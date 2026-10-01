const Facility = require("../models/Facility");
const Building = require("../models/Building");

// Create Facility
const createFacility = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      building,
      location,
      status,
      operatingHours,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Facility name and type are required",
      });
    }

    // Check building if provided
    if (building) {
      const existingBuilding = await Building.findById(building);

      if (!existingBuilding) {
        return res.status(404).json({
          message: "Building not found",
        });
      }
    }

    const facility = await Facility.create({
      name,
      type,
      description,
      building: building || null,
      location,
      status,
      operatingHours,
    });

    res.status(201).json({
      message: "Facility created successfully",
      facility,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all Facilities
const getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find()
      .populate("building", "name code location")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: facilities.length,
      facilities,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Facility by ID
const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id).populate(
      "building",
      "name code location"
    );

    if (!facility) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.status(200).json({
      facility,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Facility
const updateFacility = async (req, res) => {
  try {
    const { building } = req.body;

    if (building) {
      const existingBuilding = await Building.findById(building);

      if (!existingBuilding) {
        return res.status(404).json({
          message: "Building not found",
        });
      }
    }

    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("building", "name code location");

    if (!facility) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.status(200).json({
      message: "Facility updated successfully",
      facility,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete Facility
const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndDelete(req.params.id);

    if (!facility) {
      return res.status(404).json({
        message: "Facility not found",
      });
    }

    res.status(200).json({
      message: "Facility deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
};