import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

# Test write
db.collection('users').document('test_user').set({
    'username': 'TestUser',
    'email': 'test@example.com',
    'createdAt': firestore.SERVER_TIMESTAMP
})

print("Test document written successfully.")

#test
