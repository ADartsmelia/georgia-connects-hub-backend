import { User } from "./User.js";
import { Post } from "./Post.js";
import { Comment } from "./Comment.js";
import { Connection } from "./Connection.js";
import { Team } from "./Team.js";
import { TeamMember } from "./TeamMember.js";
import { Chat } from "./Chat.js";
import { Message } from "./Message.js";
import { ChatMember } from "./ChatMember.js";
import { Sponsor } from "./Sponsor.js";
import { Offer } from "./Offer.js";
import { Media } from "./Media.js";
import { Quiz } from "./Quiz.js";
import { QuizAttempt } from "./QuizAttempt.js";
import { Badge } from "./Badge.js";
import { UserBadge } from "./UserBadge.js";
import { Contest } from "./Contest.js";
import { ContestEntry } from "./ContestEntry.js";
import { Playlist } from "./Playlist.js";
import { Notification } from "./Notification.js";
import { OTP } from "./OTP.js";
import Like from "./Like.js";
import AgendaCheckIn from "./AgendaCheckIn.js";
import Agenda from "./Agenda.js";
import { SponsorPass } from "./SponsorPass.js";

// User associations
User.hasMany(Post, { foreignKey: "authorId", as: "posts" });
User.hasMany(Comment, { foreignKey: "authorId", as: "comments" });
User.hasMany(Team, { foreignKey: "creatorId", as: "createdTeams" });
User.hasMany(Chat, { foreignKey: "createdBy", as: "createdChats" });
User.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
User.hasMany(Media, { foreignKey: "uploaderId", as: "uploadedMedia" });
User.hasMany(Quiz, { foreignKey: "creatorId", as: "createdQuizzes" });
User.hasMany(QuizAttempt, { foreignKey: "userId", as: "quizAttempts" });
User.hasMany(ContestEntry, { foreignKey: "userId", as: "contestEntries" });
User.hasMany(Playlist, { foreignKey: "addedBy", as: "addedPlaylistItems" });
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
User.hasMany(OTP, { foreignKey: "userId", as: "otps" });
User.hasMany(Like, { foreignKey: "userId", as: "likes" });
User.hasMany(AgendaCheckIn, { foreignKey: "userId", as: "agendaCheckIns" });
User.hasMany(SponsorPass, { foreignKey: "userId", as: "sponsorPasses" });
User.hasMany(SponsorPass, {
  foreignKey: "issuedBy",
  as: "issuedSponsorPasses",
});
User.hasMany(User, { foreignKey: "assignedBy", as: "assignedUsers" });
User.belongsTo(User, { foreignKey: "assignedBy", as: "assignedByUser" });

// Connection associations
User.belongsToMany(User, {
  through: Connection,
  as: "connections",
  foreignKey: "requesterId",
  otherKey: "addresseeId",
});

User.belongsToMany(User, {
  through: Connection,
  as: "connectionRequests",
  foreignKey: "addresseeId",
  otherKey: "requesterId",
});

Connection.belongsTo(User, { foreignKey: "requesterId", as: "requester" });
Connection.belongsTo(User, { foreignKey: "addresseeId", as: "addressee" });

// Post associations
Post.belongsTo(User, { foreignKey: "authorId", as: "author" });
Post.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
Post.belongsTo(Team, { foreignKey: "teamId", as: "team" });
Post.hasMany(Comment, { foreignKey: "postId", as: "comments" });
Post.hasMany(Like, { foreignKey: "postId", as: "likeRecords" });

// Like associations
Like.belongsTo(User, { foreignKey: "userId", as: "user" });
Like.belongsTo(Post, { foreignKey: "postId", as: "post" });

Comment.belongsTo(Post, { foreignKey: "postId", as: "post" });
Comment.belongsTo(User, { foreignKey: "authorId", as: "author" });
Comment.belongsTo(Comment, { foreignKey: "parentId", as: "parent" });
Comment.hasMany(Comment, { foreignKey: "parentId", as: "replies" });

// Team associations
Team.belongsTo(User, { foreignKey: "creatorId", as: "creator" });
Team.hasMany(Post, { foreignKey: "teamId", as: "posts" });

User.belongsToMany(Team, {
  through: TeamMember,
  as: "teams",
  foreignKey: "userId",
  otherKey: "teamId",
});

Team.belongsToMany(User, {
  through: TeamMember,
  as: "members",
  foreignKey: "teamId",
  otherKey: "userId",
});

