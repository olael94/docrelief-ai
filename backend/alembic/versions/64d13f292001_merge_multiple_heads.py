"""merge multiple heads

Revision ID: 64d13f292001
Revises: 2c76ca16ad76, b4e2568239f0
Create Date: 2026-01-26 22:22:33.304350

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64d13f292001'
down_revision: Union[str, None] = ('2c76ca16ad76', 'b4e2568239f0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
