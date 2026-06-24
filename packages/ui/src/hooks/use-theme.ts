import { useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme, type Theme } from '../theme/theme';

/** Subscribe to the active theme; re-renders the component when it flips. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, getTheme);
}
