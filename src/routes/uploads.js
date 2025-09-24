"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { AppError, ValidationError } = require("../middleware/errorHandler");
const { logger } = require("../utils/logger");

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/mp4": ".m4a",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      ".pptx",
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new ValidationError(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to upload file to S3
const uploadToS3 = async (file, folder, filename) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${folder}/${filename}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    logger.error("Error uploading to S3:", error);
    throw new AppError("Failed to upload file", 500);
  }
};

// Helper function to delete file from S3
const deleteFromS3 = async (url) => {
  try {
    const key = url.split("/").slice(-2).join("/"); // Extract folder/filename from URL
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    logger.error("Error deleting from S3:", error);
    return false;
  }
};

// Upload profile picture
router.post(
  "/profile-picture",
  authenticate,
  upload.single("profilePicture"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No file provided");
      }

      const filename = `profile_${req.user.id}_${uuidv4()}${path.extname(
        req.file.originalname
      )}`;
      const imageUrl = await uploadToS3(req.file, "profile-pictures", filename);

      // Update user profile picture in database
      const { User } = require("../models");
      await User.update({ avatar: imageUrl }, { where: { id: req.user.id } });

      res.json({
        success: true,
        data: {
          imageUrl,
          message: "Profile picture uploaded successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading profile picture:", error);
      next(error);
    }
  }
);

// Upload contest entry photo
router.post(
  "/contest-entry",
  authenticate,
  upload.single("photo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No photo provided");
      }

      const { contestId } = req.body;
      if (!contestId) {
        throw new ValidationError("Contest ID is required");
      }

      const filename = `contest_${contestId}_${
        req.user.id
      }_${uuidv4()}${path.extname(req.file.originalname)}`;
      const imageUrl = await uploadToS3(req.file, "contest-entries", filename);

      res.json({
        success: true,
        data: {
          imageUrl,
          contestId,
          message: "Contest entry photo uploaded successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading contest entry:", error);
      next(error);
    }
  }
);

// Upload post media
router.post(
  "/post-media",
  authenticate,
  upload.array("media", 5),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        throw new ValidationError("No media files provided");
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const filename = `post_${req.user.id}_${uuidv4()}${path.extname(
          file.originalname
        )}`;
        const fileUrl = await uploadToS3(file, "post-media", filename);

        uploadedFiles.push({
          url: fileUrl,
          type: file.mimetype.startsWith("image/")
            ? "image"
            : file.mimetype.startsWith("video/")
            ? "video"
            : "document",
          filename: file.originalname,
          size: file.size,
        });
      }

      res.json({
        success: true,
        data: {
          files: uploadedFiles,
          message: `${uploadedFiles.length} media file(s) uploaded successfully`,
        },
      });
    } catch (error) {
      logger.error("Error uploading post media:", error);
      next(error);
    }
  }
);

// Upload media library content
router.post(
  "/media-library",
  authenticate,
  upload.single("media"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No media file provided");
      }

      const { title, description, category, type } = req.body;

      if (!title || !category || !type) {
        throw new ValidationError("Title, category, and type are required");
      }

      const filename = `media_${req.user.id}_${uuidv4()}${path.extname(
        req.file.originalname
      )}`;
      const mediaUrl = await uploadToS3(req.file, "media-library", filename);

      // Save to media library
      const { Media } = require("../models");
      const media = await Media.create({
        title,
        description,
        type,
        category,
        url: mediaUrl,
        uploaderId: req.user.id,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });

      res.status(201).json({
        success: true,
        data: {
          media,
          message: "Media uploaded to library successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading media library content:", error);
      next(error);
    }
  }
);

