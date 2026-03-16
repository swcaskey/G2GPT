const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Mock database to store registered users
// Pre-populated with 'testuser' to satisfy Scenario 3 which assumes the user already exists
const users = [
    { username: 'testuser', password: 'testpass123' }
];

// Routing for the dummy application pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logout.html'));
});

// Form submission endpoints to handle redirects
app.post('/register_action', (req, res) => {
    const { username, password } = req.body;
    
    // Check if user already exists
    const userExists = users.some(u => u.username === username);
    
    if (userExists) {
        // Redirect back to signup with error
        res.redirect('/signup?error=UsernameTaken');
    } else if (username && password) {
        users.push({ username, password });
        // Mimic successful sign up and redirect to login
        res.redirect('/login');
    } else {
        res.redirect('/signup');
    }
});

app.post('/login_action', (req, res) => {
    const { username, password } = req.body;
    
    // Check if the user exists in our mock database
    const userMatch = users.find(u => u.username === username && u.password === password);
    
    if (userMatch) {
        // Mimic successful login and redirect to home
        res.redirect('/home');
    } else {
        // Redirect back to login with an error query parameter
        res.redirect('/login?error=InvalidCredentials');
    }
});

app.post('/logout_action', (req, res) => {
    // Mimic logout confirmation
    if (req.body.confirm === 'yes') {
        res.redirect('/');
    } else {
        res.redirect('/home');
    }
});

app.listen(port, () => {
    console.log(`Dummy server running at http://localhost:${port}`);
});
