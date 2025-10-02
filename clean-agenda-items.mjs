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

async function checkAndCleanAgenda() {
  try {
    await client.connect();
    console.log("✅ Database connected");

    console.log("🔍 Checking current agenda items...");
    
    // Check for any welcome drinks items
    const welcomeDrinksItems = await client.query(`
      SELECT * FROM agenda 
      WHERE title LIKE '%Welcome Drinks%' 
         OR title LIKE '%სარაჯიშვილი%'
         OR title LIKE '%Secret Room%'
    `);

    console.log(`Found ${welcomeDrinksItems.rows.length} welcome drinks items:`);
    welcomeDrinksItems.rows.forEach(item => {
      console.log(`- ID: ${item.id}, Title: ${item.title}, Index: ${item.itemIndex}`);
    });

    if (welcomeDrinksItems.rows.length > 0) {
      console.log("🗑️  Removing welcome drinks items...");
      
      for (const item of welcomeDrinksItems.rows) {
        await client.query(`DELETE FROM agenda WHERE id = $1`, [item.id]);
        console.log(`✅ Removed: ${item.title}`);
      }
    }

    // Check for any items with itemIndex >= 16 (which might be from our attempts)
    const highIndexItems = await client.query(`
      SELECT * FROM agenda 
      WHERE day = 'Day 1' 
        AND "isParallel" = false 
        AND "itemIndex" >= 16
      ORDER BY "itemIndex"
    `);

    console.log(`Found ${highIndexItems.rows.length} items with high itemIndex:`);
    highIndexItems.rows.forEach(item => {
      console.log(`- ID: ${item.id}, Title: ${item.title}, Index: ${item.itemIndex}`);
    });

    if (highIndexItems.rows.length > 0) {
      console.log("🗑️  Removing high index items...");
      
      for (const item of highIndexItems.rows) {
        await client.query(`DELETE FROM agenda WHERE id = $1`, [item.id]);
        console.log(`✅ Removed: ${item.title} (index ${item.itemIndex})`);
      }
    }

    // Check for any negative itemIndex values (from our failed attempts)
    const negativeIndexItems = await client.query(`
      SELECT * FROM agenda 
      WHERE "itemIndex" < 0
    `);

    console.log(`Found ${negativeIndexItems.rows.length} items with negative itemIndex:`);
    negativeIndexItems.rows.forEach(item => {
      console.log(`- ID: ${item.id}, Title: ${item.title}, Index: ${item.itemIndex}`);
    });

    if (negativeIndexItems.rows.length > 0) {
      console.log("🗑️  Removing negative index items...");
      
      for (const item of negativeIndexItems.rows) {
        await client.query(`DELETE FROM agenda WHERE id = $1`, [item.id]);
        console.log(`✅ Removed: ${item.title} (index ${item.itemIndex})`);
      }
    }

    console.log("✅ Agenda cleanup completed");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}

console.log("⚠️  Checking and cleaning agenda items in 3 seconds...");
setTimeout(checkAndCleanAgenda, 3000);
