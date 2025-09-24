import { User, ChatMember } from "./src/models/index.js";

async function testUserQuery() {
  try {
    const chatId = "f0569376-1765-4586-8cb5-8fcbe94003e4";
    
    console.log(`Testing User query for chat: ${chatId}`);
    
    const allMembers = await User.findAll({
      include: [
        {
          model: ChatMember,
          as: "ChatMember",
          where: { 
            chatId: chatId,
            isActive: true 
          },
          attributes: ["id", "role", "joinedAt", "lastReadAt", "isActive", "isMuted", "muteUntil", "unreadCount", "createdAt", "updatedAt"],
        },
      ],
      attributes: ["id", "firstName", "lastName", "avatar"],
    });
    
    console.log(`Found ${allMembers.length} users:`);
    allMembers.forEach(user => {
      console.log(`- User: ${user.firstName} ${user.lastName} (${user.id})`);
      console.log(`  ChatMember:`, user.ChatMember);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testUserQuery();

