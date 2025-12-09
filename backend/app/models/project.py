from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    # Relationships
    team = relationship("Team", back_populates="projects")
    stages = relationship("Stage", back_populates="project", cascade="all, delete-orphan")


class Stage(Base):
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    duration = Column(Integer, default=1, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    # Store array of responsible student IDs as JSON
    responsibles = Column(JSON, default=list)
    feedback = Column(String(1024), nullable=True)
    # Store array of dependency Stage IDs as JSON
    dependencies = Column(JSON, default=list)

    # Relationships
    project = relationship("Project", back_populates="stages")
    tasks = relationship("Task", back_populates="stage", cascade="all, delete-orphan", order_by="Task.id")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    duration = Column(Integer, default=1, nullable=False)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    # Store array of responsible student IDs as JSON
    responsibles = Column(JSON, default=list)
    feedback = Column(String(1024), nullable=True)
    # Store array of dependency Task IDs as JSON (or Stage IDs? usually tasks depend on tasks)
    dependencies = Column(JSON, default=list)

    # Relationships
    stage = relationship("Stage", back_populates="tasks")


