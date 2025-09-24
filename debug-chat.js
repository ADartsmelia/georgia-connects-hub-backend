import { sequelize } from "./src/database/connection.js";
import { Chat, Message, ChatMember, User } from "./src/models/index.js";

async function testChatQuery() {
  try {
    console.log("Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("Testing chat query...");

    // Test the exact query from the chat route
    const { count, rows: chats } = await Chat.findAndCountAll({
      include: [
        {
          model: User,
          as: "members",
          where: { id: "09a3953b-f8a6-48f4-8771-d1a1e4ca2a26" }, // Use a real user ID
          through: { where: { isActive: true } },
          attributes: [],
          required: true,
        },
        {
          model: Message,
          as: "messages",
          attributes: ["id", "content", "type", "createdAt"],
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
      order: [
        ["lastMessageAt", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 20,
      offset: 0,
    });

    console.log("✅ Chat query executed successfully");
    console.log("Count:", count);
    console.log("Chats:", chats.length);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

testChatQuery();
