import express from "express";
import { AgendaCheckIn } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get agenda with check-in status for user
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("=== AGENDA ROUTE DEBUG ===");
    console.log("req.user:", req.user);
    console.log("userId from token:", userId);

    // Get all check-ins for the user
    console.log("Fetching check-ins for userId:", userId);
    const userCheckIns = await AgendaCheckIn.findAll({
      where: { userId },
      attributes: [
        "day",
        "itemIndex",
        "isParallel",
        "time",
        "title",
        "checkedInAt",
      ],
      raw: true, // Get plain objects instead of Sequelize instances
    });
    console.log("Found userCheckIns:", userCheckIns);

    // Get check-in counts for all agenda items (aggregated)
    const checkInCounts = await AgendaCheckIn.findAll({
      attributes: [
        "day",
        "itemIndex",
        "isParallel",
        [
          AgendaCheckIn.sequelize.fn(
            "COUNT",
            AgendaCheckIn.sequelize.col("id")
          ),
          "count",
        ],
      ],
      group: ["day", "itemIndex", "isParallel"],
      raw: true,
    });

    // Create objects for quick lookup
    const userCheckInMap = {};
    userCheckIns.forEach((checkIn) => {
      const key = `${checkIn.day}-${checkIn.itemIndex}-${checkIn.isParallel}`;
      userCheckInMap[key] = checkIn;
    });

    const checkInCountMap = {};
    checkInCounts.forEach((item) => {
      const key = `${item.day}-${item.itemIndex}-${item.isParallel}`;
      checkInCountMap[key] = parseInt(item.count);
    });

    res.json({
      success: true,
      data: {
        userCheckIns: userCheckInMap,
        checkInCounts: checkInCountMap,
      },
    });
  } catch (error) {
    logger.error("Error fetching agenda:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agenda data",
    });
  }
});

// Check in to an agenda item
router.post("/checkin", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { day, itemIndex, isParallel = false, time, title } = req.body;

    // Validate required fields
    if (day === undefined || itemIndex === undefined || !time || !title) {
      logger.error("Missing required fields:", { day, itemIndex, time, title });
      return res.status(400).json({
        success: false,
        message: "Missing required fields: day, itemIndex, time, title",
      });
    }

    // Check if user already checked in
    const existingCheckIn = await AgendaCheckIn.findOne({
      where: {
        userId,
        day,
        itemIndex,
        isParallel,
      },
    });

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: "Already checked in to this agenda item",
      });
    }

    // Create check-in
    const checkIn = await AgendaCheckIn.create({
      userId,
      day,
      itemIndex,
      isParallel,
      time,
      title,
    });

    // Get updated count for this agenda item
    const checkInCount = await AgendaCheckIn.count({
      where: {
        day,
        itemIndex,
        isParallel,
      },
    });

    logger.info(`User ${userId} checked in to agenda item: ${title}`, {
      userId,
      day,
      itemIndex,
      isParallel,
      time,
      title,
      checkInCount,
    });

    res.json({
      success: true,
      message: "Successfully checked in",
      data: {
        checkIn: {
          id: checkIn.id,
          day: checkIn.day,
          itemIndex: checkIn.itemIndex,
          isParallel: checkIn.isParallel,
          time: checkIn.time,
          title: checkIn.title,
          checkedInAt: checkIn.checkedInAt,
        },
        checkInCount,
      },
    });
  } catch (error) {
    logger.error("Error checking in to agenda:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check in",
    });
  }
});

// Get check-in statistics (admin only)
router.get("/stats", authenticate, async (req, res) => {
  try {
    // Check if user is admin (you can implement admin check here)
    // For now, we'll allow all authenticated users to see stats

    const stats = await AgendaCheckIn.findAll({
      attributes: [
        "day",
        "itemIndex",
        "isParallel",
        "time",
        "title",
        [
          AgendaCheckIn.sequelize.fn(
            "COUNT",
            AgendaCheckIn.sequelize.col("id")
          ),
          "checkInCount",
        ],
      ],
      group: ["day", "itemIndex", "isParallel", "time", "title"],
      order: [
        ["day", "ASC"],
        ["itemIndex", "ASC"],
        ["isParallel", "ASC"],
      ],
      raw: true,
    });

    // Get total check-ins
    const totalCheckIns = await AgendaCheckIn.count();

    // Get unique users who checked in
    const uniqueUsers = await AgendaCheckIn.count({
      distinct: true,
      col: "userId",
    });

    res.json({
      success: true,
      data: {
        stats,
        summary: {
          totalCheckIns,
          uniqueUsers,
          totalAgendaItems: stats.length,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching agenda stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agenda statistics",
    });
  }
});

export default router;
