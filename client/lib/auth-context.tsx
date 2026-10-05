"use client";

import axios from "axios";
import { api } from "@/lib/api";
import { deleteOfflineVideos } from "@/lib/offline-store";
import { User } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  offline: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const OFFLINE_PROFILE_KEY = "streamly:offline-profile";

function storedProfile(): User | null {
  try {
    const value = localStorage.getItem(OFFLINE_PROFILE_KEY);
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      localStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify(response.data));
      setOffline(false);
    } catch (error: unknown) {
      if (!navigator.onLine) {
        setUser(storedProfile());
        setOffline(true);
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setUser(null);
        localStorage.removeItem(OFFLINE_PROFILE_KEY);
        setOffline(false);
      } else {
        setUser((currentUser) => currentUser ?? storedProfile());
        setOffline(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const markOffline = () => setOffline(true);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", markOffline);
    };
  }, [refresh]);

  const login = useCallback((nextUser: User) => {
    localStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setOffline(false);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    const userId = user?.id;
    localStorage.removeItem(OFFLINE_PROFILE_KEY);
    setUser(null);
    setOffline(false);
    if (userId) {
      try {
        await Promise.all([
          deleteOfflineVideos(`favorites:${userId}`),
          deleteOfflineVideos(`history:${userId}`),
        ]);
      } catch {
        throw new Error(
          "You were signed out, but saved data could not be cleared from this device.",
        );
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, offline, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
