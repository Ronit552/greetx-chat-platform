"""
One-time migration: drop & recreate the 'friendships' table.

The old table has columns (user_id, friend_id).
The new model uses (sender_id, receiver_id).
db.create_all() never alters existing tables, so we must drop manually.

Run ONCE from the backend directory:
    python migrate_friendships.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

from app import app
from models import db

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(db.text("DROP TABLE IF EXISTS friendships CASCADE;"))
        conn.commit()
    print("[OK] Dropped old 'friendships' table (user_id / friend_id columns).")

    # Recreate with new schema (sender_id, receiver_id)
    db.create_all()
    print("[OK] Recreated 'friendships' table with new schema (sender_id, receiver_id).")
    print("[OK] Migration complete. You can now delete migrate_friendships.py.")

