import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  value?: number;
  onChange: (seconds: number) => void;
  onRemove: () => void;
}

const ITEM_H = 40;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;

const MINUTES = Array.from({ length: 10 }, (_, i) => i);
const SECONDS = [0, 5, 10, 15, 20, 30, 45];

// On web the drum wheels are awkward — let min/sec be typed directly.
const isWeb = Platform.OS === 'web';

// ─── Drum wheel ─────────────────────────────────────────────

interface DrumWheelProps {
  items: number[];
  initialIndex: number;
  label: string;
  onSelect: (value: number) => void;
}

function DrumWheel({ items, initialIndex, label, onSelect }: DrumWheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    scrollRef.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
  }, [initialIndex]);

  // Commit on every scroll frame. snapToInterval handles snapping natively
  // (and on web via CSS scroll-snap), so we do NOT call scrollTo from a
  // scroll-end handler — calling scrollTo({animated:true}) during an already
  // in-flight momentum scroll re-enters the scroll responder and leaves the
  // wheel unable to accept further gestures, which breaks the whole modal
  // after the first scroll.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(i, items.length - 1));

      if (clamped !== activeIndexRef.current) {
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
        onSelect(items[clamped]);
      }
    },
    [items, onSelect],
  );

  const handleItemPress = useCallback(
    (index: number) => {
      activeIndexRef.current = index;
      setActiveIndex(index);
      onSelect(items[index]);

      scrollRef.current?.scrollTo({ y: index * ITEM_H, animated: true });
    },
    [items, onSelect],
  );

  return (
    <View style={drum.wrapper}>
      <View style={drum.selectionBand} pointerEvents="none" />

      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'transparent']}
        style={drum.fadeTop}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        style={{ height: PICKER_H }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="center"
        decelerationRate={0.994}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: (PICKER_H - ITEM_H) / 2,
        }}
        onScroll={handleScroll}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - activeIndex);

          return (
            <Pressable key={item} style={drum.item} onPress={() => handleItemPress(i)}>
              <Text
                style={[
                  drum.itemText,
                  i === activeIndex && drum.itemTextActive,
                  { opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2 },
                ]}
              >
                {String(item).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.12)']}
        style={drum.fadeBottom}
        pointerEvents="none"
      />

      <Text style={drum.label}>{label}</Text>
    </View>
  );
}

// ─── Main component ─────────────────────────────────────────

export default function AddRestTimerButton({
  value,
  onChange,
  onRemove,
}: Props) {
  const { accent } = useAccent();
  const [modalVisible, setModalVisible] = useState(false);

  const draftMin = useRef(value !== undefined ? Math.floor(value / 60) : 1);
  const draftSec = useRef(value !== undefined ? value % 60 : 30);

  // Web: typed min/sec, kept in sync with the draft refs that handleConfirm
  // reads. Reset to the current value each time the modal opens.
  const [minStr, setMinStr] = useState(String(draftMin.current));
  const [secStr, setSecStr] = useState(String(draftSec.current));
  useEffect(() => {
    if (modalVisible) {
      const m = value !== undefined ? Math.floor(value / 60) : draftMin.current;
      const s = value !== undefined ? value % 60 : draftSec.current;
      draftMin.current = m;
      draftSec.current = s;
      setMinStr(String(m));
      setSecStr(String(s));
    }
  }, [modalVisible, value]);

  const handleMinSelect = useCallback((v: number) => {
    draftMin.current = v;
  }, []);

  const handleSecSelect = useCallback((v: number) => {
    draftSec.current = v;
  }, []);

  const initialMinIdx = Math.max(
    0,
    Math.min(draftMin.current, MINUTES.length - 1),
  );

  const initialSecIdx = Math.max(
    0,
    SECONDS.includes(draftSec.current)
      ? SECONDS.indexOf(draftSec.current)
      : 0,
  );

  const formatted =
    value !== undefined
      ? `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
          value % 60,
        ).padStart(2, '0')}`
      : null;

  const handleConfirm = () => {
    const total = draftMin.current * 60 + draftSec.current;
    onChange(total > 0 ? total : 30);
    setModalVisible(false);
  };

  return (
    <>
      {value !== undefined ? (
        <View style={[styles.pill, { borderColor: accent + '99' }]}>
          <Feather name="clock" size={13} color={accent} />

          <Pressable onPress={() => setModalVisible(true)}>
            <Text style={[styles.pillText, { color: accent }]}>Rest {formatted}</Text>
          </Pressable>

          <Pressable onPress={onRemove} style={styles.pillRemove}>
            <Feather name="x" size={13} color={colors.button1} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="clock" size={14} color={colors.button1} />
          <Text style={styles.addBtnText}>Add Rest Timer</Text>
        </Pressable>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <Text style={styles.title}>Rest Timer</Text>

            {isWeb ? (
              <View style={styles.pickerRow}>
                <View style={webPicker.field}>
                  <TextInput
                    style={webPicker.input}
                    value={minStr}
                    onChangeText={(t) => {
                      const digits = t.replace(/[^0-9]/g, '').slice(0, 1);
                      setMinStr(digits);
                      draftMin.current = Math.min(parseInt(digits) || 0, MINUTES.length - 1);
                    }}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    placeholder="0"
                    placeholderTextColor={colors.button1}
                  />
                  <Text style={webPicker.unit}>min</Text>
                </View>

                <Text style={styles.colon}>:</Text>

                <View style={webPicker.field}>
                  <TextInput
                    style={webPicker.input}
                    value={secStr}
                    onChangeText={(t) => {
                      const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
                      setSecStr(digits);
                      draftSec.current = Math.min(parseInt(digits) || 0, 59);
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus
                    placeholder="00"
                    placeholderTextColor={colors.button1}
                  />
                  <Text style={webPicker.unit}>sec</Text>
                </View>
              </View>
            ) : (
              <View style={styles.pickerRow}>
                <DrumWheel
                  items={MINUTES}
                  initialIndex={initialMinIdx}
                  label="min"
                  onSelect={handleMinSelect}
                />

                <Text style={styles.colon}>:</Text>

                <DrumWheel
                  items={SECONDS}
                  initialIndex={initialSecIdx}
                  label="sec"
                  onSelect={handleSecSelect}
                />
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmText, { color: accent }]}>Set Timer</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const drum = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 80,
  },
  selectionBand: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 0,
    right: 0,
    height: ITEM_H,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.button2,
    zIndex: 1,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.button1,
    fontVariant: ['tabular-nums'],
  },
  itemTextActive: {
    color: colors.highlight,
    fontSize: 32,
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.button1,
    opacity: 0.6,
  },
});

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.button2,
    backgroundColor: colors.button3,
    marginTop: 6,
    marginBottom: 4,
  },
  addBtnText: {
    color: colors.button1,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: { opacity: 0.6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
    borderWidth: 1,
    backgroundColor: colors.button3,
    marginTop: 6,
    marginBottom: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillRemove: { marginLeft: 2, padding: 2 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.container,
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    width: 300,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 10,
    backgroundColor: colors.button2,
    marginBottom: 16,
  },
  title: {
    color: colors.highlight,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.button1,
    marginHorizontal: 6,
  },
  confirmBtn: {
    backgroundColor: colors.button3,
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  cancelText: {
    color: colors.button1,
    fontSize: 14,
    fontWeight: '600',
  },
});

const webPicker = StyleSheet.create({
  field: {
    alignItems: 'center',
    gap: 4,
  },
  input: {
    width: 72,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.container,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    color: colors.highlight,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  unit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.button1,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});