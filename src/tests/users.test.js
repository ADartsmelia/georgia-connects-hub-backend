import request from "supertest";
import { app } from "../server.js";
import { User } from "../models/User.js";

describe("Users", () => {
  let token;
  let user;

  beforeEach(async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
    };

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(userData);

    token = response.body.data.token;
    user = response.body.data.user;
  });

  describe("GET /api/v1/users/:id", () => {
    it("should get user profile by ID", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.firstName).toBe(user.firstName);
      expect(response.body.data.user.lastName).toBe(user.lastName);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/api/v1/users/00000000-0000-0000-0000-000000000000")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });
  });

  describe("PUT /api/v1/users/profile", () => {
    it("should update user profile", async () => {
      const updateData = {
        company: "Test Company",
        jobTitle: "Software Engineer",
        bio: "Test bio",
      };

      const response = await request(app)
        .put("/api/v1/users/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.company).toBe(updateData.company);
      expect(response.body.data.user.jobTitle).toBe(updateData.jobTitle);
      expect(response.body.data.user.bio).toBe(updateData.bio);
    });

    it("should not allow updating email", async () => {
      const updateData = {
        email: "newemail@example.com",
      };

      const response = await request(app)
        .put("/api/v1/users/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Email should remain unchanged
      expect(response.body.data.user.email).toBe(user.email);
    });
  });

  describe("GET /api/v1/users", () => {
    beforeEach(async () => {
      // Create additional users for search testing
      const users = [
        {
          email: "user1@example.com",
          password: "password123",
          firstName: "Alice",
          lastName: "Smith",
          company: "Tech Corp",
        },
        {
          email: "user2@example.com",
          password: "password123",
          firstName: "Bob",
          lastName: "Johnson",
          company: "Business Inc",
        },
      ];

      for (const userData of users) {
        await request(app).post("/api/v1/auth/register").send(userData);
      }
    });

    it("should get all users", async () => {
      const response = await request(app).get("/api/v1/users").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    it("should search users by name", async () => {
      const response = await request(app)
        .get("/api/v1/users?search=Alice")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0].firstName).toBe("Alice");
    });

    it("should filter users by company", async () => {
      const response = await request(app)
        .get("/api/v1/users?search=Tech Corp")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0].company).toBe("Tech Corp");
    });
  });

  describe("GET /api/v1/users/:id/stats", () => {
    it("should get user statistics", async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user.id}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("postsCount");
      expect(response.body.data).toHaveProperty("commentsCount");
      expect(response.body.data).toHaveProperty("connectionsCount");
      expect(response.body.data).toHaveProperty("badgesCount");
      expect(response.body.data).toHaveProperty("totalPoints");
    });
  });

  describe("PUT /api/v1/users/settings", () => {
    it("should update user settings", async () => {
      const settingsData = {
        notificationSettings: {
          email: false,
          push: true,
        },
        privacySettings: {
          profileVisibility: "private",
        },
      };

      const response = await request(app)
        .put("/api/v1/users/settings")
        .set("Authorization", `Bearer ${token}`)
        .send(settingsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.notificationSettings.email).toBe(false);
      expect(response.body.data.user.notificationSettings.push).toBe(true);
      expect(response.body.data.user.privacySettings.profileVisibility).toBe(
        "private"
      );
    });
  });

  describe("DELETE /api/v1/users/account", () => {
    it("should delete user account with correct password", async () => {
      const response = await request(app)
        .delete("/api/v1/users/account")
        .set("Authorization", `Bearer ${token}`)
        .send({ password: "password123" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");
    });

    it("should not delete account with incorrect password", async () => {
      const response = await request(app)
        .delete("/api/v1/users/account")
        .set("Authorization", `Bearer ${token}`)
        .send({ password: "wrongpassword" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid password");
    });

    it("should not delete account without password", async () => {
      const response = await request(app)
        .delete("/api/v1/users/account")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Password is required");
    });
  });
});
