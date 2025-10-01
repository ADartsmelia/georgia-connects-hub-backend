import { Sequelize } from "sequelize";
import dotenv from "dotenv";

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

async function removeSingleUser() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const t = await sequelize.transaction();

    try {
      const email = "salom.chigvaria@benegroup.ge";

      console.log("🔍 Looking for user to remove...");

      const user = await sequelize.query(
        'SELECT id, email, "firstName", "lastName", "createdAt" FROM users WHERE email = :email',
        {
          replacements: { email: email.toLowerCase() },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (user.length > 0) {
        console.log(`📧 Found: ${email}`);
        console.log(`   ID: ${user[0].id}`);
        console.log(`   Name: ${user[0].firstName} ${user[0].lastName}`);
        console.log(`   Created: ${user[0].createdAt}`);
      } else {
        console.log(`❌ User not found: ${email}`);
        await t.rollback();
        await sequelize.close();
        return;
      }

      console.log("\n⚠️  About to delete user in 3 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

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
        console.log(`ℹ️  No user deleted`);
      }

      await t.commit();
      console.log("✅ User removed successfully!");
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

console.log("🗑️  User Removal Script");
console.log("This will remove: salom.chigvaria@benegroup.ge");
console.log("");

removeSingleUser();
