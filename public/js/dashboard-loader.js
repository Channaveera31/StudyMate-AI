// dashboard-loader.js - Enhanced version with better data handling
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

let currentUser = null;
let userData = null;
let isDataLoaded = false;

// Initialize dashboard when DOM loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("🏠 Dashboard loader initializing...");

  // Check authentication state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      console.log("✅ User authenticated on dashboard:", user.uid);
      await loadUserDataAndUpdateDisplay();
    } else {
      console.log("❌ User not authenticated, redirecting...");
      localStorage.clear();
      window.location.href = "login.html";
    }
  });

  // Also try to load from cache immediately for faster display
  const cachedProfile = localStorage.getItem("userProfile");
  const cachedUserName = localStorage.getItem("userName");

  if (cachedProfile && cachedUserName) {
    try {
      userData = JSON.parse(cachedProfile);
      updateDashboardDisplay();
      console.log("✅ Dashboard updated with cached data");
    } catch (error) {
      console.error("❌ Error parsing cached data:", error);
    }
  }
});

// Load user data and update dashboard display
async function loadUserDataAndUpdateDisplay() {
  try {
    console.log("📊 Loading user data for dashboard...");

    // Try to get fresh data from Firestore
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));

    if (userDoc.exists()) {
      userData = userDoc.data();
      isDataLoaded = true;
      console.log("✅ Fresh user data loaded:", userData);

      // Update localStorage
      localStorage.setItem("userProfile", JSON.stringify(userData));
      localStorage.setItem(
        "userName",
        userData.name ||
          userData.firstName ||
          currentUser.displayName ||
          "Student"
      );
      localStorage.setItem("userEmail", userData.email || currentUser.email);
    } else {
      console.warn("⚠️ User profile not found in Firestore");

      // Use cached data or create minimal profile
      const cachedProfile = localStorage.getItem("userProfile");
      if (cachedProfile) {
        userData = JSON.parse(cachedProfile);
        isDataLoaded = true;
      } else {
        // Create minimal user data
        userData = createMinimalUserData();
        isDataLoaded = true;
      }
    }

    // Update dashboard display
    updateDashboardDisplay();
  } catch (error) {
    console.error("❌ Error loading user data:", error);

    // Try to use cached data as fallback
    const cachedProfile = localStorage.getItem("userProfile");
    if (cachedProfile) {
      try {
        userData = JSON.parse(cachedProfile);
        isDataLoaded = true;
        updateDashboardDisplay();
        console.log("✅ Using cached data as fallback");
      } catch (parseError) {
        console.error("❌ Error parsing cached data:", parseError);
        setDefaultDisplay();
      }
    } else {
      setDefaultDisplay();
    }
  }
}

// Create minimal user data when no profile exists
function createMinimalUserData() {
  const displayName =
    currentUser.displayName || currentUser.email.split("@")[0];
  const nameParts = displayName.split(" ");

  return {
    name: displayName,
    firstName: nameParts[0] || displayName,
    lastName: nameParts.slice(1).join(" ") || "",
    email: currentUser.email,
    studyStats: {
      studyStreak: 0,
      totalHours: 0,
      completedQuizzes: 0,
      averageScore: 0,
    },
    activities: [],
  };
}

// Update dashboard display elements
function updateDashboardDisplay() {
  if (!userData || !isDataLoaded) {
    console.log("⚠️ No user data available for display");
    return;
  }

  console.log("📄 Updating dashboard display...");

  try {
    // Determine the best display name
    const displayName = determineDisplayName();
    console.log("👤 Display name:", displayName);

    // Update welcome message using multiple strategies
    updateWelcomeMessage(displayName);

    // Update other user name elements
    updateUserNameElements(displayName);

    // Update user email elements
    updateUserEmailElements();

    // Update study statistics
    if (userData.studyStats) {
      updateStudyStats(userData.studyStats);
    }

    // Update activities
    if (userData.activities && Array.isArray(userData.activities)) {
      updateRecentActivities(userData.activities);
    }

    // Store updated display name
    localStorage.setItem("userName", displayName);

    console.log("✅ Dashboard display updated successfully");
  } catch (error) {
    console.error("❌ Error updating dashboard display:", error);
  }
}

