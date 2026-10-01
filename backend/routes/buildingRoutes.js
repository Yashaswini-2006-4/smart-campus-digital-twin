const express = require("express");

const {
  createBuilding,
  getBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
} = require("../controllers/buildingController");

const router = express.Router();

router.post("/", createBuilding);
router.get("/", getBuildings);
router.get("/:id", getBuildingById);
router.put("/:id", updateBuilding);
router.delete("/:id", deleteBuilding);

module.exports = router;