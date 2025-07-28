const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// CORS (optional, for frontend fetch)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// Serve log.json
app.get("/log.json", (req, res) => {
  res.sendFile(path.join(__dirname, "log.json"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
