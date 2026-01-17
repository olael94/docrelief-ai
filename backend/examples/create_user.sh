#!/bin/bash

# Exemplo de POST para cadastrar um usuário
# Endpoint: POST /api/v1/users

curl -X POST "http://localhost:8000/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "github_id": 12345678,
    "github_login": "usuario_exemplo",
    "name": "Usuário Exemplo",
    "email": "usuario@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678"
  }'

echo ""