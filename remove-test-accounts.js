import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "./.env" });

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

async function removeTestAccounts() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const t = await sequelize.transaction();

    try {
      // List of test emails to remove
      const testEmails = [
        "test@exmaple.com",
        "test4@gmail.com",
        "test3@gmail.com",
        "jhon@gmail.com",
        "anri2@gmail.com",
        "anri@gmail.com",
        "test@gmail.com",
        "test@example.com",
      ];

      console.log("🔍 Looking for test accounts to remove...");

      // First, let's see what accounts exist
      for (const email of testEmails) {
        const user = await sequelize.query(
          'SELECT id, email, "firstName", "lastName", "createdAt" FROM users WHERE email = :email',
          {
            replacements: { email: email.toLowerCase() },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (user.length > 0) {
          console.log(`📧 Found: ${email} (ID: ${user[0].id})`);
        } else {
          console.log(`❌ Not found: ${email}`);
        }
      }

      console.log("\n⚠️  About to delete test accounts in 3 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Delete users with test emails
      for (const email of testEmails) {
        const result = await sequelize.query(
          "DELETE FROM users WHERE email = :email",
          {
            replacements: { email: email.toLowerCase() },
            transaction: t,
          }
        );

        if (result[1] > 0) {
          console.log(`✅ Deleted: ${email}`);
        } else {
          console.log(`ℹ️  No account found: ${email}`);
        }
      }

      await t.commit();
      console.log("✅ All test accounts removed successfully!");
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

console.log("🗑️  Test Account Removal Script");
console.log("This will remove the following test accounts:");
console.log("- test@exmaple.com");
console.log("- test4@gmail.com");
console.log("- test3@gmail.com");
console.log("- jhon@gmail.com");
console.log("- anri2@gmail.com");
console.log("- anri@gmail.com");
console.log("- test@gmail.com");
console.log("- test@example.com");
console.log("");

removeTestAccounts();

