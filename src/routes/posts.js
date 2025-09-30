import express from "express";
import multer from "multer";
import path from "path";
import { Op } from "sequelize";
import { Post, Comment, User, Team, Like } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  validate,
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { uploadFileToSpaces } from "../utils/spaces.js";

const router = express.Router();

// Helper function to upload post image to DigitalOcean Spaces
const uploadPostImageToSpaces = async (fileBuffer, filename, contentType) => {
  try {
    const s3Url = await uploadFileToSpaces(fileBuffer, filename, "posts", contentType);
    return s3Url;
  } catch (error) {
    logger.error("Error uploading post image to Spaces:", error);
    throw error;
  }
};

// Configure multer for memory storage (for S3 upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Post content
 *               type:
 *                 type: string
 *                 enum: [text, image, video, poll, link]
 *                 default: text
 *               teamId:
 *                 type: string
 *                 format: uuid
 *                 description: Team ID if posting to a team
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Post tags
 *               pollOptions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Poll options (required if type is poll)
 *               pollExpiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Poll expiration date
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create a new post (with optional image upload)
router.post(
  "/",
  authenticate,
  upload.single("image"),
  validate(createPostSchema),
  catchAsync(async (req, res) => {
    const { content, type, teamId, tags, pollOptions, pollExpiresAt } =
      req.body;
    const authorId = req.user.id;
    const imageFile = req.file;

    // If teamId is provided, verify user is member of the team
    if (teamId) {
      const team = await Team.findByPk(teamId, {
        include: [
          {
            model: User,
            as: "members",
            where: { id: authorId },
            through: { where: { status: "active" } },
          },
        ],
      });

      if (!team) {
        throw new NotFoundError("Team not found or you are not a member");
      }
    }

    // Parse JSON fields if they come as strings (from FormData)
    let parsedTags = tags;
    let parsedPollOptions = pollOptions;

    if (typeof tags === "string") {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = [];
      }
    }

    if (typeof pollOptions === "string") {
      try {
        parsedPollOptions = JSON.parse(pollOptions);
      } catch (e) {
        parsedPollOptions = [];
      }
    }

    // Prepare post data
    const postData = {
      authorId,
      content,
      type: type || (imageFile ? "image" : "text"),
      teamId,
      tags: parsedTags || [],
      approvalStatus: "pending", // All posts require admin approval
    };

    // Add image-specific data
    if (imageFile) {
      try {
        // Generate unique filename for Spaces
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = `post-${uniqueSuffix}${path.extname(imageFile.originalname)}`;
        
        // Upload image to DigitalOcean Spaces
        const s3Url = await uploadPostImageToSpaces(imageFile.buffer, filename, imageFile.mimetype);
        
        postData.mediaUrl = s3Url;
        postData.mediaType = imageFile.mimetype;
        
        logger.info(`Post image uploaded to Spaces: ${s3Url}`);
      } catch (error) {
        logger.error("Failed to upload post image to Spaces:", error);
        throw new ValidationError("Failed to upload image");
      }
    }

    // Add poll-specific data
    if (type === "poll" && parsedPollOptions) {
      postData.pollOptions = parsedPollOptions;
      postData.pollResults = parsedPollOptions.reduce((acc, option, index) => {
        acc[index] = 0;
        return acc;
      }, {});
      if (pollExpiresAt) {
        postData.pollExpiresAt = new Date(pollExpiresAt);
      }
    }

    const post = await Post.create(postData);

    // Load the created post with author information
    const createdPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
        {
          model: Team,
          as: "team",
          attributes: ["id", "name"],
        },
      ],
    });

    logger.info("Post created successfully", {
      postId: post.id,
      authorId,
      type,
    });

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: {
        post: createdPost,
      },
    });
  })
);

// Get posts feed
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      teamId,
      authorId,
      tags,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      isPublic: true,
      isDeleted: false,
      approvalStatus: "approved", // Only show approved posts by default
    };

    // Add filters
    if (type) {
      whereClause.type = type;
    }

    if (teamId) {
      whereClause.teamId = teamId;
    }

    if (authorId) {
      whereClause.authorId = authorId;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      whereClause.tags = {
        [Op.overlap]: tagArray,
      };
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
        {
          model: Team,
          as: "team",
          attributes: ["id", "name"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalPosts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get user's own posts (including pending and rejected)
router.get(
  "/my-posts",
  authenticate,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      approvalStatus,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      authorId: req.user.id,
      isDeleted: false,
    };

    // Add filters
    if (type) {
      whereClause.type = type;
    }

    if (approvalStatus) {
      whereClause.approvalStatus = approvalStatus;
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
        {
          model: User,
          as: "approver",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalPosts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single post
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      where: {
        isPublic: true,
        isDeleted: false,
        approvalStatus: "approved", // Only show approved posts to users
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
        {
          model: Team,
          as: "team",
          attributes: ["id", "name"],
        },
        {
          model: Comment,
          as: "comments",
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "firstName", "lastName", "avatar"],
            },
          ],
          where: { isDeleted: false },
          order: [["createdAt", "ASC"]],
          limit: 50,
        },
      ],
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // Increment view count
    await post.increment("views");

    res.json({
      success: true,
      data: {
        post,
      },
    });
  })
);

