// src/services/SettingsContext.tsx
//
// Holds the per-user, cross-device preferences that previously lived in
// AsyncStorage only (units, equipped title, favorite workouts).
// Source of truth = Supabase `user_settings`. Local state is optimistic.

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  WeightUnit,
  HeightUnit,
  fetchSettings,
  upsertSettings,
  migrateSettingsFromAsyncStorage,
} from './settingsService';

// ── Theme accent palette ─────────────────────────────────────────────────────
//
// Each cosmetic theme defines a triplet that mirrors the original
// colors.accent / accentDim / accentSubtle shape so callers can drop
// these in wherever they were reading from the colors module.

interface AccentPalette {
  accent: string;
  accentDim: string;
  accentSubtle: string;
}

const DEFAULT_ACCENT: AccentPalette = {
  accent:        '#00FA9A',
  accentDim:     '#00C97A',
  accentSubtle:  'rgba(0, 250, 154, 0.12)',
};

const THEME_ACCENTS: Record<string, AccentPalette> = {
  crimson: {
    accent:       '#DC143C',
    accentDim:    '#B30E2F',
    accentSubtle: 'rgba(220, 20, 60, 0.12)',
  },
  pink: {
    accent:       '#FF4DD2',
    accentDim:    '#D43FB0',
    accentSubtle: 'rgba(255, 77, 210, 0.12)',
  },
};

interface SettingsContextValue {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  equippedSeasonTitle: string | null;
  favoriteWorkoutIds: ReadonlySet<string>;
  publicProfile: boolean;
  openFollows: boolean;
  waterTrackerEnabled: boolean;
  // ── Store / cosmetics ────────────────────────────────────────
  // Sum of coins spent in the store. availableCoins = coins (from
  // CoinContext) - spentCoins. Persisted in user_settings.extra.
  spentCoins: number;
  ownedThemeIds: ReadonlySet<string>;
  equippedThemeId: string | null;
  // Active accent palette — switches off the equipped cosmetic theme.
  // Defaults to mint green when no theme (or the default theme) is equipped.
  accent: string;
  accentDim: string;
  accentSubtle: string;
  isLoaded: boolean;

