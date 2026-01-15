import { useCallback, useState, RefObject } from 'react';
import { Alert, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '../components/features/workout/ShareCard';

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = TARGET_WIDTH * (SHARE_CARD_HEIGHT / SHARE_CARD_WIDTH);

export function useShareWorkoutCard(cardRef: RefObject<View | null>) {
  const [loading, setLoading] = useState(false);

  const share = useCallback(async () => {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'This device does not support sharing.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share workout',
      });
    } catch (e: any) {
      console.error('useShareWorkoutCard: capture/share failed', e);
      Alert.alert('Could not share', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cardRef, loading]);

  return { share, loading };
}
