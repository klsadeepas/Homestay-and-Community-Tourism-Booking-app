import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

// All dates in this app are stored as YYYY-MM-DD because bookings, trips and
// admin filters compare/sort them as strings. The calendar is the only way to
// produce one, so typos can no longer break those comparisons.

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fromIso(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayIso = (): string => toIsoDate(new Date());

export function prettyDate(s: string): string {
  const d = fromIso(s);
  if (!d) return s;
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

function daysFrom(from: string, count: number): string {
  const d = fromIso(from) ?? new Date();
  d.setDate(d.getDate() + count);
  return toIsoDate(d);
}

// Inclusive list of days between two dates (used to shade a selected range).
function span(from: string, to: string): string[] {
  if (!from) return [];
  if (!to || to === from) return [from];
  if (to < from) return [from];
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = daysFrom(cur, 1);
    guard += 1;
  }
  return out;
}

interface Marked {
  [day: string]: {
    selected?: boolean;
    startingDay?: boolean;
    endingDay?: boolean;
    disabled?: boolean;
    disableTouchEvent?: boolean;
    customStyle?: ViewStyle;
    textColor?: string;
  };
}

const theme = {
  calendarBackground: colors.surface,
  textSectionTitleColor: colors.textMuted,
  dayTextColor: colors.text,
  todayTextColor: colors.primary,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: '#FFFFFF',
  arrowColor: colors.primary,
  monthTextColor: colors.text,
  textDisabledColor: colors.borderStrong,
};

function markedFor(from: string, to: string, mode: 'single' | 'range'): Marked {
  const m: Marked = {};
  if (mode === 'single') {
    if (from) m[from] = { selected: true };
    return m;
  }
  const days = span(from, to);
  days.forEach((d, i) => {
    const first = i === 0;
    const last = i === days.length - 1;
    m[d] = days.length === 1
      ? { selected: true }
      : {
          selected: first || last,
          startingDay: first,
          endingDay: last,
          customStyle: first || last ? undefined : { backgroundColor: colors.surfaceAlt },
        };
  });
  return m;
}

interface PickerProps {
  mode: 'single' | 'range';
  from: string;
  to: string;
  minDate?: string;
  maxDate?: string;
  onPick: (from: string, to: string) => void;
}

function CalendarPicker({ mode, from, to, minDate, maxDate, onPick }: PickerProps) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);

  const marked = useMemo(() => markedFor(start, mode === 'range' ? end : '', mode), [mode, start, end]);

  const press = (dayString: string) => {
    if (mode === 'single') {
      setStart(dayString);
      onPick(dayString, '');
      return;
    }
    if (!start || (start && end)) {
      setStart(dayString);
      setEnd('');
      return;
    }
    if (dayString < start) {
      setStart(dayString);
      setEnd(start);
    } else {
      setEnd(dayString);
    }
  };

  return (
    <View>
      <Calendar
        theme={theme}
        minDate={minDate}
        maxDate={maxDate}
        onDayPress={(d: { dateString: string }) => press(d.dateString)}
        markedDates={marked}
        style={styles.calendar}
      />
      <View style={styles.footer}>
        <Pressable style={styles.textBtn} onPress={() => onPick('', '')}>
          <Text style={styles.textBtnLabel}>Clear</Text>
        </Pressable>
        <Pressable style={styles.textBtn} onPress={() => { const t = todayIso(); setStart(t); setEnd(''); }}>
          <Text style={styles.textBtnLabel}>Today</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, mode === 'range' && !start && styles.primaryBtnDisabled]}
          onPress={() => onPick(start, mode === 'range' ? end : '')}
        >
          <Text style={styles.primaryBtnLabel}>{mode === 'range' ? (end ? 'Apply range' : 'Pick end date') : 'Close'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FieldShell({
  label, error, helper, containerStyle, onPress, children,
}: {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.field, error ? { borderColor: colors.danger } : null]}
      >
        <View style={{ flex: 1 }}>{children}</View>
        <MaterialIcons name="event" size={20} color={error ? colors.danger : colors.primary} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export function CalendarModal({
  visible, mode, from, to, title, minDate, maxDate, onClose, onConfirm,
}: {
  visible: boolean;
  mode: 'single' | 'range';
  from: string;
  to: string;
  title: string;
  minDate?: string;
  maxDate?: string;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <MaterialIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <CalendarPicker
            key={`${mode}-${from}-${to}`}
            mode={mode}
            from={from}
            to={to}
            minDate={minDate}
            maxDate={maxDate}
            onPick={(f, t) => {
              if (mode === 'single') {
                onConfirm(f, '');
                onClose();
              } else if (f && t) {
                onConfirm(f, t);
                onClose();
              }
            }}
          />
          {mode === 'range' ? (
            <Text style={styles.rangeHint}>
              {from ? prettyDate(from) : 'Start'} – {to ? prettyDate(to) : 'End'} · tap a start day, then an end day.
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  title?: string;
  containerStyle?: ViewStyle;
}

export function DateField({
  label, value, onChange, error, helper, minDate, maxDate,
  placeholder = 'Select a date', title, containerStyle,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldShell label={label} error={error} helper={helper} containerStyle={containerStyle} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ? prettyDate(value) : placeholder}
        </Text>
      </FieldShell>
      <CalendarModal
        visible={open}
        mode="single"
        from={value}
        to=""
        title={title || label || 'Choose a date'}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => setOpen(false)}
        onConfirm={(f) => onChange(f)}
      />
    </>
  );
}

interface DateRangeFieldProps {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  errorFrom?: string;
  errorTo?: string;
  helper?: string;
  minDate?: string;
  maxDate?: string;
}

export function DateRangeField({ label, from, to, onChange, errorFrom, errorTo, helper, minDate, maxDate }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const summary = from ? `${prettyDate(from)}${to ? ` – ${prettyDate(to)}` : ''}` : '';
  const error = errorFrom || errorTo;
  return (
    <>
      <FieldShell label={label} error={error} helper={helper} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !summary && styles.placeholder]} numberOfLines={1}>
          {summary || 'Select dates'}
        </Text>
      </FieldShell>
      <CalendarModal
        visible={open}
        mode="range"
        from={from}
        to={to}
        title={label}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => setOpen(false)}
        onConfirm={(f, t) => onChange(f, t)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.smallBold, color: colors.text, marginBottom: 6 },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: { ...typography.body, color: colors.text },
  placeholder: { color: colors.textSubtle },
  error: { ...typography.caption, color: colors.danger, marginTop: 4 },
  helper: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sheetTitle: { ...typography.h3, color: colors.text },
  calendar: { borderWidth: 0, paddingTop: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm },
  textBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  textBtnLabel: { ...typography.smallBold, color: colors.textMuted },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnLabel: { ...typography.smallBold, color: colors.textOnPrimary },
  rangeHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
});
