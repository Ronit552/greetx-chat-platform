import sys
from app import app, db, User

with app.app_context():
    client = app.test_client()
    user = User.query.first()
    if not user:
        print("No users")
        sys.exit(1)
    
    with client.session_transaction() as sess:
        sess['user_id'] = user.id
    
    res = client.get('/api/conversations')
    print("Status:", res.status_code)
    print("Data:", res.get_data(as_text=True))
