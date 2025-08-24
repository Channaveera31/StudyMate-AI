// auth.js - Fixed version with proper user data handling and redirection
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Track current user
let currentUser = null;

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    console.log("✅ User authenticated:", user.email);
    localStorage.setItem("userLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    // Fetch and store complete user data
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        localStorage.setItem("userProfile", JSON.stringify(userData));
        localStorage.setItem(
          "userName",
          userData.name ||
            userData.firstName ||
            user.displayName ||
            user.email.split("@")[0]
        );
        console.log("✅ User profile cached:", userData);

        // Update display elements if on dashboard
        updateDashboardDisplay(userData);
      } else {
        console.warn("⚠️ User profile not found in Firestore");
        // Set fallback name
        localStorage.setItem(
          "userName",
          user.displayName || user.email.split("@")[0]
        );
      }
    } catch (error) {
      console.error("❌ Error loading user profile:", error);
      // Set fallback name even on error
      localStorage.setItem(
        "userName",
        user.displayName || user.email.split("@")[0]
      );
    }
  } else {
    console.log("🚪 User not authenticated");
    localStorage.clear();
  }
});

// Update dashboard display elements
function updateDashboardDisplay(userData) {
  // Update welcome message
  const welcomeElements = document.querySelectorAll(
    '[id*="welcome"], [class*="welcome"]'
  );
  const userName =
    userData.name || userData.firstName || userData.displayName || "Student";

  welcomeElements.forEach((element) => {
    if (
      element.textContent.includes("Welcome") ||
      element.textContent.includes("Student")
    ) {
      element.textContent = `Welcome, ${userName}!`;
    }
  });

  // Update user menu/profile elements
  const userNameElements = document.querySelectorAll(
    ".user-name, #userName, #displayName"
  );
  userNameElements.forEach((element) => {
    element.textContent = userName;
  });

  // Update user email elements
  const userEmailElements = document.querySelectorAll(
    ".user-email, #userEmail, #displayEmail"
  );
  userEmailElements.forEach((element) => {
    element.textContent = userData.email;
  });

  // Update stats if elements exist
  if (userData.studyStats) {
    Object.keys(userData.studyStats).forEach((key) => {
      const element = document.getElementById(key);
      if (element) {
        let value = userData.studyStats[key] || 0;
        if (key === "averageScore" && typeof value === "number") {
          value = value + "%";
        }
        element.textContent = value;
      }
    });
  }
}

// Utility functions
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const successDiv = document.getElementById("successMessage");

  if (successDiv) successDiv.style.display = "none";
  if (errorDiv) {
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    errorDiv.style.display = "block";
    errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => (errorDiv.style.display = "none"), 8000);
  } else {
    alert(message);
  }
}

function showSuccess(message) {
  const errorDiv = document.getElementById("errorMessage");
  const successDiv = document.getElementById("successMessage");

  if (errorDiv) errorDiv.style.display = "none";
  if (successDiv) {
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successDiv.style.display = "block";
    successDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    console.log("SUCCESS:", message);
  }
}

