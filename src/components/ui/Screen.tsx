import { ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import ResponsiveContent from "./ResponsiveContent";

type Props = ScrollViewProps & {
  // Opt out of Screen's own ScrollView. Use this when the child renders its
  // own ScrollView — nested scrollers break `scrollTo`/`measure`-based
  // calculations because the outer one ends up owning the scroll.
  scroll?: boolean;
};

export default function Screen({ children, style, scroll = true, ...props }: Props) {
  if (!scroll) {
    return (
      <View style={[styles.containerStatic, style as ViewStyle]}>
        <ResponsiveContent fill>{children}</ResponsiveContent>
      </View>
    );
  }
  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={styles.container}
      {...props}
    >
      <ResponsiveContent>{children}</ResponsiveContent>
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
  // Non-scroll wrapper: `flex: 1` (not flexGrow) so it clamps to the
  // parent height and lets a child ScrollView get bounded, scrollable
  // height on web (flexGrow alone keeps flexShrink:0 and grows to content).
  containerStatic: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
});
