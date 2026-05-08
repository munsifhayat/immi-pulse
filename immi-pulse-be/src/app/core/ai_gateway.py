"""
AI Gateway — OpenAI inference via the Strands Agents SDK, with usage tracking.

Strands is provider-agnostic: `Agent(model=...)` accepts any model implementation,
so callers (`classify`, `analyze`, `summarize`, `classify_comprehensive`) keep
the exact same interface regardless of which provider is wired in. We use
`strands.models.openai.OpenAIModel` so the OpenAI key in `OPENAI_API_KEY`
drives all AI features (precase triage, intake classifier, document analyzer).
"""

import asyncio
import hashlib
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Approximate OpenAI pricing per 1M tokens (May 2026 published rates).
# Used for telemetry only — never gates a request.
MODEL_PRICING = {
    "gpt-4o-mini": {"input_per_1m": 0.15, "output_per_1m": 0.60},
    "gpt-4o": {"input_per_1m": 2.50, "output_per_1m": 10.00},
    "gpt-4.1-mini": {"input_per_1m": 0.40, "output_per_1m": 1.60},
    "gpt-4.1": {"input_per_1m": 2.00, "output_per_1m": 8.00},
    "o4-mini": {"input_per_1m": 1.10, "output_per_1m": 4.40},
    "default": {"input_per_1m": 0.50, "output_per_1m": 2.00},
}


def _normalize_model_id(model_id: str) -> str:
    """Strip provider/version suffixes (e.g. `-2024-08-06`) for pricing lookup."""
    base = model_id.split(":")[0]
    # Trim any trailing date suffix like "gpt-4o-2024-08-06" → "gpt-4o"
    parts = base.split("-")
    while len(parts) > 1 and parts[-1].isdigit() and len(parts[-1]) >= 2:
        parts.pop()
    return "-".join(parts) if parts else base


@dataclass
class AIMetrics:
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: int
    model_id: str
    estimated_cost_usd: float


@dataclass
class AIGatewayResponse:
    message: str
    raw_result: Any
    metrics: AIMetrics
    success: bool
    error: Optional[str] = None


