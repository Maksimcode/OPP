from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.team_invitation import InvitationStatus, TeamInvitation
from app.models.team import Team
from app.services.team_service import TeamService


class TeamInvitationService:
    @staticmethod
    def create_invitation(
        db: Session,
        team_id: int,
        invited_by_id: int,
        invited_user_id: int
    ) -> Optional[TeamInvitation]:
        """Создать приглашение в команду"""
        # Проверяем, что команда существует
        team = TeamService.get_team(db, team_id)
        if not team:
            return None
        
        # Проверяем, что пользователь не является уже участником
        team = db.query(Team).filter(Team.id == team_id).first()
        from app.models.student import Student
        invited_user = db.query(Student).filter(Student.id == invited_user_id).first()
        if not invited_user:
            return None
        
        if invited_user in team.members:
            return None  # Уже участник
        
        # Проверяем, нет ли уже активного приглашения
        existing = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.team_id == team_id,
                TeamInvitation.invited_user_id == invited_user_id,
                TeamInvitation.status == InvitationStatus.PENDING
            )
            .first()
        )
        if existing:
            return None  # Приглашение уже существует
        
        invitation = TeamInvitation(
            team_id=team_id,
            invited_by_id=invited_by_id,
            invited_user_id=invited_user_id,
            status=InvitationStatus.PENDING
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        return invitation

    @staticmethod
    def get_user_invitations(db: Session, user_id: int) -> List[TeamInvitation]:
        """Получить все приглашения пользователя"""
        return (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.invited_user_id == user_id,
                TeamInvitation.status == InvitationStatus.PENDING
            )
            .all()
        )

    @staticmethod
    def accept_invitation(db: Session, invitation_id: int, user_id: int) -> bool:
        """Принять приглашение"""
        invitation = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.id == invitation_id,
                TeamInvitation.invited_user_id == user_id,
                TeamInvitation.status == InvitationStatus.PENDING
            )
            .first()
        )
        if not invitation:
            return False
        
        # Добавляем пользователя в команду
        added = TeamService.add_member(db, invitation.team_id, user_id)
        if not added:
            return False
        
        # Обновляем статус приглашения
        invitation.status = InvitationStatus.ACCEPTED
        invitation.responded_at = datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def decline_invitation(db: Session, invitation_id: int, user_id: int) -> bool:
        """Отклонить приглашение"""
        invitation = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.id == invitation_id,
                TeamInvitation.invited_user_id == user_id,
                TeamInvitation.status == InvitationStatus.PENDING
            )
            .first()
        )
        if not invitation:
            return False
        
        invitation.status = InvitationStatus.DECLINED
        invitation.responded_at = datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def get_invitation(db: Session, invitation_id: int) -> Optional[TeamInvitation]:
        """Получить приглашение по ID"""
        return db.query(TeamInvitation).filter(TeamInvitation.id == invitation_id).first()

