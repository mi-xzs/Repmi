import { ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import ResponsiveContent from "./ResponsiveContent";

type Props = ScrollViewProps & {
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
  containerStatic: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
});
