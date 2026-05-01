from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Index
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """User account table.
    The 'username' column has:
      - UNIQUE constraint  → PostgreSQL auto-creates a B-Tree index for uniqueness checks.
      - Explicit B-Tree index below (ix_users_username_btree) → used by the prefix-ILIKE
        search query in /api/search/users to stay fast at scale.
    """
    __tablename__ = 'users'

    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(100), nullable=False)
    email          = db.Column(db.String(120), unique=True, nullable=False)
    password_hash  = db.Column(db.String(255), nullable=False)
    username       = db.Column(db.String(50),  unique=True, nullable=False)
    dob            = db.Column(db.Date, nullable=False)
    gender         = db.Column(db.String(20), nullable=False)
    bio            = db.Column(db.String(150), default="Loving the conversation. Building cool stuff.")
    profile_image  = db.Column(db.String(255), default="JD")
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    # Explicit B-Tree index on username for fast prefix-search (ILIKE 'query%')
    __table_args__ = (
        Index('ix_users_username_btree', 'username'),
    )

    def __repr__(self):
        return f"<User {self.username}>"


class OTP(db.Model):
    __tablename__ = 'otps'

    id          = db.Column(db.Integer, primary_key=True)
    email       = db.Column(db.String(120), unique=True, nullable=False)
    otp_code    = db.Column(db.String(6), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at  = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)


class Friendship(db.Model):
    """Friend-request / friendship table.

    Columns:
      sender_id   — the user who sent the friend request.
      receiver_id — the user who received the request.
      status      — 'pending'  : request sent, not yet accepted.
                    'accepted' : both users are friends.

    Duplicate-safety:
      • DB-level: UniqueConstraint on (sender_id, receiver_id) blocks exact duplicates.
      • API-level: /api/friends/request also checks the reverse pair (receiver→sender)
        to prevent A→B when B→A already exists.

    Indexes on both FK columns for fast per-user lookups.
    """
    __tablename__ = 'friendships'

    id          = db.Column(db.Integer, primary_key=True)
    sender_id   = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status      = db.Column(db.String(20), nullable=False, default='pending')  # 'pending' | 'accepted'
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    sender   = db.relationship('User', foreign_keys=[sender_id],   backref='sent_requests')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_requests')

    __table_args__ = (
        db.UniqueConstraint('sender_id', 'receiver_id', name='uq_friendship_pair'),
        Index('ix_friendship_sender_id',   'sender_id'),
        Index('ix_friendship_receiver_id', 'receiver_id'),
    )

    def __repr__(self):
        return f"<Friendship {self.sender_id} → {self.receiver_id} [{self.status}]>"


class Notification(db.Model):
    """Real-time notification table.

    Types:
      'friend_request'  — user_id received a friend request from from_user_id.
      'friend_accepted' — user_id's friend request was accepted by from_user_id.
      'new_message'     — user_id received a chat message from from_user_id.

    SSE polling queries by (user_id, id > last_seen_id) — both columns indexed.
    """
    __tablename__ = 'notifications'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type         = db.Column(db.String(30), nullable=False)   # 'friend_request' | 'friend_accepted'
    is_read      = db.Column(db.Boolean, default=False, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    user      = db.relationship('User', foreign_keys=[user_id])
    from_user = db.relationship('User', foreign_keys=[from_user_id])

    __table_args__ = (
        Index('ix_notifications_user_id',      'user_id'),
        Index('ix_notifications_user_is_read', 'user_id', 'is_read'),
    )

    def __repr__(self):
        return f"<Notification {self.type} → user {self.user_id}>"


class Message(db.Model):
    """Direct message table.

    A conversation between user A and B = rows where
      (sender_id=A AND receiver_id=B) OR (sender_id=B AND receiver_id=A).

    Private SocketIO room: dm_{min(a,b)}_{max(a,b)}
    Pagination: use  id < before_id  for infinite-scroll (load older messages).
    """
    __tablename__ = 'messages'

    id          = db.Column(db.Integer, primary_key=True)
    sender_id   = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content     = db.Column(db.Text, nullable=False)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_read     = db.Column(db.Boolean, default=False, nullable=False)

    sender   = db.relationship('User', foreign_keys=[sender_id])
    receiver = db.relationship('User', foreign_keys=[receiver_id])

    __table_args__ = (
        Index('ix_messages_sender_id',   'sender_id'),
        Index('ix_messages_receiver_id', 'receiver_id'),
        # Covers conversation history range queries (the hot path)
        Index('ix_messages_conv_ts', 'sender_id', 'receiver_id', 'timestamp'),
    )

    def __repr__(self):
        return f"<Message {self.sender_id}→{self.receiver_id} @ {self.timestamp}>"
