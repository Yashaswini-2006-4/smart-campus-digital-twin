const express = require("express");

const {
  getDigitalTwinOverview,
} = require("../controllers/digitalTwinController");

const router = express.Router();

router.get("/overview", getDigitalTwinOverview);

module.exports = router;