from pydantic import BaseModel, EmailStr, Field


class StudentBase(BaseModel):
    email: EmailStr
    full_name: str


class StudentCreate(StudentBase):
    password: str = Field(min_length=6, max_length=128)


class StudentRead(StudentBase):
    id: int

    class Config:
        from_attributes = True
