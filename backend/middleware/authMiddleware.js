
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ALLOWED_ROLES = new Set([
  "student",
  "faculty",
  "admin",
  "maintenance",
]);

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Authentication configuration error",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  if (
    typeof decoded !== "object" ||
    !decoded ||
    !decoded.userId
  ) {
    return res.status(401).json({
      message: "Invalid authentication token",
    });
  }

  try {
    // Always load the user's actual role from the database.
    // Never trust a role supplied only by a JWT.
    const user = await User.findById(decoded.userId)
      .select("_id role");

    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    const assignedRole = String(user.role || "")
      .trim()
      .toLowerCase();

    if (!ALLOWED_ROLES.has(assignedRole)) {
      return res.status(403).json({
        message: "No valid role is assigned to this account",
      });
    }

    // Replace the token's role claim with the database role.
    req.user = {
      ...decoded,
      userId: String(user._id),
      role: assignedRole,
    };

    return next();
  } catch (error) {
    console.error("Authentication verification failed:", error);

    return res.status(500).json({
      message: "Unable to verify account permissions",
    });
  }
};

module.exports = {
  protect,
};
