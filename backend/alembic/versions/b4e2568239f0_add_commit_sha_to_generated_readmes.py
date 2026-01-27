"""add commit_sha to generated_readmes

Revision ID: b4e2568239f0
Revises: d6c26c9dd4f6
Create Date: 2026-01-24 20:07:02.081126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e2568239f0'
down_revision: Union[str, None] = 'd6c26c9dd4f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add commit_sha column
    op.add_column('generated_readmes', sa.Column('commit_sha', sa.String(), nullable=True))

    # Create index for faster lookups
    op.create_index('ix_generated_readmes_commit_sha', 'generated_readmes', ['commit_sha'], unique=False)


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_generated_readmes_commit_sha', table_name='generated_readmes')

    # Remove column
    op.drop_column('generated_readmes', 'commit_sha')
