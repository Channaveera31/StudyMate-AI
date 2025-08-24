import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Elements
const questionInput = document.getElementById("questionInput");
const postQuestionBtn = document.getElementById("postQuestionBtn");
const questionsList = document.getElementById("questionsList");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

let currentUser = null;

// Handle login with Google
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Watch auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = `👤 ${user.displayName || user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    postQuestionBtn.disabled = false;
  } else {
    currentUser = null;
    userInfo.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    postQuestionBtn.disabled = true;
  }
});

// Post a new question
postQuestionBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("Please login to ask a question!");

  const text = questionInput.value.trim();
  if (!text) return alert("Please enter a question!");

  await addDoc(collection(db, "questions"), {
    text,
    user: currentUser.displayName || currentUser.email,
    uid: currentUser.uid,
    answers: [],
    createdAt: new Date(),
  });

  questionInput.value = "";
});

// Realtime listener for questions
const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  questionsList.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const questionDiv = document.createElement("div");
    questionDiv.classList.add("question-card");

    questionDiv.innerHTML = `
      <p><b>❓ ${data.text}</b></p>
      <p style="font-size:12px;color:gray;">Asked by: ${
        data.user || "Anonymous"
      }</p>
      <div class="answers">
        ${
          data.answers && data.answers.length > 0
            ? data.answers
                .map(
                  (a) =>
                    `<p>➡ ${a.text} <span style="font-size:12px;color:gray;">- ${a.user}</span></p>`
                )
                .join("")
            : "<p>No answers yet.</p>"
        }
      </div>
      <div class="answer-input">
        <input type="text" placeholder="Write an answer..." />
        <button>Reply</button>
      </div>
    `;

    // Answer submission
    const input = questionDiv.querySelector("input");
    const btn = questionDiv.querySelector("button");
    btn.addEventListener("click", async () => {
      if (!currentUser) return alert("Please login to reply!");

      const answer = input.value.trim();
      if (!answer) return;

      await updateDoc(doc(db, "questions", docSnap.id), {
        answers: arrayUnion({
          text: answer,
          user: currentUser.displayName || currentUser.email,
          uid: currentUser.uid,
          createdAt: new Date(),
        }),
      });
      input.value = "";
    });

    questionsList.appendChild(questionDiv);
  });
});
