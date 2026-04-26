# GitHub Actions Workflows

## ci.yaml
Runs backend and frontend tests on every pull request to `main`.

## CD Pipeline (not active)
The project was originally deployed to a personal server via SSH. Below is the
CD workflow that was used for that setup, kept here for reference in case of
future server-based deployments.

Railway (backend) and Vercel (frontend) now handle deployments automatically
on every push to `main`.

 This is the  cd.yaml workflow in case of future server-based deployments:
```yaml
name: CD - Build, Push and Deploy

on:
  push:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAMESPACE: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAMESPACE }}-backend:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAMESPACE }}-backend:${{ github.sha }}

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          build-args: |
            VITE_BACKEND_URL=
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAMESPACE }}-frontend:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAMESPACE }}-frontend:${{ github.sha }}

      - name: Deploy DEV via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: 66.7.119.183
          username: scaiocesar
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/docrelief-docker
            IMAGE_TAG=${{ github.sha }} docker compose pull
            IMAGE_TAG=${{ github.sha }} docker compose up -d --remove-orphans

```