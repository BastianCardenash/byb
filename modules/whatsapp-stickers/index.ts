import { requireOptionalNativeModule } from 'expo-modules-core';

export type StickerKind = 'static' | 'animated';

export type StickerItem = {
  id: string;
  fileName: string;
  uri: string;
  emojis: string[];
  sizeBytes: number;
};

export type StickerPack = {
  identifier: string;
  name: string;
  publisher: string;
  animated: boolean;
  version: number;
  trayIconUri: string | null;
  stickers: StickerItem[];
};

export type AddStickerResult = {
  packId: string;
  animated: boolean;
  sticker: StickerItem;
};

type NativeWhatsappStickersModule = {
  getPacks(): Promise<StickerPack[]>;
  createPack(name: string, animated: boolean): Promise<StickerPack>;
  renamePack(packId: string, name: string): Promise<void>;
  deletePack(packId: string): Promise<void>;
  importSticker(sourceUri: string, emojis?: string[], targetPackId?: string | null): Promise<AddStickerResult>;
  deleteSticker(packId: string, fileName: string): Promise<void>;
  sendPackToWhatsApp(packId: string): Promise<boolean>;
};

const Native = requireOptionalNativeModule<NativeWhatsappStickersModule>('WhatsappStickers');

export const isWhatsappStickersAvailable = Native !== null;

function requireNative(): NativeWhatsappStickersModule {
  if (!Native) {
    throw new Error('El módulo de stickers solo está disponible en la build nativa de Android.');
  }
  return Native;
}

export function getStickerPacks(): Promise<StickerPack[]> {
  if (!Native) return Promise.resolve([]);
  return Native.getPacks();
}

export function createStickerPack(name: string, animated: boolean): Promise<StickerPack> {
  return requireNative().createPack(name, animated);
}

export function renameStickerPack(packId: string, name: string): Promise<void> {
  return requireNative().renamePack(packId, name);
}

export function deleteStickerPack(packId: string): Promise<void> {
  return requireNative().deletePack(packId);
}

export function importSticker(
  sourceUri: string,
  emojis: string[] = ['😊'],
  targetPackId: string | null = null,
): Promise<AddStickerResult> {
  return requireNative().importSticker(sourceUri, emojis, targetPackId);
}

export function deleteSticker(packId: string, fileName: string): Promise<void> {
  return requireNative().deleteSticker(packId, fileName);
}

export function sendPackToWhatsApp(packId: string): Promise<boolean> {
  return requireNative().sendPackToWhatsApp(packId);
}
