const express = require("express");

const {
  register,
  login,
  selectRole,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Select role for the current authenticated session
router.post("/select-role", protect, selectRole);

module.exports = router;