const express = require("express");

const {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} = require("../controllers/facilityController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All facility routes require authentication
router.use(protect);

// Anyone authenticated can view facilities
router.get("/", getFacilities);
router.get("/:id", getFacilityById);

// Only admins can modify facilities
router.post("/", authorize("admin"), createFacility);
router.put("/:id", authorize("admin"), updateFacility);
router.delete("/:id", authorize("admin"), deleteFacility);

module.exports = router;