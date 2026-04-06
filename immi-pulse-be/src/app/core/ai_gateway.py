"""
AI Gateway — AWS Bedrock inference with usage tracking.
Simplified from AgentOS: Bedrock-only, no user scoping.
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

# Approximate Bedrock pricing per 1M tokens
MODEL_PRICING = {
    "anthropic.claude-3-haiku-20240307-v1:0": {
        "input_per_1m": 0.25,
        "output_per_1m": 1.25,
    },
    "anthropic.claude-3-5-haiku-20241022-v1:0": {
        "input_per_1m": 0.80,
        "output_per_1m": 4.00,
    },
    "anthropic.claude-sonnet-4-20250514-v1:0": {
        "input_per_1m": 3.00,
        "output_per_1m": 15.00,
    },
    "anthropic.claude-sonnet-4-6": {
        "input_per_1m": 3.00,
        "output_per_1m": 15.00,
    },
    "default": {
        "input_per_1m": 1.00,
        "output_per_1m": 5.00,
    },
}


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
            model_id=settings.bedrock_analyzer_model,
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
            model_id=settings.bedrock_drafter_model,
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
            model_id=settings.bedrock_drafter_model,
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
            model_id=settings.bedrock_drafter_model,
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
                    error="Failed to initialize AI agent — AWS credentials may not be configured",
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
            from strands.models.bedrock import BedrockModel

            if not settings.aws_access_key_id or not settings.aws_secret_access_key:
                logger.warning("AWS credentials not configured for AI Gateway")
                return None

            model = BedrockModel(
                model_id=model_id,
                region_name=settings.aws_region,
                max_tokens=max_tokens,
            )
            agent = Agent(model=model, system_prompt=system_prompt)
            self._agents[cache_key] = agent
            logger.info(f"AI Gateway: Created agent for {model_id}")
            return agent

        except ImportError as e:
            logger.error(f"Strands SDK not installed: {e}")
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
        pricing = MODEL_PRICING.get(model_id, MODEL_PRICING["default"])
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
