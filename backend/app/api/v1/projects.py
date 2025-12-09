from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.student import Student
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate, StageCreate, StageRead
from app.services.project_service import ProjectService
from app.services.team_service import TeamService

router = APIRouter()


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    # Check if user is member of the team
    team = TeamService.get_team(db, project_in.team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if current_user not in team.members:
        raise HTTPException(status_code=403, detail="Not a member of the team")

    return ProjectService.create_project(db, project_in)


@router.get("", response_model=List[ProjectRead])
def read_projects(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    team = TeamService.get_team(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if current_user not in team.members:
        raise HTTPException(status_code=403, detail="Not a member of the team")
    
    return ProjectService.get_team_projects(db, team_id)


@router.get("/{project_id}", response_model=ProjectRead)
def read_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access via team
    team = TeamService.get_team(db, project.team_id)
    if current_user not in team.members:
        raise HTTPException(status_code=403, detail="Not a member of the project team")
    
    return project


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access via team - any team member (including owner) can update projects
    if not TeamService.is_user_member(db, project.team_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of the project team")
    
    updated_project = ProjectService.update_project(db, project_id, project_update)
    if not updated_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check access via team - any team member (including owner) can delete projects
    if not TeamService.is_user_member(db, project.team_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of the project team")
    
    deleted = ProjectService.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")


@router.put("/{project_id}/stages", response_model=List[StageRead])
def update_project_stages(
    project_id: int,
    stages: List[StageCreate],
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user),
):
    try:
        project = ProjectService.get_project(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        team = TeamService.get_team(db, project.team_id)
        if current_user not in team.members:
            raise HTTPException(status_code=403, detail="Not a member of the project team")
        
        result = ProjectService.update_project_stages(db, project_id, stages)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


