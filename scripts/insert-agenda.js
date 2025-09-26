import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from database.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../database.env") });

import { Agenda } from "../src/models/index.js";
import { sequelize } from "../src/database/connection.js";

const agendaData = [
  {
    "day": "Day 1",
    "items": [
      {
        "time": "08:00-08:30",
        "title": "რეგისტრაცია",
        "requiresCheckIn": false
      },
      {
        "time": "08:30-12:00",
        "title": "მგზავრობა (თბილისი-წინანდალი)",
        "requiresCheckIn": false
      },
      {
        "time": "12:00-12:30",
        "title": "გახსნითი სიტყვა",
        "requiresCheckIn": false
      },
      {
        "time": "12:30-13:00",
        "title": "სპიკერი N1 ალექს ჩიქოვანი – The Art of Bra(i)nding",
        "requiresCheckIn": false
      },
      {
        "time": "13:00-13:30",
        "title": "სპიკერი N2 დავით ხუციშვილი – The Art of Exceptional",
        "requiresCheckIn": false
      },
      {
        "time": "13:30-15:00",
        "title": "ლანჩი / ჩექინი სასტუმროში",
        "requiresCheckIn": false
      },
      {
        "time": "15:00-15:30",
        "title": "სპიკერი N3 ნინო ზამბახიძე – The Art of Strategic Partnership",
        "requiresCheckIn": false
      },
      {
        "time": "15:30-16:00",
        "title": "სპიკერი N4 დავით კიკვიძე – The Art of Innovation",
        "requiresCheckIn": false
      },
      {
        "time": "16:00-17:00",
        "title": "კიკალა სტუდიოს ფოტოგრაფიის მასტერკლასი – ვახტანგ ალანია (The Art of Photography)",
        "requiresCheckIn": true
      },
      {
        "time": "17:00-17:30",
        "title": "სპიკერი N5 თაზო ლეჟავა – The Art of AI",
        "requiresCheckIn": false
      },
      {
        "time": "17:30-18:00",
        "title": "სპიკერი N6 სანდრო ჯეჯელავა – The Art of Modern Leadership",
        "requiresCheckIn": false
      },
      {
        "time": "18:00-20:00",
        "title": "თავისუფალი დრო",
        "requiresCheckIn": false
      },
      {
        "time": "20:00-23:00",
        "title": "ვახშამი და ცოცხალი მუსიკა (Showtime Band)",
        "requiresCheckIn": false
      },
      {
        "time": "21:00-21:15",
        "title": "აუდიო-ვიზუალური შოუ Ambavi-სგან",
        "requiresCheckIn": false
      },
      {
        "time": "23:00",
        "title": "Afterparty (Bessarionn)",
        "requiresCheckIn": false
      }
    ],
    "parallel": [
      {
        "time": "13:30-18:00",
        "title": "თიმბილდინგი და გასართობი აქტივობები (სპორტული და სააზროვნო)",
        "requiresCheckIn": false
      }
    ]
  },
  {
    "day": "Day 2",
    "items": [
      {
        "time": "08:00-11:00",
        "title": "საუზმე",
        "requiresCheckIn": false
      },
      {
        "time": "09:00-10:00",
        "title": "იოგა",
        "requiresCheckIn": true
      },
      {
        "time": "10:00-12:00",
        "title": "Leo Institute-ის ვორქშოპი – Anna & Sami Cohen (The Art of Connection)",
        "requiresCheckIn": true
      },
      {
        "time": "11:00-12:00",
        "title": "ნუტრიციოლოგის სესია – თორნიკე ენუქიძე",
        "requiresCheckIn": true
      },
      {
        "time": "11:00-12:00",
        "title": "ვორქშოპი: The Art of Signature",
        "requiresCheckIn": true
      },
      {
        "time": "14:00-15:00",
        "title": "ვორქშოპი – თამუნა ჩიჩუა (The Art of Leading with Questions)",
        "requiresCheckIn": true
      },
      {
        "time": "15:00-16:00",
        "title": "ვორქშოპი – სოსო გალუმაშვილი (The Art of Trust)",
        "requiresCheckIn": true
      },
      {
        "time": "16:00-17:00",
        "title": "მონაწილეების დაჯილდოვება და ღონისძიების დახურვა",
        "requiresCheckIn": false
      },
      {
        "time": "17:00",
        "title": "გამგზავრება",
        "requiresCheckIn": false
      }
    ],
    "parallel": []
  }
];

async function insertAgendaData() {
  try {
    console.log("Starting agenda data insertion...");
    
    // Clear existing agenda data
    await Agenda.destroy({ where: {} });
    console.log("Cleared existing agenda data");
    
    // Insert new agenda data
    for (const dayData of agendaData) {
      const { day, items, parallel = [] } = dayData;
      
      // Insert main items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await Agenda.create({
          day,
          itemIndex: i,
          isParallel: false,
          time: item.time,
          title: item.title,
          requiresCheckIn: item.requiresCheckIn,
          isActive: true,
        });
      }
      
      // Insert parallel items
      for (let i = 0; i < parallel.length; i++) {
        const item = parallel[i];
        await Agenda.create({
          day,
          itemIndex: i,
          isParallel: true,
          time: item.time,
          title: item.title,
          requiresCheckIn: item.requiresCheckIn,
          isActive: true,
        });
      }
    }
    
    console.log("Successfully inserted agenda data!");
    
    // Verify insertion
    const count = await Agenda.count();
    console.log(`Total agenda items inserted: ${count}`);
    
    // Show sample data
    const sampleData = await Agenda.findAll({
      limit: 5,
      order: [['day', 'ASC'], ['itemIndex', 'ASC'], ['isParallel', 'ASC']]
    });
    console.log("Sample agenda data:", sampleData.map(item => ({
      day: item.day,
      itemIndex: item.itemIndex,
      isParallel: item.isParallel,
      time: item.time,
      title: item.title,
      requiresCheckIn: item.requiresCheckIn
    })));
    
  } catch (error) {
    console.error("Error inserting agenda data:", error);
  } finally {
    await sequelize.close();
  }
}

insertAgendaData();
