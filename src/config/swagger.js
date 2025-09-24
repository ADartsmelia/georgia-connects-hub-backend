import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Georgia Connects Hub API",
      version: "1.0.0",
      description:
        "A comprehensive backend API for the Georgia Connects Hub professional networking platform",
      contact: {
        name: "Georgia Connects Hub Team",
        email: "support@georgia-connects-hub.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api/v1",
        description: "Development server",
      },
      {
        url: "https://api.georgia-connects-hub.com/api/v1",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "User unique identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            firstName: {
              type: "string",
              description: "User first name",
            },
            lastName: {
              type: "string",
              description: "User last name",
            },
            jobTitle: {
              type: "string",
              description: "User job title",
            },
            company: {
              type: "string",
              description: "User company",
            },
            avatar: {
              type: "string",
              format: "uri",
              description: "User profile picture URL",
            },
            isEmailVerified: {
              type: "boolean",
              description: "Email verification status",
            },
            isActive: {
              type: "boolean",
              description: "Account active status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            content: {
              type: "string",
              description: "Post content",
            },
            type: {
              type: "string",
              enum: ["text", "image", "video", "poll", "link"],
              description: "Post type",
            },
            authorId: {
              type: "string",
              format: "uuid",
              description: "Author user ID",
            },
            author: {
              $ref: "#/components/schemas/User",
            },
            likes: {
              type: "integer",
              description: "Number of likes",
            },
            commentCount: {
              type: "integer",
              description: "Number of comments",
            },
            shares: {
              type: "integer",
              description: "Number of shares",
            },
            views: {
              type: "integer",
              description: "Number of views",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Post tags",
            },
            isPublic: {
              type: "boolean",
              description: "Whether the post is public",
            },
            teamId: {
              type: "string",
              format: "uuid",
              description: "Team ID if posted to a team",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Connection: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            requesterId: {
              type: "string",
              format: "uuid",
              description: "User who sent the connection request",
            },
            addresseeId: {
              type: "string",
              format: "uuid",
              description: "User who received the connection request",
            },
            status: {
              type: "string",
              enum: ["pending", "accepted", "rejected"],
              description: "Connection status",
            },
            message: {
              type: "string",
              description: "Optional connection message",
            },
            requester: {
              $ref: "#/components/schemas/User",
            },
            addressee: {
              $ref: "#/components/schemas/User",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            content: {
              type: "string",
              description: "Comment content",
            },
            authorId: {
              type: "string",
              format: "uuid",
              description: "Comment author ID",
            },
            author: {
              $ref: "#/components/schemas/User",
            },
            postId: {
              type: "string",
              format: "uuid",
              description: "Post ID",
            },
            parentId: {
              type: "string",
              format: "uuid",
              description: "Parent comment ID for replies",
            },
            likes: {
              type: "integer",
              description: "Number of likes",
            },
            replyCount: {
              type: "integer",
              description: "Number of replies",
            },
            isEdited: {
              type: "boolean",
              description: "Whether the comment was edited",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
            error: {
              type: "string",
              description: "Error details",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              description: "Success message",
            },
            data: {
              type: "object",
              description: "Response data",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/docs/*.js"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
