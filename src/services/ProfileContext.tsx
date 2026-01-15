import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types/user';
import { fetchProfile, upsertProfile } from './profileService';
import { useAuth } from './AuthContext';

interface ProfileContextValue {
  profile: UserProfile | null;
  hasProfile: boolean;
  isLoading: boolean;
  saveProfile: (data: UserProfile) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchProfile(session.user.id)
      .then(p => setProfile(p))
      .finally(() => setIsLoading(false));
  }, [session?.user.id]);

  async function saveProfile(data: UserProfile) {
    if (!session) return;
    await upsertProfile(session.user.id, data);
    setProfile(data);
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (!session || !profile) return;
    const updated = { ...profile, ...data };
    await upsertProfile(session.user.id, updated);
    setProfile(updated);
  }

  return (
    <ProfileContext.Provider value={{ profile, hasProfile: profile !== null, isLoading, saveProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
