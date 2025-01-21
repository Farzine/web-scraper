import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { scrapeWebsite, scrapePDF } from "./utils/scraper.js";

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


// Multer configuration for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/scrape-pdf", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const data = await scrapePDF(file.path);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup uploaded file
    fs.unlink(file.path, (err) => {
      if (err) console.error("Failed to delete uploaded file:", err);
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
