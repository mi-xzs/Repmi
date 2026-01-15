import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../../theme/colors';

export const DRUM_ITEM_H = 40;
export const DRUM_VISIBLE = 5;
export const DRUM_PICKER_H = DRUM_ITEM_H * DRUM_VISIBLE;

interface DrumWheelProps {
  items: number[];
  initialIndex: number;
  label: string;
  onSelect: (value: number) => void;
}

export default function DrumWheel({ items, initialIndex, label, onSelect }: DrumWheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    scrollRef.current?.scrollTo({ y: initialIndex * DRUM_ITEM_H, animated: false });
  }, [initialIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.y / DRUM_ITEM_H);
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
      scrollRef.current?.scrollTo({ y: index * DRUM_ITEM_H, animated: true });
    },
    [items, onSelect],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.selectionBand} pointerEvents="none" />
      <LinearGradient colors={['rgba(0,0,0,0.12)', 'transparent']} style={styles.fadeTop} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={{ height: DRUM_PICKER_H }}
        showsVerticalScrollIndicator={false}
        snapToInterval={DRUM_ITEM_H}
        snapToAlignment="center"
        decelerationRate={0.994}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: (DRUM_PICKER_H - DRUM_ITEM_H) / 2 }}
        onScroll={handleScroll}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - activeIndex);
          return (
            <Pressable key={item} style={styles.item} onPress={() => handleItemPress(i)}>
              <Text style={[styles.itemText, i === activeIndex && styles.itemTextActive, { opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2 }]}>
                {String(item).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.12)']} style={styles.fadeBottom} pointerEvents="none" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 80 },
  selectionBand: {
    position: 'absolute',
    top: DRUM_ITEM_H * 2,
    left: 0,
    right: 0,
    height: DRUM_ITEM_H,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.button2,
    zIndex: 1,
  },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: DRUM_ITEM_H * 2, zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: DRUM_ITEM_H * 2, zIndex: 2 },
  item: { height: DRUM_ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 28, fontWeight: '600', color: colors.button1, fontVariant: ['tabular-nums'] },
  itemTextActive: { color: colors.highlight, fontSize: 32, fontWeight: '700' },
  label: { marginTop: 6, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.button1, opacity: 0.6 },
});
