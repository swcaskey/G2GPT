// G2GPT Database Configuration
// SQLite3 database setup with user authentication tables

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "login.db");

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create tables and insert default test data
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);

  // Login attempts table (for tracking authentication history)
  db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      success INTEGER NOT NULL,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default test users
  db.run(`
    INSERT OR IGNORE INTO users (username, password, name)
    VALUES
      ('tarun123', 'rutgers2026', 'Tarun'),
      ('student1', 'password123', 'Student One'),
      ('admin', 'admin123', 'Admin User')
  `);
});

module.exports = db;
