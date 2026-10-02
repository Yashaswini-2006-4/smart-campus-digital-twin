const express = require("express");

const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
} = require("../controllers/complaintController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All complaint routes require authentication
router.use(protect);

// Authenticated users can view complaints
router.get("/", getComplaints);
router.get("/:id", getComplaintById);

// Students, faculty and admins can create complaints
router.post(
  "/",
  authorize("student", "faculty", "admin"),
  createComplaint
);

// Admins and maintenance staff can update complaints
router.put(
  "/:id",
  authorize("admin", "maintenance"),
  updateComplaint
);

// Only admins can delete complaints
router.delete(
  "/:id",
  authorize("admin"),
  deleteComplaint
);

module.exports = router;