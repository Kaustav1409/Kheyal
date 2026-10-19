// Load environment variables first so every module below can read them.
require("dotenv").config({ quiet: true });

const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kheyal backend is running.",
  });
});

app.listen(PORT, () => {
  console.log(`Kheyal backend running at http://localhost:${PORT}`);
});
