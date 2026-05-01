import requests
import sys

s = requests.Session()
# Assuming we can login
res = s.post('http://127.0.0.1:5000/api/login', json={'email': 'test@example.com', 'password': 'password'})
print(res.status_code, res.text)
if res.status_code == 200:
    res2 = s.get('http://127.0.0.1:5000/api/conversations')
    print("Conversations:", res2.status_code, res2.text)
