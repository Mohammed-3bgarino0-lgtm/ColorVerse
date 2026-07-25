import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseApp } from './client';

const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const token = await result.user.getIdToken();
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error('Google sign-in verification failed.');
  return response.json();
}

export function signOutUser() {
  return signOut(auth);
}
