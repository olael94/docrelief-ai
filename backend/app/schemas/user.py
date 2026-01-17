from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional


class UserBase(BaseModel):
    github_id: int
    github_login: str
    name: str
    email: EmailStr
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    github_id: Optional[int] = None
    github_login: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True