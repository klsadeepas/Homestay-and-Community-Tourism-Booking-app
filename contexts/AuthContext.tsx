import React, { createContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '@/services/storage';
import { fetchCollection, writeItem, addTableChangeListener } from '@/services/db';
import { sampleUsers, SampleUser } from '@/constants/sampleData';
import { Role } from '@/services/types';

type AuthState = {
  user: SampleUser | null;
  users: SampleUser[];
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (data: Partial<SampleUser> & { email: string; password: string; name: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
  addUser: (data: Partial<SampleUser> & { email: string; password: string; name: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<SampleUser>) => Promise<void>;
  updateUser: (id: string, patch: Partial<SampleUser>) => Promise<void>;
};

export const AuthContext = createContext<AuthState | undefined>(undefined);

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
async function writeCache<T>(key: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SampleUser | null>(null);
  const [users, setUsers] = useState<SampleUser[]>(sampleUsers);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const usersRef = useRef<SampleUser[]>(sampleUsers);
  const userRef = useRef<SampleUser | null>(null);
  userRef.current = user;

  const applyUsers = useCallback((next: SampleUser[]) => {
    usersRef.current = next;
    setUsers(next);
    void writeCache(KEYS.users, next);
  }, []);

  // An auth event is recorded straight into audit_log so a sign-in from any
  // phone shows up in the admin log even though AuthProvider sits above the
  // data layer.
  const log = useCallback(async (actorId: string, action: string, target: string, reason?: string) => {
    await writeItem('audit', {
      id: `au-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      actorId,
      action,
      target,
      reason,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const loadUsers = useCallback(async () => {
    const remote = await fetchCollection<SampleUser>('users');
    if (remote) {
      if (remote.length === 0) {
        applyUsers(sampleUsers);
        for (const u of sampleUsers) await writeItem('users', u);
        return;
      }
      applyUsers(remote);
      return;
    }
    const cached = await readCache<SampleUser[]>(KEYS.users);
    if (cached && cached.length) applyUsers(cached);
  }, [applyUsers]);

  useEffect(() => {
    (async () => {
      await loadUsers();
      const storedUsers = usersRef.current;
      const sessionId = await readCache<string>(KEYS.session);
      if (sessionId) setUser(storedUsers.find((u) => u.id === sessionId) || null);
      readyRef.current = true;
      setReady(true);
    })();
  }, [loadUsers]);

  // Live refresh: accounts created or edited on another device appear here, and
  // a remotely suspended/deleted account is signed out. rs_session stays local.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = addTableChangeListener((keys) => {
      if (!readyRef.current || !keys.includes('users')) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        await loadUsers();
        const raw = await AsyncStorage.getItem(KEYS.session);
        const sessionId = raw ? (JSON.parse(raw) as string) : null;
        setUser(sessionId ? usersRef.current.find((u) => u.id === sessionId) ?? null : null);
      }, 200);
    });
    return () => { if (timer) clearTimeout(timer); off(); };
  }, [loadUsers]);

  const persistUser = useCallback(async (next: SampleUser, all: SampleUser[]) => {
    applyUsers(all);
    await writeItem('users', next);
  }, [applyUsers]);

  const signIn: AuthState['signIn'] = async (email, password) => {
    const found = usersRef.current.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      await log('anonymous', 'login_failed', email.trim().toLowerCase(), 'Unknown email or wrong password');
      return { ok: false, error: 'Invalid email or password' };
    }
    if (found.status === 'suspended') return { ok: false, error: 'This account is suspended' };
    setUser(found);
    await writeCache(KEYS.session, found.id);
    await log(found.id, 'signed_in', found.name || found.email);
    return { ok: true };
  };

  const signUp: AuthState['signUp'] = async (data) => {
    if (data.role === 'admin') return { ok: false, error: 'Admin registration is not permitted' };
    if (data.role === 'coordinator') return { ok: false, error: 'Coordinator access is granted by administrators' };
    const exists = usersRef.current.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (exists) {
      await log('anonymous', 'signup_failed', data.email.trim().toLowerCase(), 'Email already registered');
      return { ok: false, error: 'An account with this email already exists' };
    }
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
    await persistUser(nu, [...usersRef.current, nu]);
    setUser(nu);
    await writeCache(KEYS.session, nu.id);
    await log(nu.id, 'account_registered', `${nu.name} (${nu.role})`);
    return { ok: true };
  };

  // Demo-grade recovery: this app authenticates against the app_users table and
  // has no mail server, so the account owner sets a new password in-app instead
  // of clicking an emailed link. Tighten before a real deployment.
  const resetPassword: AuthState['resetPassword'] = async (email, password) => {
    const found = usersRef.current.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      await log('anonymous', 'reset_failed', email.trim().toLowerCase(), 'No account for this email');
      return { ok: false, error: 'No account is registered with this email' };
    }
    if (found.status === 'suspended') return { ok: false, error: 'This account is suspended — contact support' };
    if (found.password === password) return { ok: false, error: 'Use a different password from the current one' };
    const nextUser = { ...found, password };
    await persistUser(nextUser, usersRef.current.map((u) => (u.id === found.id ? nextUser : u)));
    await log(found.id, 'password_reset', found.name || found.email);
    return { ok: true };
  };

  const addUser: AuthState['addUser'] = async (data) => {
    const exists = usersRef.current.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
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
    await persistUser(nu, [...usersRef.current, nu]);
    await log(userRef.current?.id || nu.id, 'account_created', `${nu.name} (${nu.role})`);
    return { ok: true };
  };

  const signOut = async () => {
    const leaving = userRef.current;
    setUser(null);
    await AsyncStorage.removeItem(KEYS.session);
    if (leaving) await log(leaving.id, 'signed_out', leaving.name || leaving.email);
  };

  const updateProfile = useCallback(async (patch: Partial<SampleUser>) => {
    const current = userRef.current;
    if (!current) return;
    const nextUser = { ...current, ...patch };
    await persistUser(nextUser, usersRef.current.map((u) => (u.id === current.id ? nextUser : u)));
    setUser(nextUser);
    await log(nextUser.id, 'profile_updated', nextUser.name || nextUser.email);
  }, [persistUser, log]);

  const updateUser = useCallback(async (id: string, patch: Partial<SampleUser>) => {
    const all = usersRef.current;
    const next = all.map((u) => (u.id === id ? { ...u, ...patch } : u));
    const changed = next.find((u) => u.id === id);
    applyUsers(next);
    if (changed) await writeItem('users', changed);
    if (userRef.current?.id === id && changed) setUser(changed);
  }, [applyUsers]);

  return (
    <AuthContext.Provider value={{ user, users, ready, signIn, signUp, addUser, resetPassword, signOut, updateProfile, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
