import { Chat, User, ChatMember, Message } from "./src/models/index.js";

async function testFullChats() {
  try {
    const userId = "7ce8579b-b708-4112-9bb3-fc0313603365";
    
    console.log(`Testing full getChats logic for user: ${userId}`);
    
    // First, get chats where user is a member
    const { count, rows: chats } = await Chat.findAndCountAll({
      include: [
        {
          model: User,
          as: "members",
          where: { id: userId },
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
    
    console.log(`Found ${chats.length} chats`);
    
    // Get all members for each chat
    const chatsWithMembers = await Promise.all(
      chats.map(async (chat) => {
        const allMembers = await User.findAll({
          include: [
            {
              model: ChatMember,
              as: "ChatMember",
              where: { 
                chatId: chat.id,
                isActive: true 
              },
              attributes: ["id", "role", "joinedAt", "lastReadAt", "isActive", "isMuted", "muteUntil", "unreadCount", "createdAt", "updatedAt"],
            },
          ],
          attributes: ["id", "firstName", "lastName", "avatar"],
        });

        const result = {
          ...chat.toJSON(),
          members: allMembers,
        };
        
        console.log(`Chat ${chat.id} has ${allMembers.length} members:`);
        allMembers.forEach(member => {
          console.log(`  - ${member.firstName} ${member.lastName} (${member.id})`);
        });
        
        return result;
      })
    );
    
    console.log(`\nFinal result: ${chatsWithMembers.length} chats with members`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testFullChats();

