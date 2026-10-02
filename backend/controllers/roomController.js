const Room = require("../models/Room");
const Building = require("../models/Building");
const Department = require("../models/Department");

// Create a room
const createRoom = async (req, res) => {
  try {
    const {
      name,
      roomNumber,
      type,
      building,
      department,
      capacity,
      floor,
      status,
    } = req.body;

    if (!name || !roomNumber || !building) {
      return res.status(400).json({
        message: "Name, room number and building are required",
      });
    }

    // Check building
    const existingBuilding = await Building.findById(building);

    if (!existingBuilding) {
      return res.status(404).json({
        message: "Building not found",
      });
    }

    // Check department if provided
    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found",
        });
      }
    }

    const room = await Room.create({
      name,
      roomNumber,
      type,
      building,
      department: department || null,
      capacity,
      floor,
      status,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all rooms
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("building", "name code location")
      .populate("department", "name code")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("building", "name code location")
      .populate("department", "name code");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { building, department } = req.body;

    // Validate building if being changed
    if (building) {
      const existingBuilding = await Building.findById(building);

      if (!existingBuilding) {
        return res.status(404).json({
          message: "Building not found",
        });
      }
    }

    // Validate department if being changed
    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found",
        });
      }
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("building", "name code location")
      .populate("department", "name code");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      message: "Room deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};