// FIXED SIGNUP Function with proper redirection
async function handleSignup(e) {
  e.preventDefault();
  console.log("🚀 Starting signup process...");

  // Get form fields
  const firstNameField = document.getElementById("firstName");
  const lastNameField = document.getElementById("lastName");
  const nameField = document.getElementById("fullName");
  const emailField = document.getElementById("signupEmail");
  const passwordField = document.getElementById("signupPassword");
  const confirmPasswordField = document.getElementById("confirmPassword");
  const agreeTermsField = document.getElementById("agreeTerms");
  const signupBtn = document.getElementById("signupBtn");

  if (!emailField || !passwordField) {
    showError("Required form fields not found");
    return;
  }

  // Extract data
  let firstName, lastName, fullName;

  if (firstNameField && lastNameField) {
    firstName = firstNameField.value.trim();
    lastName = lastNameField.value.trim();
    fullName = `${firstName} ${lastName}`.trim();
  } else if (nameField) {
    fullName = nameField.value.trim();
    const nameParts = fullName.split(" ");
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  const email = emailField.value.trim();
  const password = passwordField.value;
  const confirmPassword = confirmPasswordField
    ? confirmPasswordField.value
    : password;

  // Validation
  if (!fullName || !email || !password) {
    showError("Please fill in all required fields");
    return;
  }
  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }
  if (password.length < 6) {
    showError("Password must be at least 6 characters long");
    return;
  }
  if (agreeTermsField && !agreeTermsField.checked) {
    showError("You must agree to the Terms of Service");
    return;
  }

  // Loading state
  if (signupBtn) {
    signupBtn.classList.add("loading");
    signupBtn.disabled = true;
  }

  try {
    console.log("🔐 Creating Firebase Auth user...");

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("✅ Auth user created:", user.uid);

    // Update profile with display name
    await updateProfile(user, { displayName: fullName });
    console.log("✅ Display name updated:", fullName);

    // Collect comprehensive user data
    const userData = {
      // Basic Info
      uid: user.uid,
      firstName: firstName,
      lastName: lastName,
      name: fullName,
      email: email,
      phone: document.getElementById("phone")?.value.trim() || "",
      dateOfBirth: document.getElementById("dateOfBirth")?.value || "",
      grade: document.getElementById("grade")?.value || "",
      bio: document.getElementById("bio")?.value.trim() || "",

      // Timestamps
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      lastUpdated: serverTimestamp(),

      // Profile Status
      profileComplete: true,
      emailVerified: user.emailVerified,

      // Study Preferences
      preferences: {
        emailNotifications:
          document.getElementById("emailNotifications")?.checked || false,
        pushNotifications:
          document.getElementById("pushNotifications")?.checked || true,
        darkMode: document.getElementById("darkMode")?.checked || false,
        autoSave: document.getElementById("autoSave")?.checked || true,
        analytics: document.getElementById("analytics")?.checked || true,
        studyReminders:
          document.getElementById("studyReminders")?.checked || true,
        newsletter: document.getElementById("newsletter")?.checked || false,
      },

      // Study Statistics
      studyStats: {
        studyStreak: 0,
        totalHours: 0,
        completedQuizzes: 0,
        averageScore: 0,
        lastStudyDate: null,
        totalSessions: 0,
        streakDays: 0,
      },

      // Additional arrays
      subjects: [],
      goals: [],
      achievements: [],
      activities: [
        {
          action: "Account Created",
          description: "Welcome to StudyMate AI!",
          timestamp: serverTimestamp(),
          date: new Date().toISOString(),
        },
      ],
      notes: [],

      // System
      version: "1.0",
      theme: document.getElementById("darkMode")?.checked ? "dark" : "light",
    };

    console.log("💾 Saving user data to Firestore...", userData);

    // Save to Firestore
    await setDoc(doc(db, "users", user.uid), userData);
    console.log("✅ User data saved to Firestore successfully");

    // Cache user data locally
    localStorage.setItem("userProfile", JSON.stringify(userData));
    localStorage.setItem("userName", fullName);

    // Success feedback
    showSuccess("🎉 Account created successfully! Redirecting to login...");

    // Animation
    const authCard = document.querySelector(".auth-card");
    if (authCard) {
      authCard.style.transform = "scale(1.02)";
      authCard.style.transition = "transform 0.3s ease";
    }

    // Force logout to ensure clean login flow
    console.log("🔄 Signing out for clean login flow...");
    await signOut(auth);

    // Clear any cached auth state
    localStorage.removeItem("userLoggedIn");

    // Redirect after delay
    setTimeout(() => {
      console.log("🔄 Redirecting to login page...");
      window.location.href = "login.html";
    }, 2500);
  } catch (error) {
    console.error("❌ Signup error:", error);

    let errorMessage = "Account creation failed";
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "An account with this email already exists";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address";
        break;
      case "auth/weak-password":
        errorMessage = "Password is too weak (minimum 6 characters)";
        break;
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your connection.";
        break;
      case "auth/operation-not-allowed":
        errorMessage = "Email/password accounts are not enabled";
        break;
      default:
        errorMessage = error.message;
    }

    showError(errorMessage);

    // Shake animation
    const authCard = document.querySelector(".auth-card");
    if (authCard) {
      authCard.classList.add("shake");
      setTimeout(() => authCard.classList.remove("shake"), 500);
    }
  } finally {
    if (signupBtn) {
      signupBtn.classList.remove("loading");
      signupBtn.disabled = false;
    }
  }
}

