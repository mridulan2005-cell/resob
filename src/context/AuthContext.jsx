// Authentication has been removed. This context now serves a static
// default "guest" user so every component that still calls `useAuth()`
// keeps working without changes — but nothing is ever gated by login.
import { createContext, useContext } from 'react';

const DEFAULT_USER = {
  id: '6e0cee5d-7495-421d-89f9-bd2bb444d7de', // seeded user id
  email: 'arjun@iitb.ac.in',
  name: 'Arjun Mehta',
  roll_number: '24B0001',
  department: 'Computer Science',
  year: 3,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // No loading, no token plumbing — we expose the default user immediately.
  const value = {
    user: DEFAULT_USER,
    token: null,
    loading: false,
    login:    async () => DEFAULT_USER,
    register: async () => DEFAULT_USER,
    logout:   () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
