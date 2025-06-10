from flask import Flask, render_template, request, redirect, session, url_for, jsonify, flash, Response
import requests
import firebase_admin
from firebase_admin import credentials, auth
import os
from firebase_config import db  
from firebase_admin import firestore
import speech_recognition as sr
import json
import bcrypt

app = Flask(__name__)
app.secret_key = 'your_secret_key'

firebase_config = os.getenv('FIREBASE_CONFIG')

if firebase_config:
    cred_dict = json.loads(firebase_config)
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate('serviceAccountKey.json')  # fallback if running locally

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Route: Home
@app.route('/')
def home():
    text = request.args.get('text', '')
    return render_template('home.html', text=text)


# Route: Login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        try:
            users_ref = db.collection('users')
            query = users_ref.where('email', '==', email).stream()

            user_doc = None
            for doc in query:
                user_doc = doc
                break

            if not user_doc:
                flash("User not found. Please sign up first.", "error")
                return redirect(url_for('login'))

            user_data = user_doc.to_dict()
            if bcrypt.checkpw(password.encode('utf-8'), user_data['password'].encode('utf-8')):
                session['user_id'] = user_doc.id
                session['username'] = user_data['username']
                session['email'] = user_data['email']

                return redirect(url_for('home'))
            else:
                flash("Login failed: Incorrect password", "error")
                return redirect(url_for('login'))
        except Exception as e:
            return f"Error: {str(e)}"
    return render_template('login.html')

# Route: Signup
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        try:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=username
            )
            print(f"User Created: {user.uid}")

            user_data = {
                "username": username,
                "email": email,
                "password": hashed_password.decode('utf-8'),
                "createdAt": firestore.SERVER_TIMESTAMP
            }

            db.collection('users').document(user.uid).set(user_data)
            print(f"User data written to Firestore for UID: {user.uid}")

            return redirect('/login')

        except Exception as e:
            print(f"Error during signup: {e}")
            return f"Error creating user: {str(e)}"

    return render_template('signup.html')

# Route: Logout
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    return render_template('feedback.html')

# Route: Test Firebase
@app.route('/test-firebase')
def test_firebase():
    try:
        from firebase_admin import firestore

        db = firestore.client()

        test_data = {
            "status": "working",
            "timestamp": "2025-03-01"
        }
        db.collection("test").document("connection_test").set(test_data)

        doc = db.collection("test").document("connection_test").get()
        if doc.exists:
            return jsonify({"success": True, "data": doc.to_dict()})
        else:
            return jsonify({"success": False, "error": "Document not found"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# Route: Dashboard
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('home.html')

# Route: Save History
@app.route('/save-history', methods=['POST'])
def save_history():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'User not logged in'})

    data = request.json
    text = data.get('text', '')

    if not text.strip():
        return jsonify({'success': False, 'error': 'Text is empty'})

    try:
        user_id = session['user_id']

        history_entry = {
            'text': text,
            'timestamp': firestore.SERVER_TIMESTAMP
        }

        db.collection('users').document(user_id).collection('history').add(history_entry)

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Route: History
@app.route('/history')
def history():
    if 'user_id' not in session:
        return redirect('/login')

    user_id = session['user_id']
    history_ref = db.collection('users').document(user_id).collection('history').order_by('timestamp', direction=firestore.Query.DESCENDING)
    history_docs = history_ref.stream()

    history_list = []
    for doc in history_docs:
        history_list.append(doc.to_dict())

    return render_template('history.html', history=history_list)

if __name__ == '__main__':
    app.run(debug=True)
