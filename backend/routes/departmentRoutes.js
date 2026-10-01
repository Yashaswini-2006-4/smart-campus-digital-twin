const express = require("express");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All department routes require authentication
router.use(protect);

// Anyone authenticated can view departments
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);

// Only admins can modify departments
router.post("/", authorize("admin"), createDepartment);
router.put("/:id", authorize("admin"), updateDepartment);
router.delete("/:id", authorize("admin"), deleteDepartment);

module.exports = router;