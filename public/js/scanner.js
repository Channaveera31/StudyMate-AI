import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// OCR library (Tesseract.js)
import Tesseract from "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
import { setExtractedText } from "./flashcards.js";

// Elements
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const previewImg = document.getElementById("previewImg");
const summarizeBtn = document.getElementById("summarizeBtn");
const summaryOutput = document.getElementById("summaryOutput");

let uploadedImageURL = ""; // store last uploaded/captured file URL

// Upload File
uploadBtn.addEventListener("click", async () => {
  if (fileInput.files.length === 0) {
    alert("Please select a file first!");
    return;
  }

  const file = fileInput.files[0];
  const fileRef = ref(storage, `notes/${Date.now()}_${file.name}`);

  try {
    await uploadBytes(fileRef, file);
    uploadedImageURL = await getDownloadURL(fileRef);
    previewImg.src = uploadedImageURL;
    alert("✅ File uploaded successfully!");
  } catch (error) {
    console.error(error);
    alert("❌ Upload failed");
  }
});

// --- AI Summarization ---
// Extract text with OCR, then send to AI API
summarizeBtn.addEventListener("click", async () => {
  if (!uploadedImageURL) {
    alert("Upload or capture a note first!");
    return;
  }

  summaryOutput.innerHTML = `<div class="spinner"></div><p>Extracting text from image...</p>`;

  try {
    // Step 1: OCR
    const result = await Tesseract.recognize(previewImg.src, "eng");
    const extractedText = result.data.text;
    setExtractedText(extractedText); // Share with flashcards.js

    if (!extractedText.trim()) {
      summaryOutput.textContent = "❌ No readable text found.";
      return;
    }

    summaryOutput.innerHTML = `<div class="spinner"></div><p>Summarizing with AI...</p>`;

    // Step 2: Send to AI API
    async function summarizeText(text) {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.GROQ_API_KEY, // 👈 replace with your real key
          },
          body: JSON.stringify({
            model: "llama3-8b-8192", // Free & fast
            messages: [
              {
                role: "system",
                content:
                  "You are a study assistant. Summarize text into clear bullet points, highlight key terms, and make it easy for revision.",
              },
              {
                role: "user",
                content: text,
              },
            ],
            max_tokens: 250,
          }),
        }
      );

      const data = await response.json();
      return data.choices[0].message.content;
    }

    const summary = await summarizeText(extractedText);
    summaryOutput.textContent = summary;
  } catch (error) {
    console.error(error);
    summaryOutput.textContent = "❌ Failed to summarize.";
  }
});