TeamMember.belongsTo(User, { foreignKey: "userId", as: "user" });
TeamMember.belongsTo(Team, { foreignKey: "teamId", as: "team" });
TeamMember.belongsTo(User, { foreignKey: "invitedBy", as: "inviter" });

// Chat associations
Chat.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Chat.hasMany(Message, { foreignKey: "chatId", as: "messages" });

User.belongsToMany(Chat, {
  through: ChatMember,
  as: "chats",
  foreignKey: "userId",
  otherKey: "chatId",
});

Chat.belongsToMany(User, {
  through: ChatMember,
  as: "members",
  foreignKey: "chatId",
  otherKey: "userId",
});

ChatMember.belongsTo(User, { foreignKey: "userId", as: "user" });
ChatMember.belongsTo(Chat, { foreignKey: "chatId", as: "chat" });

// Add ChatMember association to User
User.hasMany(ChatMember, { foreignKey: "userId", as: "ChatMember" });

Message.belongsTo(Chat, { foreignKey: "chatId", as: "chat" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });
Message.belongsTo(Message, { foreignKey: "replyToId", as: "replyTo" });
Message.hasMany(Message, { foreignKey: "replyToId", as: "replies" });

// Sponsor associations
Sponsor.hasMany(Offer, { foreignKey: "sponsorId", as: "offers" });
Sponsor.hasMany(SponsorPass, { foreignKey: "sponsorId", as: "sponsorPasses" });

Offer.belongsTo(Sponsor, { foreignKey: "sponsorId", as: "sponsor" });
SponsorPass.belongsTo(Sponsor, { foreignKey: "sponsorId", as: "sponsor" });
SponsorPass.belongsTo(User, { foreignKey: "userId", as: "user" });
SponsorPass.belongsTo(User, { foreignKey: "issuedBy", as: "issuedByUser" });

// Quiz associations
Quiz.belongsTo(User, { foreignKey: "creatorId", as: "creator" });
Quiz.hasMany(QuizAttempt, { foreignKey: "quizId", as: "attempts" });

QuizAttempt.belongsTo(Quiz, { foreignKey: "quizId", as: "quiz" });
QuizAttempt.belongsTo(User, { foreignKey: "userId", as: "user" });

// Badge associations
User.belongsToMany(Badge, {
  through: UserBadge,
  as: "badges",
  foreignKey: "userId",
  otherKey: "badgeId",
});

Badge.belongsToMany(User, {
  through: UserBadge,
  as: "users",
  foreignKey: "badgeId",
  otherKey: "userId",
});

UserBadge.belongsTo(User, { foreignKey: "userId", as: "user" });
UserBadge.belongsTo(Badge, { foreignKey: "badgeId", as: "badge" });

// Contest associations
Contest.hasMany(ContestEntry, { foreignKey: "contestId", as: "entries" });
Contest.belongsTo(User, { foreignKey: "winnerId", as: "winner" });

ContestEntry.belongsTo(Contest, { foreignKey: "contestId", as: "contest" });
ContestEntry.belongsTo(User, { foreignKey: "userId", as: "user" });

// Playlist associations
Playlist.belongsTo(User, { foreignKey: "addedBy", as: "adder" });

// Notification associations
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });
Notification.belongsTo(User, {
  foreignKey: "relatedUserId",
  as: "relatedUser",
});
Notification.belongsTo(Post, {
  foreignKey: "relatedPostId",
  as: "relatedPost",
});
Notification.belongsTo(Comment, {
  foreignKey: "relatedCommentId",
  as: "relatedComment",
});
Notification.belongsTo(Connection, {
  foreignKey: "relatedConnectionId",
  as: "relatedConnection",
});
Notification.belongsTo(Chat, {
  foreignKey: "relatedChatId",
  as: "relatedChat",
});

// OTP associations
OTP.belongsTo(User, { foreignKey: "userId", as: "user" });

// AgendaCheckIn associations
AgendaCheckIn.belongsTo(User, { foreignKey: "userId", as: "user" });
AgendaCheckIn.belongsTo(Agenda, { foreignKey: "agendaId", as: "agenda" });

// Agenda associations
Agenda.hasMany(AgendaCheckIn, { foreignKey: "agendaId", as: "checkIns" });

export {
  User,
  Post,
  Comment,
  Connection,
  Team,
  TeamMember,
  Chat,
  Message,
  ChatMember,
  Sponsor,
  Offer,
  Media,
  Quiz,
  QuizAttempt,
  Badge,
  UserBadge,
  Contest,
  ContestEntry,
  Playlist,
  Notification,
  OTP,
  Like,
  AgendaCheckIn,
  Agenda,
  SponsorPass,
};
