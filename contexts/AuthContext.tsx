import React, { createContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { storage, KEYS } from '@/services/storage';
import { syncFromRemote, addRemoteChangeListener } from '@/services/sync';
import { sampleUsers, SampleUser } from '@/constants/sampleData';
import { Role } from '@/services/types';

type AuthState = {
  user: SampleUser | null;
  users: SampleUser[];
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (data: Partial<SampleUser> & { email: string; password: string; name: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
  addUser: (data: Partial<SampleUser> & { email: string; password: string; name: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<SampleUser>) => Promise<void>;
  updateUser: (id: string, patch: Partial<SampleUser>) => Promise<void>;
};

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SampleUser | null>(null);
  const [users, setUsers] = useState<SampleUser[]>(sampleUsers);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    (async () => {
      await syncFromRemote();
      let storedUsers = await storage.get<SampleUser[]>(KEYS.users);
      if (!storedUsers) {
        storedUsers = sampleUsers;
        await storage.set(KEYS.users, storedUsers);
      }
      setUsers(storedUsers);
      const sessionId = await storage.get<string>(KEYS.session);
      if (sessionId) {
        const found = storedUsers.find((u) => u.id === sessionId) || null;
        setUser(found);
      }
      readyRef.current = true;
      setReady(true);
    })();
  }, []);

  // Live refresh: account changes made on another device (new sign-ups,
  // profile edits, admin suspensions) appear immediately, and a remotely
  // suspended/deleted account is signed out live. rs_session stays local.
  useEffect(() => {
    return addRemoteChangeListener((keys) => {
      if (!readyRef.current || !keys.includes(KEYS.users)) return;
      void (async () => {
        const storedUsers = await storage.get<SampleUser[]>(KEYS.users);
        if (!storedUsers) return;
        setUsers(storedUsers);
        const sessionId = await storage.get<string>(KEYS.session);
        setUser(sessionId ? storedUsers.find((u) => u.id === sessionId) ?? null : null);
      })();
    });
  }, []);

  const persistUsers = async (next: SampleUser[]) => {
    setUsers(next);
    await storage.set(KEYS.users, next);
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: 'Invalid email or password' };
    if (found.status === 'suspended') return { ok: false, error: 'This account is suspended' };
    setUser(found);
    await storage.set(KEYS.session, found.id);
    return { ok: true };
  };

  const signUp: AuthState['signUp'] = async (data) => {
    if (data.role === 'admin') return { ok: false, error: 'Admin registration is not permitted' };
    if (data.role === 'coordinator') return { ok: false, error: 'Coordinator access is granted by administrators' };
    const exists = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (exists) return { ok: false, error: 'An account with this email already exists' };
    const nu: SampleUser = {
      id: `u-${Date.now()}`,
      email: data.email.trim(),
      password: data.password,
      name: data.name,
      role: data.role,
      phone: data.phone,
      language: 'en',
      status: data.role === 'traveler' ? 'active' : 'pending',
      notifyBookings: true,
      notifyMessages: true,
      notifyAnnouncements: true,
    };
    const next = [...users, nu];
    await persistUsers(next);
    setUser(nu);
    await storage.set(KEYS.session, nu.id);
    return { ok: true };
  };

  const addUser: AuthState['addUser'] = async (data) => {
    const exists = users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (exists) return { ok: false, error: 'An account with this email already exists' };
    const nu: SampleUser = {
      id: `u-${Date.now()}`,
      language: 'en',
      status: 'active',
      notifyBookings: true,
      notifyMessages: true,
      notifyAnnouncements: true,
      ...data,
      email: data.email.trim(),
    };
    await persistUsers([...users, nu]);
    return { ok: true };
  };

  const signOut = async () => {
    setUser(null);
    await storage.remove(KEYS.session);
  };

  const updateProfile = useCallback(async (patch: Partial<SampleUser>) => {
    if (!user) return;
    const nextUser = { ...user, ...patch };
    const next = users.map((u) => (u.id === user.id ? nextUser : u));
    await persistUsers(next);
    setUser(nextUser);
  }, [user, users]);

  const updateUser = useCallback(async (id: string, patch: Partial<SampleUser>) => {
    const next = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    await persistUsers(next);
    if (user?.id === id) setUser({ ...user, ...patch });
  }, [user, users]);

  return (
    <AuthContext.Provider value={{ user, users, ready, signIn, signUp, addUser, signOut, updateProfile, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
