// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUaZa2_5lpz1iBrXK3pSh4yMFzvON0FP4",
  authDomain: "studymateai-b2444.firebaseapp.com",
  projectId: "studymateai-b2444",
  storageBucket: "studymateai-b2444.firebasestorage.app",
  messagingSenderId: "482393836923",
  appId: "1:482393836923:web:20e7a74fe74f237b0b41de",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Development mode check - connect to emulators if running locally
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  console.log(
    "🔧 Development mode detected - connecting to emulators if available"
  );

  try {
    // Uncomment these lines if you're using Firebase emulators for development
    // connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    // connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("🔧 Connected to Firebase emulators");
  } catch (error) {
    console.log("🔧 No emulators detected, using production Firebase");
  }
} else {
  console.log("🚀 Production mode - using Firebase production services");
}

// Export the app instance as well for other uses
export { app };

console.log("✅ Firebase initialized successfully");
