const Building = require("../models/Building");
const Department = require("../models/Department");
const Room = require("../models/Room");
const Facility = require("../models/Facility");
const Complaint = require("../models/Complaint");
const Maintenance = require("../models/Maintenance");

// Get complete Digital Twin overview
const getDigitalTwinOverview = async (req, res) => {
  try {
    // Run database queries in parallel
    const [
      buildings,
      departments,
      rooms,
      facilities,
      activeComplaints,
      urgentComplaints,
      activeMaintenance,
      completedMaintenanceCount,
    ] = await Promise.all([
      Building.find()
        .select("name code description location floors status")
        .sort({ name: 1 }),

      Department.find()
        .populate("building", "name code")
        .select("name code description building head")
        .sort({ name: 1 }),

      Room.find()
        .populate("building", "name code location")
        .populate("department", "name code")
        .select(
          "name roomNumber type building department capacity floor status"
        )
        .sort({ roomNumber: 1 }),

      Facility.find()
        .populate("building", "name code location")
        .select(
          "name type description building location status operatingHours"
        )
        .sort({ name: 1 }),

      Complaint.find({
        status: {
          $in: ["pending", "assigned", "in_progress"],
        },
      })
        .populate("reportedBy", "name email role")
        .populate("assignedTo", "name email role")
        .select(
          "title description category location reportedBy assignedTo status priority createdAt"
        )
        .sort({ priority: -1, createdAt: -1 }),

      Complaint.find({
        status: {
          $in: ["pending", "assigned", "in_progress"],
        },
        priority: "urgent",
      })
        .populate("reportedBy", "name email role")
        .populate("assignedTo", "name email role")
        .select(
          "title description category location reportedBy assignedTo status priority createdAt"
        )
        .sort({ createdAt: -1 }),

      Maintenance.find({
        status: {
          $in: ["assigned", "in_progress"],
        },
      })
        .populate("complaint", "title category location priority")
        .populate("assignedTo", "name email role")
        .select(
          "complaint assignedTo taskDescription status scheduledDate notes createdAt"
        )
        .sort({ scheduledDate: 1 }),

      Maintenance.countDocuments({
        status: "completed",
      }),
    ]);

    // Build campus hierarchy
    const campusHierarchy = buildings.map((building) => {
      const buildingDepartments = departments.filter(
        (department) =>
          department.building &&
          department.building._id.toString() === building._id.toString()
      );

      const buildingRooms = rooms.filter(
        (room) =>
          room.building &&
          room.building._id.toString() === building._id.toString()
      );

      const buildingFacilities = facilities.filter(
        (facility) =>
          facility.building &&
          facility.building._id.toString() === building._id.toString()
      );

      return {
        building,
        departments: buildingDepartments,
        rooms: buildingRooms,
        facilities: buildingFacilities,
      };
    });

    res.status(200).json({
      campus: "Smart Campus",

      statistics: {
        buildings: buildings.length,
        departments: departments.length,
        rooms: rooms.length,
        facilities: facilities.length,
        activeComplaints: activeComplaints.length,
        urgentComplaints: urgentComplaints.length,
        activeMaintenanceTasks: activeMaintenance.length,
        completedMaintenanceTasks: completedMaintenanceCount,
      },

      campusHierarchy,

      liveStatus: {
        rooms: rooms.map((room) => ({
          id: room._id,
          name: room.name,
          roomNumber: room.roomNumber,
          status: room.status,
          capacity: room.capacity,
          floor: room.floor,
          building: room.building,
          department: room.department,
        })),

        facilities: facilities.map((facility) => ({
          id: facility._id,
          name: facility.name,
          type: facility.type,
          status: facility.status,
          location: facility.location,
          building: facility.building,
          operatingHours: facility.operatingHours,
        })),
      },

      alerts: {
        activeComplaints,
        urgentComplaints,
      },

      maintenance: {
        activeTasks: activeMaintenance,
        completedTasks: completedMaintenanceCount,
      },

      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Digital Twin error:", error);

    res.status(500).json({
      message: "Failed to fetch digital twin overview",
      error: error.message,
    });
  }
};

module.exports = {
  getDigitalTwinOverview,
};