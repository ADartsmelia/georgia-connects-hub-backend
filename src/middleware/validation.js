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
  location: Joi.string().min(1).max(100).required().messages({
    "string.min": "Location is required",
    "string.max": "Location cannot exceed 100 characters",
    "any.required": "Location is required",
  }),
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
};
