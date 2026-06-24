import { useSyncExternalStore } from 'react';
import { getAuthState, subscribeAuth, type AuthState } from '../auth/auth-store';

/** Subscribe to auth state; re-renders on sign-in/up/out and session restore. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
}
