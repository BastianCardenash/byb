import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { font, radius, useTheme } from '@/lib/theme';

type Props = TextInputProps & {
  label?: string;
};

export function Input({ label, style, multiline, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
          },
          multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: 13,
  },
  input: {
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 15,
  },
  multiline: {
    minHeight: 110,
  },
});
