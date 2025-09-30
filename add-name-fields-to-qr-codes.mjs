import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load environment variables
dotenv.config();

// Create database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || "georgia_connects_hub",
  process.env.DB_USERNAME || "postgres",
  process.env.DB_PASSWORD || "postgres123",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5433,
    dialect: "postgres",
    logging: console.log,
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  }
);

async function addNameFieldsToQRCodes() {
  try {
    console.log("🔗 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log(
      "📝 Adding firstName and lastName columns to qr_codes table..."
    );

    // Add firstName column
    await sequelize.query(`
      ALTER TABLE qr_codes 
      ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255);
    `);
    console.log("✅ Added firstName column");

    // Add lastName column
    await sequelize.query(`
      ALTER TABLE qr_codes 
      ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255);
    `);
    console.log("✅ Added lastName column");

    // Add comments to the columns
    await sequelize.query(`
      COMMENT ON COLUMN qr_codes."firstName" IS 'First name of the attendee';
    `);

    await sequelize.query(`
      COMMENT ON COLUMN qr_codes."lastName" IS 'Last name of the attendee';
    `);
    console.log("✅ Added column comments");

    console.log(
      "🎉 Successfully added firstName and lastName fields to qr_codes table!"
    );

    // Verify the changes
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'qr_codes' 
      AND column_name IN ('firstName', 'lastName')
      ORDER BY column_name;
    `);

    console.log("📊 Verification - New columns:");
    results.forEach((row) => {
      console.log(
        `  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });
  } catch (error) {
    console.error("❌ Error adding name fields to qr_codes table:", error);
    throw error;
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the migration
addNameFieldsToQRCodes()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
