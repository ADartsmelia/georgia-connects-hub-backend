import { ChatMember } from "./src/models/index.js";

async function checkChatMembers() {
  try {
    const chatId = "f0569376-1765-4586-8cb5-8fcbe94003e4";
    
    console.log(`Checking chat members for chat: ${chatId}`);
    
    const members = await ChatMember.findAll({
      where: { 
        chatId: chatId,
        isActive: true 
      }
    });
    
    console.log(`Found ${members.length} active members:`);
    members.forEach(member => {
      console.log(`- User ID: ${member.userId}, Role: ${member.role}, Active: ${member.isActive}`);
    });
    
    // Also check all members (including inactive)
    const allMembers = await ChatMember.findAll({
      where: { 
        chatId: chatId
      }
    });
    
    console.log(`\nAll members (including inactive): ${allMembers.length}`);
    allMembers.forEach(member => {
      console.log(`- User ID: ${member.userId}, Role: ${member.role}, Active: ${member.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkChatMembers();

