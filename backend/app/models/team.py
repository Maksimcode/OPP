from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.db.base import Base

# Association table for many-to-many relationship between Student and Team
team_members = Table(
    "team_members",
    Base.metadata,
    Column("student_id", Integer, ForeignKey("students.id"), primary_key=True),
    Column("team_id", Integer, ForeignKey("teams.id"), primary_key=True),
)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    owner_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    # Relationships
    owner = relationship("Student", backref="owned_teams")
    members = relationship("Student", secondary=team_members, backref="teams")
    projects = relationship("Project", back_populates="team", cascade="all, delete-orphan")

    @property
    def project_count(self):
        return len(self.projects)
