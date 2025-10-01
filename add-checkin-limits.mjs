import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

async function addCheckInLimits() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const t = await sequelize.transaction();

    try {
      // Add checkInLimit column if it doesn't exist
      console.log("🔄 Adding checkInLimit column to agenda table...");
      await sequelize.query(
        `ALTER TABLE agenda 
         ADD COLUMN IF NOT EXISTS "checkInLimit" INTEGER DEFAULT NULL;`,
        { transaction: t }
      );
      console.log("✅ checkInLimit column added");

      // Update specific events with their limits
      const eventLimits = [
        {
          title:
            "კიკალა სტუდიოს ფოტოგრაფიის მასტერკლასი – ვახტანგ ალანია (The Art of Photography)",
          limit: 50,
        },
        { title: "იოგა", limit: 30 },
        {
          title:
            "Leo Institute-ის ვორქშოპი – Anna & Sami Cohen (The Art of Connection)",
          limit: 100,
        },
        { title: "ნუტრიციოლოგის სესია – თორნიკე ენუქიძე", limit: 30 },
        { title: "ვორქშოპი: The Art of Signature by Signify", limit: 30 },
        {
          title: "ვორქშოპი – თამუნა ჩიჩუა (The Art of Leading with Questions)",
          limit: 30,
        },
        { title: "ვორქშოპი – სოსო გალუმაშვილი (The Art of Trust)", limit: 80 },
      ];

      console.log("\n🔄 Setting check-in limits for events...");
      for (const event of eventLimits) {
        const result = await sequelize.query(
          `UPDATE agenda 
           SET "checkInLimit" = :limit 
           WHERE title = :title`,
          {
            replacements: { title: event.title, limit: event.limit },
            transaction: t,
          }
        );

        if (result[1] > 0) {
          console.log(`✅ Set limit of ${event.limit} for: ${event.title}`);
        } else {
          console.log(`⚠️  Event not found: ${event.title}`);
        }
      }

      await t.commit();
      console.log("\n✅ Migration completed successfully!");
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

console.log("🚀 Starting migration to add check-in limits...\n");
addCheckInLimits();
