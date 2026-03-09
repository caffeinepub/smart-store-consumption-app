import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Role = "worker" | "admin" | null;

const WORKER_PASSWORD = "362341";
const ADMIN_PASSWORD = "121212";
const SESSION_KEY = "storetrack_role_v1";

interface AuthContextValue {
  role: Role;
  login: (password: string) => "worker" | "admin" | "invalid";
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored === "worker" || stored === "admin") return stored;
    } catch {
      // sessionStorage might be unavailable
    }
    return null;
  });

  // Persist role to sessionStorage whenever it changes
  useEffect(() => {
    try {
      if (role) {
        sessionStorage.setItem(SESSION_KEY, role);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, [role]);

  const login = useCallback(
    (password: string): "worker" | "admin" | "invalid" => {
      if (password === ADMIN_PASSWORD) {
        setRole("admin");
        return "admin";
      }
      if (password === WORKER_PASSWORD) {
        setRole("worker");
        return "worker";
      }
      return "invalid";
    },
    [],
  );

  const logout = useCallback(() => {
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ role, login, logout, isAuthenticated: role !== null }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
