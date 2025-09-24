import { sequelize } from "./connection.js";
import {
  User,
  Badge,
  Quiz,
  Sponsor,
  Offer,
  Contest,
  Media,
  Playlist,
} from "../models/index.js";
import { logger } from "../utils/logger.js";

async function seed() {
  try {
    logger.info("Starting database seeding...");

    // Seed badges
    const badges = [
      {
        name: "First Connection",
        description: "Make your first professional connection",
        icon: "🤝",
        category: "Networking",
        rarity: "Common",
        requirements: { connections: 1 },
        points: 10,
      },
      {
        name: "Social Butterfly",
        description: "Make 10 professional connections",
        icon: "🦋",
        category: "Networking",
        rarity: "Rare",
        requirements: { connections: 10 },
        points: 50,
      },
      {
        name: "Network Master",
        description: "Make 50 professional connections",
        icon: "🌟",
        category: "Networking",
        rarity: "Epic",
        requirements: { connections: 50 },
        points: 200,
      },
      {
        name: "First Post",
        description: "Share your first post on the platform",
        icon: "📝",
        category: "Engagement",
        rarity: "Common",
        requirements: { posts: 1 },
        points: 10,
      },
      {
        name: "Content Creator",
        description: "Create 10 posts",
        icon: "✍️",
        category: "Engagement",
        rarity: "Rare",
        requirements: { posts: 10 },
        points: 50,
      },
      {
        name: "Thought Leader",
        description: "Create 50 posts",
        icon: "💡",
        category: "Engagement",
        rarity: "Epic",
        requirements: { posts: 50 },
        points: 200,
      },
      {
        name: "Quiz Master",
        description: "Complete your first quiz with 80% or higher",
        icon: "🧠",
        category: "Knowledge",
        rarity: "Common",
        requirements: { quizScore: 80 },
        points: 25,
      },
      {
        name: "Knowledge Seeker",
        description: "Complete 5 quizzes",
        icon: "📚",
        category: "Knowledge",
        rarity: "Rare",
        requirements: { quizzesCompleted: 5 },
        points: 100,
      },
      {
        name: "Georgia Expert",
        description: "Complete 20 quizzes",
        icon: "🏆",
        category: "Knowledge",
        rarity: "Legendary",
        requirements: { quizzesCompleted: 20 },
        points: 500,
      },
    ];

    await Badge.bulkCreate(badges, { ignoreDuplicates: true });
    logger.info("Badges seeded successfully");

    // Seed sample quizzes
    const quizzes = [
      {
        title: "Georgia Business Landscape",
        description: "Test your knowledge about Georgia's business environment",
        category: "Business",
        difficulty: "Medium",
        timeLimit: 300,
        points: 100,
        badge: "Georgia Expert",
        questions: [
          {
            question: "What is the capital of Georgia?",
            options: ["Atlanta", "Savannah", "Augusta", "Columbus"],
            correctAnswer: 0,
            explanation: "Atlanta is the capital and largest city of Georgia.",
          },
          {
            question: "Which industry is NOT a major sector in Georgia?",
            options: [
              "Agriculture",
              "Technology",
              "Manufacturing",
              "Oil and Gas",
            ],
            correctAnswer: 3,
            explanation:
              "Georgia's economy is diverse but oil and gas is not a major sector.",
          },
          {
            question: "What is Georgia's nickname?",
            options: [
              "The Peach State",
              "The Empire State",
              "The Sunshine State",
              "The Volunteer State",
            ],
            correctAnswer: 0,
            explanation:
              'Georgia is known as "The Peach State" due to its peach production.',
          },
        ],
      },
      {
        title: "Networking Best Practices",
        description: "Learn about effective networking strategies",
        category: "Professional Development",
        difficulty: "Easy",
        timeLimit: 180,
        points: 75,
        questions: [
          {
            question: "What is the most important aspect of networking?",
            options: [
              "Selling yourself",
              "Building relationships",
              "Collecting business cards",
              "Attending events",
            ],
            correctAnswer: 1,
            explanation:
              "Building genuine relationships is the foundation of effective networking.",
          },
          {
            question: "How often should you follow up with new connections?",
            options: [
              "Immediately",
              "Within 24-48 hours",
              "Within a week",
              "Only when you need something",
            ],
            correctAnswer: 1,
            explanation:
              "Following up within 24-48 hours shows professionalism and interest.",
          },
        ],
      },
    ];

    await Quiz.bulkCreate(quizzes, { ignoreDuplicates: true });
    logger.info("Quizzes seeded successfully");

    // Seed sample sponsors
    const sponsors = [
      {
        name: "TechSpace Atlanta",
        description: "Premium coworking space in the heart of Atlanta",
        website: "https://techspaceatlanta.com",
        category: "Coworking",
        location: "Atlanta, GA",
        contactEmail: "info@techspaceatlanta.com",
        contactPhone: "(404) 555-0123",
        isVerified: true,
        subscriptionType: "premium",
      },
      {
        name: "Georgia Business Summit",
        description: "Annual business conference for Georgia professionals",
        website: "https://gabusinesssummit.com",
        category: "Events",
        location: "Atlanta, GA",
        contactEmail: "info@gabusinesssummit.com",
        isVerified: true,
        subscriptionType: "premium",
      },
      {
        name: "Atlanta Coffee Co.",
        description: "Artisanal coffee roasters serving Georgia since 2010",
        website: "https://atlantacoffee.com",
        category: "Food & Beverage",
        location: "Atlanta, GA",
        contactEmail: "hello@atlantacoffee.com",
        contactPhone: "(404) 555-0456",
        isVerified: true,
        subscriptionType: "basic",
      },
      {
        name: "CloudTech Solutions",
        description: "Cloud computing and IT consulting services",
        website: "https://cloudtechsolutions.com",
        category: "Technology",
        location: "Atlanta, GA",
        contactEmail: "contact@cloudtechsolutions.com",
        isVerified: true,
        subscriptionType: "premium",
      },
    ];

    await Sponsor.bulkCreate(sponsors, { ignoreDuplicates: true });
    logger.info("Sponsors seeded successfully");

    // Seed sample offers
    const sponsorIds = await Sponsor.findAll({ attributes: ["id"] });

    if (sponsorIds.length > 0) {
      const offers = [
        {
          sponsorId: sponsorIds[0].id,
          title: "Free Day Pass",
          description: "Get a free day pass to our premium coworking space",
          discountType: "free",
          discountValue: 0,
          originalPrice: 25,
          category: "Coworking",
          location: "Atlanta, GA",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          maxRedemptions: 100,
          terms: "Valid for first-time visitors only. Must show valid ID.",
        },
        {
          sponsorId: sponsorIds[1].id,
          title: "Early Bird Discount",
          description: "Get 20% off your conference ticket",
          discountType: "percentage",
          discountValue: 20,
          originalPrice: 299,
          category: "Events",
          location: "Atlanta, GA",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          maxRedemptions: 50,
          terms: "Early bird pricing valid until 30 days before event.",
        },
        {
          sponsorId: sponsorIds[2].id,
          title: "Buy One Get One Free",
          description: "Buy any coffee drink and get another free",
          discountType: "bogo",
          discountValue: 50,
          originalPrice: 5,
          category: "Food & Beverage",
          location: "Atlanta, GA",
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          terms: "Valid for drinks only. Cannot be combined with other offers.",
        },
      ];

      await Offer.bulkCreate(offers, { ignoreDuplicates: true });
      logger.info("Offers seeded successfully");
    }

    // Seed sample contests
    const contests = [
      {
        title: "Georgia Innovation Photo Contest",
        description: "Share photos showcasing innovation in Georgia",
        category: "Photography",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        votingEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        maxEntries: 100,
        prize: "$500 gift card and featured on our platform",
        rules: [
          "Photos must be taken in Georgia",
          "Must showcase innovation or technology",
          "Original work only",
          "High resolution preferred",
          "Include brief description with submission",
        ],
      },
    ];

    await Contest.bulkCreate(contests, { ignoreDuplicates: true });
    logger.info("Contests seeded successfully");

    // Seed sample media
    const media = [
      {
        title: "Building Your Professional Network in Georgia",
        description:
          "Learn effective networking strategies for Georgia professionals",
        type: "video",
        category: "Networking",
        url: "https://example.com/video1",
        duration: 1200, // 20 minutes
        speakers: ["John Smith", "Sarah Johnson"],
        tags: ["networking", "professional development", "georgia"],
        isPublic: true,
        isFeatured: true,
      },
      {
        title: "Georgia Tech Innovation Podcast",
        description: "Weekly podcast featuring Georgia tech leaders",
        type: "podcast",
        category: "Technology",
        url: "https://example.com/podcast1",
        duration: 1800, // 30 minutes
        speakers: ["Dr. Michael Chen", "Lisa Rodriguez"],
        tags: ["technology", "innovation", "georgia tech"],
        isPublic: true,
        isFeatured: true,
      },
    ];

    await Media.bulkCreate(media, { ignoreDuplicates: true });
    logger.info("Media seeded successfully");

    // Seed sample playlist items
    const playlist = [
      {
        title: "Essential Business Skills for Georgia Professionals",
        description: "Curated playlist of business development videos",
        category: "Education",
        url: "https://example.com/playlist1",
        duration: 3600, // 1 hour
        isApproved: true,
        isFeatured: true,
      },
      {
        title: "Leadership Development Series",
        description: "Comprehensive leadership training videos",
        category: "Business",
        url: "https://example.com/playlist2",
        duration: 7200, // 2 hours
        isApproved: true,
      },
    ];

    await Playlist.bulkCreate(playlist, { ignoreDuplicates: true });
    logger.info("Playlist items seeded successfully");

    logger.info("Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Database seeding failed:", error);
    process.exit(1);
  }
}

seed();
