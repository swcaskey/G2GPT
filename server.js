// G2GPT Server - Express.js Application
// Main server file handling authentication and routing

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "./frontend")));

// ==================== Routes: HTML Pages ====================

// Landing page (home)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/home.html"));
});

// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/login.html"));
});

// Sign up page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/signup.html"));
});

// Dashboard (authenticated home page)
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/dashboard.html"));
});

// Logout confirmation page
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/logout.html"));
});

// ==================== Routes: API Endpoints ====================

// POST /signup - Create new user account
app.post("/signup", (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required."
    });
  }

  db.get(
    "SELECT * FROM users WHERE name = ? OR username = ?",
    [name, username],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error."
        });
      }

      if (!user) {
        db.run(
          "INSERT INTO users (name, username, password) VALUES (?, ?, ?)",
          [name, username, password],
          (err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Database error during registration."
              });
            }
            return res.status(201).json({
              success: true,
              message: "Account created successfully! You can now log in."
            });
          }
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "Name or username in use!"
        });
      }
    }
  );
});

// POST /login - Authenticate user
app.post("/login", (req, res) => {
  const { uname, psw } = req.body;

  if (!uname || !psw) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required."
    });
  }

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [uname, psw],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error."
        });
      }

      if (!user) {
        db.run(
          "INSERT INTO login_attempts (username, success) VALUES (?, ?)",
          [uname, 0]
        );

        return res.status(401).json({
          success: false,
          message: "Invalid username or password."
        });
      }

      db.run(
        "INSERT INTO login_attempts (username, success) VALUES (?, ?)",
        [uname, 1]
      );

      return res.status(200).json({
        success: true,
        message: `Login successful! Welcome, ${user.name}!`
      });
    }
  );
});

// GET /logins - Retrieve login history
app.get("/logins", (req, res) => {
  db.all(
    "SELECT * FROM login_attempts ORDER BY login_time DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Could not fetch login history."
        });
      }

      res.json({
        success: true,
        logins: rows
      });
    }
  );
});

// GET /api/health - Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running."
  });
});

// ==================== Server Initialization ====================

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
