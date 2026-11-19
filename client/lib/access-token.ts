let accessToken: string | null = null;
const sessionHintKey = 'cruisin_has_session';

const storage = (): Storage | null => typeof window === 'undefined' ? null : window.localStorage;

const assistedWindowKey = 'cruisin_assisted_window';
export const isAssistedWindow = (): boolean => typeof window !== 'undefined' &&
  (window.location.pathname === '/assisted-sign-in' || window.sessionStorage.getItem(assistedWindowKey) === 'true');

export const markAssistedWindow = (): void => window.sessionStorage.setItem(assistedWindowKey, 'true');

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  if (isAssistedWindow()) return;
  if (token) {
    storage()?.setItem(sessionHintKey, 'true');
  } else {
    storage()?.removeItem(sessionHintKey);
  }
};

export const hasSessionHint = (): boolean => !isAssistedWindow() && storage()?.getItem(sessionHintKey) === 'true';
