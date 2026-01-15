import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';

interface SwipeTabsProps {
  tabs: string[];
  translateX: Animated.Value;
  screenWidth: number;
  activeIndex: number;
  /** Horizontal padding of the parent container on each side (default 24) */
  containerPadding?: number;
  onTabPress: (index: number) => void;
  style?: ViewStyle;
}

export default function SwipeTabs({
  tabs,
  translateX,
  screenWidth,
  activeIndex,
  containerPadding = 24,
  onTabPress,
  style,
}: SwipeTabsProps) {
  const { accent } = useAccent();
  const tabCount = tabs.length;
  // Compute pill width statically — avoids onLayout re-render flash.
  // Tab bar width = screenWidth - (padding * 2). Pill area = tabBar - 4 (2px padding each side).
  const pillW = (screenWidth - containerPadding * 2 - 4) / tabCount;

  return (
    <View style={style}>
      <View style={st.tabBar}>
        <Animated.View
          style={[
            st.tabPill,
            { width: pillW },
            {
              transform: [{
                translateX: translateX.interpolate({
                  inputRange:  tabs.map((_, i) => -i * screenWidth).reverse(),
                  outputRange: tabs.map((_, i) =>  i * pillW).reverse(),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }],
            },
          ]}
        />
        {tabs.map((label, i) => (
          <Pressable key={label} style={st.tabItem} onPress={() => onTabPress(i)}>
            <Text
              style={[
                st.tabLabel,
                { color: i === activeIndex ? accent : colors.button1 },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={st.dotRow}>
        {tabs.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              st.dot,
              { backgroundColor: i === activeIndex ? accent : colors.button2 },
              {
                transform: [{
                  scaleX: translateX.interpolate({
                    inputRange:  [-(i + 0.5) * screenWidth, -i * screenWidth, -(i - 0.5) * screenWidth].sort((a, b) => a - b),
                    outputRange: [0.333, 1, 0.333],
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.button3,
    borderRadius: 999,
    padding: 2,
    position: 'relative',
  },
  tabPill: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
});
