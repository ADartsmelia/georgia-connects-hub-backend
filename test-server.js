import express from "express";

const app = express();
const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Test server is working" });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});

export default app;
