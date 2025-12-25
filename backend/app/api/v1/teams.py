from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.student import Student
from app.models.team_invitation import TeamInvitation
from app.schemas.student import StudentRead
from app.schemas.team import TeamCreate, TeamRead, TeamReadWithMembers, TeamUpdate
from app.schemas.team_invitation import TeamInvitationCreate, TeamInvitationRead, TeamInvitationResponse
from app.services.team_service import TeamService
from app.services.student_service import StudentService
from app.services.team_invitation_service import TeamInvitationService

router = APIRouter()


@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: TeamCreate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    return TeamService.create_team(db, team_in, current_user.id)


@router.get("", response_model=List[TeamRead])
def read_teams(
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    return TeamService.get_user_teams(db, current_user.id)


@router.get("/search-users", response_model=List[StudentRead])
def search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Поиск пользователей по имени или email"""
    if len(q) < 2:
        return []
    students = StudentService.search_students(db, q)
    return students


@router.get("/{team_id}", response_model=TeamReadWithMembers)
def read_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    team = TeamService.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check access (is owner OR member)
    is_member = team.owner_id == current_user.id or any(m.id == current_user.id for m in team.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    return team


@router.put("/{team_id}", response_model=TeamRead)
def update_team(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    team = TeamService.update_team(db, team_id, team_update, current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or you are not a member of this team")
    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    result = TeamService.delete_team(db, team_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if result is False:
        raise HTTPException(status_code=403, detail="You are not a member of this team")


@router.post("/{team_id}/invitations", response_model=TeamInvitationRead, status_code=status.HTTP_201_CREATED)
def create_invitation(
    team_id: int,
    invitation_in: TeamInvitationCreate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Создать приглашение в команду"""
    team = TeamService.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check access (is owner OR member)
    is_member = team.owner_id == current_user.id or any(m.id == current_user.id for m in team.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    
    # Проверяем, что приглашают не самого себя
    if invitation_in.invited_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    invitation = TeamInvitationService.create_invitation(
        db, team_id, current_user.id, invitation_in.invited_user_id
    )
    if not invitation:
        raise HTTPException(
            status_code=400,
            detail="Cannot create invitation (user might already be a member or invitation already exists)"
        )
    
    # Загружаем связанные данные для ответа
    db.refresh(invitation)
    invitation = db.query(TeamInvitation).filter(TeamInvitation.id == invitation.id).first()
    
    result = TeamInvitationRead(
        id=invitation.id,
        team_id=invitation.team_id,
        invited_user_id=invitation.invited_user_id,
        invited_by_id=invitation.invited_by_id,
        status=invitation.status,
        created_at=invitation.created_at,
        responded_at=invitation.responded_at,
        team_name=team.name,
        invited_by_name=current_user.full_name,
        invited_user_name=invitation.invited_user.full_name
    )
    return result


@router.get("/invitations/my", response_model=List[TeamInvitationRead])
def get_my_invitations(
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Получить все мои приглашения"""
    invitations = TeamInvitationService.get_user_invitations(db, current_user.id)
    
    result = []
    for inv in invitations:
        result.append(TeamInvitationRead(
            id=inv.id,
            team_id=inv.team_id,
            invited_user_id=inv.invited_user_id,
            invited_by_id=inv.invited_by_id,
            status=inv.status,
            created_at=inv.created_at,
            responded_at=inv.responded_at,
            team_name=inv.team.name,
            invited_by_name=inv.invited_by.full_name,
            invited_user_name=inv.invited_user.full_name
        ))
    return result


@router.post("/invitations/{invitation_id}/respond", status_code=status.HTTP_200_OK)
def respond_to_invitation(
    invitation_id: int,
    response: TeamInvitationResponse,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Принять или отклонить приглашение"""
    if response.action == "accept":
        success = TeamInvitationService.accept_invitation(db, invitation_id, current_user.id)
    elif response.action == "decline":
        success = TeamInvitationService.decline_invitation(db, invitation_id, current_user.id)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'accept' or 'decline'")
    
    if not success:
        raise HTTPException(status_code=404, detail="Invitation not found or already responded")
    
    return {"message": f"Invitation {response.action}ed successfully"}


@router.post("/{team_id}/members", status_code=status.HTTP_200_OK)
def invite_member(
    team_id: int,
    email: str,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Старый метод для обратной совместимости - создает приглашение по email"""
    team = TeamService.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Check access (is owner OR member)
    is_member = team.owner_id == current_user.id or any(m.id == current_user.id for m in team.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    
    student = StudentService.get_by_email(db, email)
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    
    if student.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    invitation = TeamInvitationService.create_invitation(
        db, team_id, current_user.id, student.id
    )
    if not invitation:
        raise HTTPException(
            status_code=400,
            detail="Could not create invitation (user might already be a member or invitation already exists)"
        )
    
    return {"message": "Invitation sent successfully"}


@router.post("/{team_id}/leave", status_code=status.HTTP_200_OK)
def leave_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    """Выйти из команды"""
    success = TeamService.remove_member(db, team_id, current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not leave the team or not a member")
    
    return {"message": "Successfully left the team"}


