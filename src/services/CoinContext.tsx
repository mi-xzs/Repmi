import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useWorkouts } from './WorkoutContext';
import { useXP, computeAchievementXP } from './XPContext';
import { loadAllSessions as sbLoadAllSessions } from './sessionService';
import { WorkoutSession } from '../screens/WorkoutScreen';
import { deriveCoinTotal, CoinTotals } from './coinService';
import { getLongestStreak } from '../utils/analyticsHelpers';
import { logError } from './logger';

const EMPTY_TOTALS: CoinTotals = {
  seed: 0,
  workouts: 0,
  achievements: 0,
  levelUps: 0,
  streakMilestones: 0,
  weeklyBonuses: 0,
  total: 0,
};

interface CoinContextValue {
  coins: number;
  breakdown: CoinTotals;
  isLoaded: boolean;
  refreshCoins: () => Promise<void>;
}

const CoinContext = createContext<CoinContextValue | undefined>(undefined);

export function CoinProvider({ children }: { children: ReactNode }) {
  const { session: authSession, isLoading: authLoading } = useAuth();
  const userId = authSession?.user.id;
  const { isLoading: workoutsLoading } = useWorkouts();
  const { levelInfo, isLoaded: xpLoaded } = useXP();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshCoins = useCallback(async (): Promise<void> => {
    if (!userId) {
      setSessions([]);
      return;
    }
    try {
      const fresh = await sbLoadAllSessions(userId);
      setSessions(fresh);
    } catch (e) {
      logError('coin.refresh.failed', { name: (e as Error)?.name });
    }
  }, [userId]);

  const initializedForRef = useRef<string | 'no-user' | null>(null);
  useEffect(() => {
    if (authLoading || workoutsLoading) return;

    const target = userId ?? 'no-user';
    if (initializedForRef.current === target) return;
    initializedForRef.current = target;

    let cancelled = false;
    (async () => {
      try {
        if (userId) await refreshCoins();
        else setSessions([]);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, workoutsLoading, userId, refreshCoins]);

  const breakdown = useMemo<CoinTotals>(() => {
    if (!userId) return EMPTY_TOTALS;
    const { earned } = computeAchievementXP(sessions);
    return deriveCoinTotal({
      sessions,
      currentLevel: levelInfo.level,
      earnedAchievementXPs: earned.map(a => a.xp),
      longestStreak: getLongestStreak(sessions),
    });
  }, [userId, sessions, levelInfo.level]);

  const value: CoinContextValue = {
    coins: breakdown.total,
    breakdown,
    isLoaded: isLoaded && (userId ? xpLoaded : true),
    refreshCoins,
  };

  return <CoinContext.Provider value={value}>{children}</CoinContext.Provider>;
}

export function useCoins(): CoinContextValue {
  const context = useContext(CoinContext);
  if (!context) {
    throw new Error('useCoins must be used within a CoinProvider');
  }
  return context;
}
