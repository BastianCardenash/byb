import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, parseLocalDate, toYMD } from '@/lib/dates';
import { font, radius, useTheme } from '@/lib/theme';

type Props = {
  label?: string;
  value: string;
  onChange: (ymd: string) => void;
};

export function DateField({ label, value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.value, { color: colors.text }]}>{formatDate(value)}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={parseLocalDate(value)}
          mode="date"
          display="default"
          onValueChange={(_event, selected) => {
            setOpen(false);
            onChange(toYMD(selected));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pressed: {
    opacity: 0.85,
  },
  value: {
    fontFamily: font.regular,
    fontSize: 15,
  },
});
