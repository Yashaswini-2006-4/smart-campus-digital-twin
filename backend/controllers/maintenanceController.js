const Maintenance = require("../models/Maintenance");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

// Create maintenance task
const createMaintenance = async (req, res) => {
  try {
    const {
      complaint,
      assignedTo,
      taskDescription,
      scheduledDate,
      notes,
    } = req.body;

    if (!complaint || !assignedTo || !taskDescription) {
      return res.status(400).json({
        message:
          "Complaint, assignedTo and taskDescription are required",
      });
    }

    const existingComplaint = await Complaint.findById(complaint);

    if (!existingComplaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return res.status(404).json({
        message: "Assigned user not found",
      });
    }

    const maintenance = await Maintenance.create({
      complaint,
      assignedTo,
      taskDescription,
      scheduledDate,
      notes,
    });

    // Update complaint status
    existingComplaint.assignedTo = assignedTo;
    existingComplaint.status = "assigned";

    await existingComplaint.save();

    const populatedMaintenance = await Maintenance.findById(
      maintenance._id
    )
      .populate(
        "complaint",
        "title category location priority status resolvedAt"
      )
      .populate("assignedTo", "name email role");

    res.status(201).json({
      message: "Maintenance task created successfully",
      maintenance: populatedMaintenance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all maintenance tasks
const getMaintenanceTasks = async (req, res) => {
  try {
    const tasks = await Maintenance.find()
      .populate(
        "complaint",
        "title category location priority status resolvedAt"
      )
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get maintenance task by ID
const getMaintenanceById = async (req, res) => {
  try {
    const task = await Maintenance.findById(req.params.id)
      .populate(
        "complaint",
        "title category location priority status resolvedAt"
      )
      .populate("assignedTo", "name email role");

    if (!task) {
      return res.status(404).json({
        message: "Maintenance task not found",
      });
    }

    res.status(200).json({
      maintenance: task,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update maintenance task
const updateMaintenance = async (req, res) => {
  try {
    // Get the existing task first
    const existingTask = await Maintenance.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({
        message: "Maintenance task not found",
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
    };

    // Automatically record completion time
    if (req.body.status === "completed") {
      updateData.completedAt = new Date();
    }

    // Update maintenance task
    const updatedTask = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    // Determine complaint status
    let complaintStatus = "assigned";

    if (updatedTask.status === "in_progress") {
      complaintStatus = "in_progress";
    }

    if (updatedTask.status === "completed") {
      complaintStatus = "resolved";
    }

    // Update linked complaint
    await Complaint.findByIdAndUpdate(
      existingTask.complaint,
      {
        status: complaintStatus,
        ...(updatedTask.status === "completed"
          ? {
              resolvedAt: new Date(),
            }
          : {}),
      }
    );

    // Fetch the updated task with populated data
    const populatedTask = await Maintenance.findById(
      updatedTask._id
    )
      .populate(
        "complaint",
        "title category location priority status resolvedAt"
      )
      .populate("assignedTo", "name email role");

    res.status(200).json({
      message: "Maintenance task updated successfully",
      maintenance: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete maintenance task
const deleteMaintenance = async (req, res) => {
  try {
    const task = await Maintenance.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Maintenance task not found",
      });
    }

    res.status(200).json({
      message: "Maintenance task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createMaintenance,
  getMaintenanceTasks,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
};