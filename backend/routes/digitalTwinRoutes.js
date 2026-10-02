const express = require("express");

const {
  getDigitalTwinOverview,
} = require("../controllers/digitalTwinController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Digital Twin data requires authentication
router.use(protect);

// Read-only Digital Twin overview
router.get("/overview", getDigitalTwinOverview);

module.exports = router;