import { Chat, ChatMember, Message, User } from "./src/models/index.js";

async function forceDeleteChat() {
  try {
    console.log("Force deleting all direct chats...");
    
    const chatId = "9901fa85-3939-4fd2-8f1f-1576da35791d";
    
    // Delete messages first
    const deletedMessages = await Message.destroy({ where: { chatId } });
    console.log(`Deleted ${deletedMessages} messages`);
    
    // Delete chat members
    const deletedMembers = await ChatMember.destroy({ where: { chatId } });
    console.log(`Deleted ${deletedMembers} chat members`);
    
    // Delete chat
    const deletedChats = await Chat.destroy({ where: { id: chatId } });
    console.log(`Deleted ${deletedChats} chats`);
    
    console.log("Force delete completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during force delete:", error);
    process.exit(1);
  }
}

forceDeleteChat();
