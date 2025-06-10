import firebase_admin
from firebase_admin import credentials, firestore, auth

# Path to your service account key JSON file
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

# Initialize Firestore DB
db = firestore.client()

#firebase_config = {
#  "apiKey": "AIzaSyCUmcLjc5chy7IgsfRW9NsmO2BgpdUd0_E",
#  "authDomain": "sign-converter-f0a13.firebaseapp.com",
 # "projectId": "sign-converter-f0a13",
  #"storageBucket": "sign-converter-f0a13.firebasestorage.app",
 # "3messagingSenderId": "286643495309",
  #"appId": "1:286643495309:web:389820beb4f4799a5b5dc4",
  #"measurementId": "G-DX4E4RB5Z9"
#}

