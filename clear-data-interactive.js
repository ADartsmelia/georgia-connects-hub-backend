import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import readline from "readline";

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function getClearOptions() {
  console.log('\n📋 What would you like to clear?\n');
  
  const clearPosts = await askQuestion('Clear all posts? (y/n): ');
  const clearComments = await askQuestion('Clear all comments? (y/n): ');
  const clearLikes = await askQuestion('Clear all likes? (y/n): ');
  const clearMedia = await askQuestion('Clear all media? (y/n): ');
  const clearConnections = await askQuestion('Clear all connections? (y/n): ');
  const clearChats = await askQuestion('Clear all chats? (y/n): ');
  const clearNotifications = await askQuestion('Clear all notifications? (y/n): ');
  
  return {
    posts: clearPosts.toLowerCase() === 'y',
    comments: clearComments.toLowerCase() === 'y',
    likes: clearLikes.toLowerCase() === 'y',
    media: clearMedia.toLowerCase() === 'y',
    connections: clearConnections.toLowerCase() === 'y',
    chats: clearChats.toLowerCase() === 'y',
    notifications: clearNotifications.toLowerCase() === 'y'
  };
}

async function clearData(options) {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Start transaction
    const t = await sequelize.transaction();

    try {
      let totalDeleted = 0;

      // Clear notifications first (they reference other entities)
      if (options.notifications) {
        const deletedNotifications = await sequelize.query(
          'DELETE FROM notifications',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all notifications`);
        totalDeleted++;
      }

      // Clear chats and related data
      if (options.chats) {
        const deletedMessages = await sequelize.query(
          'DELETE FROM messages',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all messages`);

        const deletedChatMembers = await sequelize.query(
          'DELETE FROM chat_members',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all chat members`);

        const deletedChats = await sequelize.query(
          'DELETE FROM chats',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all chats`);
        totalDeleted++;
      }

      // Clear connections
      if (options.connections) {
        const deletedConnections = await sequelize.query(
          'DELETE FROM connections',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all connections`);
        totalDeleted++;
      }

      // Clear posts and related data
      if (options.posts) {
        // Clear comments first (they reference posts)
        if (options.comments) {
          const deletedComments = await sequelize.query(
            'DELETE FROM comments',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all comments`);
        }

        // Clear likes (they reference posts)
        if (options.likes) {
          const deletedLikes = await sequelize.query(
            'DELETE FROM likes',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all likes`);
        }

        // Clear media (they reference posts)
        if (options.media) {
          const deletedMedia = await sequelize.query(
            'DELETE FROM media',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all media`);
        }

        // Finally delete posts
        const deletedPosts = await sequelize.query(
          'DELETE FROM posts',
          { transaction: t, type: sequelize.QueryTypes.DELETE }
        );
        console.log(`✅ Deleted all posts`);
        totalDeleted++;
      } else {
        // If not clearing posts, still clear comments/likes/media if requested
        if (options.comments) {
          const deletedComments = await sequelize.query(
            'DELETE FROM comments',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all comments`);
          totalDeleted++;
        }

        if (options.likes) {
          const deletedLikes = await sequelize.query(
            'DELETE FROM likes',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all likes`);
          totalDeleted++;
        }

        if (options.media) {
          const deletedMedia = await sequelize.query(
            'DELETE FROM media',
            { transaction: t, type: sequelize.QueryTypes.DELETE }
          );
          console.log(`✅ Deleted all media`);
          totalDeleted++;
        }
      }

      // Commit transaction
      await t.commit();
      console.log(`\n✅ Successfully cleared ${totalDeleted} types of data!`);
      
    } catch (error) {
      await t.rollback();
      console.error('❌ Error during cleanup, transaction rolled back:', error);
      throw error;
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
    rl.close();
  }
}

async function main() {
  console.log('🧹 Georgia Connects Hub - Data Cleanup Tool');
  console.log('==========================================\n');
  
  console.log('⚠️  WARNING: This will permanently delete data from your database!');
  console.log('⚠️  Make sure you have a backup before proceeding.\n');
  
  const confirm = await askQuestion('Are you sure you want to continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    return;
  }

  const options = await getClearOptions();
  
  console.log('\n📋 Summary of what will be cleared:');
  Object.entries(options).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });
  
  const finalConfirm = await askQuestion('\nProceed with cleanup? (yes/no): ');
  
  if (finalConfirm.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    return;
  }

  await clearData(options);
}

main();

