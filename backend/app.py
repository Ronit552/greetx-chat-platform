from flask import Flask, render_template, send_from_directory, request, jsonify, session, redirect, url_for, Response, stream_with_context
import os
import random
import string
import time
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from models import db, User, OTP, Friendship, Notification

load_dotenv()

app = Flask(__name__, template_folder='../frontend/html', static_folder='../frontend')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('database_url') or 'sqlite:///greetx.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Mail configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('email')
app.config['MAIL_PASSWORD'] = os.getenv('email_pass')

mail = Mail(app)

app.secret_key = os.getenv('SECRET_KEY') or os.urandom(24)

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('landing.html')

@app.route('/screenshots/<path:filename>')
def screenshots(filename):
    """Serve screenshot images for the landing page."""
    screenshots_dir = os.path.join(os.path.dirname(__file__), '..', 'screenshots')
    return send_from_directory(screenshots_dir, filename)

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = User.query.get(session['user_id'])
    if not user:
        return redirect(url_for('login'))
    return render_template('profile.html', user=user)

@app.route('/contacts')
def contacts():
    return render_template('contacts.html')

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    
    # Basic validation
    required_fields = ['name', 'email', 'password', 'username', 'dob', 'gender']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409

    otp_record = OTP.query.filter_by(email=data['email']).first()
    if not otp_record or not otp_record.is_verified:
        return jsonify({'error': 'Email not verified via OTP'}), 403

    hashed_password = generate_password_hash(data['password'])
    
    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=hashed_password,
        username=data['username'],
        dob=data['dob'],
        gender=data['gender']
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        session['user_id'] = new_user.id
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
        
    session['user_id'] = user.id
    return jsonify({'message': 'Login successful', 'user_id': user.id, 'username': user.username}), 200

