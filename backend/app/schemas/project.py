from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# --- Task Schemas ---
class TaskBase(BaseModel):
    name: str
    duration: int = 1
    is_completed: bool = False
    responsibles: List[str] = [] # List of names or IDs? Frontend sends names strings mostly
    feedback: Optional[str] = None
    dependencies: List[int] = []

    def __init__(self, **data):
        # Гарантируем, что dependencies всегда список
        if 'dependencies' not in data or data['dependencies'] is None:
            data['dependencies'] = []
        if 'responsibles' not in data or data['responsibles'] is None:
            data['responsibles'] = []
        super().__init__(**data)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: int
    stage_id: int

    class Config:
        from_attributes = True


# --- Stage Schemas ---
class StageBase(BaseModel):
    name: str
    duration: int = 1
    is_completed: bool = False
    responsibles: List[str] = []
    feedback: Optional[str] = None
    dependencies: List[int] = []

    def __init__(self, **data):
        # Гарантируем, что dependencies всегда список
        if 'dependencies' not in data or data['dependencies'] is None:
            data['dependencies'] = []
        if 'responsibles' not in data or data['responsibles'] is None:
            data['responsibles'] = []
        super().__init__(**data)


class StageCreate(StageBase):
    tasks: List[TaskCreate] = []


class StageUpdate(StageBase):
    pass


class StageRead(StageBase):
    id: int
    project_id: int
    tasks: List[TaskRead] = []

    class Config:
        from_attributes = True


# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    deadline: datetime


class ProjectCreate(ProjectBase):
    team_id: int


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: int
    created_at: datetime
    team_id: int
    stages: List[StageRead] = []

    class Config:
        from_attributes = True


