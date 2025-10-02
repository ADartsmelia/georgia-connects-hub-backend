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

async function restoreAgendaTable() {
  try {
    await client.connect();
    console.log("✅ Database connected");

    console.log("🗑️  Clearing all agenda items...");
    
    // Clear all agenda items
    await client.query(`DELETE FROM agenda`);

    console.log("🔄 Restoring original agenda data...");
    
    // Insert the correct original agenda data
    const originalAgendaData = [
      // Day 1 - Main items
      { day: "Day 1", itemIndex: 0, isParallel: false, time: "08:00-08:30", title: "რეგისტრაცია", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 1, isParallel: false, time: "08:30-12:00", title: "მგზავრობა (თბილისი-წინანდალი)", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 2, isParallel: false, time: "12:00-12:30", title: "გახსნითი სიტყვა", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 3, isParallel: false, time: "12:30-13:00", title: "სპიკერი N1 ალექს ჩიქოვანი – The Art of Bra(i)nding", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 4, isParallel: false, time: "13:00-13:30", title: "სპიკერი N2 დავით ხუციშვილი – The Art of Exceptional", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 5, isParallel: false, time: "13:30-15:00", title: "ლანჩი / ჩექინი სასტუმროში", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 6, isParallel: false, time: "15:00-15:30", title: "სპიკერი N3 ნინო ზამბახიძე – The Art of Strategic Partnership", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 7, isParallel: false, time: "15:30-16:00", title: "სპიკერი N4 დავით კიკვიძე – The Art of Innovation", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 8, isParallel: false, time: "16:00-17:00", title: "კიკალა სტუდიოს ფოტოგრაფიის მასტერკლასი – ვახტანგ ალანია (The Art of Photography)", requiresCheckIn: true, checkInLimit: 50 },
      { day: "Day 1", itemIndex: 9, isParallel: false, time: "17:00-17:30", title: "სპიკერი N5 თაზო ლეჟავა – The Art of AI", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 10, isParallel: false, time: "17:00-19:30", title: "სარაჯიშვილი Welcome Drinks at Secret Room", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 11, isParallel: false, time: "17:30-18:00", title: "სპიკერი N6 სანდრო ჯეჯელავა – The Art of Modern Leadership", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 12, isParallel: false, time: "18:00-20:00", title: "თავისუფალი დრო", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 13, isParallel: false, time: "20:00-23:00", title: "ვახშამი და ცოცხალი მუსიკა (Showtime Band)", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 14, isParallel: false, time: "21:00-21:15", title: "აუდიო-ვიზუალური შოუ Ambavi-სგან", requiresCheckIn: false },
      { day: "Day 1", itemIndex: 15, isParallel: false, time: "23:00", title: "Afterparty (Bessarionn)", requiresCheckIn: false },
      
      // Day 1 - Parallel items
      { day: "Day 1", itemIndex: 0, isParallel: true, time: "13:30-18:00", title: "თიმბილდინგი და გასართობი აქტივობები (სპორტული და სააზროვნო)", requiresCheckIn: false },
      
      // Day 2 - Main items
      { day: "Day 2", itemIndex: 0, isParallel: false, time: "08:00-11:00", title: "საუზმე", requiresCheckIn: false },
      { day: "Day 2", itemIndex: 1, isParallel: false, time: "09:00-10:00", title: "იოგა", requiresCheckIn: true, checkInLimit: 30 },
      { day: "Day 2", itemIndex: 2, isParallel: false, time: "10:00-12:00", title: "Leo Institute-ის ვორქშოპი – Anna & Sami Cohen (The Art of Connection)", requiresCheckIn: true, checkInLimit: 150 },
      { day: "Day 2", itemIndex: 3, isParallel: false, time: "11:00-12:00", title: "ნუტრიციოლოგის სესია – თორნიკე ენუქიძე", requiresCheckIn: true, checkInLimit: 50 },
      { day: "Day 2", itemIndex: 4, isParallel: false, time: "11:00-12:00", title: "ვორქშოპი: The Art of Signature by Signify", requiresCheckIn: true, checkInLimit: 50 },
      { day: "Day 2", itemIndex: 5, isParallel: false, time: "14:00-15:00", title: "ვორქშოპი – თამუნა ჩიჩუა (The Art of Leading with Questions)", requiresCheckIn: true, checkInLimit: 30 },
      { day: "Day 2", itemIndex: 6, isParallel: false, time: "15:00-16:00", title: "ვორქშოპი – სოსო გალუმაშვილი (The Art of Trust)", requiresCheckIn: true, checkInLimit: 150 },
      { day: "Day 2", itemIndex: 7, isParallel: false, time: "16:00-17:00", title: "მონაწილეების დაჯილდოვება და ღონისძიების დახურვა", requiresCheckIn: false },
      { day: "Day 2", itemIndex: 8, isParallel: false, time: "17:00", title: "გამგზავრება", requiresCheckIn: false },
    ];

    // Insert all agenda items
    for (const item of originalAgendaData) {
      await client.query(`
        INSERT INTO agenda (id, day, "itemIndex", "isParallel", time, title, "requiresCheckIn", "checkInLimit", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      `, [
        item.day,
        item.itemIndex,
        item.isParallel,
        item.time,
        item.title,
        item.requiresCheckIn,
        item.checkInLimit || null
      ]);
    }

    console.log("✅ Agenda table restored to original state");
    console.log(`✅ Inserted ${originalAgendaData.length} agenda items`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    await client.end();
  }
}

console.log("⚠️  Restoring agenda table to original state in 3 seconds...");
setTimeout(restoreAgendaTable, 3000);