@app.route('/api/send_otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    otp_code = ''.join(random.choices(string.digits, k=6))
    
    otp_record = OTP.query.filter_by(email=email).first()
    if otp_record:
        otp_record.otp_code = otp_code
        otp_record.expires_at = datetime.utcnow() + timedelta(minutes=10)
        otp_record.is_verified = False
    else:
        otp_record = OTP(
            email=email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        db.session.add(otp_record)
        
    try:
        msg = Message("Your GreetX Verification Code",
                      sender=app.config['MAIL_USERNAME'],
                      recipients=[email])
        
        current_year = datetime.utcnow().year
        msg.html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 10px; }}
                .container {{ max-width: 500px; margin: 0 auto; background: rgba(30, 41, 59, 0.7); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }}
                .logo {{ width: auto; height: 40px; margin-bottom: 24px; }}
                h1 {{ font-size: 24px; font-weight: 600; margin: 0 0 10px; color: #ffffff; }}
                p {{ font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }}
                .otp-box {{ background: rgba(15, 23, 42, 0.8); border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 30px 0; }}
                .otp-code {{ font-size: 42px; font-weight: 700; color: #60a5fa; letter-spacing: 8px; margin: 0; font-family: monospace; }}
                .disclaimer {{ font-size: 13px; color: #64748b; margin-bottom: 30px; }}
                .footer {{ border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; font-size: 12px; color: #475569; }}
                strong {{ color: #e2e8f0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <img src="https://raw.githubusercontent.com/Ronit552/greetx-chat-platform/main/frontend/assets/images/logo.png" alt="GreetX" class="logo">
                <h1>Verify your email</h1>
                <p>Welcome to GreetX! Use the verification code below to complete your authentication process and join the conversation.</p>
                <div class="otp-box">
                    <p class="otp-code">{otp_code}</p>
                </div>
                <p class="disclaimer">This code is valid for exactly <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
                <div class="footer">
                    &copy; {current_year} GreetX Chat Platform.<br>Secure connections. Modern people.
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.body = f"Your GreetX One-Time Password is {otp_code}. It expires in 10 minutes. If you did not request this, please ignore this email."
        mail.send(msg)
        db.session.commit()
        return jsonify({'message': 'OTP sent successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to send email: {str(e)}'}), 500

@app.route('/api/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp_code = data.get('otp')
    
    if not email or not otp_code:
        return jsonify({'error': 'Email and OTP are required'}), 400
        
    otp_record = OTP.query.filter_by(email=email).first()
    if not otp_record or otp_record.otp_code != otp_code:
        return jsonify({'error': 'Invalid OTP'}), 400
        
    if otp_record.expires_at < datetime.utcnow():
        return jsonify({'error': 'OTP has expired'}), 400
        
    otp_record.is_verified = True
    db.session.commit()
    
    return jsonify({'message': 'OTP verified successfully'}), 200

@app.route('/api/login_otp', methods=['POST'])
def login_otp():
    data = request.get_json()
    email = data.get('email')
    otp_code = data.get('otp_code')
    
    if not email or not otp_code:
        return jsonify({'error': 'Email and OTP are required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Email not registered'}), 404
        
    otp_record = OTP.query.filter_by(email=email).first()
    if not otp_record or otp_record.otp_code != otp_code:
        return jsonify({'error': 'Invalid OTP code'}), 400
        
    if otp_record.expires_at < datetime.utcnow():
        return jsonify({'error': 'OTP has expired'}), 400
        
    session['user_id'] = user.id
    return jsonify({'message': 'OTP Login successful', 'user_id': user.id, 'username': user.username}), 200

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.get_json()
    user = User.query.get(session['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if 'name' in data:
        user.name = data['name']
    if 'bio' in data:
        user.bio = data['bio']
            
    try:
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/password', methods=['PUT'])
def update_password():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.get_json()
    user = User.query.get(session['user_id'])
    
    if not check_password_hash(user.password_hash, data.get('current_password')):
        return jsonify({'error': 'Incorrect current password'}), 401
        
    if data.get('new_password') != data.get('confirm_password'):
        return jsonify({'error': 'Passwords do not match'}), 400
        
    user.password_hash = generate_password_hash(data.get('new_password'))
    db.session.commit()
    return jsonify({'message': 'Password updated successfully'}), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200


# ─────────────────────────────────────────────────────────────────────────────
# SEARCH
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/search/users', methods=['GET'])
def search_users():
    """Live username prefix-search.

    Query param:  q=<prefix>   (must be ≥ 2 characters)
    Returns:      JSON array of up to 8 matching users.
    Auth:         Session required (private endpoint).

    Exclusion logic
    ───────────────
    We collect IDs to hide from results:
      • The current logged-in user (themselves).
      • Anyone with whom a Friendship record exists in EITHER direction
        and ANY status (pending OR accepted).  This prevents re-sending
        duplicate requests and avoids showing existing friends.

    DB query
    ────────
    User.username.ilike(f"{q}%")
    → Prefix ILIKE hits the B-Tree index (ix_users_username_btree)
      so this stays O(log n) even at large user counts.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([]), 200

    current_id = session['user_id']

    # ── Accepted friends (both directions) → fully excluded from search ──────
    accepted_sent = {
        f.receiver_id for f in
        Friendship.query.filter_by(sender_id=current_id, status='accepted').all()
    }
    accepted_recv = {
        f.sender_id for f in
        Friendship.query.filter_by(receiver_id=current_id, status='accepted').all()
    }

    # ── Pending requests I RECEIVED → exclude (they appear in my pending panel)
    recv_pending_ids = {
        f.sender_id for f in
        Friendship.query.filter_by(receiver_id=current_id, status='pending').all()
    }

    # ── Pending requests I SENT → keep in results but mark as 'pending_sent' ─
    sent_pending_ids = {
        f.receiver_id for f in
        Friendship.query.filter_by(sender_id=current_id, status='pending').all()
    }

    # Fully excluded IDs (self + accepted + received-pending)
    excluded_ids = accepted_sent | accepted_recv | recv_pending_ids | {current_id}

    # Prefix-ILIKE search — uses the B-Tree index on username
    results = (
        User.query
        .filter(
            User.username.ilike(f"{q}%"),
            ~User.id.in_(excluded_ids)
        )
        .limit(8)
        .all()
    )

    def make_initials(name):
        parts = name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return name[:2].upper()

    data = [
        {
            'id':           u.id,
            'username':     u.username,
            'name':         u.name,
            'bio':          u.bio or '',
            'initials':     make_initials(u.name),
            # 'pending_sent' → I already sent a request; 'none' → no relationship
            'relationship': 'pending_sent' if u.id in sent_pending_ids else 'none',
        }
        for u in results
    ]

    return jsonify(data), 200





# ─────────────────────────────────────────────────────────────────────────────
# FRIENDS
# ─────────────────────────────────────────────────────────────────────────────

def _make_initials(name):
    """Generate 1–2 character initials from a display name."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


@app.route('/api/friends/request', methods=['POST'])
def send_friend_request():
    """Send a friend request.

    Body: { "receiver_id": <int> }

    Duplicate safety (two layers):
      1. API checks both directions before inserting.
      2. DB UniqueConstraint on (sender_id, receiver_id) as final guard.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    data        = request.get_json()
    receiver_id = data.get('receiver_id')
    sender_id   = session['user_id']

    if not receiver_id:
        return jsonify({'error': 'receiver_id is required'}), 400

    if receiver_id == sender_id:
        return jsonify({'error': 'You cannot send a friend request to yourself'}), 400

    # Check receiver exists
    receiver = User.query.get(receiver_id)
    if not receiver:
        return jsonify({'error': 'User not found'}), 404

    # Bidirectional duplicate check
    existing = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.sender_id == sender_id,   Friendship.receiver_id == receiver_id),
            db.and_(Friendship.sender_id == receiver_id, Friendship.receiver_id == sender_id),
        )
    ).first()

    if existing:
        if existing.status == 'accepted':
            return jsonify({'error': 'You are already friends'}), 409
        return jsonify({'error': 'A friend request already exists between these users'}), 409

    new_req = Friendship(sender_id=sender_id, receiver_id=receiver_id, status='pending')
    try:
        db.session.add(new_req)
        # Create notification for the receiver
        notif = Notification(
            user_id      = receiver_id,
            from_user_id = sender_id,
            type         = 'friend_request',
        )
        db.session.add(notif)
        db.session.commit()
        return jsonify({'message': f'Friend request sent to @{receiver.username}'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/friends', methods=['GET'])
def get_friends():
    """Return the current user's friends list and pending incoming requests.

    Response shape:
    {
      "friends":          [ { id, username, name, bio, initials } ],
      "pending_received": [ { friendship_id, id, username, name, bio, initials } ]
    }
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    me = session['user_id']

    # Accepted friendships — appear in BOTH directions
    accepted = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.sender_id   == me, Friendship.status == 'accepted'),
            db.and_(Friendship.receiver_id == me, Friendship.status == 'accepted'),
        )
    ).all()

    friends = []
    for f in accepted:
        other = f.receiver if f.sender_id == me else f.sender
        friends.append({
            'id':       other.id,
            'username': other.username,
            'name':     other.name,
            'bio':      other.bio or '',
            'initials': _make_initials(other.name),
        })

    # Pending requests received by me (I need to act on these)
    pending = Friendship.query.filter_by(receiver_id=me, status='pending').all()
    pending_received = []
    for f in pending:
        u = f.sender
        pending_received.append({
            'friendship_id': f.id,
            'id':            u.id,
            'username':      u.username,
            'name':          u.name,
            'bio':           u.bio or '',
            'initials':      _make_initials(u.name),
        })

    return jsonify({'friends': friends, 'pending_received': pending_received}), 200


@app.route('/api/friends/accept/<int:friendship_id>', methods=['POST'])
def accept_friend_request(friendship_id):
    """Accept a pending friend request.
    Only the receiver of the request is allowed to accept it.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    f = Friendship.query.get(friendship_id)
    if not f:
        return jsonify({'error': 'Friend request not found'}), 404

    if f.receiver_id != session['user_id']:
        return jsonify({'error': 'Forbidden — you are not the receiver of this request'}), 403

    if f.status != 'pending':
        return jsonify({'error': 'This request is not pending'}), 409

    f.status = 'accepted'
    # Create notification for the original sender (their request was accepted)
    notif = Notification(
        user_id      = f.sender_id,
        from_user_id = f.receiver_id,
        type         = 'friend_accepted',
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify({'message': f'You are now friends with @{f.sender.username}'}), 200


@app.route('/api/friends/decline/<int:friendship_id>', methods=['POST'])
def decline_friend_request(friendship_id):
    """Decline or cancel a friend request.
    Either the receiver (decline) or the sender (cancel/withdraw) can delete it.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    f = Friendship.query.get(friendship_id)
    if not f:
        return jsonify({'error': 'Friend request not found'}), 404

    me = session['user_id']
    if f.receiver_id != me and f.sender_id != me:
        return jsonify({'error': 'Forbidden'}), 403

    try:
        db.session.delete(f)
        db.session.commit()
        return jsonify({'message': 'Friend request removed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/notifications')
def get_notifications():
    """Return all unread notifications for the current user (used on page load)."""
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    notifs = (
        Notification.query
        .filter_by(user_id=session['user_id'], is_read=False)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return jsonify([_fmt_notif(n) for n in notifs]), 200


@app.route('/api/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    """Mark specific notification IDs as read.
    Body: { "ids": [1, 2, 3] }  — or omit to mark ALL unread as read.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    data = request.get_json() or {}
    ids  = data.get('ids')  # list of ints, or None

    q = Notification.query.filter_by(user_id=session['user_id'], is_read=False)
    if ids:
        q = q.filter(Notification.id.in_(ids))
    q.update({'is_read': True}, synchronize_session=False)
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@app.route('/api/notifications/stream')
def notification_stream():
    """Server-Sent Events endpoint for real-time notifications.

    The browser connects once via EventSource; this generator polls the DB
    every 5 seconds and pushes any new rows as SSE events.

    SSE protocol:
      id: <notif_id>         — browser sends Last-Event-ID on reconnect
      data: <json>           — notification payload
      : keepalive            — heartbeat comment (no event fired)
    """
    if 'user_id' not in session:
        return '', 401

    user_id  = session['user_id']
    # Priority: Last-Event-ID header (auto-sent by EventSource on reconnect)
    #           > ?after= query param  (sent by JS on first connection)
    #           > 0 (fresh start, no history)
    header_id = request.headers.get('Last-Event-ID', '').strip()
    param_id  = request.args.get('after', '').strip()
    last_id   = int(header_id or param_id or 0)


    def generate(uid, start_id):
        cursor = start_id
        while True:
            try:
                new_notifs = (
                    Notification.query
                    .filter(
                        Notification.user_id == uid,
                        Notification.is_read == False,
                        Notification.id > cursor,
                    )
                    .order_by(Notification.id.asc())
                    .all()
                )

                for n in new_notifs:
                    cursor = n.id
                    payload = json.dumps(_fmt_notif(n))
                    yield f'id: {n.id}\ndata: {payload}\n\n'

                if not new_notifs:
                    # Heartbeat — keeps the connection alive through proxies/browsers
                    yield ': keepalive\n\n'

            except Exception:
                yield ': error\n\n'
            finally:
                # Return the DB connection to the pool between sleeps
                db.session.remove()

            time.sleep(5)

    return Response(
        stream_with_context(generate(user_id, last_id)),
        content_type  = 'text/event-stream',
        headers       = {
            'Cache-Control':    'no-cache',
            'X-Accel-Buffering': 'no',       # disable nginx buffering
            'Connection':       'keep-alive',
        },
    )


def _fmt_notif(n):
    """Serialize a Notification row to a dict for JSON/SSE."""
    return {
        'id':             n.id,
        'type':           n.type,
        'from_name':      n.from_user.name,
        'from_username':  n.from_user.username,
        'from_initials':  _make_initials(n.from_user.name),
        'created_at':     n.created_at.isoformat(),
        'is_read':        n.is_read,
    }


if __name__ == '__main__':
    # threaded=True is required for concurrent SSE connections
    app.run(host='0.0.0.0', debug=True, port=5000, threaded=True)
