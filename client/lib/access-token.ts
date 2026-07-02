let accessToken: string | null = null;
const sessionHintKey = 'cruisin_has_session';

const storage = (): Storage | null => typeof window === 'undefined' ? null : window.localStorage;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  if (token) {
    storage()?.setItem(sessionHintKey, 'true');
  } else {
    storage()?.removeItem(sessionHintKey);
  }
};

export const hasSessionHint = (): boolean => storage()?.getItem(sessionHintKey) === 'true';
