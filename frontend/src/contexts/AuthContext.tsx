import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { User, UserRole, StoredUser } from '@/types/tara';
import { toast } from 'sonner';

const USERS_STORAGE_KEY = 'tara-users';
const SESSION_STORAGE_KEY = 'tara-user';

// Default admin account seeded on first load
const DEFAULT_ADMIN: StoredUser = {
  id: 'admin-default-001',
  email: 'admin@autotara.io',
  name: 'Admin User',
  role: 'admin',
  password: 'admin123',
};

function getStoredUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [DEFAULT_ADMIN];
    }
  }
  // First load — seed with default admin
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([DEFAULT_ADMIN]));
  return [DEFAULT_ADMIN];
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  is2FAPending: boolean;
  pendingUser: User | null;
  otpCode: string | null;
  users: StoredUser[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  verify2FA: (code: string) => boolean;
  resend2FA: () => void;
  createUser: (email: string, name: string, password: string, role: UserRole) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function toSafeUser(stored: StoredUser): User {
  return {
    id: stored.id,
    email: stored.email,
    name: stored.name,
    role: stored.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [users, setUsers] = useState<StoredUser[]>(getStoredUsers);

  const login = useCallback((email: string, password: string) => {
    const allUsers = getStoredUsers();
    const found = allUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!found) {
      return { success: false, error: 'Invalid email or password' };
    }

    const safeUser = toSafeUser(found);
    setPendingUser(safeUser);
    setIs2FAPending(true);

    // Generate and "send" OTP
    const code = generateOTP();
    setOtpCode(code);

    // Simulate email delivery via toast
    setTimeout(() => {
      toast.info(`Your 2FA verification code`, {
        description: `Code: ${code} (sent to ${found.email})`,
        duration: 15000,
      });
    }, 500);

    return { success: true };
  }, []);

  const verify2FA = useCallback(
    (code: string): boolean => {
      if (code === otpCode && pendingUser) {
        setUser(pendingUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(pendingUser));
        setPendingUser(null);
        setIs2FAPending(false);
        setOtpCode(null);
        return true;
      }
      return false;
    },
    [otpCode, pendingUser]
  );

  const resend2FA = useCallback(() => {
    if (!pendingUser) return;
    const code = generateOTP();
    setOtpCode(code);
    toast.info(`New 2FA verification code`, {
      description: `Code: ${code} (sent to ${pendingUser.email})`,
      duration: 15000,
    });
  }, [pendingUser]);

  const createUser = useCallback(
    (email: string, name: string, password: string, role: UserRole) => {
      if (user?.role !== 'admin') {
        return { success: false, error: 'Only admins can create users' };
      }

      const allUsers = getStoredUsers();
      if (allUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'A user with this email already exists' };
      }

      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        email,
        name,
        role,
        password,
      };

      const updated = [...allUsers, newUser];
      saveStoredUsers(updated);
      setUsers(updated);
      return { success: true };
    },
    [user]
  );

  const deleteUser = useCallback(
    (userId: string) => {
      if (user?.role !== 'admin') {
        return { success: false, error: 'Only admins can delete users' };
      }
      if (userId === user.id) {
        return { success: false, error: 'You cannot delete your own account' };
      }

      const allUsers = getStoredUsers();
      const updated = allUsers.filter((u) => u.id !== userId);
      saveStoredUsers(updated);
      setUsers(updated);
      return { success: true };
    },
    [user]
  );

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string) => {
      if (!user) return { success: false, error: 'Not logged in' };
      const allUsers = getStoredUsers();
      const found = allUsers.find(u => u.id === user.id);
      if (!found) return { success: false, error: 'User not found' };
      if (found.password !== currentPassword) return { success: false, error: 'Current password is incorrect' };
      if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters' };
      found.password = newPassword;
      saveStoredUsers(allUsers);
      setUsers([...allUsers]);
      return { success: true };
    },
    [user]
  );

  const logout = useCallback(() => {
    setUser(null);
    setPendingUser(null);
    setIs2FAPending(false);
    setOtpCode(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        is2FAPending,
        pendingUser,
        otpCode,
        users,
        login,
        verify2FA,
        resend2FA,
        createUser,
        deleteUser,
        changePassword,
        logout,
      }}
    >
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
