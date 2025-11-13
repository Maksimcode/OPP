from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.schemas import auth as auth_schema
from app.schemas.student import StudentCreate, StudentRead
from app.services.student_service import StudentService

router = APIRouter()


@router.post("/register", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def register(student_in: StudentCreate, db: Session = Depends(get_db)):
    existing_student = StudentService.get_by_email(db, student_in.email)
    if existing_student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    student = StudentService.create_student(db, student_in)
    return student


@router.post("/login", response_model=auth_schema.Token)
def login(login_request: auth_schema.LoginRequest, db: Session = Depends(get_db)):
    student = StudentService.authenticate(db, login_request.email, login_request.password)
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token = create_access_token(student.email)
    refresh_token = create_refresh_token(student.email)

    return auth_schema.Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=auth_schema.Token)
def refresh_token(request: auth_schema.RefreshRequest):
    try:
        payload = decode_token(request.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    token_type = payload.get("type")
    if token_type != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type")

    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")

    access_token = create_access_token(subject)
    refresh_token = create_refresh_token(subject)
    return auth_schema.Token(access_token=access_token, refresh_token=refresh_token)
