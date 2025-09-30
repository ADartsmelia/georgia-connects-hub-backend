import { Sequelize } from "sequelize";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "./.env" });

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  logging: false,
});

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log("✓ Database connection established");

    // Check if admin user already exists
    const [existingAdmin] = await sequelize.query(
      "SELECT id, email FROM users WHERE email = 'admin@networkinggeorgia.com'",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingAdmin) {
      console.log("\n✓ Admin user already exists!");
      console.log("\nLogin Credentials:");
      console.log("  Email:    admin@networkinggeorgia.com");
      console.log("  Password: admin123");
      console.log("\nAccess at: http://localhost:8081/admin/login");
      await sequelize.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 12);

    // Create admin user
    await sequelize.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", "phoneNumber", 
        "isEmailVerified", "isActive", "userType", "passType", "isAdmin", 
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), 
        'admin@networkinggeorgia.com', 
        '${hashedPassword}', 
        'Admin', 
        'User', 
        '+995555123456', 
        true, 
        true, 
        'admin', 
        'full_pass', 
        true, 
        NOW(), 
        NOW()
      )
    `);

    console.log("\n🎉 Admin user created successfully!");
    console.log("\n" + "=".repeat(50));
    console.log("Login Credentials:");
    console.log("=".repeat(50));
    console.log("  Email:    admin@networkinggeorgia.com");
    console.log("  Password: admin123");
    console.log("=".repeat(50));
    console.log("\nAccess Admin Dashboard:");
    console.log("  http://localhost:8081/admin/login");
    console.log("\n⚠️  Please change the password after first login!");

    await sequelize.close();
  } catch (error) {
    console.error("\n✗ Error creating admin user:", error.message);
    await sequelize.close();
    process.exit(1);
  }
}

createAdminUser();
