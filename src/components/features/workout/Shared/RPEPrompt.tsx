import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors } from "../../../../theme/colors";
import { useAccent } from "../../../../services/SettingsContext";

import { RPEEntry } from '../../../../services/sessionService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { RPEEntry };

interface RPEPromptProps {
  visible: boolean;
  workoutId: string;
  workoutName?: string;
  onSubmit: (entry: RPEEntry) => void;
  onSkip: () => void;
}

// ─── RPE Scale Labels ─────────────────────────────────────────────────────────

const RPE_LABELS: Record<number, { short: string; description: string }> = {
  1:  { short: 'Rest',      description: 'Nothing at all'         },
  2:  { short: 'Easy',      description: 'Very light effort'      },
  3:  { short: 'Light',     description: 'Light effort'           },
  4:  { short: 'Moderate',  description: 'Somewhat hard'          },
  5:  { short: 'Moderate',  description: 'Hard but manageable'    },
  6:  { short: 'Hard',      description: 'Hard'                   },
  7:  { short: 'Hard',      description: 'Very hard'              },
  8:  { short: 'Very Hard', description: 'Very hard, near limit'  },
  9:  { short: 'Max',       description: 'Extremely hard'         },
  10: { short: 'Max',       description: 'Absolute maximum'       },
};

// ─── Colour helpers ───────────────────────────────────────────────────────────

// Monochrome accent scale: rating 1 = full brightness, rating 10 = most dim.
// Base hex must be a #RRGGBB string (6 chars after the hash) so the alpha
// suffix produces a valid #RRGGBBAA.
function getRpeColorHex(rating: number, baseHex: string): string {
  const opacities = ['FF', 'C5', 'B0', '9D', '8A', '77', '63', '50', '3D', '2A'];
  const op = opacities[Math.max(0, Math.min(9, rating - 1))];
  return op === 'FF' ? baseHex : `${baseHex}${op}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RPEPrompt({
  visible,
  workoutId,
  workoutName,
  onSubmit,
  onSkip,
}: RPEPromptProps) {
  const { accent } = useAccent();
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Animation refs
  const backdropAnim  = useRef(new Animated.Value(0)).current;
  const sheetAnim     = useRef(new Animated.Value(60)).current;
  const sheetOpacity  = useRef(new Animated.Value(0)).current;
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const checkAnim     = useRef(new Animated.Value(0)).current;
  const labelAnim     = useRef(new Animated.Value(0)).current;

  // Enter animation
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setConfirmed(false);
      checkAnim.setValue(0);
      labelAnim.setValue(1);

      Animated.parallel([
        Animated.timing(backdropAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(sheetAnim,     { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(sheetOpacity,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Label fade in when selection changes
  useEffect(() => {
    if (selected !== null) {
      labelAnim.setValue(0);
      Animated.timing(labelAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

      // Pulse the selected pip
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [selected]);

  const handleSelect = (n: number) => setSelected(n);

  const handleConfirm = () => {
    if (selected === null || confirmed) return;
    setConfirmed(true);

    // Check animation then submit
    Animated.timing(checkAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        onSubmit({
          workoutId,
          rating: selected,
          recordedAt: new Date().toISOString(),
        });
      }, 300);
    });
  };

  const accentColor = selected !== null ? getRpeColorHex(selected, accent) : colors.button2;
  const label = selected !== null ? RPE_LABELS[selected] : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-only"
      />

      {/* Sheet */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetAnim }],
              opacity: sheetOpacity,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.pill} />
            <Text style={styles.eyebrow}>Workout complete</Text>
            <Text style={styles.title}>
              {workoutName ? `How was ${workoutName}?` : 'How hard was that?'}
            </Text>
            <Text style={styles.subtitle}>Rate your perceived exertion</Text>
          </View>

          {/* Scale label */}
          <Animated.View style={[styles.labelRow, { opacity: labelAnim }]}>
            {label ? (
              <>
                <Text style={[styles.labelRating, { color: accentColor }]}>
                  {selected}
                </Text>
                <View style={styles.labelText}>
                  <Text style={[styles.labelShort, { color: accentColor }]}>
                    {label.short}
                  </Text>
                  <Text style={styles.labelDesc}>{label.description}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.labelHint}>select a number below:</Text>
            )}
          </Animated.View>

          {/* Number row */}
          <View style={styles.pipRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const isSelected = selected === n;
              const stepColor = getRpeColorHex(n, accent);
              return (
                <Pressable
                  key={n}
                  onPress={() => handleSelect(n)}
                  style={({ pressed }) => [
                    styles.pip,
                    isSelected && { backgroundColor: accent, borderColor: accent },
                    !isSelected && { borderColor: stepColor },
                    pressed && styles.pipPressed,
                  ]}
                  hitSlop={4}
                >
                  <Animated.View
                    style={isSelected ? { transform: [{ scale: pulseAnim }] } : undefined}
                  >
                    <Text
                      style={[
                        styles.pipText,
                        { color: isSelected ? '#0f0f12' : stepColor },
                      ]}
                    >
                      {n}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {/* Scale ends */}
          <View style={styles.scaleEnds}>
            <Text style={styles.scaleEndText}>Easy</Text>
            <Text style={styles.scaleEndText}>Max effort</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={selected === null || confirmed}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: selected !== null ? accent : '#2a2a33' },
                pressed && { opacity: 0.85 },
                (selected === null || confirmed) && { opacity: 0.45 },
              ]}
            >
              {confirmed ? (
                <Animated.Text
                  style={[styles.confirmText, { opacity: checkAnim }]}
                >
                  ✓ Saved
                </Animated.Text>
              ) : (
                <Text
                  style={[
                    styles.confirmText,
                    { color: selected !== null ? '#0f0f12' : '#555' },
                  ]}
                >
                  Log it
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 24,
    // Subtle top border glow
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },

  // Header
  pill: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 12,
    marginBottom: 24,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.button1,
    letterSpacing: -0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 0,
    textTransform: 'capitalize',
  },

  // Label
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginVertical: 20,
    gap: 14,
  },
  labelRating: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
    width: 52,
  },
  labelText: {
    flex: 1,
  },
  labelShort: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  labelDesc: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize'
  },
  labelHint: {
    fontSize: 16,
    color: '#444',
    fontStyle: 'italic',
    textTransform: 'capitalize',
  },

  // Pips
  pipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  pip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pipPressed: {
    opacity: 0.75,
  },
  pipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scaleEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    marginTop: 4,
  },
  scaleEndText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '500',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f12',
    letterSpacing: -0.2,
  },
});