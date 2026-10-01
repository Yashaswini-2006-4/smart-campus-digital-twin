const express = require("express");

const {
  createBuilding,
  getBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
} = require("../controllers/buildingController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All building routes require authentication
router.use(protect);

// Anyone authenticated can view buildings
router.get("/", getBuildings);
router.get("/:id", getBuildingById);

// Only admins can modify buildings
router.post("/", authorize("admin"), createBuilding);
router.put("/:id", authorize("admin"), updateBuilding);
router.delete("/:id", authorize("admin"), deleteBuilding);

module.exports = router;