// profile-loader.js - Fixed version with better error handling and data loading
import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

let userData = {};
let currentUser = null;
let isDataLoaded = false;

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Profile loader initializing...");

  // Set up loading state immediately
  showLoadingOverlay(true);

  // Show loading text in profile fields
  setLoadingText();

  // Check authentication state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      console.log("✅ User authenticated in profile:", user.uid);

      try {
        // Load user data first
        await loadUserDataFromFirebase();

        // Setup everything else after data is loaded
        setupEventListeners();
        setupFormValidation();

        // Animate stats after data is loaded
        setTimeout(() => {
          if (isDataLoaded) {
            animateStats();
          }
        }, 500);
      } catch (error) {
        console.error("❌ Error initializing profile:", error);
        showNotification(
          "❌ Error loading profile. Please refresh the page.",
          "error"
        );
      }
    } else {
      console.log("❌ User not authenticated, redirecting...");
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
});

// Set loading text in profile display
function setLoadingText() {
  const displayName = document.getElementById("displayName");
  const displayEmail = document.getElementById("displayEmail");

  if (displayName) displayName.textContent = "Loading...";
  if (displayEmail) displayEmail.textContent = "Loading...";
}

// Load user data from Firebase
async function loadUserDataFromFirebase() {
  console.log("📊 Loading user profile from Firebase...");

  try {
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const firebaseData = userDoc.data();
      console.log("✅ User data loaded from Firebase:", firebaseData);

      // Merge with current userData
      userData = { ...firebaseData };

      // Ensure required fields exist
      userData.firstName = userData.firstName || "";
      userData.lastName = userData.lastName || "";
      userData.email = userData.email || currentUser.email || "";
      userData.phone = userData.phone || "";
      userData.dateOfBirth = userData.dateOfBirth || "";
      userData.grade = userData.grade || "";
      userData.bio = userData.bio || "";

      // Ensure preferences exist
      userData.preferences = userData.preferences || {
        emailNotifications: false,
        pushNotifications: true,
        darkMode: false,
        autoSave: true,
        analytics: true,
        studyReminders: true,
      };

      // Ensure stats exist with default values
      userData.studyStats = userData.studyStats || {
        studyStreak: 15,
        totalHours: 127,
        completedQuizzes: 43,
        averageScore: 87,
      };

      // Mark data as loaded
      isDataLoaded = true;

      // Load the data into form fields and display
      loadUserDataIntoForm();
      updateDisplayInfo();

      // Update localStorage for caching
      localStorage.setItem("userProfile", JSON.stringify(userData));
      localStorage.setItem("userName", getUserDisplayName());

      console.log("✅ Profile data processing complete");
    } else {
      console.warn("⚠️ No user profile found, creating default profile...");
      await createDefaultProfile();
    }
  } catch (error) {
    console.error("❌ Error loading user profile:", error);

    // Try to load from localStorage as fallback
    await loadFromLocalStorageFallback();
  } finally {
    showLoadingOverlay(false);
  }
}

// Fallback to localStorage if Firebase fails
async function loadFromLocalStorageFallback() {
  console.log("🔄 Attempting to load from localStorage fallback...");

  try {
    const cachedProfile = localStorage.getItem("userProfile");
    if (cachedProfile) {
      userData = JSON.parse(cachedProfile);
      isDataLoaded = true;
      loadUserDataIntoForm();
      updateDisplayInfo();
      showNotification("📱 Loaded cached profile data", "info");
      console.log("✅ Loaded from localStorage:", userData);
    } else {
      console.log("⚠️ No cached data found, creating default profile...");
      await createDefaultProfile();
    }
  } catch (parseError) {
    console.error("❌ Error parsing cached profile:", parseError);
    await createDefaultProfile();
  }
}

