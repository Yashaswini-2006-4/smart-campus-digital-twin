const express = require("express");

const {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} = require("../controllers/facilityController");

const router = express.Router();

router.post("/", createFacility);
router.get("/", getFacilities);
router.get("/:id", getFacilityById);
router.put("/:id", updateFacility);
router.delete("/:id", deleteFacility);

module.exports = router;