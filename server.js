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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error."
        });
      }

      if (user) {
        return res.status(400).json({
          success: false,
          message: "Email already in use."
        });
      }

      db.run(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        [email, password],
        (err) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: "Database error during registration."
            });
          }
          return res.status(201).json({
            success: true,
            message: "Account created successfully!"
          });
        }
      );
    }
  );
});

// POST /login - Authenticate user
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error."
        });
      }

      if (!user) {
        db.run(
          "INSERT INTO login_attempts (email, success) VALUES (?, ?)",
          [email, 0]
        );

        return res.status(401).json({
          success: false,
          message: "Invalid email or password."
        });
      }

      db.run(
        "INSERT INTO login_attempts (email, success) VALUES (?, ?)",
        [email, 1]
      );

      return res.status(200).json({
        success: true,
        message: "Login successful!"
      });
    }
  );
});

// POST /logout - End user session
app.post("/logout", (req, res) => {
  // In a real application, this would clear session/token
  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
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
