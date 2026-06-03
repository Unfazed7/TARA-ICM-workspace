import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/tara';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  users: User[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  createUser: (email: string, name: string, password: string, role: UserRole) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('tara_token');
    if (token) {
      api.auth.me()
        .then(u => setUser({ id: u.email, email: u.email, name: u.name, role: u.role as UserRole }))
        .catch(() => sessionStorage.removeItem('tara_token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.auth.login(email, password);
    sessionStorage.setItem('tara_token', access_token);
    const u = await api.auth.me();
    setUser({ id: u.email, email: u.email, name: u.name, role: u.role as UserRole });
  };

  const logout = () => {
    sessionStorage.removeItem('tara_token');
    setUser(null);
  };

  const createUser = (_email: string, _name: string, _password: string, _role: UserRole) => {
    return { success: false, error: 'User management via API not yet implemented' };
  };

  const deleteUser = (_userId: string) => {
    return { success: false, error: 'User management via API not yet implemented' };
  };

  const changePassword = (_currentPassword: string, _newPassword: string) => {
    return { success: false, error: 'Password change via API not yet implemented' };
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      users: user ? [user] : [],
      login,
      logout,
      createUser,
      deleteUser,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
