import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { logger } from "../utils/logger.js";

// Generate JWT token
export const generateToken = (
  userId,
  expiresIn = process.env.JWT_EXPIRES_IN || "7d"
) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error("Token verification failed:", error.message);
    return null;
  }
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Find user and check if active
    const user = await User.findByPk(decoded.userId, {
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "passwordResetToken",
          "emailVerificationToken",
        ],
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const user = await User.findByPk(decoded.userId, {
        attributes: {
          exclude: [
            "password",
            "refreshToken",
            "passwordResetToken",
            "emailVerificationToken",
          ],
        },
      });

      if (user && user.isActive) {
        req.user = user;
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    logger.error("Optional authentication error:", error);
    req.user = null;
    next();
  }
};

// Admin authorization middleware
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is admin (you can add admin role to User model)
    if (req.user.role !== "admin") {
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

// Admin authorization middleware (checks isAdmin field)
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user has isAdmin flag
    if (!req.user.isAdmin) {
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

// Premium user authorization middleware
export const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !req.user.isPremium ||
      (req.user.premiumExpires && new Date() > req.user.premiumExpires)
    ) {
      return res.status(403).json({
        success: false,
        message: "Premium subscription required",
      });
    }

    next();
  } catch (error) {
    logger.error("Premium authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization failed",
    });
  }
};

// Rate limiting middleware
export const rateLimitByUser = (
  windowMs = 15 * 60 * 1000,
  maxRequests = 100
) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );
    requests.set(userId, validRequests);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, please try again later",
      });
    }

    validRequests.push(now);
    next();
  };
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  optionalAuth,
  requireAdmin,
  isAdmin,
  requirePremium,
  rateLimitByUser,
};
