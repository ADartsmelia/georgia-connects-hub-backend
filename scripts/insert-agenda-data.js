import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env" });

const sequelize = new Sequelize({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || "georgia_connects_hub",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",
  dialect: "postgres",
  logging: false,
});

const agendaData = [
  {
    day: "Day 1",
    items: [
      {
        time: "08:00-08:30",
        title: "რეგისტრაცია",
        requiresCheckIn: false,
      },
      {
        time: "08:30-12:00",
        title: "მგზავრობა (თბილისი-წინანდალი)",
        requiresCheckIn: false,
      },
      {
        time: "12:00-12:30",
        title: "გახსნითი სიტყვა",
        requiresCheckIn: false,
      },
      {
        time: "12:30-13:00",
        title: "სპიკერი N1 ალექს ჩიქოვანი – The Art of Bra(i)nding",
        requiresCheckIn: false,
      },
      {
        time: "13:00-13:30",
        title: "სპიკერი N2 დავით ხუციშვილი – The Art of Exceptional",
        requiresCheckIn: false,
      },
      {
        time: "13:30-15:00",
        title: "ლანჩი / ჩექინი სასტუმროში",
        requiresCheckIn: false,
      },
      {
        time: "15:00-15:30",
        title: "სპიკერი N3 ნინო ზამბახიძე – The Art of Strategic Partnership",
        requiresCheckIn: false,
      },
      {
        time: "15:30-16:00",
        title: "სპიკერი N4 დავით კიკვიძე – The Art of Innovation",
        requiresCheckIn: false,
      },
      {
        time: "16:00-17:00",
        title:
          "კიკალა სტუდიოს ფოტოგრაფიის მასტერკლასი – ვახტანგ ალანია (The Art of Photography)",
        requiresCheckIn: true,
      },
      {
        time: "17:00-17:30",
        title: "სპიკერი N5 თაზო ლეჟავა – The Art of AI",
        requiresCheckIn: false,
      },
      {
        time: "17:30-18:00",
        title: "სპიკერი N6 სანდრო ჯეჯელავა – The Art of Modern Leadership",
        requiresCheckIn: false,
      },
      {
        time: "18:00-20:00",
        title: "თავისუფალი დრო",
        requiresCheckIn: false,
      },
      {
        time: "20:00-23:00",
        title: "ვახშამი და ცოცხალი მუსიკა (Showtime Band)",
        requiresCheckIn: false,
      },
      {
        time: "21:00-21:15",
        title: "აუდიო-ვიზუალური შოუ Ambavi-სგან",
        requiresCheckIn: false,
      },
      {
        time: "23:00",
        title: "Afterparty (Bessarionn)",
        requiresCheckIn: false,
      },
    ],
    parallel: [
      {
        time: "13:30-18:00",
        title: "თიმბილდინგი და გასართობი აქტივობები (სპორტული და სააზროვნო)",
        requiresCheckIn: false,
      },
    ],
  },
  {
    day: "Day 2",
    items: [
      {
        time: "08:00-11:00",
        title: "საუზმე",
        requiresCheckIn: false,
      },
      {
        time: "09:00-10:00",
        title: "იოგა",
        requiresCheckIn: true,
      },
      {
        time: "10:00-12:00",
        title:
          "Leo Institute-ის ვორქშოპი – Anna & Sami Cohen (The Art of Connection)",
        requiresCheckIn: true,
      },
      {
        time: "11:00-12:00",
        title: "ნუტრიციოლოგის სესია – თორნიკე ენუქიძე",
        requiresCheckIn: true,
      },
      {
        time: "11:00-12:00",
        title: "ვორქშოპი: The Art of Signature",
        requiresCheckIn: true,
      },
      {
        time: "14:00-15:00",
        title: "ვორქშოპი – თამუნა ჩიჩუა (The Art of Leading with Questions)",
        requiresCheckIn: true,
      },
      {
        time: "15:00-16:00",
        title: "ვორქშოპი – სოსო გალუმაშვილი (The Art of Trust)",
        requiresCheckIn: true,
      },
      {
        time: "16:00-17:00",
        title: "მონაწილეების დაჯილდოვება და ღონისძიების დახურვა",
        requiresCheckIn: false,
      },
      {
        time: "17:00",
        title: "გამგზავრება",
        requiresCheckIn: false,
      },
    ],
    parallel: [],
  },
];

async function insertAgendaData() {
  try {
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Clear existing agenda data
    console.log("🧹 Clearing existing agenda data...");
    await sequelize.query("DELETE FROM agenda");
    console.log("✅ Existing agenda data cleared");

    let totalInserted = 0;

    // Insert new agenda data
    for (const dayData of agendaData) {
      const { day, items, parallel = [] } = dayData;
      console.log(`📅 Processing ${day}...`);

      // Insert main items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await sequelize.query(`
          INSERT INTO agenda (id, day, "itemIndex", "isParallel", time, title, "requiresCheckIn", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), '${day}', ${i}, false, '${item.time}', '${item.title}', ${item.requiresCheckIn}, true, NOW(), NOW())
        `);
        totalInserted++;
      }

      // Insert parallel items
      for (let i = 0; i < parallel.length; i++) {
        const item = parallel[i];
        await sequelize.query(`
          INSERT INTO agenda (id, day, "itemIndex", "isParallel", time, title, "requiresCheckIn", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), '${day}', ${i}, true, '${item.time}', '${item.title}', ${item.requiresCheckIn}, true, NOW(), NOW())
        `);
        totalInserted++;
      }

      console.log(`✅ ${day} processed successfully`);
    }

    console.log(`🎉 Agenda data insertion completed!`);
    console.log(`📊 Total items inserted: ${totalInserted}`);

    // Verify insertion
    const count = await sequelize.query("SELECT COUNT(*) FROM agenda");
    console.log(
      `✅ Verification: ${count[0][0].count} agenda items in database`
    );

    // Show summary by day
    const daySummary = await sequelize.query(`
      SELECT day, COUNT(*) as item_count 
      FROM agenda 
      GROUP BY day 
      ORDER BY day
    `);

    console.log("\n📋 Agenda Summary:");
    daySummary[0].forEach((row) => {
      console.log(`   ${row.day}: ${row.item_count} items`);
    });
  } catch (error) {
    console.error("❌ Error inserting agenda data:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
console.log("🚀 Starting agenda data insertion script...");
insertAgendaData();
