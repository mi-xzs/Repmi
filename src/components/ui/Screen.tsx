import { ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";

type Props = ScrollViewProps & {
  // Opt out of Screen's own ScrollView. Use this when the child renders its
  // own ScrollView — nested scrollers break `scrollTo`/`measure`-based
  // calculations because the outer one ends up owning the scroll.
  scroll?: boolean;
};

export default function Screen({ children, style, scroll = true, ...props }: Props) {
  if (!scroll) {
    return <View style={[styles.container, style as ViewStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={styles.container}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
});
