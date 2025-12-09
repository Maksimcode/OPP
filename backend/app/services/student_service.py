from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.student import Student
from app.schemas.student import StudentCreate


class StudentService:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Student | None:
        return db.query(Student).filter(Student.email == email).first()

    @staticmethod
    def create_student(db: Session, student_in: StudentCreate) -> Student:
        student = Student(
            email=student_in.email,
            full_name=student_in.full_name,
            hashed_password=get_password_hash(student_in.password),
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Student | None:
        student = StudentService.get_by_email(db, email)
        if not student:
            return None
        if not verify_password(password, student.hashed_password):
            return None
        return student

    @staticmethod
    def search_students(db: Session, query: str, limit: int = 10) -> List[Student]:
        """Поиск пользователей по имени или email"""
        search_term = f"%{query.lower()}%"
        return (
            db.query(Student)
            .filter(
                or_(
                    Student.email.ilike(search_term),
                    Student.full_name.ilike(search_term)
                )
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, student_id: int) -> Optional[Student]:
        return db.query(Student).filter(Student.id == student_id).first()
