import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { SmartImage } from '@/components/ui/SmartImage';
import { VillageCard } from '@/components/feature/VillageCard';
import { ListingCard } from '@/components/feature/ListingCard';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function TravelerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { villages, listings, events, wishlist, toggleWishlist, notifications, seasonal } = useData();
  const { t } = useSettings();
  const unread = notifications.filter((n) => n.userId === user?.id && !n.read).length;
  const featured = listings.filter((l) => l.status === 'approved').slice(0, 5);
  const experiences = listings.filter((l) => l.status === 'approved' && l.type === 'experience').slice(0, 6);
  const publishedEvents = events.filter((e) => e.status === 'published' && (e.audience === 'all' || e.audience === 'travelers'));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hello, {user?.name.split(' ')[0]}</Text>
            <Text style={styles.heading}>Discover rural in Sri Lanka</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} style={styles.bell} hitSlop={10} accessibilityLabel="Notifications">
            <MaterialIcons name="notifications" size={22} color={colors.text} />
            {unread > 0 ? <View style={styles.dot}><Text style={styles.dotText}>{unread}</Text></View> : null}
          </Pressable>
          <Pressable onPress={() => router.push('/(traveler)/profile')} hitSlop={10}>
            <Avatar uri={user?.photo} name={user?.name} size={40} />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(traveler)/search')} style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <Text style={styles.searchText}>{t('search_ph')}</Text>
        </Pressable>

        <Text style={styles.section}>Featured villages</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          {villages.map((v) => (
            <VillageCard key={v.id} village={v} onPress={() => router.push({ pathname: '/village/[id]', params: { id: v.id } })} />
          ))}
        </ScrollView>

        <View style={styles.rowBetween}>
          <Text style={styles.section}>Recommended stays & tours</Text>
          <Pressable onPress={() => router.push('/(traveler)/search')}><Text style={styles.link}>See all</Text></Pressable>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {featured.map((l) => {
            const village = villages.find((v) => v.id === l.villageId);
            return (
              <ListingCard key={l.id} listing={l} village={village} saved={wishlist.includes(l.id)} onSave={() => toggleWishlist(l.id)} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} />
            );
          })}
        </View>

        <Text style={styles.section}>Local food & craft experiences</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {experiences.map((l) => (
            <Pressable key={l.id} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} style={styles.expCard}>
              <SmartImage uri={l.photo} style={styles.expImg} fallbackIcon="restaurant" />
              <View style={{ padding: spacing.sm }}>
                <Text style={styles.expTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.expSub}>{l.experienceCategory} · ★ {l.rating.toFixed(1)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.section}>{t('seasonal')}</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {seasonal.map((s) => {
            const v = villages.find((vv) => vv.id === s.villageId);
            return (
              <Pressable key={s.id} style={styles.seasonCard} onPress={() => s.villageId ? router.push({ pathname: '/village/[id]', params: { id: s.villageId } }) : null}>
                <SmartImage uri={s.photo} style={styles.seasonImg} fallbackIcon="wb-sunny" />
                <View style={{ flex: 1, padding: spacing.sm, gap: 2 }}>
                  <Text style={styles.seasonTag}>{s.type.toUpperCase()}{s.recurring ? ' · recurring' : ''}</Text>
                  <Text style={styles.seasonTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.seasonSub} numberOfLines={2}>{v?.name ? `${v.name} · ` : ''}{s.description}</Text>
                </View>
              </Pressable>
            );
          })}
          {publishedEvents.map((e) => {
            const v = villages.find((vv) => vv.id === e.villageId);
            return (
              <Pressable key={e.id} style={styles.seasonCard} onPress={() => router.push({ pathname: '/village/[id]', params: { id: e.villageId } })}>
                <SmartImage uri={e.photo} style={styles.seasonImg} fallbackIcon="event" />
                <View style={{ flex: 1, padding: spacing.sm, gap: 2 }}>
                  <Text style={styles.seasonTag}>EVENT</Text>
                  <Text style={styles.seasonTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.seasonSub}>{v?.name} · {e.dateFrom}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.seasonFoot}>Dates and conditions vary year-to-year. Confirm locally.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  hello: { ...typography.small, color: colors.textMuted },
  heading: { ...typography.h2, color: colors.text },
  bell: { padding: 6 },
  dot: { position: 'absolute', top: 2, right: 2, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchBar: { marginHorizontal: spacing.lg, marginVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchText: { color: colors.textMuted, ...typography.body },
  section: { ...typography.h3, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.primary, ...typography.smallBold, paddingHorizontal: spacing.lg },
  expCard: { width: 180, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  expImg: { width: '100%', height: 120 },
  expTitle: { ...typography.smallBold, color: colors.text },
  expSub: { ...typography.caption, color: colors.textMuted },
  seasonCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  seasonImg: { width: 90, height: 90 },
  seasonTag: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  seasonTitle: { ...typography.bodyBold, color: colors.text },
  seasonSub: { ...typography.caption, color: colors.textMuted },
  seasonFoot: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md, fontStyle: 'italic' },
});
