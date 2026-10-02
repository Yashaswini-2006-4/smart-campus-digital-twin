const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "classroom",
        "lab",
        "office",
        "seminar_hall",
        "auditorium",
        "library",
        "other",
      ],
      default: "classroom",
    },

    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },

    floor: {
      type: Number,
      default: 1,
      min: 0,
    },

    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "closed"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Room", roomSchema);