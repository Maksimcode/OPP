from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.team_invitation import InvitationStatus


class TeamInvitationBase(BaseModel):
    invited_user_id: int


class TeamInvitationCreate(TeamInvitationBase):
    pass


class TeamInvitationRead(TeamInvitationBase):
    id: int
    invited_by_id: int
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    team_name: Optional[str] = None
    invited_by_name: Optional[str] = None
    invited_user_name: Optional[str] = None

    class Config:
        from_attributes = True


class TeamInvitationResponse(BaseModel):
    id: int
    action: str  # "accept" or "decline"

