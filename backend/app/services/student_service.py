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