  setWeightUnit: (v: WeightUnit) => void;
  setHeightUnit: (v: HeightUnit) => void;
  equipSeasonTitle: (v: string | null) => void;
  toggleFavorite: (workoutId: string) => void;
  isFavorite: (workoutId: string) => boolean;
  setPublicProfile: (v: boolean) => void;
  setOpenFollows: (v: boolean) => void;
  setWaterTrackerEnabled: (v: boolean) => void;
  // Atomic unlock — bumps spentCoins by `price` and adds `themeId`
  // to the owned set in a single update so the two stay in sync.
  unlockTheme: (themeId: string, price: number) => void;
  equipTheme: (themeId: string | null) => void;
  // Resets spentCoins to 0 — restores all spent coins to the
  // wallet. Owned themes are kept; this is a refund, not a reset.
  refundAllCoins: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session: authSession, isLoading: authLoading } = useAuth();
  const userId = authSession?.user.id;

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Load settings once auth settles ────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      // No user — keep defaults so the UI can render.
      setSettings(DEFAULT_SETTINGS);
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // migrateSettingsFromAsyncStorage runs once, then fetches the merged row.
        const merged = await migrateSettingsFromAsyncStorage(userId);
        if (!cancelled) setSettings(merged);
      } catch (e) {
        console.error('SettingsContext: load failed, falling back to defaults', e);
        // Try a plain fetch as a fallback in case migration errored.
        try {
          const remote = await fetchSettings(userId);
          if (!cancelled) setSettings(remote);
        } catch (e2) {
          console.error('SettingsContext: fallback fetch also failed', e2);
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, authLoading]);

  // ── Optimistic writes: update local state, then sync to Supabase. ─────────
  const setWeightUnit = useCallback((v: WeightUnit) => {
    setSettings(prev => {
      const next = { ...prev, weightUnit: v };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const setHeightUnit = useCallback((v: HeightUnit) => {
    setSettings(prev => {
      const next = { ...prev, heightUnit: v };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const equipSeasonTitle = useCallback((v: string | null) => {
    setSettings(prev => {
      const next = { ...prev, equippedSeasonTitle: v };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const toggleFavorite = useCallback((workoutId: string) => {
    setSettings(prev => {
      const current = new Set(prev.favoriteWorkoutIds);
      if (current.has(workoutId)) current.delete(workoutId);
      else current.add(workoutId);
      const next = { ...prev, favoriteWorkoutIds: Array.from(current) };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const setPublicProfile = useCallback((v: boolean) => {
    setSettings(prev => {
      const next = { ...prev, extra: { ...prev.extra, publicProfile: v } };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const setOpenFollows = useCallback((v: boolean) => {
    setSettings(prev => {
      const next = { ...prev, extra: { ...prev.extra, openFollows: v } };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const setWaterTrackerEnabled = useCallback((v: boolean) => {
    setSettings(prev => {
      const next = { ...prev, extra: { ...prev.extra, waterTrackerEnabled: v } };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  // ── Store / cosmetics writers ────────────────────────────────────────
  const unlockTheme = useCallback((themeId: string, price: number) => {
    setSettings(prev => {
      const prevSpent = (prev.extra?.spentCoins as number | undefined) ?? 0;
      const prevOwned = (prev.extra?.ownedThemes as string[] | undefined) ?? [];
      // Idempotent — re-unlocking an already-owned theme is a no-op.
      if (prevOwned.includes(themeId)) return prev;
      const next = {
        ...prev,
        extra: {
          ...prev.extra,
          spentCoins: prevSpent + price,
          ownedThemes: [...prevOwned, themeId],
        },
      };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const equipTheme = useCallback((themeId: string | null) => {
    setSettings(prev => {
      const next = {
        ...prev,
        extra: { ...prev.extra, equippedThemeId: themeId },
      };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const refundAllCoins = useCallback(() => {
    setSettings(prev => {
      const next = {
        ...prev,
        extra: { ...prev.extra, spentCoins: 0 },
      };
      if (userId) upsertSettings(userId, next).catch(e => console.error(e));
      return next;
    });
  }, [userId]);

  const favoriteSet = React.useMemo(
    () => new Set(settings.favoriteWorkoutIds),
    [settings.favoriteWorkoutIds],
  );

  const isFavorite = useCallback(
    (workoutId: string) => favoriteSet.has(workoutId),
    [favoriteSet],
  );

  const publicProfile = (settings.extra?.publicProfile as boolean | undefined) ?? true;
  const openFollows   = (settings.extra?.openFollows   as boolean | undefined) ?? true;
  const waterTrackerEnabled = (settings.extra?.waterTrackerEnabled as boolean | undefined) ?? true;

  // Store / cosmetics — derived from the JSONB extra blob so we
  // don't need a schema migration just to ship the dummy store.
  const spentCoins = (settings.extra?.spentCoins as number | undefined) ?? 0;
  const equippedThemeId =
    (settings.extra?.equippedThemeId as string | null | undefined) ?? null;
  const ownedThemeIds = React.useMemo(
    () =>
      new Set<string>(
        (settings.extra?.ownedThemes as string[] | undefined) ?? [],
      ),
    [settings.extra?.ownedThemes],
  );

  const palette = equippedThemeId && THEME_ACCENTS[equippedThemeId]
    ? THEME_ACCENTS[equippedThemeId]
    : DEFAULT_ACCENT;

  const value: SettingsContextValue = {
    weightUnit: settings.weightUnit,
    heightUnit: settings.heightUnit,
    equippedSeasonTitle: settings.equippedSeasonTitle,
    favoriteWorkoutIds: favoriteSet,
    publicProfile,
    openFollows,
    waterTrackerEnabled,
    spentCoins,
    ownedThemeIds,
    equippedThemeId,
    accent: palette.accent,
    accentDim: palette.accentDim,
    accentSubtle: palette.accentSubtle,
    isLoaded,
    setWeightUnit,
    setHeightUnit,
    equipSeasonTitle,
    toggleFavorite,
    isFavorite,
    setPublicProfile,
    setOpenFollows,
    setWaterTrackerEnabled,
    unlockTheme,
    equipTheme,
    refundAllCoins,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

/**
 * Returns the active accent palette derived from the equipped cosmetic theme.
 * Defaults to mint green when no theme is equipped or the equipped theme is
 * the default. Components that show the app's primary "green" should read
 * from this hook so they swap when the user equips Crimson / Pink.
 */
export function useAccent(): AccentPalette {
  const { accent, accentDim, accentSubtle } = useSettings();
  return { accent, accentDim, accentSubtle };
}
