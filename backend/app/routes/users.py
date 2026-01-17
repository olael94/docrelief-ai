from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.session import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user import (
    get_user,
    get_users,
    create_user,
    update_user,
    delete_user
)

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    """Cria um novo usuário"""
    return create_user(db, user)


@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: UUID, db: Session = Depends(get_db)):
    """Busca um usuário por ID"""
    return get_user(db, user_id)


@router.get("", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Lista usuários com paginação"""
    return get_users(db, skip=skip, limit=limit)


@router.put("/{user_id}", response_model=UserResponse)
def update_user_full(user_id: UUID, user: UserCreate, db: Session = Depends(get_db)):
    """Atualiza um usuário completamente (PUT)"""
    # Para PUT, usamos UserCreate mas convertemos para UserUpdate
    user_update = UserUpdate(**user.model_dump())
    return update_user(db, user_id, user_update)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_partial(user_id: UUID, user: UserUpdate, db: Session = Depends(get_db)):
    """Atualiza um usuário parcialmente (PATCH)"""
    return update_user(db, user_id, user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(user_id: UUID, db: Session = Depends(get_db)):
    """Deleta um usuário"""
    delete_user(db, user_id)
    return None