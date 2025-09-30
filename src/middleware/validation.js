import Joi from "joi";

// User validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.max": "Password cannot exceed 100 characters",
    "any.required": "Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  otp: Joi.string()
    .length(4)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "string.length": "OTP must be exactly 4 digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
});

export const completeProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required().messages({
    "string.min": "First name is required",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().min(1).max(50).required().messages({
    "string.min": "Last name is required",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),
  company: Joi.string().min(1).max(100).required().messages({
    "string.min": "Company is required",
    "string.max": "Company name cannot exceed 100 characters",
    "any.required": "Company is required",
  }),
  jobTitle: Joi.string().min(1).max(100).required().messages({
    "string.min": "Job title is required",
    "string.max": "Job title cannot exceed 100 characters",
    "any.required": "Job title is required",
  }),
  industry: Joi.string().min(1).max(50).required().messages({
    "string.min": "Industry is required",
    "string.max": "Industry cannot exceed 50 characters",
    "any.required": "Industry is required",
  }),
  experience: Joi.string()
    .valid(
      "Entry Level (0-2 years)",
      "Mid Level (3-5 years)",
      "Senior Level (6-10 years)",
      "Executive Level (10+ years)"
    )
    .required()
    .messages({
      "any.only": "Please select a valid experience level",
      "any.required": "Experience level is required",
    }),
  location: Joi.string().max(100).optional().allow(""),
  phoneNumber: Joi.string().optional().allow(""),
  bio: Joi.string().max(1000).optional().allow(""),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  company: Joi.string().min(1).max(100).optional(),
  jobTitle: Joi.string().min(1).max(100).optional(),
  industry: Joi.string().min(1).max(50).optional(),
  experience: Joi.string()
    .valid(
      "Entry Level (0-2 years)",
      "Mid Level (3-5 years)",
      "Senior Level (6-10 years)",
      "Executive Level (10+ years)"
    )
    .optional(),
  location: Joi.string().min(1).max(100).optional(),
  bio: Joi.string().max(1000).optional(),
  phoneNumber: Joi.string()
    .min(10)
    .max(15)
    .pattern(/^[0-9]+$/)
    .optional(),
});

// Post validation schemas
export const createPostSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(5000)
    .when("type", {
      is: "image",
      then: Joi.optional().allow(""),
      otherwise: Joi.required(),
    })
    .messages({
      "string.min": "Post content cannot be empty",
      "string.max": "Post content cannot exceed 5000 characters",
      "any.required": "Post content is required",
    }),
  type: Joi.string()
    .valid("text", "image", "poll", "video", "link")
    .default("text"),
  teamId: Joi.string().uuid().optional(),
  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(50)).max(10),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          return helpers.error("any.invalid");
        } catch (e) {
          return helpers.error("any.invalid");
        }
      })
    )
    .optional(),
  pollOptions: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().min(1).max(200)).min(2).max(6),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          return helpers.error("any.invalid");
        } catch (e) {
          return helpers.error("any.invalid");
        }
      })
    )
    .when("type", {
      is: "poll",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  pollExpiresAt: Joi.date().greater("now").when("type", {
    is: "poll",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
});

export const updatePostSchema = Joi.object({
  content: Joi.string().min(1).max(5000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

// Comment validation schemas
export const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required().messages({
    "string.min": "Comment cannot be empty",
    "string.max": "Comment cannot exceed 1000 characters",
    "any.required": "Comment content is required",
  }),
  parentId: Joi.string().uuid().optional(),
});

// Connection validation schemas
export const sendConnectionRequestSchema = Joi.object({
  addresseeId: Joi.string().uuid().required().messages({
    "string.guid": "Invalid user ID format",
    "any.required": "User ID is required",
  }),
  message: Joi.string().max(500).optional().messages({
    "string.max": "Connection message cannot exceed 500 characters",
  }),
});

// Chat validation schemas
export const createChatSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  type: Joi.string().valid("direct", "group").default("direct"),
  description: Joi.string().max(500).optional(),
  members: Joi.array().items(Joi.string().uuid()).min(1).when("type", {
    is: "group",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

export const sendMessageSchema = Joi.object({
  content: Joi.string().min(1).max(5000).when("type", {
    is: "text",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  type: Joi.string()
    .valid("text", "image", "video", "audio", "file", "system")
    .default("text"),
  replyToId: Joi.string().uuid().optional(),
});

// Sponsor validation schemas
export const createSponsorSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  category: Joi.string()
    .valid(
      "Coworking",
      "Events",
      "Food & Beverage",
      "Technology",
      "Professional Services",
      "Healthcare",
      "Finance",
      "Education"
    )
    .required(),
  location: Joi.string().min(1).max(100).required(),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().optional(),
});

export const createOfferSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).required(),
  discountType: Joi.string()
    .valid("percentage", "fixed", "free", "bogo")
    .required(),
  discountValue: Joi.number().positive().required(),
  originalPrice: Joi.number().positive().optional(),
  category: Joi.string().min(1).required(),
  location: Joi.string().min(1).required(),
  validFrom: Joi.date().min("now").required(),
  validUntil: Joi.date().greater(Joi.ref("validFrom")).required(),
  maxRedemptions: Joi.number().positive().optional(),
  terms: Joi.string().optional(),
});

// Media validation schemas
export const createMediaSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  type: Joi.string().valid("video", "podcast", "document").required(),
  category: Joi.string()
    .valid(
      "Networking",
      "Technology",
      "Business",
      "Leadership",
      "Innovation",
      "Career Development"
    )
    .required(),
  speakers: Joi.array().items(Joi.string().max(100)).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

// Quiz validation schemas
export const createQuizSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  category: Joi.string().min(1).required(),
  difficulty: Joi.string().valid("Easy", "Medium", "Hard").default("Medium"),
  timeLimit: Joi.number().positive().required(),
  points: Joi.number().positive().default(100),
  badge: Joi.string().optional(),
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().min(1).required(),
        options: Joi.array()
          .items(Joi.string().min(1))
          .min(2)
          .max(6)
          .required(),
        correctAnswer: Joi.number().min(0).required(),
        explanation: Joi.string().optional(),
      })
    )
    .min(1)
    .required(),
});

