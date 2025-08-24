import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Redirect if not logged in
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // User is not logged in, clear any stale localStorage data
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    window.location.href = "login.html"; // force login
  } else {
    // User is logged in, update localStorage
    localStorage.setItem("userLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem(
      "userName",
      user.displayName || user.email.split("@")[0]
    );
    localStorage.setItem("userId", user.uid);
  }
});

// Show user name
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userNameElement = document.getElementById("userName");
    if (userNameElement) {
      userNameElement.innerText = user.displayName || user.email;
    }
  } else {
    window.location.href = "login.html";
  }
});

// Enhanced Logout with complete cleanup
async function handleLogout() {
  try {
    console.log("🚪 Logging out user...");

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.innerHTML = "Signing out...";
    }

    // Sign out from Firebase
    await signOut(auth);
    console.log("✅ Firebase signOut completed");

    // Clear all localStorage data
    localStorage.clear();
    console.log("✅ localStorage cleared");

    // Clear any session data
    sessionStorage.clear();
    console.log("✅ sessionStorage cleared");

    // Show logout message (optional)
    console.log("✅ User successfully logged out");

    // Redirect to home page
    window.location.href = "index.html";
  } catch (error) {
    console.error("❌ Logout error:", error);

    // Even if there's an error, still clear local data and redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
  }
}

// Logout button event listener
document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});

// Alternative logout setup (in case the button is added dynamically)
document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

// Chatbot toggle
const chatToggle = document.getElementById("chatToggle");
const chatbox = document.getElementById("chatbox");

if (chatToggle && chatbox) {
  chatToggle.addEventListener("click", () => {
    chatbox.style.display = chatbox.style.display === "flex" ? "none" : "flex";
  });
}

// Simple chatbot demo (you can later connect to API)
document.getElementById("sendChat")?.addEventListener("click", () => {
  const input = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");

  if (input && chatBody && input.value.trim() !== "") {
    let userMsg = `<div><b>You:</b> ${input.value}</div>`;
    let botMsg = `<div><b>Bot:</b> I'm still learning! 😅</div>`;
    chatBody.innerHTML += userMsg + botMsg;
    chatBody.scrollTop = chatBody.scrollHeight;
    input.value = "";
  }
});

// Enhanced Enter key support for chat
document.getElementById("chatInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("sendChat")?.click();
  }
});

// Page visibility change handler - logout if user closes tab/browser
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // User switched away from tab - could implement auto-logout timer here if needed
    console.log("User switched away from dashboard");
  } else {
    // User returned to tab - verify auth state
    if (!auth.currentUser && !localStorage.getItem("userLoggedIn")) {
      window.location.href = "login.html";
    }
  }
});

// Periodic auth state check (every 30 seconds)
setInterval(() => {
  if (!auth.currentUser) {
    console.log("⚠️ No authenticated user found, redirecting to login");
    localStorage.clear();
    window.location.href = "login.html";
  }
}, 30000);

// Expose logout function globally for any buttons added dynamically
window.handleDashboardLogout = handleLogout;

window.navigateTo = function (page) {
  window.location.href = page;
};

console.log("✅ Dashboard script loaded successfully");
