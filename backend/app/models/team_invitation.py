from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    invited_by_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    invited_user_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(String(20), default=InvitationStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    responded_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    invited_by = relationship("Student", foreign_keys=[invited_by_id], backref="sent_invitations")
    invited_user = relationship("Student", foreign_keys=[invited_user_id], backref="received_invitations")

