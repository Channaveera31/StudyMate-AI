// schedule.js
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
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// DOM
const subjectInput = document.getElementById("subjectInput");
const dateInput = document.getElementById("dateInput");
const hoursInput = document.getElementById("hoursInput");
const addBtn = document.getElementById("addScheduleBtn");
const scheduleList = document.getElementById("scheduleList");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userLabel = document.getElementById("userLabel");

const planModal = document.getElementById("planModal");
const closeModal = document.getElementById("closeModal");
const planBody = document.getElementById("planBody");
const planModalTitle = document.getElementById("planModalTitle");
const downloadPlanBtn = document.getElementById("downloadPlanBtn");
const progressBadge = document.getElementById("progressBadge");

const calendarModal = document.getElementById("calendarModal");
const openCalendarBtn = document.getElementById("openCalendarBtn");
const closeCalendar = document.getElementById("closeCalendar");
const calendarGrid = document.getElementById("calendarGrid");
const calendarDayTasks = document.getElementById("calendarDayTasks");

const downloadAllBtn = document.getElementById("downloadAllBtn");

// config
const GROQ_KEY = process.env.GROQ_API_KEY; // <- REPLACE
// state
let unsubSchedules = null;
let currentUserId = null;
let currentViewedScheduleId = null;

// auth
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    alert(e.message);
  }
});
logoutBtn.addEventListener("click", async () => await signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    userLabel.textContent = `👤 ${user.displayName || user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    startSchedulesListener(user.uid);
  } else {
    currentUserId = null;
    userLabel.textContent = "Not signed in";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    stopSchedulesListener();
    scheduleList.innerHTML = `<li class="empty">No tasks yet.</li>`;
  }
});

// Add schedule item
addBtn.addEventListener("click", async () => {
  if (!currentUserId) return alert("Please sign in.");
  const subject = subjectInput.value.trim();
  const examDate = dateInput.value;
  const dailyHours = Number(hoursInput.value);
  if (!subject || !examDate || !dailyHours)
    return alert("Enter subject, date & hours.");

  await addDoc(collection(db, "schedules"), {
    uid: currentUserId,
    subject,
    examDate,
    dailyHours,
    plan: null,
    createdAt: serverTimestamp(),
  });

  subjectInput.value = "";
  dateInput.value = "";
  hoursInput.value = "";
});

// realtime listener
function startSchedulesListener(uid) {
  if (unsubSchedules) unsubSchedules();
  const q = query(
    collection(db, "schedules"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  unsubSchedules = onSnapshot(q, (snap) => {
    if (snap.empty) {
      scheduleList.innerHTML = `<li class="empty">No tasks yet.</li>`;
      return;
    }
    scheduleList.innerHTML = "";
    snap.forEach((docSnap) => renderScheduleItem(docSnap.id, docSnap.data()));
  });
}
function stopSchedulesListener() {
  if (unsubSchedules) unsubSchedules = null;
}

// render list item
function renderScheduleItem(id, item) {
  const li = document.createElement("li");
  const daysLeft = daysUntil(item.examDate);
  const planBadge = item.plan
    ? `<span class="badge">✅ Plan ready</span>`
    : `<span class="badge">⌛ No plan</span>`;

  // compute progress if plan exists
  const progressPct = calcProgress(item.plan);

  li.innerHTML = `
    <div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">
        <strong>${escapeHtml(item.subject)}</strong>
        ${planBadge}
        <span class="badge">📅 ${item.examDate}</span>
        <span class="badge">⏱ ${item.dailyHours}h</span>
        <span class="badge">🕒 ${
          daysLeft >= 0 ? daysLeft + " days left" : "exam passed"
        }</span>
      </div>
      <div class="meta">Progress: ${progressPct}%</div>
    </div>
    <div class="actions">
      <button class="btn primary" data-ai="${id}">⚡ AI Plan</button>
      <button class="btn" data-view="${id}">👁 View Plan</button>
      <button class="btn" data-del="${id}">🗑 Delete</button>
    </div>
  `;

  // actions
  li.querySelector(`[data-ai="${id}"]`).addEventListener("click", () =>
    generateAIPlan(id, item)
  );
  li.querySelector(`[data-view="${id}"]`).addEventListener("click", () =>
    openPlan(id, item)
  );
  li.querySelector(`[data-del="${id}"]`).addEventListener("click", () =>
    deleteItem(id)
  );
  scheduleList.appendChild(li);
}

// helpers
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ex = new Date(dateStr);
  ex.setHours(0, 0, 0, 0);
  return Math.round((ex - today) / (1000 * 60 * 60 * 24));
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function calcProgress(plan) {
  if (!plan) return 0;
  if (Array.isArray(plan)) {
    let total = 0,
      done = 0;
    plan.forEach((day) => {
      const tasks = day.tasks || [];
      tasks.forEach((t) => {
        total++;
        if (t.done) done++;
      });
    });
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }
  return 0;
}

// delete item
async function deleteItem(id) {
  if (!confirm("Delete this schedule?")) return;
  await deleteDoc(doc(db, "schedules", id));
}

// open modal to view plan
async function openPlan(id, item) {
  currentViewedScheduleId = id;
  planModalTitle.textContent = `📊 AI Plan — ${escapeHtml(item.subject)}`;
  // load doc
  const ref = doc(db, "schedules", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    planBody.textContent = "No plan.";
    planModal.classList.remove("hidden");
    return;
  }
  const data = snap.data();
  const plan = data.plan;
  if (!plan) {
    planBody.textContent = "No plan yet. Click ⚡ AI Plan to generate.";
    progressBadge.textContent = "Progress: 0%";
  } else if (Array.isArray(plan)) {
    // render interactive list with checkboxes
    renderPlanInteractive(plan, id);
    progressBadge.textContent = `Progress: ${calcProgress(plan)}%`;
  } else {
    planBody.textContent = String(plan);
  }
  planModal.classList.remove("hidden");
}

// render plan with checkboxes and save toggles
function renderPlanInteractive(plan, scheduleId) {
  planBody.innerHTML = "";
  // display per day
  plan.forEach((day) => {
    const dayDiv = document.createElement("div");
    dayDiv.style.marginBottom = "12px";
    const dayTitle = document.createElement("div");
    dayTitle.style.fontWeight = "700";
    dayTitle.textContent = day.date;
    dayDiv.appendChild(dayTitle);

    (day.tasks || []).forEach((task, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.marginTop = "6px";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!task.done;
      chk.addEventListener("change", async () => {
        // update Firestore: find the schedule doc, update the specific task.done
        const refDoc = doc(db, "schedules", scheduleId);
        const snap = await getDoc(refDoc);
        if (!snap.exists()) return;
        const data = snap.data();
        let planData = data.plan || [];
        // update matching day.date & task text (best-effort)
        const dayObj = planData.find((d) => d.date === day.date);
        if (dayObj) {
          const targetTask = dayObj.tasks.find((t) => t.text === task.text);
          if (targetTask) targetTask.done = chk.checked;
          else {
            // fallback by index
            dayObj.tasks[idx].done = chk.checked;
          }
        }
        await updateDoc(refDoc, { plan: planData });
      });

      const label = document.createElement("label");
      label.textContent = task.text;
      row.appendChild(chk);
      row.appendChild(label);
      dayDiv.appendChild(row);
    });

    planBody.appendChild(dayDiv);
  });
}

// close modal
document
  .getElementById("closeModal")
  .addEventListener("click", () => planModal.classList.add("hidden"));
planModal.addEventListener("click", (e) => {
  if (e.target === planModal) planModal.classList.add("hidden");
});

// Calendar open
openCalendarBtn.addEventListener("click", async () => {
  if (!currentUserId) return alert("Sign in to view calendar.");
  // generate a 30-day window calendar starting today
  calendarGrid.innerHTML = "";
  calendarDayTasks.innerHTML = "Click a day to see tasks.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return formatDate(d);
  });

  // fetch user's schedules and their plans
  const qSnap = await getDocs(
    query(collection(db, "schedules"), where("uid", "==", currentUserId))
  );
  const allPlans = [];
  qSnap.forEach((snap) => {
    const data = snap.data();
    if (Array.isArray(data.plan)) allPlans.push(...data.plan);
  });

  days.forEach((dateStr) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    const dateEl = document.createElement("div");
    dateEl.className = "date";
    dateEl.textContent = dateStr;
    cell.appendChild(dateEl);
    // count tasks for that date in allPlans
    const tasks = allPlans
      .filter((p) => p.date === dateStr)
      .flatMap((p) => p.tasks || []);
    if (tasks.length) {
      const countEl = document.createElement("div");
      countEl.className = "count";
      countEl.textContent = tasks.length + " task(s)";
      cell.appendChild(countEl);
    }
    cell.addEventListener("click", () => {
      // show tasks for this day
      if (tasks.length === 0)
        calendarDayTasks.textContent = `No tasks for ${dateStr}`;
      else {
        calendarDayTasks.innerHTML =
          `<strong>Tasks for ${dateStr}:</strong>\n\n` +
          tasks.map((t) => `- ${t.text} ${t.done ? "(done)" : ""}`).join("\n");
      }
    });
    calendarGrid.appendChild(cell);
  });

  calendarModal.classList.remove("hidden");
});
closeCalendar.addEventListener("click", () =>
  calendarModal.classList.add("hidden")
);
calendarModal.addEventListener("click", (e) => {
  if (e.target === calendarModal) calendarModal.classList.add("hidden");
});

// download single plan as PDF
downloadPlanBtn.addEventListener("click", async () => {
  if (!currentViewedScheduleId) return alert("Open a plan first.");
  const snap = await getDoc(doc(db, "schedules", currentViewedScheduleId));
  if (!snap.exists()) return alert("No plan.");
  const data = snap.data();
  const plan = data.plan;
  const title = `${data.subject} - Study Plan`;
  downloadPlanAsPdf(title, plan);
});

// download all plans as a single PDF
downloadAllBtn.addEventListener("click", async () => {
  if (!currentUserId) return alert("Sign in first.");
  const qSnap = await getDocs(
    query(collection(db, "schedules"), where("uid", "==", currentUserId))
  );
  let content = "";
  qSnap.forEach((snap) => {
    const d = snap.data();
    content += `${d.subject} (${d.examDate})\n`;
    if (Array.isArray(d.plan)) {
      d.plan.forEach((day) => {
        content += `${day.date}\n`;
        day.tasks.forEach(
          (t) => (content += ` - ${t.text} ${t.done ? "(done)" : ""}\n`)
        );
      });
    } else if (d.plan) content += `${d.plan}\n`;
    content += `\n\n`;
  });
  if (!content) return alert("No plans to download.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text("StudyMate AI - All Plans", 10, 10);
  const lines = doc.splitTextToSize(content, 180);
  doc.text(lines, 10, 20);
  doc.save("StudyMate_Plans.pdf");
});

// AI Planner
async function generateAIPlan(id, item) {
  if (!currentUserId) return alert("Sign in first.");
  const btn = document.querySelector(`[data-ai="${id}"]`);
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Generating…`;
  btn.disabled = true;

  try {
    const prompt = `
You are an expert study coach. Create a concise daily study plan starting from TODAY until the exam date.
Subject: ${item.subject}
Exam Date: ${item.examDate}
Daily Hours: ${item.dailyHours}
Rules:
- Return STRICT JSON array only. No prose.
- Each element: { "date": "YYYY-MM-DD", "tasks": ["Task 1", "Task 2", ...] }
- Balance workload across days; emphasize learning early and revision close to the exam.
- Keep 2-5 tasks per day; keep tasks short and actionable.
Output: JSON ONLY.
    `.trim();

    const resp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: "You output only valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      }
    );

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "[]";

    let planJson;
    try {
      planJson = JSON.parse(raw);
      if (!Array.isArray(planJson)) throw new Error("not array");
    } catch (e) {
      // fallback: save raw string as plan
      await updateDoc(doc(db, "schedules", id), { plan: String(raw) });
      alert("AI returned non-JSON; saved raw text as plan.");
      return;
    }

    // convert tasks from strings to objects {text, done:false}
    const normalized = planJson.map((day) => ({
      date: day.date,
      tasks: (day.tasks || []).map((t) => ({ text: String(t), done: false })),
    }));

    await updateDoc(doc(db, "schedules", id), { plan: normalized });
  } catch (err) {
    console.error(err);
    alert("Failed to generate plan.");
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

// save toggles watchers: realtime update will re-render the list with progress
// (we already listen to schedules collection, so when plan changes, progress updates)

// helper: format date YYYY-MM-DD
function formatDate(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// download plan helper
function downloadPlanAsPdf(title, plan) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 10, 12);
  doc.setFontSize(11);
  if (Array.isArray(plan)) {
    let y = 20;
    plan.forEach((day) => {
      const lines = [`${day.date}:`].concat(
        (day.tasks || []).map((t) => ` - ${t.text} ${t.done ? "(done)" : ""}`)
      );
      const wrapped = doc.splitTextToSize(lines.join("\n"), 180);
      doc.text(wrapped, 10, y);
      y += wrapped.length * 6 + 4;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  } else {
    const lines = doc.splitTextToSize(String(plan), 180);
    doc.text(lines, 10, 20);
  }
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
