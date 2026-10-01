const Department = require("../models/Department");
const Building = require("../models/Building");

// Create a department
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, building, head } = req.body;

    if (!name || !code || !building) {
      return res.status(400).json({
        message: "Name, code and building are required",
      });
    }

    // Check whether the building exists
    const existingBuilding = await Building.findById(building);

    if (!existingBuilding) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    // Check duplicate department code
    const existingDepartment = await Department.findOne({ code });

    if (existingDepartment) {
      return res.status(400).json({
        message: "Department code already exists",
      });
    }

    const department = await Department.create({
      name,
      code,
      description,
      building,
      head,
    });

    res.status(201).json({
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("building", "name code location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: departments.length,
      departments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate(
      "building",
      "name code location"
    );

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.status(200).json({
      department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { building } = req.body;

    // If building is being changed, verify it exists
    if (building) {
      const existingBuilding = await Building.findById(building);

      if (!existingBuilding) {
        return res.status(404).json({
          message: "Building not found",
        });
      }
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("building", "name code location");

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.status(200).json({
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.status(200).json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};