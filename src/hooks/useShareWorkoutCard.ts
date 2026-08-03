import { useCallback, useState, RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '../components/features/workout/ShareCard';
import { logError } from '../services/logger';
import { notify } from '../utils/alert';

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = TARGET_WIDTH * (SHARE_CARD_HEIGHT / SHARE_CARD_WIDTH);
const FILE_NAME = 'repmi-workout.png';

// Web has no share sheet for files unless the browser implements the Web Share
// API *with* file support (mobile Safari/Chrome, HTTPS only). Everywhere else —
// which is most desktop browsers — downloading the PNG is the honest equivalent.
async function shareOnWeb(dataUri: string) {
  const blob = await (await fetch(dataUri)).blob();
  const file = new File([blob], FILE_NAME, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Share workout' });
      return;
    } catch (e) {
      // The user dismissing the sheet is not an error worth reporting.
      if ((e as Error)?.name === 'AbortError') return;
      // Anything else: fall through to the download path.
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // The download is async — revoking in this tick invalidates the URL before
  // the browser has fetched it, which silently cancels the download.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function useShareWorkoutCard(cardRef: RefObject<View | null>) {
  const [loading, setLoading] = useState(false);

  const share = useCallback(async () => {
    if (loading) return;
    if (!cardRef.current) {
      // Never fail mutely — a press that does nothing is indistinguishable
      // from a broken button.
      logError('share.workoutCard.noCard', {});
      notify('Could not share', 'The workout card is not ready yet. Try again in a moment.');
      return;
    }
    setLoading(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        // 'tmpfile' isn't implemented on web — it warns and hands back a data
        // URI anyway, so ask for what we actually get.
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });

      if (Platform.OS === 'web') {
        await shareOnWeb(uri);
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        notify('Sharing unavailable', 'This device does not support sharing.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share workout',
      });
    } catch (e: any) {
      logError('share.workoutCard.failed', { name: (e as Error)?.name });
      notify('Could not share', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cardRef, loading]);

  return { share, loading };
}
