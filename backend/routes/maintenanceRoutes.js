const express = require("express");

const {
  createMaintenance,
  getMaintenanceTasks,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
} = require("../controllers/maintenanceController");

const router = express.Router();

// Create maintenance task
router.post("/", createMaintenance);

// Get all maintenance tasks
router.get("/", getMaintenanceTasks);

// Get maintenance task by ID
router.get("/:id", getMaintenanceById);

// Update maintenance task
router.put("/:id", updateMaintenance);

// Delete maintenance task
router.delete("/:id", deleteMaintenance);

module.exports = router;