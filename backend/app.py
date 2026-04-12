from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__, template_folder='../frontend/html', static_folder='../frontend')

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

if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True, port=5000)