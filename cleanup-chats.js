import { Chat, ChatMember, Message, User } from "./src/models/index.js";

async function deleteIncompleteChats() {
  try {
    console.log("Starting chat cleanup...");

    // Find all direct chats
    const directChats = await Chat.findAll({
      where: { type: "direct" },
      include: [
        {
          model: User,
          as: "members",
          through: { where: { isActive: true } },
        },
      ],
    });

    console.log(`Found ${directChats.length} direct chats`);

    for (const chat of directChats) {
      console.log(`Chat ID: ${chat.id}, Members: ${chat.members.length}`);

      // Delete if chat has less than 2 members
      if (chat.members.length < 2) {
        console.log(`Deleting incomplete chat: ${chat.id}`);

        // Delete messages first
        await Message.destroy({ where: { chatId: chat.id } });

        // Delete chat members
        await ChatMember.destroy({ where: { chatId: chat.id } });

        // Delete chat
        await chat.destroy();

        console.log(`Deleted chat: ${chat.id}`);
      }
    }

    console.log("Cleanup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

deleteIncompleteChats();