// Get user display name with fallbacks
function getUserDisplayName() {
  if (userData.name) return userData.name;

  const firstName = userData.firstName || "";
  const lastName = userData.lastName || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  if (currentUser) {
    return currentUser.displayName || currentUser.email.split("@")[0];
  }

  return "Student";
}

// Create default profile if none exists
async function createDefaultProfile() {
  console.log("🆕 Creating default profile...");

  try {
    const displayName = currentUser
      ? currentUser.displayName || currentUser.email.split("@")[0]
      : "Student";
    const nameParts = displayName.split(" ");

    const defaultData = {
      uid: currentUser?.uid || "unknown",
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      name: displayName,
      email: currentUser?.email || "",
      phone: "",
      dateOfBirth: "",
      grade: "",
      bio: "",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      profileComplete: false,
      emailVerified: currentUser?.emailVerified || false,
      preferences: {
        emailNotifications: false,
        pushNotifications: true,
        darkMode: false,
        autoSave: true,
        analytics: true,
        studyReminders: true,
      },
      studyStats: {
        studyStreak: 15,
        totalHours: 127,
        completedQuizzes: 43,
        averageScore: 87,
      },
      subjects: [],
      goals: [],
      achievements: [],
      activities: [
        {
          action: "Profile Created",
          description: "Default profile created",
          timestamp: new Date().toISOString(),
          date: new Date().toISOString(),
        },
      ],
      notes: [],
      version: "1.0",
      theme: "light",
    };

    // Save to Firebase if user is authenticated
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
          ...defaultData,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        });
        console.log("✅ Default profile saved to Firebase");
      } catch (firebaseError) {
        console.warn(
          "⚠️ Could not save to Firebase, using local only:",
          firebaseError
        );
      }
    }

    // Update local data
    userData = defaultData;
    isDataLoaded = true;

    // Load into form and display
    loadUserDataIntoForm();
    updateDisplayInfo();

    // Cache locally
    localStorage.setItem("userProfile", JSON.stringify(userData));
    localStorage.setItem("userName", displayName);

    console.log("✅ Default profile created and loaded");
    showNotification("🆕 Welcome! Profile created successfully", "success");
  } catch (error) {
    console.error("❌ Error creating default profile:", error);
    showNotification("❌ Error creating profile", "error");
  }
}

