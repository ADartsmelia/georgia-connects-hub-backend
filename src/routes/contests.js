import express from "express";
import { Op } from "sequelize";
import { Contest, ContestEntry, User } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  validate,
  createContestSchema,
  createContestEntrySchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get contests
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      status, // 'active', 'upcoming', 'ended'
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    const now = new Date();

    // Add status filter
    if (status === "active") {
      whereClause.startDate = { [Op.lte]: now };
      whereClause.endDate = { [Op.gte]: now };
    } else if (status === "upcoming") {
      whereClause.startDate = { [Op.gt]: now };
    } else if (status === "ended") {
      whereClause.endDate = { [Op.lt]: now };
    }

    if (category) {
      whereClause.category = category;
    }

    const { count, rows: contests } = await Contest.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        contests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalContests: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single contest
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    // Get contest entries if voting is open or contest has ended
    let entries = [];
    if (contest.isVotingOpen || new Date() > contest.endDate) {
      entries = await ContestEntry.findAll({
        where: { contestId: id, isApproved: true },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
        order: [
          ["votes", "DESC"],
          ["createdAt", "ASC"],
        ],
      });
    }

    // Check if user has already entered
    let userEntry = null;
    if (req.user) {
      userEntry = await ContestEntry.findOne({
        where: { contestId: id, userId: req.user.id },
      });
    }

    res.json({
      success: true,
      data: {
        contest,
        entries,
        userEntry,
      },
    });
  })
);

// Create contest (admin only)
router.post(
  "/",
  authenticate,
  validate(createContestSchema),
  catchAsync(async (req, res) => {
    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to create contests

    const contest = await Contest.create(req.body);

    logger.info("Contest created successfully", {
      contestId: contest.id,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Contest created successfully",
      data: {
        contest,
      },
    });
  })
);

// Update contest
router.put(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const contest = await Contest.findByPk(id);

    if (!contest) {
      throw new NotFoundError("Contest not found");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to update contests

    await contest.update(req.body);

    logger.info("Contest updated successfully", {
      contestId: id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Contest updated successfully",
      data: {
        contest,
      },
    });
  })
);

// Delete contest
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const contest = await Contest.findByPk(id);

    if (!contest) {
      throw new NotFoundError("Contest not found");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to delete contests

    await contest.update({ isActive: false });

    logger.info("Contest deactivated successfully", {
      contestId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Contest deactivated successfully",
    });
  })
);

// Submit contest entry
router.post(
  "/:id/entries",
  authenticate,
  validate(createContestEntrySchema),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { title, description, imageUrl } = req.body;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    const now = new Date();

    // Check if contest is still accepting entries
    if (now < contest.startDate || now > contest.endDate) {
      throw new ValidationError("Contest is not currently accepting entries");
    }

    // Check if user has already entered
    const existingEntry = await ContestEntry.findOne({
      where: { contestId: id, userId: req.user.id },
    });

    if (existingEntry) {
      throw new ValidationError("You have already entered this contest");
    }

    // Check entry limit
    if (contest.maxEntries && contest.currentEntries >= contest.maxEntries) {
      throw new ValidationError("Contest has reached maximum entries");
    }

    // Create entry
    const entry = await ContestEntry.create({
      contestId: id,
      userId: req.user.id,
      title,
      description,
      imageUrl,
      isApproved: false, // Default to pending approval
    });

    // Update contest entry count
    await contest.increment("currentEntries");

    logger.info("Contest entry submitted", {
      contestId: id,
      entryId: entry.id,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Contest entry submitted successfully",
      data: {
        entry,
      },
    });
  })
);

// Vote for contest entry
router.post(
  "/:id/entries/:entryId/vote",
  authenticate,
  catchAsync(async (req, res) => {
    const { id, entryId } = req.params;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    const entry = await ContestEntry.findByPk(entryId);

    if (!entry || entry.contestId !== id) {
      throw new NotFoundError("Contest entry not found");
    }

    // Check if voting is open
    if (!contest.isVotingOpen) {
      throw new ValidationError(
        "Voting is not currently open for this contest"
      );
    }

    const now = new Date();

    // Check voting period
    if (contest.votingEndDate && now > contest.votingEndDate) {
      throw new ValidationError("Voting period has ended");
    }

    if (now < contest.endDate) {
      throw new ValidationError(
        "Voting can only begin after the entry period ends"
      );
    }

    // Check if user is the entry owner
    if (entry.userId === req.user.id) {
      throw new ValidationError("You cannot vote for your own entry");
    }

    // In a real app, you'd track individual votes to prevent multiple votes
    // For simplicity, we'll just increment the vote count
    await entry.increment("votes");

    // Update contest total votes
    await contest.increment("totalVotes");

    logger.info("Contest entry voted", {
      contestId: id,
      entryId,
      votedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        votes: entry.votes,
      },
    });
  })
);

// Get contest entries
router.get(
  "/:id/entries",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = "votes",
      sortOrder = "DESC",
    } = req.query;
    const offset = (page - 1) * limit;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    const { count, rows: entries } = await ContestEntry.findAndCountAll({
      where: { contestId: id, isApproved: true },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalEntries: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Approve contest entry (admin only)
router.post(
  "/:id/entries/:entryId/approve",
  authenticate,
  catchAsync(async (req, res) => {
    const { id, entryId } = req.params;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    const entry = await ContestEntry.findByPk(entryId);

    if (!entry || entry.contestId !== id) {
      throw new NotFoundError("Contest entry not found");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to approve entries

    await entry.update({
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: req.user.id,
    });

    logger.info("Contest entry approved", {
      contestId: id,
      entryId,
      approvedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Contest entry approved successfully",
      data: {
        entry,
      },
    });
  })
);

// Announce contest winner (admin only)
router.post(
  "/:id/winner",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { entryId } = req.body;

    const contest = await Contest.findByPk(id);

    if (!contest || !contest.isActive) {
      throw new NotFoundError("Contest not found");
    }

    const entry = await ContestEntry.findByPk(entryId);

    if (!entry || entry.contestId !== id) {
      throw new NotFoundError("Contest entry not found");
    }

    if (!entry.isApproved) {
      throw new ValidationError("Cannot announce winner for unapproved entry");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to announce winners

    // Update contest winner
    await contest.update({
      winnerId: entry.userId,
      winnerAnnouncedAt: new Date(),
    });

    // Update entry as winner
    await entry.update({ isWinner: true });

    logger.info("Contest winner announced", {
      contestId: id,
      winnerId: entry.userId,
      announcedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Contest winner announced successfully",
      data: {
        contest,
        winner: entry,
      },
    });
  })
);

export default router;