// Contest validation schemas
export const createContestSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).required(),
  category: Joi.string().min(1).required(),
  startDate: Joi.date().min("now").required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
  votingEndDate: Joi.date().greater(Joi.ref("endDate")).optional(),
  maxEntries: Joi.number().positive().optional(),
  prize: Joi.string().optional(),
  rules: Joi.array().items(Joi.string().min(1)).required(),
});

export const createContestEntrySchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).required(),
});

// Playlist validation schemas
export const createPlaylistSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  category: Joi.string()
    .valid("Education", "Business", "Inspiration", "Skills")
    .required(),
  url: Joi.string().uri().required(),
});

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    console.log("=== VALIDATION DEBUG ===");
    console.log(
      "Schema name:",
      schema.describe().metas?.[0]?.description || "Unknown"
    );
    console.log("Request body:", req.body);
    console.log("========================");

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      console.log("=== VALIDATION ERROR ===");
      console.log("Error details:", error.details);
      console.log("========================");

      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Query validation failed",
        errors,
      });
    }

    req.query = value;
    next();
  };
};

// Admin validation schemas
export const updateUserTypeSchema = Joi.object({
  userType: Joi.string()
    .valid("attendee", "speaker", "sponsor", "volunteer", "organizer", "admin")
    .required()
    .messages({
      "any.only":
        "User type must be one of: attendee, speaker, sponsor, volunteer, organizer, admin",
      "any.required": "User type is required",
    }),
  passType: Joi.string()
    .valid("day_pass", "full_pass", "none")
    .optional()
    .messages({
      "any.only": "Pass type must be one of: day_pass, full_pass, none",
    }),
  adminNotes: Joi.string().max(1000).allow("").optional().messages({
    "string.max": "Admin notes cannot exceed 1000 characters",
  }),
});

export const approvePostSchema = Joi.object({
  action: Joi.string().valid("approve", "reject").required().messages({
    "any.only": "Action must be either 'approve' or 'reject'",
    "any.required": "Action is required",
  }),
  rejectionReason: Joi.string()
    .max(500)
    .when("action", {
      is: "reject",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.max": "Rejection reason cannot exceed 500 characters",
      "any.required": "Rejection reason is required when rejecting a post",
    }),
});

export const createSponsorPassSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid user ID",
    "any.required": "User ID is required",
  }),
  sponsorId: Joi.string().uuid().required().messages({
    "string.guid": "Please provide a valid sponsor ID",
    "any.required": "Sponsor ID is required",
  }),
  passType: Joi.string().valid("day_pass", "full_pass").required().messages({
    "any.only": "Pass type must be either 'day_pass' or 'full_pass'",
    "any.required": "Pass type is required",
  }),
  dayNumber: Joi.number()
    .integer()
    .min(1)
    .max(7)
    .when("passType", {
      is: "day_pass",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "number.base": "Day number must be a number",
      "number.integer": "Day number must be an integer",
      "number.min": "Day number must be at least 1",
      "number.max": "Day number cannot exceed 7",
      "any.required": "Day number is required for day passes",
    }),
  notes: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Notes cannot exceed 500 characters",
  }),
});

