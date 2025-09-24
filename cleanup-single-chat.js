import { Chat, ChatMember, Message } from "./src/models/index.js";

async function deleteSingleChat() {
  try {
    const chatId = "932b6b2e-b2aa-45a4-8e7e-54e2aead66ef";

    console.log(`Deleting chat: ${chatId}`);

    // Delete messages first
    const deletedMessages = await Message.destroy({ where: { chatId } });
    console.log(`Deleted ${deletedMessages} messages`);

    // Delete chat members
    const deletedMembers = await ChatMember.destroy({ where: { chatId } });
    console.log(`Deleted ${deletedMembers} chat members`);

    // Delete chat
    const deletedChats = await Chat.destroy({ where: { id: chatId } });
    console.log(`Deleted ${deletedChats} chats`);

    console.log("Single chat cleanup completed");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

deleteSingleChat();

