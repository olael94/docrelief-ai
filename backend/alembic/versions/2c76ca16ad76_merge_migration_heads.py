"""merge migration heads

Revision ID: 2c76ca16ad76
Revises: 4017706628d3, d6c26c9dd4f6
Create Date: 2026-01-24 23:59:02.148837

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c76ca16ad76'
down_revision: Union[str, None] = ('4017706628d3', 'd6c26c9dd4f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
