import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
function getFirebase(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

function getAuthSafe(): Auth | null {
  const a = getFirebase();
  return a ? getAuth(a) : null;
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const auth = getAuthSafe();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getAuthSafe();
  if (!auth) throw new Error("Firebase is not configured");
  const res = await signInWithPopup(auth, new GoogleAuthProvider());
  return res.user;
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getAuthSafe();
  if (auth) await signOut(auth);
}

/** Mirrors the public music profile to Cloud Firestore (best effort). */
export async function mirrorProfile(uid: string, data: Record<string, unknown>): Promise<void> {
  const a = getFirebase();
  if (!a) return;
  try {
    await setDoc(doc(getFirestore(a), "profiles", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    /* Firestore rules may block writes; ignore */
  }
}
