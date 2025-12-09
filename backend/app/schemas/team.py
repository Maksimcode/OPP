from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.student import StudentRead


class TeamBase(BaseModel):
    name: str


class TeamCreate(TeamBase):
    pass


class TeamUpdate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int
    created_at: datetime
    owner_id: int
    # members: List[StudentRead] = [] # Пока не будем тянуть всех участников, или можно
    project_count: int = 0 # Вычисляемое поле

    class Config:
        from_attributes = True


class TeamReadWithMembers(TeamRead):
    members: List[StudentRead] = []


