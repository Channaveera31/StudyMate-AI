import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import ImageKit from "imagekit";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch"; // make sure installed: npm install node-fetch

// Load env vars
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Serve /assets folder
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// ✅ Serve static HTML from "StudyMate AI"
app.use(express.static(path.join(__dirname, "..", "public")));

// Root route → index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ------------------ ImageKit ------------------
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

app.get("/api/imagekit-auth", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// ------------------ Activities Storage ------------------
const activitiesFile = path.join(__dirname, "activities.json");

app.post("/api/activities", (req, res) => {
  try {
    const { activities } = req.body || {};
    if (!Array.isArray(activities)) {
      return res.status(400).json({ error: "activities must be array" });
    }
    fs.writeFileSync(
      activitiesFile,
      JSON.stringify({ updatedAt: Date.now(), activities }, null, 2)
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------ Secure Groq API Proxy ------------------
app.post("/api/groq", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------ Config (no secrets) ------------------
app.get("/config.json", (req, res) => {
  const cfgPath = path.join(__dirname, "..", "config.json");
  if (fs.existsSync(cfgPath)) {
    res.setHeader("Content-Type", "application/json");
    res.send(fs.readFileSync(cfgPath, "utf-8"));
  } else {
    res.json({
      homePage: "index.html",
      dashboardPage: "dashboard.html",
      imagekit: {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
        authenticationEndpoint: "/api/imagekit-auth",
      },
      groq: {
        apiKey: null, // ✅ Do not expose key
        model: "llama-3.1-8b-instant",
      },
    });
  }
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`✅ StudyMate AI running on http://localhost:${PORT}`);
});
