"""Newsletter schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class NewsletterSubscribeIn(BaseModel):
    email: EmailStr
    source: Optional[str] = Field(default="public_footer", max_length=64)


class NewsletterSubscribeOut(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime
    already_subscribed: bool = False

    class Config:
        from_attributes = True
