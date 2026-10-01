const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "wifi",
        "parking",
        "cafeteria",
        "washroom",
        "sports",
        "medical",
        "library",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      default: null,
    },

    location: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["available", "unavailable", "maintenance"],
      default: "available",
    },

    operatingHours: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Facility", facilitySchema);