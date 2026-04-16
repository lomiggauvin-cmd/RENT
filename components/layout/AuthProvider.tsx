'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  email?: string | null;
  id?: string;
}

interface AuthContextType {
  user: User | null;
  session: null;
  loading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  showAuthModal: false,
  setShowAuthModal: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <AuthContext.Provider value={{ user: null, session: null, loading: false, showAuthModal, setShowAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