function determineDisplayName() {
  // Try multiple sources for the display name
  let displayName = "";

  if (userData.name && userData.name.trim()) {
    displayName = userData.name.trim();
  } else if (userData.firstName || userData.lastName) {
    displayName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();
  } else if (currentUser?.displayName) {
    displayName = currentUser.displayName;
  } else if (currentUser?.email) {
    displayName = currentUser.email.split("@")[0];
  } else {
    displayName = "Student";
  }

  return displayName;
}

function updateWelcomeMessage(displayName) {
  // Strategy 1: Try specific selectors first
  const welcomeSelectors = [
    "#welcomeMessage",
    ".welcome-message",
    '[class*="welcome"]',
    ".user-greeting",
    ".dashboard-greeting",
  ];

  let welcomeUpdated = false;

  welcomeSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element) {
        // Check if element contains "Welcome" or "Student" text
        if (
          element.textContent.includes("Welcome") ||
          element.textContent.includes("Student")
        ) {
          element.textContent = `Welcome, ${displayName}!`;
          welcomeUpdated = true;
          console.log(`✅ Updated welcome message via ${selector}`);
        }
      }
    });
  });

  // Strategy 2: Search all elements for "Welcome, Student" text
  if (!welcomeUpdated) {
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      if (
        element.textContent &&
        (element.textContent.includes("Welcome, Student") ||
          element.textContent.trim() === "Welcome, Student!" ||
          element.textContent.includes("Welcome, Student!"))
      ) {
        element.textContent = `Welcome, ${displayName}!`;
        welcomeUpdated = true;
        console.log("✅ Updated welcome message via text content search");
      }
    });
  }

  // Strategy 3: Look for specific text patterns
  if (!welcomeUpdated) {
    const textWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textNode;
    while ((textNode = textWalker.nextNode())) {
      if (textNode.textContent.includes("Welcome, Student")) {
        textNode.textContent = textNode.textContent.replace(
          /Welcome,\s*Student/gi,
          `Welcome, ${displayName}`
        );
        welcomeUpdated = true;
        console.log("✅ Updated welcome message via text walker");
        break;
      }
    }
  }

  if (!welcomeUpdated) {
    console.log("⚠️ Could not find welcome message element to update");
  }
}

function updateUserNameElements(displayName) {
  const userNameSelectors = [
    "#userName",
    ".user-name",
    "#displayName",
    ".display-name",
    ".user-profile-name",
  ];

  userNameSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element) {
        element.textContent = displayName;
        console.log(`✅ Updated user name via ${selector}`);
      }
    });
  });
}

function updateUserEmailElements() {
  const email = userData.email || currentUser?.email || "";
  const userEmailSelectors = [
    "#userEmail",
    ".user-email",
    "#displayEmail",
    ".display-email",
  ];

  userEmailSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      if (element) {
        element.textContent = email;
        console.log(`✅ Updated user email via ${selector}`);
      }
    });
  });
}

// Update study statistics on dashboard
function updateStudyStats(stats) {
  console.log("📈 Updating study stats:", stats);

  // Default stats if none provided
  const defaultStats = {
    studyStreak: 0,
    totalHours: 0,
    completedQuizzes: 0,
    averageScore: 0,
  };

  const actualStats = { ...defaultStats, ...stats };

  const statMappings = {
    studyStreak: ["#studyStreak", ".study-streak", '[data-stat="streak"]'],
    totalHours: ["#totalHours", ".total-hours", '[data-stat="hours"]'],
    completedQuizzes: [
      "#completedQuizzes",
      ".completed-quizzes",
      '[data-stat="quizzes"]',
    ],
    averageScore: ["#averageScore", ".average-score", '[data-stat="score"]'],
  };

  Object.keys(statMappings).forEach((statKey) => {
    const value = actualStats[statKey] || 0;
    const formattedValue = statKey === "averageScore" ? `${value}%` : value;

    statMappings[statKey].forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element) {
          element.textContent = formattedValue;
          console.log(`✅ Updated ${statKey}: ${formattedValue}`);
        }
      });
    });
  });

  // Also try to find elements by text content and data attributes
  updateStatsByContent(actualStats);
}

