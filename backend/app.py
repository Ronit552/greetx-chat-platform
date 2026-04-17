from flask import Flask, render_template, send_from_directory, request, jsonify
import os
import random
import string
from datetime import datetime, timedelta
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from models import db, User, OTP

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
    return render_template('profile.html')

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
        
    return jsonify({'message': 'OTP Login successful', 'user_id': user.id, 'username': user.username}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000, ssl_context='adhoc') #https enabled