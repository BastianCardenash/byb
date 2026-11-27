import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';
import { resolveTwitterMediaUrl } from '@/lib/twitter';
import {
  createStickerPack,
  deleteSticker,
  deleteStickerPack,
  getStickerPacks,
  importSticker,
  isWhatsappStickersAvailable,
  renameStickerPack,
  sendPackToWhatsApp,
  type StickerItem,
  type StickerKind,
} from '../../modules/whatsapp-stickers';

type PackModalState =
  | { mode: 'create'; animated: boolean }
  | { mode: 'rename'; packId: string }
  | null;

export default function StickersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<StickerKind>('static');
  const [selectedIds, setSelectedIds] = useState<Record<StickerKind, string | null>>({
    static: null,
    animated: null,
  });
  const [tweetUrl, setTweetUrl] = useState('');
  const [busyAction, setBusyAction] = useState<'gallery' | 'twitter' | 'whatsapp' | null>(null);
  const [packModal, setPackModal] = useState<PackModalState>(null);
  const [packNameDraft, setPackNameDraft] = useState('');

  const { data: packs = [], refetch } = useQuery({
    queryKey: ['sticker-packs'],
    queryFn: getStickerPacks,
    staleTime: 0,
  });

  const staticPacks = packs.filter((p) => !p.animated);
  const animatedPacks = packs.filter((p) => p.animated);
  const visiblePacks = tab === 'static' ? staticPacks : animatedPacks;
  const activePack =
    visiblePacks.find((p) => p.identifier === selectedIds[tab]) ?? visiblePacks[0];
  const stickers = activePack?.stickers ?? [];

  const handleImportUri = async (uri: string) => {
    const result = await importSticker(uri, ['😊'], activePack?.identifier ?? null, {
      maxFps: 20,
      maxFrames: 55,
      maxDurationMs: 9500,
      priority: 'fps',
    });
    const kind: StickerKind = result.animated ? 'animated' : 'static';
    setSelectedIds((prev) => ({ ...prev, [kind]: result.packId }));
    await refetch();
    setTab(kind);
  };

  const handlePickFromGallery = async () => {
    setBusyAction('gallery');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 1,
      });
      if (res.canceled || !res.assets[0]?.uri) return;
      await handleImportUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('No se pudo crear el sticker', (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportFromTwitter = async () => {
    if (!tweetUrl.trim()) return;
    setBusyAction('twitter');
    try {
      const mediaUrl = await resolveTwitterMediaUrl(tweetUrl);
      await handleImportUri(mediaUrl);
      setTweetUrl('');
    } catch (e) {
      Alert.alert('No se pudo importar desde X', (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteSticker = (item: StickerItem) => {
    if (!activePack) return;
    Alert.alert('Eliminar sticker', '¿Quieres quitar este sticker del pack?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteSticker(activePack.identifier, item.fileName);
          await refetch();
        },
      },
    ]);
  };

  const handleDeletePack = (packId: string, name: string) => {
    if (visiblePacks.length <= 1) return;
    Alert.alert('Eliminar pack', `¿Quieres eliminar "${name}" y todos sus stickers?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteStickerPack(packId);
          setSelectedIds((prev) => (prev[tab] === packId ? { ...prev, [tab]: null } : prev));
          await refetch();
        },
      },
    ]);
  };

  const handleSavePackModal = async () => {
    if (!packModal) return;
    try {
      if (packModal.mode === 'create') {
        const created = await createStickerPack(packNameDraft, packModal.animated);
        const kind: StickerKind = created.animated ? 'animated' : 'static';
        setSelectedIds((prev) => ({ ...prev, [kind]: created.identifier }));
      } else {
        await renameStickerPack(packModal.packId, packNameDraft);
      }
      setPackModal(null);
      setPackNameDraft('');
      await refetch();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleSendToWhatsApp = async () => {
    if (!activePack) return;
    setBusyAction('whatsapp');
    try {
      await sendPackToWhatsApp(activePack.identifier);
    } catch (e) {
      Alert.alert('No se pudo enviar a WhatsApp', (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const missingCount = Math.max(0, 3 - stickers.length);

  if (!isWhatsappStickersAvailable) {
    return (
      <View style={styles.unavailable}>
        <EmptyState
          icon="logo-whatsapp"
          title="Solo disponible en Android compilado"
          subtitle="Los stickers usan un módulo nativo propio, por lo que funcionan en el APK o Development Build de Android (no en Web ni Expo Go)."
        />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.topSection}>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionSubtitle}>A partir de un archivo</Text>
        <Card>
          <Button
            title="Elegir imagen, GIF o video"
            onPress={handlePickFromGallery}
            loading={busyAction === 'gallery'}
            disabled={busyAction !== null && busyAction !== 'gallery'}
          />
        </Card>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionSubtitle}>A partir de un link de X</Text>
        <Card>
          <View style={styles.twitterRow}>
            <View style={styles.twitterInputWrap}>
              <Input
                value={tweetUrl}
                onChangeText={setTweetUrl}
                placeholder="Link"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={busyAction === null}
              />
            </View>
            <Button
              title="Importar"
              variant="soft"
              onPress={handleImportFromTwitter}
              loading={busyAction === 'twitter'}
              disabled={!tweetUrl.trim() || (busyAction !== null && busyAction !== 'twitter')}
              style={styles.twitterBtn}
            />
          </View>
        </Card>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { key: 'static', label: `Estáticos (${staticPacks.length})` },
            { key: 'animated', label: `Animados (${animatedPacks.length})` },
          ] as const
        ).map((item) => {
          const selected = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.tabPill, selected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.packRow}
      >
        {visiblePacks.map((pack) => {
          const selected = pack.identifier === activePack?.identifier;
          return (
            <Pressable
              key={pack.identifier}
              onPress={() => setSelectedIds((prev) => ({ ...prev, [tab]: pack.identifier }))}
              onLongPress={() => handleDeletePack(pack.identifier, pack.name)}
              style={[
                styles.packChip,
                selected && {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.packChipText, selected && { color: colors.text }]}>
                {pack.name} ({pack.stickers.length}/30)
              </Text>
              {selected ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setPackNameDraft(pack.name);
                    setPackModal({ mode: 'rename', packId: pack.identifier });
                  }}
                >
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            setPackNameDraft('');
            setPackModal({ mode: 'create', animated: tab === 'animated' });
          }}
          style={styles.newPackChip}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={[styles.packChipText, { color: colors.primary }]}>Nuevo</Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={stickers}
        keyExtractor={(item) => item.id}
        numColumns={3}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.skeletonRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonTile}>
                  <View style={styles.skeletonInner} />
                </View>
              ))}
            </View>
            <Text style={styles.emptyLabel}>
              {tab === 'static' ? 'Pack estático vacío' : 'Pack animado vacío'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDeleteSticker(item)}
            style={({ pressed }) => [styles.stickerTile, pressed && styles.pressed]}
          >
            <Image source={{ uri: item.uri }} style={styles.stickerImage} contentFit="contain" />
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        {missingCount > 0 ? (
          <Text style={styles.hintText}>Agrega 3 stickers para importar a WhatsApp</Text>
        ) : (
          <Text style={styles.hintText}>Mantén presionado un sticker para eliminarlo.</Text>
        )}
        <Button
          title={`Agregar "${activePack?.name ?? 'Pack'}" a WhatsApp`}
          onPress={handleSendToWhatsApp}
          loading={busyAction === 'whatsapp'}
          disabled={missingCount > 0 || (busyAction !== null && busyAction !== 'whatsapp')}
        />
      </View>

      <Modal
        visible={packModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPackModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {packModal?.mode === 'rename'
                ? 'Renombrar pack'
                : packModal?.animated
                  ? 'Nuevo pack animado'
                  : 'Nuevo pack estático'}
            </Text>
            <Input
              value={packNameDraft}
              onChangeText={setPackNameDraft}
              placeholder="Nombre del pack"
              maxLength={60}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setPackModal(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Guardar"
                onPress={handleSavePackModal}
                disabled={!packNameDraft.trim()}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    unavailable: {
      flex: 1,
      justifyContent: 'center',
    },
    topSection: {
      paddingTop: 16,
      paddingBottom: 10,
      gap: 12,
    },
    sectionBlock: {
      gap: 6,
    },
    sectionSubtitle: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: colors.text,
      textAlign: 'left',
    },
    twitterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    twitterInputWrap: {
      flex: 1,
    },
    twitterBtn: {
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
    },
    tabPill: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabText: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.muted,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    packRow: {
      gap: 8,
      paddingVertical: 2,
    },
    packChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    newPackChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    packChipText: {
      fontFamily: font.semibold,
      fontSize: 12,
      color: colors.muted,
    },
    gridContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 10,
      flexGrow: 1,
    },
    gridRow: {
      gap: 10,
    },
    emptyWrap: {
      paddingTop: 8,
      gap: 12,
      alignItems: 'center',
    },
    skeletonRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    skeletonTile: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: colors.card,
      borderRadius: radius.input,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skeletonInner: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      opacity: 0.6,
    },
    emptyLabel: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.muted,
    },
    stickerTile: {
      flex: 1 / 3,
      aspectRatio: 1,
      backgroundColor: colors.card,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickerImage: {
      width: '100%',
      height: '100%',
    },
    pressed: {
      opacity: 0.75,
    },
    footer: {
      padding: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.bg,
      gap: 8,
    },
    hintText: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      gap: 14,
    },
    modalTitle: {
      fontFamily: font.bold,
      fontSize: 17,
      color: colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
    },
    modalBtn: {
      flex: 1,
    },
  });
