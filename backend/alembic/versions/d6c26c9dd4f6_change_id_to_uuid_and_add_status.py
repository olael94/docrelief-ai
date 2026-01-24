"""change_id_to_uuid_and_add_status

Revision ID: d6c26c9dd4f6
Revises: bc8712053550
Create Date: 2026-01-23 22:48:57.747680

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd6c26c9dd4f6'
down_revision: Union[str, None] = 'bc8712053550'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable UUID extension if not already enabled
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Create readmestatus enum
    readmestatus_enum = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='readmestatus')
    readmestatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Drop primary key constraint and index
    op.drop_constraint('generated_readmes_pkey', 'generated_readmes', type_='primary')
    op.drop_index('ix_generated_readmes_id', table_name='generated_readmes')
    
    # Add temporary UUID column
    op.add_column('generated_readmes', sa.Column('id_new', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False))
    
    # Generate UUIDs for existing rows (if any)
    op.execute("""
        UPDATE generated_readmes 
        SET id_new = uuid_generate_v4()
        WHERE id_new IS NULL
    """)
    
    # Drop old integer id column
    op.drop_column('generated_readmes', 'id')
    
    # Rename new column to id
    op.alter_column('generated_readmes', 'id_new', new_column_name='id')
    
    # Add primary key constraint
    op.create_primary_key('generated_readmes_pkey', 'generated_readmes', ['id'])
    
    # Create index on id
    op.create_index('ix_generated_readmes_id', 'generated_readmes', ['id'], unique=False)
    
    # Add status column with default
    op.add_column('generated_readmes', sa.Column('status', readmestatus_enum, nullable=False, server_default='pending'))
    op.create_index('ix_generated_readmes_status', 'generated_readmes', ['status'], unique=False)
    
    # Make readme_content nullable
    op.alter_column('generated_readmes', 'readme_content',
                   existing_type=sa.Text(),
                   nullable=True)


def downgrade() -> None:
    # Make readme_content not nullable (set default for NULL values)
    op.execute("""
        UPDATE generated_readmes 
        SET readme_content = '' 
        WHERE readme_content IS NULL
    """)
    op.alter_column('generated_readmes', 'readme_content',
                   existing_type=sa.Text(),
                   nullable=False)
    
    # Drop status column and index
    op.drop_index('ix_generated_readmes_status', table_name='generated_readmes')
    op.drop_column('generated_readmes', 'status')
    
    # Drop readmestatus enum
    readmestatus_enum = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='readmestatus')
    readmestatus_enum.drop(op.get_bind(), checkfirst=True)
    
    # Drop primary key and index
    op.drop_constraint('generated_readmes_pkey', 'generated_readmes', type_='primary')
    op.drop_index('ix_generated_readmes_id', table_name='generated_readmes')
    
    # Add integer id column back
    op.add_column('generated_readmes', sa.Column('id_new', sa.Integer(), nullable=False, server_default=sa.text("nextval('generated_readmes_id_seq'::regclass)")))
    
    # Drop UUID column
    op.drop_column('generated_readmes', 'id')
    
    # Rename integer column to id
    op.alter_column('generated_readmes', 'id_new', new_column_name='id')
    
    # Add primary key constraint
    op.create_primary_key('generated_readmes_pkey', 'generated_readmes', ['id'])
    
    # Create index on id
    op.create_index('ix_generated_readmes_id', 'generated_readmes', ['id'], unique=False)
