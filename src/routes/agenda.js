import express from "express";
import { AgendaCheckIn, Agenda } from "../models/index.js";
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

    // Get all agenda items
    const agendaItems = await Agenda.findAll({
      where: { isActive: true },
      order: [
        ["day", "ASC"],
        ["itemIndex", "ASC"],
        ["isParallel", "ASC"],
      ],
      raw: true,
    });

    // Get all check-ins for the user
    console.log("Fetching check-ins for userId:", userId);
    const userCheckIns = await AgendaCheckIn.findAll({
      where: { userId },
      attributes: ["agendaId", "checkedInAt"],
      raw: true,
    });

    // Get check-in counts for all agenda items (aggregated)
    const checkInCounts = await AgendaCheckIn.findAll({
      attributes: [
        "agendaId",
        [
          AgendaCheckIn.sequelize.fn(
            "COUNT",
            AgendaCheckIn.sequelize.col("id")
          ),
          "count",
        ],
      ],
      group: ["agendaId"],
      raw: true,
    });

    // Create objects for quick lookup
    const userCheckInMap = {};
    userCheckIns.forEach((checkIn) => {
      userCheckInMap[checkIn.agendaId] = checkIn;
    });

    const checkInCountMap = {};
    checkInCounts.forEach((item) => {
      checkInCountMap[item.agendaId] = parseInt(item.count);
    });

    // Organize agenda data by day
    const agendaByDay = {};
    agendaItems.forEach((item) => {
      if (!agendaByDay[item.day]) {
        agendaByDay[item.day] = {
          day: item.day,
          items: [],
          parallel: [],
        };
      }

      const checkInCount = checkInCountMap[item.id] || 0;
      const isFull = item.checkInLimit
        ? checkInCount >= item.checkInLimit
        : false;

      const agendaItem = {
        id: item.id,
        time: item.time,
        title: item.title,
        requiresCheckIn: item.requiresCheckIn,
        checkedIn: !!userCheckInMap[item.id],
        checkInCount: checkInCount,
        checkInLimit: item.checkInLimit,
        isFull: isFull,
      };

      if (item.isParallel) {
        agendaByDay[item.day].parallel.push(agendaItem);
      } else {
        agendaByDay[item.day].items.push(agendaItem);
      }
    });

    // Convert to array format
    const agendaData = Object.values(agendaByDay).sort((a, b) => {
      const dayA = parseInt(a.day.replace("Day ", ""));
      const dayB = parseInt(b.day.replace("Day ", ""));
      return dayA - dayB;
    });

    res.json({
      success: true,
      data: agendaData,
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
    const { agendaId } = req.body;

    // Validate required fields
    if (!agendaId) {
      logger.error("Missing required field:", { agendaId });
      return res.status(400).json({
        success: false,
        message: "Missing required field: agendaId",
      });
    }

    // Get the agenda item to check limits
    const agendaItem = await Agenda.findByPk(agendaId);

    if (!agendaItem) {
      return res.status(404).json({
        success: false,
        message: "Agenda item not found",
      });
    }

    // Check if user already checked in
    const existingCheckIn = await AgendaCheckIn.findOne({
      where: {
        userId,
        agendaId,
      },
    });

    if (existingCheckIn) {
      return res.status(400).json({
        success: false,
        message: "Already checked in to this agenda item",
      });
    }

    // Check if check-in limit is reached
    if (agendaItem.checkInLimit) {
      const currentCheckInCount = await AgendaCheckIn.count({
        where: {
          agendaId,
        },
      });

      if (currentCheckInCount >= agendaItem.checkInLimit) {
        return res.status(400).json({
          success: false,
          message: "Check-in limit reached for this event",
        });
      }
    }

    // Create check-in
    const checkIn = await AgendaCheckIn.create({
      userId,
      agendaId,
    });

    // Get updated count for this agenda item
    const checkInCount = await AgendaCheckIn.count({
      where: {
        agendaId,
      },
    });

    logger.info(`User ${userId} checked in to agenda item: ${agendaId}`, {
      userId,
      agendaId,
      checkInCount,
      limit: agendaItem.checkInLimit,
    });

    res.json({
      success: true,
      message: "Successfully checked in",
      data: {
        checkIn: {
          id: checkIn.id,
          agendaId: checkIn.agendaId,
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

// Cancel check-in to an agenda item
router.delete("/checkin/:agendaId", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { agendaId } = req.params;

    // Validate required fields
    if (!agendaId) {
      logger.error("Missing required field:", { agendaId });
      return res.status(400).json({
        success: false,
        message: "Missing required field: agendaId",
      });
    }

    // Find the check-in
    const checkIn = await AgendaCheckIn.findOne({
      where: {
        userId,
        agendaId,
      },
    });

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found",
      });
    }

    // Delete the check-in
    await checkIn.destroy();

    // Get updated count for this agenda item
    const checkInCount = await AgendaCheckIn.count({
      where: {
        agendaId,
      },
    });

    logger.info(
      `User ${userId} cancelled check-in to agenda item: ${agendaId}`,
      {
        userId,
        agendaId,
        checkInCount,
      }
    );

    res.json({
      success: true,
      message: "Successfully cancelled check-in",
      data: {
        checkInCount,
      },
    });
  } catch (error) {
    logger.error("Error cancelling check-in:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel check-in",
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
        "agendaId",
        [
          AgendaCheckIn.sequelize.fn(
            "COUNT",
            AgendaCheckIn.sequelize.col("id")
          ),
          "checkInCount",
        ],
      ],
      include: [
        {
          model: Agenda,
          as: "agenda",
          attributes: ["day", "itemIndex", "isParallel", "time", "title"],
        },
      ],
      group: ["agendaId", "agenda.id"],
      order: [
        [Agenda, "day", "ASC"],
        [Agenda, "itemIndex", "ASC"],
        [Agenda, "isParallel", "ASC"],
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