function loadUserDataIntoForm() {
  if (!isDataLoaded || !userData) {
    console.log("⚠️ No user data available to load into form");
    return;
  }

  try {
    console.log("📄 Loading data into form fields...", userData);

    // Load basic info with safety checks
    const fields = {
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      email: userData.email || currentUser?.email || "",
      phone: userData.phone || "",
      dateOfBirth: userData.dateOfBirth || "",
      grade: userData.grade || "",
      bio: userData.bio || "",
    };

    // Populate form fields
    Object.keys(fields).forEach((fieldId) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = fields[fieldId];
        console.log(`✅ Set ${fieldId}: ${fields[fieldId]}`);
      } else {
        console.warn(`⚠️ Field ${fieldId} not found in DOM`);
      }
    });

    // Load preferences
    const preferences = userData.preferences || {};
    console.log("🔧 Loading preferences:", preferences);

    Object.keys(preferences).forEach((key) => {
      const toggle = document.querySelector(`[data-preference="${key}"]`);
      if (toggle) {
        if (preferences[key]) {
          toggle.classList.add("active");
        } else {
          toggle.classList.remove("active");
        }
        console.log(`✅ Set preference ${key}: ${preferences[key]}`);
      } else {
        console.warn(`⚠️ Preference toggle ${key} not found`);
      }
    });

    // Load stats
    const stats = userData.studyStats || {};
    console.log("📊 Loading stats:", stats);

    const statElements = {
      studyStreak: "studyStreak",
      totalHours: "totalHours",
      completedQuizzes: "completedQuizzes",
      averageScore: "averageScore",
    };

    Object.keys(statElements).forEach((statKey) => {
      const element = document.getElementById(statElements[statKey]);
      if (element && stats[statKey] !== undefined) {
        let value = stats[statKey];
        if (statKey === "averageScore") {
          value = value + "%";
        }
        element.textContent = value;
        console.log(`✅ Set stat ${statKey}: ${value}`);
      }
    });

    // Load avatar if exists
    if (userData.avatarData) {
      const avatar = document.getElementById("profileAvatar");
      if (avatar) {
        avatar.style.backgroundImage = `url(${userData.avatarData})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.textContent = "";
        console.log("✅ Loaded custom avatar");
      }
    }

    console.log("✅ Profile data loaded into form successfully");
  } catch (error) {
    console.error("❌ Error loading profile data into form:", error);
    showNotification("❌ Error loading some profile data", "error");
  }
}

function updateDisplayInfo() {
  if (!isDataLoaded || !userData) {
    console.log("⚠️ No user data available for display update");
    return;
  }

  try {
    const fullName = getUserDisplayName();
    const email = userData.email || currentUser?.email || "No email set";

    console.log("🔄 Updating display info:", { fullName, email });

    // Update display elements
    const displayNameElement = document.getElementById("displayName");
    const displayEmailElement = document.getElementById("displayEmail");

    if (displayNameElement) {
      displayNameElement.textContent = fullName;
      console.log("✅ Updated display name:", fullName);
    }
    if (displayEmailElement) {
      displayEmailElement.textContent = email;
      console.log("✅ Updated display email:", email);
    }

    // Update avatar with initials if no custom avatar
    const avatar = document.getElementById("profileAvatar");
    if (avatar && !userData.avatarData) {
      const initials = fullName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

      if (initials && initials !== "" && initials !== "S") {
        avatar.textContent = initials;
        avatar.style.backgroundImage = "";
        console.log("✅ Updated avatar with initials:", initials);
      }
    }

    // Update localStorage for other pages
    localStorage.setItem("userName", fullName);

    console.log("✅ Display info updated successfully");
  } catch (error) {
    console.error("❌ Error updating display info:", error);
  }
}

// Enhanced save profile function
async function saveProfile() {
  if (!currentUser) {
    showNotification("❌ Not authenticated", "error");
    return;
  }

  showLoadingOverlay(true);

  try {
    console.log("💾 Saving profile data...");

    // Collect form data with validation
    const formElements = {
      firstName: document.getElementById("firstName"),
      lastName: document.getElementById("lastName"),
      email: document.getElementById("email"),
      phone: document.getElementById("phone"),
      dateOfBirth: document.getElementById("dateOfBirth"),
      grade: document.getElementById("grade"),
      bio: document.getElementById("bio"),
    };

    const formData = {};
    Object.keys(formElements).forEach((key) => {
      const element = formElements[key];
      if (element) {
        formData[key] = element.value.trim();
      } else {
        formData[key] = userData[key] || "";
      }
    });

    // Add metadata
    formData.name = `${formData.firstName} ${formData.lastName}`.trim();
    formData.lastUpdated = new Date().toISOString();
    formData.profileComplete = true;

    console.log("💾 Saving profile data:", formData);

    // Save to Firebase
    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          ...formData,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("✅ Profile saved to Firebase");
    } catch (firebaseError) {
      console.warn("⚠️ Firebase save failed, saving locally:", firebaseError);
    }

    // Update local userData
    Object.assign(userData, formData);

    // Update localStorage cache
    localStorage.setItem("userProfile", JSON.stringify(userData));
    localStorage.setItem(
      "userName",
      formData.name || formData.firstName || "Student"
    );

    // Update display
    updateDisplayInfo();

    showLoadingOverlay(false);
    showNotification("✅ Profile updated successfully!", "success");

    console.log("✅ Profile saved successfully");

    // Add activity log
    await logActivity("Profile Updated", "Updated personal information");
  } catch (error) {
    console.error("❌ Error saving profile:", error);
    showLoadingOverlay(false);
    showNotification("❌ Error saving profile: " + error.message, "error");
  }
}

// Log user activity
async function logActivity(action, description) {
  try {
    if (!currentUser) return;

    const activity = {
      action,
      description,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString(),
    };

    // Add to user's activities array
    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const currentActivities = userDoc.data().activities || [];
      currentActivities.unshift(activity); // Add to beginning

      // Keep only last 50 activities
      const limitedActivities = currentActivities.slice(0, 50);

      await setDoc(userRef, { activities: limitedActivities }, { merge: true });
      console.log("📝 Activity logged:", action);
    }
  } catch (error) {
    console.error("❌ Error logging activity:", error);
  }
}

// Enhanced toggle switch handler
function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");

  // Form submission
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveProfile();
    });
  }

  // Toggle switches with Firebase sync
  document.querySelectorAll(".toggle-switch").forEach((toggle) => {
    toggle.addEventListener("click", async function () {
      this.classList.toggle("active");
      const preference = this.dataset.preference;
      const isActive = this.classList.contains("active");

      // Update local data
      if (!userData.preferences) userData.preferences = {};
      userData.preferences[preference] = isActive;

      try {
        // Save to Firebase
        if (currentUser) {
          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              preferences: userData.preferences,
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          );
        }

        console.log(`✅ Preference ${preference} updated:`, isActive);

        // Special handling for dark mode
        if (preference === "darkMode") {
          toggleDarkMode(isActive);
        }

        // Auto-save notification
        if (userData.preferences.autoSave) {
          showNotification(
            `🔧 ${preference.replace(/([A-Z])/g, " $1").toLowerCase()} ${
              isActive ? "enabled" : "disabled"
            }`,
            "info"
          );
        }
      } catch (error) {
        console.error("❌ Error saving preference:", error);
        // Revert toggle on error
        this.classList.toggle("active");
        userData.preferences[preference] = !isActive;
        showNotification("❌ Error saving preference", "error");
      }
    });
  });

  // Real-time form validation and auto-save trigger
  document.querySelectorAll(".form-input").forEach((input) => {
    input.addEventListener("input", function () {
      validateField(this);
      if (userData.preferences?.autoSave) {
        startAutoSave();
      }
    });

    input.addEventListener("blur", function () {
      validateField(this);
    });
  });

  // Real-time display updates
  const firstNameField = document.getElementById("firstName");
  const lastNameField = document.getElementById("lastName");

  if (firstNameField) {
    firstNameField.addEventListener("input", function () {
      userData.firstName = this.value;
      updateDisplayInfo();
    });
  }

  if (lastNameField) {
    lastNameField.addEventListener("input", function () {
      userData.lastName = this.value;
      updateDisplayInfo();
    });
  }

  console.log("✅ Event listeners set up successfully");
}

function validateField(field) {
  const isValid = field.checkValidity() && field.value.trim() !== "";

  if (!isValid && field.value) {
    field.style.borderColor = "var(--error)";
  } else if (isValid && field.value) {
    field.style.borderColor = "var(--success)";
  } else {
    field.style.borderColor = "var(--border)";
  }

  // Reset border after delay
  setTimeout(() => {
    if (!field.matches(":focus")) {
      field.style.borderColor = "var(--border)";
    }
  }, 2000);
}

function resetForm() {
  if (
    confirm(
      "Are you sure you want to reset all changes? This will restore your last saved profile."
    )
  ) {
    loadUserDataFromFirebase();
    showNotification("🔄 Profile reset to last saved version", "info");
  }
}

function uploadAvatar() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async function (e) {
    if (e.target.files[0]) {
      const file = e.target.files[0];

      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showNotification(
          "❌ Image too large. Please choose a file under 2MB.",
          "error"
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = async function (event) {
        const avatar = document.getElementById("profileAvatar");
        if (avatar) {
          avatar.style.backgroundImage = `url(${event.target.result})`;
          avatar.style.backgroundSize = "cover";
          avatar.style.backgroundPosition = "center";
          avatar.textContent = "";
        }

        try {
          // Save avatar data to Firebase
          if (currentUser) {
            await setDoc(
              doc(db, "users", currentUser.uid),
              {
                avatarData: event.target.result,
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            );
          }

          userData.avatarData = event.target.result;
          localStorage.setItem("userProfile", JSON.stringify(userData));
          showNotification("📷 Profile picture updated!", "success");
          await logActivity("Avatar Updated", "Changed profile picture");
        } catch (error) {
          console.error("❌ Error saving avatar:", error);
          showNotification("❌ Error saving profile picture", "error");
        }
      };

      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function toggleDarkMode(enabled) {
  if (enabled) {
    document.body.style.filter = "invert(1) hue-rotate(180deg)";
    showNotification("🌙 Dark mode enabled", "info");
  } else {
    document.body.style.filter = "none";
    showNotification("☀️ Light mode enabled", "info");
  }
}

function animateStats() {
  if (!userData.studyStats) {
    console.log("⚠️ No study stats to animate");
    return;
  }

  console.log("🎬 Animating stats:", userData.studyStats);

  const statsToAnimate = [
    "studyStreak",
    "totalHours",
    "completedQuizzes",
    "averageScore",
  ];

  statsToAnimate.forEach((key, index) => {
    const element = document.getElementById(key);
    if (element && userData.studyStats[key] !== undefined) {
      setTimeout(() => {
        animateValue(key, 0, userData.studyStats[key], 1000);
      }, index * 200);
    }
  });
}

function animateValue(elementId, start, end, duration) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`⚠️ Element ${elementId} not found for animation`);
    return;
  }

  const range = end - start;
  const startTime = performance.now();
  const isPercentage = elementId === "averageScore";

  function updateValue(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = start + range * progress;

    element.textContent = isPercentage
      ? Math.round(current) + "%"
      : Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(updateValue);
    }
  }

  requestAnimationFrame(updateValue);
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function showNotification(message, type) {
  // Remove existing notification
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}

// Auto-save functionality
let autoSaveTimer;
function startAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (userData.preferences?.autoSave) {
      saveProfile();
    }
  }, 30000); // Auto-save after 30 seconds of inactivity
}

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "s":
        e.preventDefault();
        saveProfile();
        break;
      case "r":
        e.preventDefault();
        resetForm();
        break;
    }
  }
});

// Form validation on submit
function setupFormValidation() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  profileForm.addEventListener("submit", function (e) {
    let isValid = true;

    // Check required fields
    const requiredFields = ["firstName", "lastName", "email"];
    requiredFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field && !field.value.trim()) {
        validateField(field);
        isValid = false;
      }
    });

    // Email validation
    const email = document.getElementById("email");
    if (email && email.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        email.style.borderColor = "var(--error)";
        isValid = false;
        showNotification("⚠️ Please enter a valid email address", "error");
      }
    }

    if (!isValid) {
      e.preventDefault();
      showNotification(
        "⚠️ Please fill in all required fields correctly",
        "error"
      );
    }
  });
}

// Page visibility API for auto-save
document.addEventListener("visibilitychange", function () {
  if (document.hidden && userData.preferences?.autoSave) {
    const form = document.getElementById("profileForm");
    if (!form) return;

    const formData = new FormData(form);
    let hasChanges = false;

    for (let [key, value] of formData.entries()) {
      if (userData[key] !== value) {
        hasChanges = true;
        break;
      }
    }

    if (hasChanges) {
      saveProfile();
    }
  }
});

// Export functions for global access
window.saveProfile = saveProfile;
window.resetForm = resetForm;
window.uploadAvatar = uploadAvatar;

console.log("🔧 Profile data loader module loaded successfully");
