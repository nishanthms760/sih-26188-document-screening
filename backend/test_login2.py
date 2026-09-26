import sys, os
sys.path.append(os.path.abspath('D:/SIH 2026/sih-26188-document-screening/backend'))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login(email, password):
    resp = client.post('/api/auth/login', data={'username': email, 'password': password})
    print(f'Login attempt for {email} with password {password}')
    print('Status:', resp.status_code)
    try:
        print('JSON:', resp.json())
    except Exception as e:
        print('JSON parse error:', e)

if __name__ == '__main__':
    # Correct credentials
    test_login('officer@ssb.gov.in', 'officer123')
    # Incorrect password
    test_login('officer@ssb.gov.in', 'wrongpass')
    # Correct admin
    test_login('admin@ssb.gov.in', 'admin123')
    # Correct analyst
    test_login('analyst@ssb.gov.in', 'analyst123')
