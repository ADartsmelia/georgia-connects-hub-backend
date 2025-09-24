# Georgia Connects Hub - Backend API

A comprehensive backend API for the Georgia Connects Hub professional networking platform built with Node.js, Express, and PostgreSQL.

## 🚀 Features

### Core Features

- **User Authentication & Management**: JWT-based auth with email verification, password reset
- **OTP Verification System**: SendGrid-powered OTP verification with fixed OTP for development
- **Professional Networking**: Connection requests, friend management, mutual connections
- **Real-time Chat**: WebSocket-powered messaging with typing indicators
- **Content Sharing**: Posts, comments, likes, polls with team collaboration
- **Sponsor Directory**: Business listings with offers and QR codes
- **Media Library**: Video, podcast, and document sharing
- **Knowledge Quizzes**: Interactive learning with badges and points
- **Photo Contests**: Community competitions with voting
- **Playlist System**: Curated educational content
- **API Documentation**: Complete Swagger/OpenAPI documentation

### Technical Features

- **RESTful API**: Well-structured endpoints with comprehensive validation
- **API Documentation**: Swagger/OpenAPI documentation with interactive testing
- **Real-time Communication**: Socket.io for instant messaging and notifications
- **Database Management**: Sequelize ORM with PostgreSQL
- **Security**: Helmet, CORS, rate limiting, input validation
- **Testing**: Comprehensive test suite with Jest
- **Logging**: Winston-based structured logging
- **Email System**: Nodemailer with HTML templates + SendGrid for OTP
- **OTP System**: SendGrid integration with fixed OTP for development/staging
- **File Upload**: Multer with AWS S3 integration
- **Caching**: Redis for session management and caching

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io
- **Validation**: Joi
- **Testing**: Jest with Supertest
- **Logging**: Winston
- **Email**: Nodemailer with Handlebars templates
- **File Storage**: AWS S3
- **Cache**: Redis
- **Security**: Helmet, CORS, bcryptjs

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 12 or higher
- Redis (optional, for caching)
- AWS S3 account (for file storage)
- SMTP email service (Gmail, SendGrid, etc.)
- SendGrid account (for OTP delivery)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd georgia-connects-hub-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=georgia_connects_hub
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT
   JWT_SECRET=your_super_secret_jwt_key

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password

   # AWS S3
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   S3_BUCKET_NAME=your_bucket_name
   ```

4. **Database Setup**

   ```bash
   # Create database
   createdb georgia_connects_hub

   # Run migrations
   npm run migrate

   # Seed initial data
   npm run seed
   ```

## 🏃‍♂️ Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📚 API Documentation

### Swagger Documentation

Interactive API documentation is available at:

- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://your-domain.com/api-docs`

The documentation includes:

- Complete endpoint specifications
- Request/response schemas
- Authentication requirements
- Interactive testing capabilities

### OTP System

The OTP system supports:

- **Email verification**: Send and verify OTP codes via SendGrid
- **Password reset**: Secure password reset with OTP verification
- **Phone verification**: SMS-based verification (placeholder for future implementation)
- **Two-factor authentication**: Additional security layer
- **Development mode**: Fixed OTP `4444` for local and staging environments

#### Environment Variables for OTP

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@georgia-connects-hub.com
SENDGRID_FROM_NAME=Georgia Connects Hub

# Environment
NODE_ENV=development  # Uses fixed OTP 4444 for development/staging
```

### Authentication Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/send-verification-otp` - Send OTP for email verification
- `POST /api/v1/auth/verify-otp` - Verify OTP for email verification
- `POST /api/v1/auth/send-password-reset-otp` - Send OTP for password reset
- `POST /api/v1/auth/reset-password-with-otp` - Reset password using OTP

### User Management

- `GET /api/v1/users` - Get all users (with search/filters)
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `PUT /api/v1/users/settings` - Update user settings
- `DELETE /api/v1/users/account` - Delete user account

### Networking

- `POST /api/v1/connections/send` - Send connection request
- `GET /api/v1/connections` - Get user connections
- `GET /api/v1/connections/requests/received` - Get received requests
- `GET /api/v1/connections/requests/sent` - Get sent requests
- `POST /api/v1/connections/:id/accept` - Accept connection
- `POST /api/v1/connections/:id/reject` - Reject connection

### Content & Posts

- `GET /api/v1/posts` - Get posts feed
- `POST /api/v1/posts` - Create new post
- `GET /api/v1/posts/:id` - Get single post
- `PUT /api/v1/posts/:id` - Update post
- `DELETE /api/v1/posts/:id` - Delete post
- `POST /api/v1/posts/:id/like` - Like/unlike post
- `POST /api/v1/posts/:id/comments` - Add comment

### Real-time Chat

- `POST /api/v1/chat` - Create chat
- `GET /api/v1/chat` - Get user chats
- `GET /api/v1/chat/:id` - Get chat details
- `POST /api/v1/chat/:id/messages` - Send message
- `PUT /api/v1/chat/messages/:id` - Edit message
- `DELETE /api/v1/chat/messages/:id` - Delete message

