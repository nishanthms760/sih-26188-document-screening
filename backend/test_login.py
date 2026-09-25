from fastapi.testclient import TestClient
import sys, os
# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.main import app
client = TestClient(app)
response = client.post('/api/auth/login', data={'username': 'officer@ssb.gov.in', 'password': 'officer123'})
print('Status code:', response.status_code)
print('Response JSON:', response.json())
