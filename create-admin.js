import { Sequelize } from "sequelize";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: "./database.env" });

const sequelize = new Sequelize({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || "georgia_connects_hub",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  dialect: "postgres",
  logging: false,
});

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully");

    // Check if admin user already exists
    const existingAdmin = await sequelize.query(
      "SELECT id FROM users WHERE email = 'dartsmelia.anzor@gmail.com'",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 12);

    // Create admin user
    await sequelize.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", "phoneNumber", 
        "isEmailVerified", "isActive", "userType", "passType", "isAdmin", 
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 'dartsmelia.anzor@gmail.com', '${hashedPassword}', 'Admin', 'User', '+995555123456', 
        true, true, 'Full pass', 'Full pass', true, NOW(), NOW()
      )
    `);

    console.log("Admin user created successfully");
    console.log("Email: dartsmelia.anzor@gmail.com");
    console.log("Password: password123");
  } catch (error) {
    console.error("Error creating admin user:", error.message);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
