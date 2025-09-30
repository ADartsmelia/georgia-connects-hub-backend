import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load production environment variables
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

async function clearUsersAndPosts() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Start transaction
    const t = await sequelize.transaction();

    try {
      // 1. Delete all posts (will cascade to related tables)
      const deletedPosts = await sequelize.query(
        'DELETE FROM posts',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all posts`);

      // 2. Delete all non-admin users
      const deletedUsers = await sequelize.query(
        'DELETE FROM users WHERE "isAdmin" = false',
        { transaction: t, type: sequelize.QueryTypes.DELETE }
      );
      console.log(`✅ Deleted all non-admin users`);

      // 3. Verify admin users still exist
      const remainingUsers = await sequelize.query(
        'SELECT id, email, "firstName", "lastName", "isAdmin" FROM users',
        { transaction: t, type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('\n📋 Remaining users:');
      remainingUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Admin: ${user.isAdmin}`);
      });

      // Commit transaction
      await t.commit();
      console.log('\n✅ All changes committed successfully!');
      
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

console.log('⚠️  WARNING: This will delete all posts and non-admin users!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  clearUsersAndPosts();
}, 5000);
