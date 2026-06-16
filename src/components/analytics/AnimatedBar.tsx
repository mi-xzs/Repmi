
import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  percent: number;                       
  delay?: number;                       
  duration?: number;                     
  trackStyle?: StyleProp<ViewStyle>;     
  fillStyle?: StyleProp<ViewStyle>;      
}

export const AnimatedBar: React.FC<Props> = ({
  percent,
  delay = 0,
  duration = 750,
  trackStyle,
  fillStyle,
}) => {
  const width = useSharedValue(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, percent));
    width.value = withDelay(
      delay,
      withTiming(target, { duration, easing: Easing.out(Easing.exp) }),
    );
  }, [percent, delay, duration, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[trackStyle, { overflow: 'hidden' }]}>
      <Animated.View style={[fillStyle, animStyle]} />
    </View>
  );
};

export default AnimatedBar;
