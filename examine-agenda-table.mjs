import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});

async function examineAgendaTable() {
  try {
    await client.connect();
    console.log("✅ Database connected");

    console.log("\n🔍 AGENDA TABLE STRUCTURE:");
    console.log("=" * 50);
    
    // Check table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'agenda' 
      ORDER BY ordinal_position
    `);

    console.log("Columns in agenda table:");
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log("\n🔍 AGENDA TABLE DATA:");
    console.log("=" * 50);
    
    // Get all agenda items
    const allItems = await client.query(`
      SELECT id, day, "itemIndex", "isParallel", time, title, "requiresCheckIn", "checkInLimit", "isActive", "createdAt"
      FROM agenda 
      ORDER BY day, "itemIndex", "isParallel"
    `);

    console.log(`Total agenda items: ${allItems.rows.length}`);
    console.log("\nAll agenda items:");
    
    allItems.rows.forEach((item, index) => {
      console.log(`${index + 1}. [${item.day}] Index: ${item.itemIndex}, Time: ${item.time}`);
      console.log(`   Title: ${item.title}`);
      console.log(`   Check-in: ${item.requiresCheckIn}, Limit: ${item.checkInLimit}, Active: ${item.isActive}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log(`   ID: ${item.id}`);
      console.log("");
    });

    console.log("\n🔍 POTENTIAL ISSUES:");
    console.log("=" * 50);
    
    // Check for duplicate itemIndex values
    const duplicates = await client.query(`
      SELECT day, "itemIndex", "isParallel", COUNT(*) as count
      FROM agenda 
      GROUP BY day, "itemIndex", "isParallel"
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log("❌ DUPLICATE itemIndex values found:");
      duplicates.rows.forEach(dup => {
        console.log(`- Day: ${dup.day}, Index: ${dup.itemIndex}, Parallel: ${dup.isParallel}, Count: ${dup.count}`);
      });
    } else {
      console.log("✅ No duplicate itemIndex values");
    }

    // Check for negative itemIndex values
    const negativeIndex = await client.query(`
      SELECT * FROM agenda WHERE "itemIndex" < 0
    `);

    if (negativeIndex.rows.length > 0) {
      console.log("❌ NEGATIVE itemIndex values found:");
      negativeIndex.rows.forEach(item => {
        console.log(`- ${item.title} (Index: ${item.itemIndex})`);
      });
    } else {
      console.log("✅ No negative itemIndex values");
    }

    // Check for very high itemIndex values
    const highIndex = await client.query(`
      SELECT * FROM agenda WHERE "itemIndex" > 20
    `);

    if (highIndex.rows.length > 0) {
      console.log("❌ HIGH itemIndex values found:");
      highIndex.rows.forEach(item => {
        console.log(`- ${item.title} (Index: ${item.itemIndex})`);
      });
    } else {
      console.log("✅ No suspiciously high itemIndex values");
    }

    // Check for welcome drinks related items
    const welcomeDrinks = await client.query(`
      SELECT * FROM agenda 
      WHERE title ILIKE '%welcome%' 
         OR title ILIKE '%drinks%'
         OR title ILIKE '%სარაჯიშვილი%'
         OR title ILIKE '%secret room%'
    `);

    if (welcomeDrinks.rows.length > 0) {
      console.log("❌ WELCOME DRINKS related items found:");
      welcomeDrinks.rows.forEach(item => {
        console.log(`- ${item.title} (Index: ${item.itemIndex})`);
      });
    } else {
      console.log("✅ No welcome drinks related items");
    }

    console.log("\n🔍 DAY 1 SPECIFIC CHECK:");
    console.log("=" * 50);
    
    const day1Items = await client.query(`
      SELECT "itemIndex", time, title, "requiresCheckIn", "checkInLimit"
      FROM agenda 
      WHERE day = 'Day 1' AND "isParallel" = false
      ORDER BY "itemIndex"
    `);

    console.log("Day 1 agenda items:");
    day1Items.rows.forEach(item => {
      console.log(`${item.itemIndex}. ${item.time} - ${item.title} (Check-in: ${item.requiresCheckIn}, Limit: ${item.checkInLimit})`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}

console.log("⚠️  Examining agenda table in 3 seconds...");
setTimeout(examineAgendaTable, 3000);
