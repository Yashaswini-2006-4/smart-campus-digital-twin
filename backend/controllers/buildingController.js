const Building = require("../models/Building");

// Create a building
const createBuilding = async (req, res) => {
  try {
    const { name, code, location, floors } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Building name and code are required",
      });
    }

    const existingBuilding = await Building.findOne({ code });

    if (existingBuilding) {
      return res.status(400).json({
        message: "Building code already exists",
      });
    }

    const building = await Building.create({
      name,
      code,
      location,
      floors,
    });

    res.status(201).json({
      message: "Building created successfully",
      building,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all buildings
const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find().sort({ createdAt: -1 });

    res.status(200).json({
      count: buildings.length,
      buildings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get building by ID
const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    res.status(200).json({
      building,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update building
const updateBuilding = async (req, res) => {
  try {
    const building = await Building.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    res.status(200).json({
      message: "Building updated successfully",
      building,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete building
const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findByIdAndDelete(req.params.id);

    if (!building) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    res.status(200).json({
      message: "Building deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createBuilding,
  getBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
};