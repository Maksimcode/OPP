from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.team import Team, team_members
from app.models.student import Student
from app.schemas.team import TeamCreate, TeamUpdate


class TeamService:
    @staticmethod
    def create_team(db: Session, team_in: TeamCreate, owner_id: int) -> Team:
        team = Team(
            name=team_in.name,
            owner_id=owner_id
        )
        db.add(team)
        db.commit()
        db.refresh(team)
        # Add owner as a member automatically? Usually yes.
        TeamService.add_member(db, team.id, owner_id)
        return team

    @staticmethod
    def get_team(db: Session, team_id: int) -> Optional[Team]:
        return db.query(Team).filter(Team.id == team_id).first()

    @staticmethod
    def get_user_teams(db: Session, user_id: int) -> List[Team]:
        # Return teams where user is owner OR member
        # Get team IDs where user is a member (via team_members table)
        member_team_ids_subquery = db.query(team_members.c.team_id).filter(
            team_members.c.student_id == user_id
        )
        
        # Return teams where user is owner OR member
        return db.query(Team).filter(
            or_(
                Team.owner_id == user_id,
                Team.id.in_(member_team_ids_subquery)
            )
        ).distinct().all()

    @staticmethod
    def add_member(db: Session, team_id: int, student_id: int) -> bool:
        team = TeamService.get_team(db, team_id)
        student = db.query(Student).filter(Student.id == student_id).first()
        if not team or not student:
            return False
        
        if student not in team.members:
            team.members.append(student)
            db.commit()
        return True

    @staticmethod
    def update_team(db: Session, team_id: int, team_update: TeamUpdate, user_id: int) -> Optional[Team]:
        team = TeamService.get_team(db, team_id)
        if not team:
            return None
        
        # Any team member can update team
        if not TeamService.is_user_member(db, team_id, user_id):
            return None
        
        team.name = team_update.name
        db.commit()
        db.refresh(team)
        return team

    @staticmethod
    def delete_team(db: Session, team_id: int, user_id: int) -> Optional[bool]:
        """
        Удаляет команду.
        Returns:
            True - команда успешно удалена
            False - команда найдена, но пользователь не является участником
            None - команда не найдена
        """
        team = TeamService.get_team(db, team_id)
        if not team:
            return None
        
        # Any team member can delete team
        if not TeamService.is_user_member(db, team_id, user_id):
            return False
        
        # Projects will be deleted cascade (see Team model: cascade="all, delete-orphan")
        db.delete(team)
        db.commit()
        return True

    @staticmethod
    def is_user_member(db: Session, team_id: int, user_id: int) -> bool:
        """Проверяет, является ли пользователь участником команды (владелец или член)"""
        team = TeamService.get_team(db, team_id)
        if not team:
            return False
        
        # Проверяем, является ли пользователь владельцем
        if team.owner_id == user_id:
            return True
        
        # Проверяем, является ли пользователь участником через таблицу team_members
        # Используем тот же подход, что и в get_user_teams
        member_team_ids_subquery = db.query(team_members.c.team_id).filter(
            team_members.c.student_id == user_id
        )
        result = db.query(Team).filter(
            Team.id == team_id,
            Team.id.in_(member_team_ids_subquery)
        ).first()
        return result is not None