### Sponsors & Offers

- `GET /api/v1/sponsors` - Get sponsors
- `POST /api/v1/sponsors` - Create sponsor
- `GET /api/v1/sponsors/:id` - Get sponsor details
- `GET /api/v1/sponsors/:id/offers` - Get sponsor offers
- `POST /api/v1/sponsors/:id/offers` - Create offer

### Media & Learning

- `GET /api/v1/media` - Get media library
- `POST /api/v1/media` - Upload media
- `GET /api/v1/quiz` - Get quizzes
- `POST /api/v1/quiz` - Create quiz
- `POST /api/v1/quiz/:id/attempt` - Submit quiz attempt
- `GET /api/v1/badges` - Get badges
- `GET /api/v1/badges/user/:userId` - Get user badges

### Contests & Community

- `GET /api/v1/contests` - Get contests
- `POST /api/v1/contests` - Create contest
- `POST /api/v1/contests/:id/entries` - Submit contest entry
- `POST /api/v1/contests/:id/entries/:entryId/vote` - Vote for entry
- `GET /api/v1/playlist` - Get playlist items
- `POST /api/v1/playlist` - Add playlist item

### Notifications

- `GET /api/v1/notifications` - Get user notifications
- `GET /api/v1/notifications/count` - Get unread notification count
- `PUT /api/v1/notifications/:id/read` - Mark notification as read
- `PUT /api/v1/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/v1/notifications/:id` - Delete notification
- `GET /api/v1/notifications/preferences` - Get notification preferences
- `PUT /api/v1/notifications/preferences` - Update notification preferences

### File Uploads

- `POST /api/v1/uploads/profile-picture` - Upload profile picture
- `POST /api/v1/uploads/contest-entry` - Upload contest entry photo
- `POST /api/v1/uploads/post-media` - Upload post media files
- `POST /api/v1/uploads/media-library` - Upload media library content
- `POST /api/v1/uploads/team-avatar` - Upload team avatar
- `POST /api/v1/uploads/sponsor-logo` - Upload sponsor logo
- `POST /api/v1/uploads/offer-image` - Upload offer image
- `DELETE /api/v1/uploads/:filename` - Delete uploaded file
- `GET /api/v1/uploads/config` - Get upload configuration

### OTP Management

- `POST /api/v1/otp/send-email-verification` - Send OTP for email verification
- `POST /api/v1/otp/send-phone-verification` - Send OTP for phone verification
- `POST /api/v1/otp/send-password-reset` - Send OTP for password reset
- `POST /api/v1/otp/send-2fa` - Send OTP for two-factor authentication
- `POST /api/v1/otp/verify` - Verify OTP
- `POST /api/v1/otp/resend` - Resend OTP
- `POST /api/v1/otp/cleanup` - Clean up expired OTPs (Admin only)

## 🔌 WebSocket Events

### Client to Server

- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `send_connection_request` - Send connection request
- `accept_connection_request` - Accept connection request
- `post_liked` - Post liked notification
- `post_commented` - Post commented notification
- `update_activity` - Update user activity
- `notification_preferences` - Update notification preferences
- `ping` - Ping for connection health

### Server to Client

- `new_message` - New message received
- `user_joined_chat` - User joined chat
- `user_left_chat` - User left chat
- `user_typing` - User typing indicator
- `connection_request_received` - Connection request received
- `connection_request_accepted` - Connection request accepted
- `post_liked_notification` - Post liked notification
- `post_commented_notification` - Post commented notification
- `new_notification` - New notification received
- `notification_preferences_updated` - Notification preferences updated
- `user_online` - User came online
- `user_offline` - User went offline
- `pong` - Pong response

## 🗄️ Database Schema

### Core Tables

- `users` - User profiles and authentication
- `posts` - User posts and content
- `comments` - Post comments
- `connections` - User connections and friend requests
- `chats` - Chat rooms
- `messages` - Chat messages
- `teams` - Team/group management
- `team_members` - Team membership
- `notifications` - User notifications and alerts

### Feature Tables

- `sponsors` - Business listings
- `offers` - Sponsor offers and deals
- `media` - Media library
- `quizzes` - Learning quizzes
- `quiz_attempts` - Quiz attempts and scores
- `badges` - Achievement badges
- `user_badges` - User badge progress
- `contests` - Photo contests
- `contest_entries` - Contest submissions
- `playlist` - Curated content
- `otps` - OTP verification codes

## 🧪 Testing

The project includes comprehensive tests covering:

- Authentication flows
- User management
- API endpoints
- Database operations
- WebSocket functionality

Run tests with:

```bash
npm test
```

## 🚀 Deployment

### Environment Variables

Ensure all required environment variables are set in production:

```env
NODE_ENV=production
PORT=3000
DB_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your_production_jwt_secret
REDIS_URL=redis://host:port
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=your_production_bucket
```

### Production Checklist

- [ ] Set up PostgreSQL database
- [ ] Configure Redis for caching
- [ ] Set up AWS S3 for file storage
- [ ] Configure SMTP for email
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.
