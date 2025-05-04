from flask import Flask, jsonify, request
import sqlite3

app = Flask(__name__)

# Database setup
def init_db():
    conn = sqlite3.connect('database/database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            balance INTEGER DEFAULT 100
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/spin', methods=['POST'])
def spin():
    data = request.json
    username = data.get('username')

    conn = sqlite3.connect('database/database.db')
    cursor = conn.cursor()

    # Check user balance
    cursor.execute('SELECT balance FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    if not result:
        return jsonify({"error": "User not found"}), 404

    balance = result[0]
    if balance <= 0:
        return jsonify({"error": "Insufficient balance"}), 400

    # Spin logic
    import random
    win = random.choice([True, False])
    amount = random.randint(1, 50)

    if win:
        balance += amount
        message = f'You won ${amount}!'
    else:
        balance -= amount
        message = f'You lost ${amount}!'

    # Update balance
    cursor.execute('UPDATE users SET balance = ? WHERE username = ?', (balance, username))
    conn.commit()
    conn.close()

    return jsonify({"message": message, "balance": balance})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)