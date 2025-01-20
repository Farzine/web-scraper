import express from "express";
import cors from "cors";
import scrapeWebsite from "./utils/scraper.js";

const app = express();
// Use CORS middleware
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "Invalid URL provided." });
  }

  try {
    const data = await scrapeWebsite(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
