import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { styles } from "../../screens/Analytics.Styles";
import { useAccent } from "../../services/SettingsContext";
import { StatCardProps } from "../../types/analytics";

interface Props extends StatCardProps {
  onPress?: () => void;
}

const StatCard: React.FC<Props> = ({ label, value, icon, compact, onPress }) => {
  const { accent } = useAccent();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.965, { stiffness: 320, damping: 14 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 280, damping: 12 });
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Animated.View style={[styles.statCard, compact && styles.statCardCompact, pressStyle]}>
        <Feather
          name={icon as React.ComponentProps<typeof Feather>["name"]}
          size={16}
          color={accent}
          style={compact ? { marginBottom: 6 } : undefined}
        />
        <Text
          style={[styles.statValue, compact && styles.statValueCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {!compact && <View style={styles.statSpacer} />}
        <Text
          style={[styles.statLabel, compact && styles.statLabelCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export default StatCard;
