import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { parseLocalDate } from '@/lib/dates';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

const MONTHS_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const DAY_COLUMNS = Array.from({ length: 31 }, (_, i) => i + 1);
const HEADER_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  dates: string[];
  monthsTitle: string;
  singularLabel: string;
  pluralLabel: string;
  children?: ReactNode;
};

type DayCell = {
  ymd: string;
  active: boolean;
} | null;

function formatMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_FULL[m - 1]} ${y}`;
}

function buildYearMonths(year: number, activeDays: Set<string>) {
  const yearStr = String(year);
  return MONTHS_SHORT.map((label, monthIdx) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    const days: DayCell[] = DAY_COLUMNS.map((day) => {
      if (day > daysInMonth) return null;
      const ymd = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
      return { ymd, active: activeDays.has(ymd) };
    });
    return { label, days };
  });
}

export function ActivitySummaryModal({
  visible,
  onClose,
  title,
  icon,
  dates,
  monthsTitle,
  singularLabel,
  pluralLabel,
  children,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    topMonths,
    maxMonthCount,
    years,
    activeDays,
    countsByYear,
  } = useMemo(() => {
    const monthCounts = new Map<string, number>();
    const yearSet = new Set<number>();
    const daySet = new Set<string>();
    const yearCounts = new Map<number, number>();

    for (const ymd of dates) {
      const ym = ymd.slice(0, 7);
      monthCounts.set(ym, (monthCounts.get(ym) ?? 0) + 1);

      const year = parseLocalDate(ymd).getFullYear();
      yearSet.add(year);
      yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);

      daySet.add(ymd);
    }

    const sortedMonths = Array.from(monthCounts.entries())
      .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
      .slice(0, 3)
      .map(([ym, count]) => ({ ym, label: formatMonthYear(ym), count }));

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
    if (sortedYears.length === 0) {
      sortedYears.push(new Date().getFullYear());
    }

    return {
      topMonths: sortedMonths,
      maxMonthCount: sortedMonths[0]?.count ?? 1,
      years: sortedYears,
      activeDays: daySet,
      countsByYear: yearCounts,
    };
  }, [dates]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const activeYear =
    selectedYear && years.includes(selectedYear) ? selectedYear : years[0];

  const months = useMemo(
    () => buildYearMonths(activeYear, activeDays),
    [activeYear, activeDays],
  );

  const yearCount = countsByYear.get(activeYear) ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIcon}>
                <Ionicons name={icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Cerrar resumen"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {children}

            {topMonths.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{monthsTitle}</Text>
                <View style={styles.monthsList}>
                  {topMonths.map((item) => {
                    const widthPct = Math.max(
                      12,
                      Math.round((item.count / maxMonthCount) * 100),
                    );
                    return (
                      <View key={item.ym} style={styles.monthRow}>
                        <View style={styles.monthMeta}>
                          <Text style={styles.monthLabel}>{item.label}</Text>
                          <Text style={styles.monthCount}>
                            {item.count === 1
                              ? `1 ${singularLabel}`
                              : `${item.count} ${pluralLabel}`}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.heatmapHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Mapa del año</Text>
                  <Text style={styles.heatmapSub}>
                    {yearCount === 1
                      ? `1 ${singularLabel} en ${activeYear}`
                      : `${yearCount} ${pluralLabel} en ${activeYear}`}
                  </Text>
                </View>
                {years.length > 1 ? (
                  <View style={styles.yearPills}>
                    {years.map((year) => {
                      const active = year === activeYear;
                      return (
                        <Pressable
                          key={year}
                          onPress={() => setSelectedYear(year)}
                          style={[
                            styles.yearPill,
                            active && styles.yearPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.yearPillText,
                              active && styles.yearPillTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View style={styles.heatmapWrap}>
                <View style={styles.gridRow}>
                  <View style={styles.monthLabelCol} />
                  <View style={styles.daysRow}>
                    {DAY_COLUMNS.map((day) => (
                      <View key={day} style={styles.dayHeaderCell}>
                        {HEADER_DAYS.has(day) ? (
                          <Text style={styles.dayHeaderText}>{day}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>

                {months.map((month) => (
                  <View key={month.label} style={styles.gridRow}>
                    <Text style={styles.monthRowLabel}>{month.label}</Text>
                    <View style={styles.daysRow}>
                      {month.days.map((cell, idx) =>
                        cell ? (
                          <View
                            key={cell.ymd}
                            style={[
                              styles.dayCell,
                              cell.active ? styles.dayCellActive : styles.dayCellEmpty,
                            ]}
                          />
                        ) : (
                          <View key={`empty-${idx}`} style={styles.dayCell} />
                        ),
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: 18,
      maxHeight: '88%',
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
    scrollContent: {
      gap: 20,
      paddingBottom: 4,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: colors.text,
    },
    monthsList: {
      gap: 10,
    },
    monthRow: {
      gap: 5,
    },
    monthMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthLabel: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
    },
    monthCount: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
    },
    barTrack: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.bg,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    heatmapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    heatmapSub: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
    },
    yearPills: {
      flexDirection: 'row',
      gap: 6,
    },
    yearPill: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.bg,
    },
    yearPillActive: {
      backgroundColor: colors.primarySoft,
    },
    yearPillText: {
      fontFamily: font.semibold,
      fontSize: 12,
      color: colors.muted,
    },
    yearPillTextActive: {
      color: colors.text,
    },
    heatmapWrap: {
      backgroundColor: colors.bg,
      borderRadius: radius.input,
      padding: 10,
      gap: 5,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthLabelCol: {
      width: 24,
    },
    monthRowLabel: {
      width: 24,
      fontFamily: font.semibold,
      fontSize: 9,
      color: colors.muted,
    },
    daysRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 1.5,
    },
    dayHeaderCell: {
      flex: 1,
      height: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },
    dayHeaderText: {
      fontFamily: font.semibold,
      fontSize: 8,
      color: colors.muted,
      width: 14,
      textAlign: 'center',
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 2,
    },
    dayCellEmpty: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    dayCellActive: {
      backgroundColor: colors.primary,
    },
  });
