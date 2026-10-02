const express = require("express");

const {
  createMaintenance,
  getMaintenanceTasks,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} = require("../controllers/maintenanceController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All maintenance routes require authentication
router.use(protect);

// Any authenticated user can view maintenance tasks
router.get("/", getMaintenanceTasks);
router.get("/:id", getMaintenanceById);

// Maintenance staff and admins can create tasks
router.post(
  "/",
  authorize("maintenance", "admin"),
  createMaintenance
);

// Maintenance staff and admins can update tasks
router.put(
  "/:id",
  authorize("maintenance", "admin"),
  updateMaintenance
);

// Only admins can delete maintenance tasks
router.delete(
  "/:id",
  authorize("admin"),
  deleteMaintenance
);

module.exports = router;