function updateStatsByContent(stats) {
  // Find elements that might contain stat values by looking at parent containers
  const statElements = document.querySelectorAll(
    '[class*="stat-value"], [id*="stat"], .stat-number, .metric-value'
  );

  statElements.forEach((element) => {
    const parent = element.closest('[class*="stat"]') || element.parentElement;
    const label =
      parent
        ?.querySelector('[class*="label"], .stat-label, .metric-label')
        ?.textContent?.toLowerCase() ||
      parent?.textContent?.toLowerCase() ||
      "";

    if (label) {
      if (label.includes("streak") || label.includes("day")) {
        element.textContent = stats.studyStreak || 0;
      } else if (label.includes("hours") || label.includes("time")) {
        element.textContent = stats.totalHours || 0;
      } else if (label.includes("quiz") || label.includes("completed")) {
        element.textContent = stats.completedQuizzes || 0;
      } else if (
        label.includes("score") ||
        label.includes("average") ||
        label.includes("avg")
      ) {
        element.textContent = `${stats.averageScore || 0}%`;
      }
    }
  });
}

// Update recent activities section
function updateRecentActivities(activities) {
  console.log("📝 Updating recent activities:", activities);

  const activityContainer = document.querySelector(
    "#recentActivities, .recent-activities, .activity-list, [class*='activity']"
  );

  if (!activityContainer) {
    console.log("⚠️ Activity container not found");
    return;
  }

  // Clear existing activities (but preserve headers/titles)
  const activityItems = activityContainer.querySelectorAll(
    ".activity-item, .activity"
  );
  activityItems.forEach((item) => {
    // Only remove if it doesn't contain header text
    if (
      !item.textContent.toLowerCase().includes("recent") &&
      !item.textContent.toLowerCase().includes("activities")
    ) {
      item.remove();
    }
  });

  // Add new activities (limit to 5 most recent)
  const recentActivities = activities.slice(0, 5);

  if (recentActivities.length === 0) {
    // Add a placeholder if no activities
    const placeholderElement = createActivityElement({
      action: "Welcome to StudyMate AI!",
      description: "Start your learning journey today",
      timestamp: new Date(),
      date: new Date().toISOString(),
    });

    if (placeholderElement) {
      activityContainer.appendChild(placeholderElement);
    }
  } else {
    recentActivities.forEach((activity) => {
      const activityElement = createActivityElement(activity);
      if (activityElement) {
        activityContainer.appendChild(activityElement);
      }
    });
  }
}

// Create activity element
function createActivityElement(activity) {
  try {
    const activityDiv = document.createElement("div");
    activityDiv.className = "activity-item";

    const timeAgo = getTimeAgo(activity.date || activity.timestamp);
    const action = activity.action || "Activity";
    const description = activity.description || "";

    // Choose appropriate icon based on action
    let icon = "📝";
    if (
      action.toLowerCase().includes("login") ||
      action.toLowerCase().includes("welcome")
    ) {
      icon = "👋";
    } else if (action.toLowerCase().includes("profile")) {
      icon = "👤";
    } else if (action.toLowerCase().includes("study")) {
      icon = "📚";
    } else if (action.toLowerCase().includes("quiz")) {
      icon = "🧠";
    }

    activityDiv.innerHTML = `
      <div class="activity-icon">${icon}</div>
      <div class="activity-content">
        <div class="activity-title">${action}</div>
        <div class="activity-description">${description}</div>
        <div class="activity-time">${timeAgo}</div>
      </div>
    `;

    return activityDiv;
  } catch (error) {
    console.error("❌ Error creating activity element:", error);
    return null;
  }
}

// Calculate time ago
function getTimeAgo(timestamp) {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  } catch (error) {
    return "Recently";
  }
}

// Set default display when no data is available
function setDefaultDisplay() {
  console.log("⚠️ Setting default display");

  const defaultName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Student";

  // Update welcome message with default name
  updateWelcomeMessage(defaultName);

  // Update localStorage
  localStorage.setItem("userName", defaultName);

  // Set default stats
  const defaultStats = {
    studyStreak: 0,
    totalHours: 0,
    completedQuizzes: 0,
    averageScore: 0,
  };

  updateStudyStats(defaultStats);
}

// Force refresh dashboard data
function refreshDashboard() {
  console.log("🔄 Refreshing dashboard data...");
  if (currentUser) {
    loadUserDataAndUpdateDisplay();
  }
}

// Export for use in other scripts
window.updateDashboardDisplay = updateDashboardDisplay;
window.loadUserDataAndUpdateDisplay = loadUserDataAndUpdateDisplay;
window.refreshDashboard = refreshDashboard;

console.log("🏠 Dashboard loader module loaded");
