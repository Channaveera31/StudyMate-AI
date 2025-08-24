// — Import Firebase auth (v12 modular SDK) —
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Global auth state
let currentUser = null;

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUIBasedOnAuthState(user);
});

// Update UI based on auth state
function updateUIBasedOnAuthState(user) {
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userDropdown = document.getElementById("userDropdown");

  if (user) {
    console.log("User is logged in:", user.email);

    if (userMenuBtn) {
      userMenuBtn.innerHTML = `
        <i class="ri-user-3-fill"></i> ${
          user.displayName || user.email.split("@")[0]
        }
        <i class="ri-arrow-down-s-line caret"></i>
      `;
    }

    if (userDropdown) {
      userDropdown.innerHTML = `
        <a href="dashboard.html"><i class="ri-dashboard-line"></i> Dashboard</a>
        <a href="#" id="logoutBtn"><i class="ri-logout-circle-line"></i> Sign Out</a>
      `;
      // Attach logout handler
      document
        .getElementById("logoutBtn")
        .addEventListener("click", handleLogout);
    }
  } else {
    console.log("User is not logged in");

    // Clear any cached data
    localStorage.clear();
    sessionStorage.clear();

    if (userMenuBtn) {
      userMenuBtn.innerHTML = `
        <i class="ri-user-3-line"></i> Account
        <i class="ri-arrow-down-s-line caret"></i>
      `;
    }

    if (userDropdown) {
      userDropdown.innerHTML = `
        <a href="login.html"><i class="ri-login-circle-line"></i> Sign In</a>
        <a href="signup.html"><i class="ri-user-add-line"></i> Sign Up</a>
      `;
    }
  }
}

// Enhanced logout with complete cleanup
async function handleLogout(e) {
  if (e) e.preventDefault();

  try {
    console.log("🚪 Logging out user...");

    // Sign out from Firebase
    await signOut(auth);
    console.log("✅ Firebase signOut completed");

    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to home after short delay
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    console.error("❌ Logout error:", error);

    // Even if error, still reset
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
  }
}
window.handleLogout = handleLogout; // expose for dropdown

// — Navbar dropdown —
const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdown = document.getElementById("userDropdown");

if (userMenuBtn && userDropdown) {
  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = userDropdown.style.display === "block";
    userDropdown.style.display = isVisible ? "none" : "block";
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (userDropdown && userMenuBtn && !userMenuBtn.contains(e.target)) {
    userDropdown.style.display = "none";
  }
});

// — Handle feature click function —
window.handleFeatureClick = function (url) {
  if (!currentUser) {
    alert("Please sign in to access this feature.");
    window.location.href = "login.html";
    return false;
  }

  if (url.startsWith("#")) {
    const element = document.querySelector(url);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      if (url === "#chat-widget") {
        toggleChat(true);
      }
    }
  } else {
    window.location.href = url;
  }
  return false;
};

// — Explore button logic —
const exploreBtn = document.getElementById("exploreBtn");
if (exploreBtn) {
  exploreBtn.addEventListener("click", (e) => {
    if (!currentUser) {
      e.preventDefault();
      window.location.href = "login.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}

// — Mobile nav —
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    const isVisible = getComputedStyle(navLinks).display !== "none";
    navLinks.style.display = isVisible ? "none" : "flex";
  });
}

// — Smooth scroll for in-page links —
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const targetElement = document.querySelector(id);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

// — Testimonials slider —
const slider = document.getElementById("testiSlider");
if (slider) {
  let scrollPos = 0;
  setInterval(() => {
    scrollPos += 300;
    if (scrollPos >= slider.scrollWidth - slider.clientWidth) scrollPos = 0;
    slider.scrollTo({ left: scrollPos, behavior: "smooth" });
  }, 2500);
}

// — Footer year —
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// — Chatbot toggle —
const chatFab = document.getElementById("chatFab");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");
const chatSend = document.getElementById("chatSend");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");

const toggleChat = (open) => {
  if (!chatWindow) return;
  chatWindow.style.display = open ? "flex" : "none";
};

if (chatFab) chatFab.addEventListener("click", () => toggleChat());
if (chatClose) chatClose.addEventListener("click", () => toggleChat(false));

const appendMsg = (text, who = "bot") => {
  if (!chatBody) return;
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
};

const handleSend = () => {
  const text = chatInput?.value?.trim();
  if (!text) return;

  appendMsg(text, "me");
  chatInput.value = "";

  setTimeout(() => {
    appendMsg(
      "I'm on it! Soon I'll use your notes and flashcards for context-aware answers."
    );
  }, 350);
};

if (chatSend) chatSend.addEventListener("click", handleSend);
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });
}

// — Contact form —
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thank you for your message! We'll get back to you soon.");
    contactForm.reset();
  });
}

console.log("StudyMate AI - Main.js loaded successfully");
