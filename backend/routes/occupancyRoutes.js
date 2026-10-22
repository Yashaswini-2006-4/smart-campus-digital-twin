const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Only a currently authenticated maintenance user can request old-record deletion.
router.delete(
  "/class-occupancy/delete-old",
  protect,
  authorize("maintenance"),
  async (req, res) => {
    const cutoffDate = String(req.body?.cutoff_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
      return res.status(400).json({ message: "A valid cutoff_date in YYYY-MM-DD format is required." });
    }

    const pythonApiUrl = (process.env.PYTHON_API_URL || "").replace(/\/+$/, "");
    const deleteSecret = process.env.OCCUPANCY_DELETE_SECRET || "";
    if (!pythonApiUrl || !deleteSecret) {
      console.error("PYTHON_API_URL or OCCUPANCY_DELETE_SECRET is not configured");
      return res.status(500).json({ message: "Occupancy deletion is not configured on the server." });
    }

    try {
      const upstream = await fetch(`${pythonApiUrl}/class-occupancy/delete-old`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Occupancy-Delete-Secret": deleteSecret,
        },
        body: JSON.stringify({ cutoff_date: cutoffDate }),
      });

      const raw = await upstream.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      if (!upstream.ok) {
        return res.status(upstream.status).json({
          message: data.detail || data.message || "Python occupancy service rejected the deletion request.",
        });
      }

      return res.json(data);
    } catch (error) {
      console.error("Old occupancy deletion failed:", error);
      return res.status(502).json({ message: "Could not reach the Python occupancy service." });
    }
  }
);

module.exports = router;