// Upload team/group avatar
router.post(
  "/team-avatar",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No avatar file provided");
      }

      const { teamId } = req.body;
      if (!teamId) {
        throw new ValidationError("Team ID is required");
      }

      // Check if user is team admin/owner
      const { TeamMember } = require("../models");
      const membership = await TeamMember.findOne({
        where: {
          userId: req.user.id,
          teamId,
          role: ["owner", "admin"],
        },
      });

      if (!membership) {
        throw new AppError("Unauthorized to update team avatar", 403);
      }

      const filename = `team_${teamId}_${uuidv4()}${path.extname(
        req.file.originalname
      )}`;
      const avatarUrl = await uploadToS3(req.file, "team-avatars", filename);

      // Update team avatar
      const { Team } = require("../models");
      await Team.update({ avatar: avatarUrl }, { where: { id: teamId } });

      res.json({
        success: true,
        data: {
          avatarUrl,
          message: "Team avatar updated successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading team avatar:", error);
      next(error);
    }
  }
);

// Upload sponsor logo
router.post(
  "/sponsor-logo",
  authenticate,
  upload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No logo file provided");
      }

      const { sponsorId } = req.body;
      if (!sponsorId) {
        throw new ValidationError("Sponsor ID is required");
      }

      // Check if user is admin or sponsor owner
      if (!req.user.isAdmin) {
        const { Sponsor } = require("../models");
        const sponsor = await Sponsor.findByPk(sponsorId);

        if (!sponsor || sponsor.ownerId !== req.user.id) {
          throw new AppError("Unauthorized to update sponsor logo", 403);
        }
      }

      const filename = `sponsor_${sponsorId}_${uuidv4()}${path.extname(
        req.file.originalname
      )}`;
      const logoUrl = await uploadToS3(req.file, "sponsor-logos", filename);

      // Update sponsor logo
      const { Sponsor } = require("../models");
      await Sponsor.update({ logo: logoUrl }, { where: { id: sponsorId } });

      res.json({
        success: true,
        data: {
          logoUrl,
          message: "Sponsor logo updated successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading sponsor logo:", error);
      next(error);
    }
  }
);

// Upload offer image
router.post(
  "/offer-image",
  authenticate,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("No image file provided");
      }

      const { offerId } = req.body;
      if (!offerId) {
        throw new ValidationError("Offer ID is required");
      }

      // Check if user is admin or sponsor owner
      const { Offer, Sponsor } = require("../models");
      const offer = await Offer.findByPk(offerId, {
        include: [{ model: Sponsor, as: "sponsor" }],
      });

      if (!offer) {
        throw new AppError("Offer not found", 404);
      }

      if (!req.user.isAdmin && offer.sponsor.ownerId !== req.user.id) {
        throw new AppError("Unauthorized to update offer image", 403);
      }

      const filename = `offer_${offerId}_${uuidv4()}${path.extname(
        req.file.originalname
      )}`;
      const imageUrl = await uploadToS3(req.file, "offer-images", filename);

      // Update offer image
      await Offer.update({ image: imageUrl }, { where: { id: offerId } });

      res.json({
        success: true,
        data: {
          imageUrl,
          message: "Offer image updated successfully",
        },
      });
    } catch (error) {
      logger.error("Error uploading offer image:", error);
      next(error);
    }
  }
);

// Delete uploaded file
router.delete("/:filename", authenticate, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { folder } = req.query;

    if (!folder) {
      throw new ValidationError("Folder parameter is required");
    }

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${filename}`;

    const deleted = await deleteFromS3(fileUrl);

    if (deleted) {
      res.json({
        success: true,
        message: "File deleted successfully",
      });
    } else {
      throw new AppError("Failed to delete file", 500);
    }
  } catch (error) {
    logger.error("Error deleting file:", error);
    next(error);
  }
});

// Get upload configuration
router.get("/config", authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: {
        images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        videos: ["video/mp4", "video/webm", "video/quicktime"],
        audio: ["audio/mpeg", "audio/wav", "audio/mp4"],
        documents: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
      },
      folders: {
        profilePictures: "profile-pictures",
        contestEntries: "contest-entries",
        postMedia: "post-media",
        mediaLibrary: "media-library",
        teamAvatars: "team-avatars",
        sponsorLogos: "sponsor-logos",
        offerImages: "offer-images",
      },
    },
  });
});

module.exports = router;
