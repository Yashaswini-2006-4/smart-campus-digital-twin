const express = require("express");

const {
  register,
  login,
  selectRole,
  listPendingUsers,
  assignUserRole,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Select role for the current authenticated session
router.post("/select-role", protect, selectRole);

// Role assignment is restricted to an already-authorized administrator.
router.get("/pending-users", protect, authorize("admin"), listPendingUsers);
router.patch("/users/:userId/role", protect, authorize("admin"), assignUserRole);

module.exports = router;