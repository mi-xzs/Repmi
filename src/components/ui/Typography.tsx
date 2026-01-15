import { Text, TextProps, StyleSheet, TextStyle } from "react-native";

const typography: Record<string, TextStyle> = {
  title: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  subtitle: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
};

interface TypographyProps extends TextProps {
  variant?: keyof typeof typography;
}

export default function Typography({
  variant = "body",
  style,
  children,
  ...props
}: TypographyProps) {
  return <Text {...props} style={[styles[variant], style]}>{children}</Text>;
}

const styles = StyleSheet.create(typography);
