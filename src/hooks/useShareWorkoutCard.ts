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

// react-native-view-shot's captureRef() calls findNodeHandle(), which throws
// unconditionally on react-native-web — so its own web shim is unreachable
// through the public API. Drive html2canvas ourselves instead; under
// react-native-web the ref already holds the DOM node. `useCORS` matters:
// the shim passes no options, so the cross-origin avatar would taint the
// canvas and make toDataURL() throw.
async function captureOnWeb(node: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const rendered = await html2canvas(node, { useCORS: true, backgroundColor: null, scale: 1 });

  const out = document.createElement('canvas');
  out.width = TARGET_WIDTH;
  out.height = TARGET_HEIGHT;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(rendered, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

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
      if (Platform.OS === 'web') {
        const dataUri = await captureOnWeb(cardRef.current as unknown as HTMLElement);
        await shareOnWeb(dataUri);
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });

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
      const name = (e as Error)?.name ?? 'Error';
      const msg = ((e as Error)?.message ?? '').slice(0, 140);
      logError('share.workoutCard.failed', { name });
      // Name the failure. A generic "try again" gives the user nothing to
      // report and gives us nothing to debug — production logs go to Sentry
      // only, so this dialog is the only visible signal on web.
      notify('Could not share', msg ? `${name}: ${msg}` : name);
    } finally {
      setLoading(false);
    }
  }, [cardRef, loading]);

  return { share, loading };
}
