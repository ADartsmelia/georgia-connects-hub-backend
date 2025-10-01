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
    console.log("✅ Database connection established successfully");

    // Start transaction
    const t = await sequelize.transaction();

    try {
      // Get count of posts before deletion
      const postCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM posts',
        { transaction: t, type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📊 Found ${postCount[0].count} posts to delete`);

      // Delete all posts (this will cascade to related tables like comments, likes, media)
      const deletedPosts = await sequelize.query(
        'DELETE FROM posts',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all posts`);

      // Also clear related tables that might have orphaned records
      const deletedComments = await sequelize.query(
        'DELETE FROM comments',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all comments`);

      const deletedLikes = await sequelize.query(
        'DELETE FROM likes',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all likes`);

      const deletedMedia = await sequelize.query(
        'DELETE FROM media',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all media`);

      // Verify posts are deleted
      const remainingPosts = await sequelize.query(
        'SELECT COUNT(*) as count FROM posts',
        { transaction: t, type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📊 Remaining posts: ${remainingPosts[0].count}`);

      // Commit transaction
      await t.commit();
      console.log('\n✅ All posts and related data cleared successfully!');
      
    } catch (error) {
      await t.rollback();
      console.error('❌ Error during cleanup, transaction rolled back:', error);
      throw error;
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

console.log('⚠️  WARNING: This will delete ALL posts and related data (comments, likes, media)!');
console.log('⚠️  Users will be preserved.');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  clearPosts();
}, 5000);

