const Complaint = require("../models/Complaint");
const User = require("../models/User");

// Create Complaint
const createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      priority,
    } = req.body;

    // Check required fields
    if (!title || !description || !location) {
      return res.status(400).json({
        message: "Title, description and location are required",
      });
    }

    // Get the logged-in user from JWT
    const reportedBy = req.user.userId;

    // Make sure the logged-in user still exists
    const user = await User.findById(reportedBy);

    if (!user) {
      return res.status(404).json({
        message: "Authenticated user not found",
      });
    }

    // Create complaint using authenticated user
    const complaint = await Complaint.create({
      title,
      description,
      category,
      location,
      reportedBy,
      priority,
    });

    // Return populated complaint
    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role");

    res.status(201).json({
      message: "Complaint created successfully",
      complaint: populatedComplaint,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all complaints
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get complaint by ID
const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      complaint,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update complaint
const updateComplaint = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    // Validate assigned user if provided
    if (assignedTo) {
      const user = await User.findById(assignedTo);

      if (!user) {
        return res.status(404).json({
          message: "Assigned user not found",
        });
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete complaint
const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
};