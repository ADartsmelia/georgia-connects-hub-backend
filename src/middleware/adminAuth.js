import { User } from "../models/User.js";
import { logger } from "../utils/logger.js";

// Admin authorization middleware
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is admin or super admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    logger.error("Admin authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

// Super admin authorization middleware
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is super admin
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }

    next();
  } catch (error) {
    logger.error("Super admin authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

// Check if user can manage other users
export const canManageUsers = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admins can manage anyone
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Regular admins can manage non-admin users
    if (req.user.isAdmin) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Insufficient permissions to manage users",
    });
  } catch (error) {
    logger.error("User management authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

// Check if user can approve posts
export const canApprovePosts = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admins and super admins can approve posts
    if (req.user.isAdmin || req.user.isSuperAdmin) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Insufficient permissions to approve posts",
    });
  } catch (error) {
    logger.error("Post approval authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

// Check if user can manage sponsors
export const canManageSponsors = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admins and super admins can manage sponsors
    if (req.user.isAdmin || req.user.isSuperAdmin) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Insufficient permissions to manage sponsors",
    });
  } catch (error) {
    logger.error("Sponsor management authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

export default {
  requireAdmin,
  requireSuperAdmin,
  canManageUsers,
  canApprovePosts,
  canManageSponsors,
};