// Update post
router.put(
  "/:id",
  authenticate,
  validate(updatePostSchema),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { content, tags } = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // Check if user is the author
    if (post.authorId !== req.user.id) {
      throw new AuthorizationError("You can only edit your own posts");
    }

    // Update post
    await post.update({
      content,
      tags: tags || post.tags,
    });

    logger.info("Post updated successfully", {
      postId: id,
      authorId: req.user.id,
    });

    res.json({
      success: true,
      message: "Post updated successfully",
      data: {
        post,
      },
    });
  })
);

// Delete post
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const post = await Post.findByPk(id);

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // Check if user is the author
    if (post.authorId !== req.user.id) {
      throw new AuthorizationError("You can only delete your own posts");
    }

    // Soft delete
    await post.update({
      isDeleted: true,
      deletedAt: new Date(),
    });

    logger.info("Post deleted successfully", {
      postId: id,
      authorId: req.user.id,
    });

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  })
);

// Like/Unlike post
router.post(
  "/:id/like",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await Post.findByPk(id);

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // Check if user has already liked this post
    const existingLike = await Like.findOne({
      where: {
        userId,
        postId: id,
      },
    });

    let action;
    let newLikeCount;

    if (existingLike) {
      // User has already liked, so unlike
      await existingLike.destroy();
      await post.decrement("likes");
      action = "unliked";
      newLikeCount = post.likes - 1;
    } else {
      // User hasn't liked yet, so like
      await Like.create({
        userId,
        postId: id,
      });
      await post.increment("likes");
      action = "liked";
      newLikeCount = post.likes + 1;
    }

    logger.info("Post like/unlike action", {
      postId: id,
      userId,
      action,
      newLikeCount,
    });

    res.json({
      success: true,
      message: `Post ${action} successfully`,
      data: {
        action,
        likes: newLikeCount,
        isLiked: action === "liked",
      },
    });
  })
);

// Vote on poll
router.post(
  "/:id/vote",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { optionIndex } = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    if (post.type !== "poll") {
      throw new ValidationError("This post is not a poll");
    }

    if (!post.pollOptions || optionIndex >= post.pollOptions.length) {
      throw new ValidationError("Invalid poll option");
    }

    if (post.pollExpiresAt && new Date() > post.pollExpiresAt) {
      throw new ValidationError("This poll has expired");
    }

    // Update poll results
    const pollResults = { ...post.pollResults };
    pollResults[optionIndex] = (pollResults[optionIndex] || 0) + 1;

    await post.update({ pollResults });

    logger.info("Poll vote recorded", {
      postId: id,
      userId: req.user.id,
      optionIndex,
    });

    res.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        pollResults,
      },
    });
  })
);

// Create comment
router.post(
  "/:id/comments",
  authenticate,
  validate(createCommentSchema),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { content, parentId } = req.body;

    const post = await Post.findByPk(id);

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    // If parentId is provided, verify it exists and belongs to this post
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId);
      if (!parentComment || parentComment.postId !== id) {
        throw new ValidationError("Invalid parent comment");
      }
    }

    const comment = await Comment.create({
      postId: id,
      authorId: req.user.id,
      content,
      parentId,
    });

    // Load comment with author information
    const createdComment = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
    });

    // Increment comment count on post
    await post.increment("comments");

    logger.info("Comment created successfully", {
      commentId: comment.id,
      postId: id,
      authorId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: {
        comment: createdComment,
      },
    });
  })
);

// Get post comments
router.get(
  "/:id/comments",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, parentId } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {
      postId: id,
      isDeleted: false,
    };

    if (parentId) {
      whereClause.parentId = parentId;
    } else {
      whereClause.parentId = null; // Only top-level comments
    }

    const { count, rows: comments } = await Comment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
      order: [["createdAt", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalComments: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

export default router;
