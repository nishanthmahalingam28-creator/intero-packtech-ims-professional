import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../services/api';
import { dataBus } from '../services/dataBus';

const AuthContext = createContext(null);

// AUTHENTICATION lives here ("who is the user?"):
//   1. login()  sends email + password to the API and receives a token + the user's profile (with role).
//   2. The token is kept in localStorage, so a page refresh does not log you out (session persistence).
//   3. On start-up we ask GET /auth/me to confirm the token is still valid and to load the profile.
//   4. If the API ever answers "401" (expired token, deactivated or deleted user) we sign out automatically.
// AUTHORIZATION ("what may the user do?") is decided by utils/permissions.js and, for real, by the API.
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(() => !!tokenStore.get());
  const [authError, setAuthError] = useState('');

  const endSession = useCallback((message = '') => {
    tokenStore.clear();
    setProfile(null);
    setAuthError(message);
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    api.get('/auth/me')
      .then(({ user }) => !cancelled && setProfile(user))
      .catch(() => !cancelled && tokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Sign out automatically when the API rejects our token.
  useEffect(() => {
    const onUnauthorized = (e) => endSession(e.detail || '');
    dataBus.addEventListener('unauthorized', onUnauthorized);
    return () => dataBus.removeEventListener('unauthorized', onUnauthorized);
  }, [endSession]);

  // Keep the role/name fresh: re-read the profile when the browser tab becomes active again.
  useEffect(() => {
    if (!profile) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') api.get('/auth/me').then(({ user }) => setProfile(user)).catch(() => {});
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      profile,
      loading,
      authError,
      clearAuthError: () => setAuthError(''),
      login: async (email, password) => {
        setAuthError('');
        const { token, user } = await api.post('/auth/login', { email: email.trim(), password });
        tokenStore.set(token);
        setProfile(user);
      },
      logout: () => endSession(''),
    }),
    [profile, loading, authError, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