// FIXED LOGIN Function with proper data loading
async function handleLogin(e) {
  e.preventDefault();
  console.log("🔓 Starting login process...");

  const emailField = document.getElementById("loginEmail");
  const passwordField = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtn");

  if (!emailField || !passwordField) {
    showError("Login form fields not found");
    return;
  }

  const email = emailField.value.trim();
  const password = passwordField.value;

  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  if (loginBtn) {
    loginBtn.classList.add("loading");
    loginBtn.disabled = true;
  }

  try {
    console.log("🔐 Authenticating user:", email);

    // Sign in user
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("✅ User authenticated:", user.uid);

    // Update last login timestamp
    await setDoc(
      doc(db, "users", user.uid),
      {
        lastLogin: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("✅ Last login timestamp updated");

    // Load complete user profile
    console.log("📊 Loading user profile from Firestore...");
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Store all user data
      localStorage.setItem("userProfile", JSON.stringify(userData));
      localStorage.setItem("userLoggedIn", "true");
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem(
        "userName",
        userData.name ||
          userData.firstName ||
          user.displayName ||
          user.email.split("@")[0]
      );

      console.log("✅ Complete user profile loaded and cached:", userData);
    } else {
      console.warn("⚠️ User profile not found, creating basic profile...");

      // Create basic profile if missing
      const basicUserData = {
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        firstName: user.displayName?.split(" ")[0] || "",
        lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        profileComplete: false,
        preferences: {
          emailNotifications: false,
          pushNotifications: true,
          darkMode: false,
          autoSave: true,
          analytics: true,
          studyReminders: true,
        },
        studyStats: {
          studyStreak: 0,
          totalHours: 0,
          completedQuizzes: 0,
          averageScore: 0,
        },
        activities: [],
        subjects: [],
        goals: [],
        achievements: [],
        notes: [],
      };

      await setDoc(doc(db, "users", user.uid), basicUserData);
      localStorage.setItem("userProfile", JSON.stringify(basicUserData));
      localStorage.setItem("userName", basicUserData.name);
    }

    showSuccess("✅ Login successful! Redirecting to dashboard...");

    // Animation
    const authCard = document.querySelector(".auth-card");
    if (authCard) {
      authCard.style.transform = "scale(1.02)";
      authCard.style.transition = "transform 0.3s ease";
    }

    // Redirect to dashboard
    setTimeout(() => {
      console.log("🔄 Redirecting to dashboard...");
      window.location.href = "dashboard.html";
    }, 1500);
  } catch (error) {
    console.error("❌ Login error:", error);

    let errorMessage = "Login failed";
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid email address";
        break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your connection.";
        break;
      case "auth/invalid-credential":
        errorMessage = "Invalid email or password";
        break;
      default:
        errorMessage = error.message;
    }

    showError(errorMessage);

    // Shake animation
    const authCard = document.querySelector(".auth-card");
    if (authCard) {
      authCard.classList.add("shake");
      setTimeout(() => authCard.classList.remove("shake"), 500);
    }
  } finally {
    if (loginBtn) {
      loginBtn.classList.remove("loading");
      loginBtn.disabled = false;
    }
  }
}

// LOGOUT Function
async function handleLogout() {
  try {
    console.log("🚪 Logging out user...");
    await signOut(auth);
    localStorage.clear();
    showSuccess("✅ Logged out successfully!");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("❌ Logout error:", error);
    showError("Error logging out: " + error.message);
  }
}

// PROFILE UPDATE Function
async function updateUserProfile(updatedData) {
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    console.log("💾 Updating user profile...", updatedData);

    // Update Firestore document
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        ...updatedData,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    // Update local storage
    const currentProfile = JSON.parse(
      localStorage.getItem("userProfile") || "{}"
    );
    const newProfile = { ...currentProfile, ...updatedData };
    localStorage.setItem("userProfile", JSON.stringify(newProfile));

    // Update display name if changed
    if (updatedData.name || (updatedData.firstName && updatedData.lastName)) {
      const displayName =
        updatedData.name ||
        `${updatedData.firstName} ${updatedData.lastName}`.trim();
      localStorage.setItem("userName", displayName);
      updateDashboardDisplay(newProfile);
    }

    console.log("✅ Profile updated successfully");
    return newProfile;
  } catch (error) {
    console.error("❌ Profile update error:", error);
    throw error;
  }
}

// LOAD USER PROFILE Function
async function loadUserProfile() {
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    console.log("📊 Loading user profile...");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      localStorage.setItem("userProfile", JSON.stringify(userData));
      localStorage.setItem(
        "userName",
        userData.name ||
          userData.firstName ||
          currentUser.displayName ||
          currentUser.email.split("@")[0]
      );
      updateDashboardDisplay(userData);
      return userData;
    } else {
      throw new Error("User profile not found");
    }
  } catch (error) {
    console.error("❌ Error loading profile:", error);
    throw error;
  }
}

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 Enhanced Auth.js initialized");

  // Setup form handlers
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
    console.log("✅ Signup form handler attached");
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    console.log("✅ Login form handler attached");
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
    console.log("✅ Logout button handler attached");
  }

  // Update display with cached data if available
  const cachedProfile = localStorage.getItem("userProfile");
  if (cachedProfile) {
    try {
      const userData = JSON.parse(cachedProfile);
      updateDashboardDisplay(userData);
      console.log("✅ Display updated with cached profile data");
    } catch (error) {
      console.error("❌ Error parsing cached profile:", error);
    }
  }

  // Expose functions globally
  window.handleLogout = handleLogout;
  window.updateUserProfile = updateUserProfile;
  window.loadUserProfile = loadUserProfile;
});

// Export functions
export {
  handleSignup,
  handleLogin,
  handleLogout,
  updateUserProfile,
  loadUserProfile,
  updateDashboardDisplay,
};
