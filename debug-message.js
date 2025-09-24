import { sequelize } from "./src/database/connection.js";
import { Message, User, Chat } from "./src/models/index.js";

async function testMessageQuery() {
  try {
    console.log("Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("Testing Message model...");

    // Test simple message query
    const messages = await Message.findAll({
      limit: 1,
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    });

    console.log("✅ Message query executed successfully");
    console.log("Messages found:", messages.length);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

testMessageQuery();
