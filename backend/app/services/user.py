from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from uuid import UUID
from typing import List, Optional
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_user(db: Session, user_id: UUID) -> User:
    """Busca um usuário por ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """Lista usuários com paginação"""
    return db.query(User).offset(skip).limit(limit).all()


def get_user_by_github_id(db: Session, github_id: int) -> Optional[User]:
    """Busca um usuário por GitHub ID"""
    return db.query(User).filter(User.github_id == github_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Busca um usuário por email"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: UserCreate) -> User:
    """Cria um novo usuário"""
    # Verifica se já existe usuário com mesmo github_id ou email
    if get_user_by_github_id(db, user.github_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with github_id {user.github_id} already exists"
        )
    
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {user.email} already exists"
        )
    
    db_user = User(**user.model_dump())
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User creation failed due to integrity constraint"
        )


def update_user(db: Session, user_id: UUID, user_update: UserUpdate) -> User:
    """Atualiza um usuário"""
    db_user = get_user(db, user_id)
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Verifica se os novos valores conflitam com outros usuários
    if "github_id" in update_data and update_data["github_id"] != db_user.github_id:
        existing = get_user_by_github_id(db, update_data["github_id"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with github_id {update_data['github_id']} already exists"
            )
    
    if "email" in update_data and update_data["email"] != db_user.email:
        existing = get_user_by_email(db, update_data["email"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email {update_data['email']} already exists"
            )
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User update failed due to integrity constraint"
        )


def delete_user(db: Session, user_id: UUID) -> User:
    """Deleta um usuário"""
    db_user = get_user(db, user_id)
    db.delete(db_user)
    db.commit()
    return db_user