class AIGateway:
    """Centralized AI Gateway for all Bedrock operations."""

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self._agents: dict[str, Any] = {}

    async def classify(
        self,
        content: str,
        system_prompt: str,
        agent_name: str = "unknown",
        max_tokens: int = 1024,
    ) -> AIGatewayResponse:
        """Use Haiku for fast classification (invoice, P1, category)."""
        return await self._invoke(
            prompt=content,
            system_prompt=system_prompt,
            model_id=settings.openai_analyzer_model,
            agent_name=agent_name,
            operation="classify",
            max_tokens=max_tokens,
        )

    async def analyze(
        self,
        content: str,
        system_prompt: str,
        agent_name: str = "unknown",
        max_tokens: int = 4096,
    ) -> AIGatewayResponse:
        """Use Sonnet for complex analysis (emergent work, thread correlation)."""
        return await self._invoke(
            prompt=content,
            system_prompt=system_prompt,
            model_id=settings.openai_drafter_model,
            agent_name=agent_name,
            operation="analyze",
            max_tokens=max_tokens,
        )

    async def classify_comprehensive(
        self,
        content: str,
        system_prompt: str,
        agent_name: str = "unified_classifier",
        max_tokens: int = 4096,
    ) -> AIGatewayResponse:
        """Use Sonnet for unified multi-dimension classification (single call)."""
        return await self._invoke(
            prompt=content,
            system_prompt=system_prompt,
            model_id=settings.openai_drafter_model,
            agent_name=agent_name,
            operation="classify_comprehensive",
            max_tokens=max_tokens,
        )

    async def summarize(
        self,
        content: str,
        system_prompt: str,
        agent_name: str = "unknown",
        max_tokens: int = 4096,
    ) -> AIGatewayResponse:
        """Use Sonnet for summary generation (daily P1, emergent work)."""
        return await self._invoke(
            prompt=content,
            system_prompt=system_prompt,
            model_id=settings.openai_drafter_model,
            agent_name=agent_name,
            operation="summarize",
            max_tokens=max_tokens,
        )

    async def _invoke(
        self,
        prompt: str,
        system_prompt: str,
        model_id: str,
        agent_name: str,
        operation: str,
        max_tokens: int,
    ) -> AIGatewayResponse:
        start_time = time.time()

        try:
            agent = self._get_or_create_agent(model_id, system_prompt, max_tokens)
            if agent is None:
                return AIGatewayResponse(
                    message="",
                    raw_result=None,
                    metrics=AIMetrics(0, 0, 0, 0, model_id, 0.0),
                    success=False,
                    error="Failed to initialize AI agent — OPENAI_API_KEY is not configured",
                )

            result = await asyncio.to_thread(agent, prompt)
            metrics = self._extract_metrics(result, model_id, start_time)
            message = self._extract_message(result)

            # Log usage to DB if session available
            if self.db:
                await self._store_usage_log(agent_name, operation, model_id, metrics)

            logger.info(
                f"AI Gateway: {agent_name}/{operation} completed in {metrics.latency_ms}ms, "
                f"tokens={metrics.total_tokens}, cost=${metrics.estimated_cost_usd:.6f}"
            )

            return AIGatewayResponse(
                message=message,
                raw_result=result,
                metrics=metrics,
                success=True,
            )

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"AI Gateway error: {agent_name}/{operation} failed: {e}", exc_info=True)
            return AIGatewayResponse(
                message="",
                raw_result=None,
                metrics=AIMetrics(0, 0, 0, elapsed_ms, model_id, 0.0),
                success=False,
                error=str(e),
            )

    def _get_or_create_agent(self, model_id: str, system_prompt: str, max_tokens: int) -> Any:
        prompt_hash = hashlib.md5(system_prompt.encode()).hexdigest()[:8]
        cache_key = f"{model_id}:{prompt_hash}:{max_tokens}"

        if cache_key in self._agents:
            return self._agents[cache_key]

        try:
            from strands import Agent
            from strands.models.openai import OpenAIModel

            if not settings.openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for AI Gateway")
                return None

            model = OpenAIModel(
                client_args={
                    "api_key": settings.openai_api_key,
                    "timeout": settings.openai_request_timeout_seconds,
                },
                model_id=model_id,
                params={"max_tokens": max_tokens},
            )
            agent = Agent(model=model, system_prompt=system_prompt)
            self._agents[cache_key] = agent
            logger.info(f"AI Gateway: Created OpenAI agent for {model_id}")
            return agent

        except ImportError as e:
            logger.error(
                f"Strands OpenAI provider not installed: {e}. "
                f"Run `pip install 'strands-agents[openai]'`."
            )
            return None
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            return None

    def _extract_metrics(self, result: Any, model_id: str, start_time: float) -> AIMetrics:
        elapsed_ms = int((time.time() - start_time) * 1000)
        input_tokens = 0
        output_tokens = 0

        try:
            if hasattr(result, "metrics") and result.metrics is not None:
                summary = result.metrics.get_summary()
                if "accumulated_usage" in summary:
                    usage = summary["accumulated_usage"]
                    input_tokens = usage.get("inputTokens", 0)
                    output_tokens = usage.get("outputTokens", 0)
        except Exception as e:
            logger.warning(f"Failed to extract metrics: {e}")

        estimated_cost = self._calculate_cost(model_id, input_tokens, output_tokens)
        return AIMetrics(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            latency_ms=elapsed_ms,
            model_id=model_id,
            estimated_cost_usd=estimated_cost,
        )

    def _calculate_cost(self, model_id: str, input_tokens: int, output_tokens: int) -> float:
        pricing = MODEL_PRICING.get(_normalize_model_id(model_id), MODEL_PRICING["default"])
        return (input_tokens / 1_000_000) * pricing["input_per_1m"] + (
            output_tokens / 1_000_000
        ) * pricing["output_per_1m"]

    def _extract_message(self, result: Any) -> str:
        try:
            if hasattr(result, "output"):
                if hasattr(result.output, "message"):
                    if hasattr(result.output.message, "content"):
                        content = result.output.message.content
                        if isinstance(content, list) and len(content) > 0:
                            return content[0].get("text", "")
                return str(result.output)
            if hasattr(result, "message"):
                message = result.message
                if isinstance(message, dict):
                    content = message.get("content", [])
                    if isinstance(content, list):
                        return "\n".join(
                            item.get("text", "") for item in content if isinstance(item, dict)
                        )
                return str(message)
            return str(result)
        except Exception as e:
            logger.warning(f"Failed to extract message: {e}")
            return str(result)

    async def _store_usage_log(
        self, agent_name: str, operation: str, model_id: str, metrics: AIMetrics
    ) -> None:
        try:
            from app.agents.shared.models import AIUsageLog

            log = AIUsageLog(
                id=uuid.uuid4(),
                agent_name=agent_name,
                operation=operation,
                model_id=model_id,
                input_tokens=metrics.input_tokens,
                output_tokens=metrics.output_tokens,
                latency_ms=metrics.latency_ms,
                estimated_cost=metrics.estimated_cost_usd,
            )
            self.db.add(log)
            await self.db.commit()
        except Exception as e:
            logger.error(f"Failed to store usage log: {e}")
            try:
                await self.db.rollback()
            except Exception:
                pass
