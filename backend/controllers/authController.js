
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ALLOWED_ROLES = new Set([
  "student",
  "faculty",
  "admin",
  "maintenance",
]);

// Register a new user.
// Public registration creates pending accounts; an administrator must assign a role.
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: "pending",
    });

    return res.status(201).json({
      message: "Registration received. Your account is awaiting role assignment by an administrator.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration failed:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Login using the account's actual database role.
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication configuration error",
      });
    }

    const user = await User.findOne({
      email: email.trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const assignedRole = String(user.role || "")
      .trim()
      .toLowerCase();

    if (assignedRole === "pending") {
      return res.status(403).json({
        message:
          "Your registration is pending. An administrator must assign your role before you can access the system.",
      });
    }

    if (!ALLOWED_ROLES.has(assignedRole)) {
      return res.status(403).json({
        message: "No valid role is assigned to this account",
      });
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        role: assignedRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: assignedRole,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Select a role only when it matches the role assigned
// to the authenticated user's database account.
const selectRole = async (req, res) => {
  try {
    const requestedRole =
      typeof req.body?.role === "string"
        ? req.body.role.trim().toLowerCase()
        : "";

    if (!ALLOWED_ROLES.has(requestedRole)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Authentication configuration error",
      });
    }

    // protect middleware loads this role from the database.
    const assignedRole = req.user?.role;

    if (!ALLOWED_ROLES.has(assignedRole)) {
      return res.status(403).json({
        message: "No valid role is assigned to this account",
      });
    }

    if (requestedRole !== assignedRole) {
      return res.status(403).json({
        message:
          "You can only select the role assigned to your account. Contact your administrator if your role is incorrect.",
      });
    }

    const token = jwt.sign(
      {
        userId: String(req.user.userId),
        role: assignedRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Role selected successfully",
      token,
      role: assignedRole,
    });
  } catch (error) {
    console.error("Role selection failed:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Return registrations that still need an administrator to assign a role.
const listPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "pending" })
      .select("name email createdAt")
      .sort({ createdAt: 1 });

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Unable to list pending users:", error);
    return res.status(500).json({ message: "Unable to load pending registrations" });
  }
};

// Only an existing authenticated admin can assign one of the supported roles.
const assignUserRole = async (req, res) => {
  try {
    const requestedRole =
      typeof req.body?.role === "string"
        ? req.body.role.trim().toLowerCase()
        : "";

    if (!ALLOWED_ROLES.has(requestedRole)) {
      return res.status(400).json({
        message: "Role must be student, faculty, admin, or maintenance",
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: "pending" },
      { $set: { role: requestedRole } },
      { new: true, runValidators: true },
    ).select("name email role");

    if (!user) {
      return res.status(404).json({
        message: "Pending registration not found. It may already have been assigned a role.",
      });
    }

    return res.status(200).json({
      message: `Role assigned successfully: ${requestedRole}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Unable to assign user role:", error);
    return res.status(500).json({ message: "Unable to assign role" });
  }
};

module.exports = {
  register,
  login,
  selectRole,
  listPendingUsers,
  assignUserRole,
};
