import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authToken, endpoints } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [loginRevision, setLoginRevision] = useState(0);

  useEffect(() => {
    if (!authToken.get()) { setReady(true); return; }
    endpoints.me()
      .then(({ data }) => setUser(data.user || data))
      .catch(() => authToken.clear())
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (mode, values) => {
    const { data } = await endpoints[mode](values);
    authToken.set(data.token);
    setUser(data.user);
    setLoginRevision((revision) => revision + 1);
    return data.user;
  }, []);
  const signOut = useCallback(() => {
    authToken.clear();
    setUser(null);
  }, []);
  const value = useMemo(() => ({ user, ready, signIn, signOut, setUser, loginRevision }), [user, ready, signIn, signOut, loginRevision]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
