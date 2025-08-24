import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const generateBtn = document.getElementById("generateFlashcards");
const deleteBtn = document.getElementById("deleteFlashcards");
const flashcardsGrid = document.getElementById("flashcardsGrid");

const API_KEY = process.env.GROQ_API_KEY;

let extractedStudyText = "";

// --- Called by scanner.js when OCR is done ---
export function setExtractedText(text) {
  extractedStudyText = text;
}

// 🔹 Delete all flashcards
deleteBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login to delete flashcards.");
    return;
  }

  if (!confirm("⚠️ Are you sure you want to delete all flashcards?")) return;

  const q = query(collection(db, "flashcards"), where("uid", "==", user.uid));
  const snapshot = await getDocs(q);

  snapshot.forEach(async (docSnap) => {
    await deleteDoc(doc(db, "flashcards", docSnap.id));
  });

  flashcardsGrid.innerHTML = "<p>🗑 All flashcards deleted.</p>";
});

// 🔹 Generate flashcards (same as before)
generateBtn.addEventListener("click", async () => {
  if (!extractedStudyText.trim()) {
    flashcardsGrid.innerHTML = "<p>⚠️ Please scan/upload notes first!</p>";
    return;
  }

  flashcardsGrid.innerHTML = "<p>⏳ Generating flashcards...</p>";

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are a study assistant. Convert the text into flashcards in JSON with this format: [{question: '...', answer: '...'}]. Keep answers short and clear.",
            },
            { role: "user", content: extractedStudyText },
          ],
          max_tokens: 300,
        }),
      }
    );

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    let flashcards;
    try {
      flashcards = JSON.parse(aiReply);
    } catch (err) {
      console.error("Failed to parse AI JSON:", err);
      flashcardsGrid.innerHTML = "<p>❌ AI returned invalid format.</p>";
      return;
    }

    const user = auth.currentUser;
    if (user) {
      await addDoc(collection(db, "flashcards"), {
        uid: user.uid,
        cards: flashcards,
        createdAt: new Date(),
      });
    }

    renderFlashcards(flashcards);
  } catch (error) {
    console.error(error);
    flashcardsGrid.innerHTML = "<p>❌ Error generating flashcards.</p>";
  }
});

// 🔹 Render flashcards
function renderFlashcards(flashcards) {
  flashcardsGrid.innerHTML = "";
  flashcards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.classList.add("flashcard");

    cardEl.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-front"><p>${card.question}</p></div>
        <div class="flashcard-back"><p>${card.answer}</p></div>
      </div>
    `;

    cardEl.addEventListener("click", () => {
      cardEl.classList.toggle("flip");
    });

    flashcardsGrid.appendChild(cardEl);
  });
}

// 🔹 Load saved flashcards
auth.onAuthStateChanged((user) => {
  if (user) {
    const q = query(collection(db, "flashcards"), where("uid", "==", user.uid));
    onSnapshot(q, (snapshot) => {
      flashcardsGrid.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        renderFlashcards(data.cards);
      });
    });
  }
});
