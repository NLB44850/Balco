import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

type MotionProps = {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
};

export function FadeIn({ children, delay = 0, style }: MotionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function PopIn({ children, delay = 0, style }: MotionProps) {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, damping: 12, stiffness: 160, mass: 0.7 }),
      Animated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, scale]);

  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}