// Badge validation schemas
export const createBadgeSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Badge name is required",
    "string.min": "Badge name must be at least 1 character",
    "string.max": "Badge name cannot exceed 100 characters",
    "any.required": "Badge name is required",
  }),
  description: Joi.string().min(1).required().messages({
    "string.empty": "Badge description is required",
    "string.min": "Badge description must be at least 1 character",
    "any.required": "Badge description is required",
  }),
  icon: Joi.string().uri().required().messages({
    "string.empty": "Badge icon URL is required",
    "string.uri": "Badge icon must be a valid URL",
    "any.required": "Badge icon URL is required",
  }),
  category: Joi.string()
    .valid("Networking", "Knowledge", "Engagement", "Special")
    .required()
    .messages({
      "any.only":
        "Category must be one of: Networking, Knowledge, Engagement, Special",
      "any.required": "Category is required",
    }),
  rarity: Joi.string()
    .valid("Common", "Rare", "Epic", "Legendary")
    .default("Common")
    .messages({
      "any.only": "Rarity must be one of: Common, Rare, Epic, Legendary",
    }),
  requirements: Joi.object().required().messages({
    "object.base": "Requirements must be an object",
    "any.required": "Requirements are required",
  }),
  points: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Points must be a number",
    "number.integer": "Points must be an integer",
    "number.min": "Points cannot be negative",
  }),
  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "isActive must be a boolean",
  }),
  metadata: Joi.object().default({}).messages({
    "object.base": "Metadata must be an object",
  }),
});

export const updateBadgeSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    "string.min": "Badge name must be at least 1 character",
    "string.max": "Badge name cannot exceed 100 characters",
  }),
  description: Joi.string().min(1).optional().messages({
    "string.min": "Badge description must be at least 1 character",
  }),
  icon: Joi.string().uri().optional().messages({
    "string.uri": "Badge icon must be a valid URL",
  }),
  category: Joi.string()
    .valid("Networking", "Knowledge", "Engagement", "Special")
    .optional()
    .messages({
      "any.only":
        "Category must be one of: Networking, Knowledge, Engagement, Special",
    }),
  rarity: Joi.string()
    .valid("Common", "Rare", "Epic", "Legendary")
    .optional()
    .messages({
      "any.only": "Rarity must be one of: Common, Rare, Epic, Legendary",
    }),
  requirements: Joi.object().optional().messages({
    "object.base": "Requirements must be an object",
  }),
  points: Joi.number().integer().min(0).optional().messages({
    "number.base": "Points must be a number",
    "number.integer": "Points must be an integer",
    "number.min": "Points cannot be negative",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be a boolean",
  }),
  metadata: Joi.object().optional().messages({
    "object.base": "Metadata must be an object",
  }),
});

export const assignBadgeSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "string.guid": "User ID must be a valid UUID",
    "any.required": "User ID is required",
  }),
  badgeId: Joi.string().uuid().required().messages({
    "string.guid": "Badge ID must be a valid UUID",
    "any.required": "Badge ID is required",
  }),
  progress: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Progress must be a number",
    "number.integer": "Progress must be an integer",
    "number.min": "Progress cannot be negative",
  }),
  maxProgress: Joi.number().integer().min(1).required().messages({
    "number.base": "Max progress must be a number",
    "number.integer": "Max progress must be an integer",
    "number.min": "Max progress must be at least 1",
    "any.required": "Max progress is required",
  }),
  isEarned: Joi.boolean().default(false).messages({
    "boolean.base": "isEarned must be a boolean",
  }),
});

// OTP validation schemas
export const sendEmailVerificationOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  userId: Joi.string().uuid().optional().messages({
    "string.guid": "Please provide a valid user ID",
  }),
});

export const sendPhoneVerificationOTPSchema = Joi.object({
  phoneNumber: Joi.string().required().messages({
    "any.required": "Phone number is required",
  }),
});

export const sendPasswordResetOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const resetPasswordWithOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(4).required().messages({
    "string.length": "OTP must be 4 characters",
    "any.required": "OTP is required",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "New password is required",
  }),
});

export const verifyOTPRecordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  otp: Joi.string().required().messages({
    "any.required": "OTP is required",
  }),
  purpose: Joi.string()
    .valid(
      "verification",
      "login",
      "password_reset",
      "phone_verification",
      "two_factor",
      "account_recovery"
    )
    .required()
    .messages({
      "any.only":
        "Purpose must be one of: verification, login, password_reset, phone_verification, two_factor, account_recovery",
      "any.required": "Purpose is required",
    }),
});

export const resendOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  purpose: Joi.string()
    .valid(
      "verification",
      "login",
      "password_reset",
      "phone_verification",
      "two_factor",
      "account_recovery"
    )
    .required()
    .messages({
      "any.only":
        "Purpose must be one of: verification, login, password_reset, phone_verification, two_factor, account_recovery",
      "any.required": "Purpose is required",
    }),
  userId: Joi.string().uuid().optional().messages({
    "string.guid": "Please provide a valid user ID",
  }),
});

export default {
  validate,
  validateQuery,
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  completeProfileSchema,
  updateProfileSchema,
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  sendConnectionRequestSchema,
  createChatSchema,
  sendMessageSchema,
  createSponsorSchema,
  createOfferSchema,
  createMediaSchema,
  createQuizSchema,
  createContestSchema,
  createContestEntrySchema,
  createPlaylistSchema,
  updateUserTypeSchema,
  approvePostSchema,
  createSponsorPassSchema,
  createBadgeSchema,
  updateBadgeSchema,
  assignBadgeSchema,
};
