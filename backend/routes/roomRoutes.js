const express = require("express");

const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All room routes require authentication
router.use(protect);

// Anyone authenticated can view rooms
router.get("/", getRooms);
router.get("/:id", getRoomById);

// Only admins can modify rooms
router.post("/", authorize("admin"), createRoom);
router.put("/:id", authorize("admin"), updateRoom);
router.delete("/:id", authorize("admin"), deleteRoom);

module.exports = router;