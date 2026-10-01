const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const buildingRoutes = require("./routes/buildingRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const roomRoutes = require("./routes/roomRoutes");
const facilityRoutes = require("./routes/facilityRoutes");
const digitalTwinRoutes = require("./routes/digitalTwinRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/digital-twin", digitalTwinRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Smart Campus Digital Twin API is running 🚀",
  });
});

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});