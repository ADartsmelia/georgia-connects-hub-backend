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

async function clearPosts() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const t = await sequelize.transaction();

    try {
      // Delete posts (cascades to comments, likes, media)
      await sequelize.query('DELETE FROM posts', { transaction: t });
      console.log("✅ Posts cleared");

      await t.commit();
      console.log("✅ Done!");
      
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

console.log("⚠️  Clearing all posts in 3 seconds...");
setTimeout(clearPosts, 3000);
