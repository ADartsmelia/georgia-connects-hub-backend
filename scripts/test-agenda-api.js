import axios from "axios";

const API_BASE = "http://localhost:3000/api/v1";

async function testAgendaAPI() {
  try {
    console.log("🔐 Logging in to get authentication token...");

    // Login to get token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "dartsmelia.anzor@gmail.com",
      password: "password123",
    });

    console.log("📧 OTP sent, getting OTP from database...");

    // For testing, let's use a simple approach - get the latest OTP from logs
    // In a real scenario, you'd get this from email
    const testOTP = "1234"; // This would be the actual OTP from email

    console.log("🔑 Verifying OTP...");

    // Verify OTP
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      email: "dartsmelia.anzor@gmail.com",
      otp: testOTP,
    });

    if (verifyResponse.data.success) {
      const token = verifyResponse.data.data.token;
      console.log("✅ Authentication successful!");

      // Test agenda API
      console.log("📅 Testing agenda API...");
      const agendaResponse = await axios.get(`${API_BASE}/agenda`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (agendaResponse.data.success) {
        console.log("✅ Agenda API working successfully!");
        console.log(
          `📊 Found ${agendaResponse.data.data.length} days in agenda`
        );

        // Show summary
        agendaResponse.data.data.forEach((day) => {
          console.log(`\n📅 ${day.day}:`);
          console.log(`   Main items: ${day.items.length}`);
          console.log(
            `   Parallel items: ${day.parallel ? day.parallel.length : 0}`
          );

          // Show check-in required items
          const checkInItems = day.items.filter((item) => item.requiresCheckIn);
          if (checkInItems.length > 0) {
            console.log(`   Check-in required: ${checkInItems.length} items`);
            checkInItems.forEach((item) => {
              console.log(`     - ${item.time}: ${item.title}`);
            });
          }
        });
      } else {
        console.log("❌ Agenda API failed:", agendaResponse.data.message);
      }
    } else {
      console.log("❌ OTP verification failed:", verifyResponse.data.message);
    }
  } catch (error) {
    console.error(
      "❌ Error testing agenda API:",
      error.response?.data || error.message
    );
  }
}

console.log("🚀 Starting agenda API test...");
testAgendaAPI();
