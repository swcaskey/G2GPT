const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "./frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/home.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/signup.html"));
});

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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running."
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
