import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";
import bcrypt from "bcryptjs";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.TEXT, // Use TEXT for hashed passwords
      allowNull: true, // Allow null for OAuth users
      validate: {
        len: [6, 100],
      },
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
      validate: {
        len: [0, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
      validate: {
        len: [0, 50],
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        len: [10, 15],
      },
    },
    company: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    jobTitle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    industry: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    experience: {
      type: DataTypes.ENUM(
        "Entry Level (0-2 years)",
        "Mid Level (3-5 years)",
        "Senior Level (6-10 years)",
        "Executive Level (10+ years)"
      ),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    avatar: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    coverImage: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    premiumExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    profileCompleteness: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    totalPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastActivityDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    googleId: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notificationSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        email: true,
        push: true,
        sms: false,
        marketing: false,
        contests: true,
        connections: true,
        posts: true,
        messages: true,
      },
    },
    privacySettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        profileVisibility: "public",
        showEmail: false,
        showPhone: false,
        showCompany: true,
        allowConnections: true,
        showOnlineStatus: true,
      },
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        theme: "light",
        language: "en",
        timezone: "America/New_York",
        emailDigest: "weekly",
      },
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        fields: ["email"],
      },
      {
        fields: ["googleId"],
      },
      {
        fields: ["location"],
      },
      {
        fields: ["industry"],
      },
      {
        fields: ["isActive"],
      },
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(
            user.password,
            parseInt(process.env.BCRYPT_ROUNDS) || 12
          );
        }
        // Calculate profile completeness
        user.profileCompleteness = calculateProfileCompleteness(user);
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(
            user.password,
            parseInt(process.env.BCRYPT_ROUNDS) || 12
          );
        }
        // Recalculate profile completeness if profile fields changed
        const profileFields = [
          "firstName",
          "lastName",
          "company",
          "jobTitle",
          "industry",
          "experience",
          "location",
          "bio",
          "avatar",
        ];
        if (profileFields.some((field) => user.changed(field))) {
          user.profileCompleteness = calculateProfileCompleteness(user);
        }
      },
    },
  }
);

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user) {
  let score = 0;
  const maxScore = 100;

  // Basic info (30 points)
  if (user.firstName) score += 10;
  if (user.lastName) score += 10;
  if (user.email) score += 10;

  // Professional info (40 points)
  if (user.company) score += 10;
  if (user.jobTitle) score += 10;
  if (user.industry) score += 10;
  if (user.experience) score += 10;

  // Additional info (30 points)
  if (user.location) score += 10;
  if (user.bio) score += 10;
  if (user.avatar) score += 10;

  return Math.min(score, maxScore);
}

// Instance methods
User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  delete values.emailVerificationToken;
  delete values.emailVerificationExpires;
  delete values.refreshToken;
  return values;
};

User.prototype.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

export default User;
