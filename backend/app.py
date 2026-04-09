from flask import Flask, render_template

app = Flask(__name__, template_folder='../frontend/html', static_folder='../frontend')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
