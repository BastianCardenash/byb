package expo.modules.whatsappstickers

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class WhatsappStickersModule : Module() {
  private fun serializePack(context: Context, pack: StickerPackRecord): Map<String, Any?> {
    val dir = StickerStore.packDir(context, pack.identifier)
    val trayFile = File(dir, pack.trayImageFile)
    return mapOf(
      "identifier" to pack.identifier,
      "name" to pack.name,
      "publisher" to pack.publisher,
      "animated" to pack.animated,
      "version" to pack.version,
      "trayIconUri" to if (trayFile.exists()) Uri.fromFile(trayFile).toString() else null,
      "stickers" to pack.stickers.map { sticker ->
        val file = File(dir, sticker.fileName)
        mapOf(
          "id" to sticker.id,
          "fileName" to sticker.fileName,
          "uri" to Uri.fromFile(file).toString(),
          "emojis" to sticker.emojis,
          "sizeBytes" to sticker.sizeBytes
        )
      }
    )
  }

  override fun definition() = ModuleDefinition {
    Name("WhatsappStickers")

    AsyncFunction("getPacks") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      StickerStore.loadPacks(context).map { serializePack(context, it) }
    }

    AsyncFunction("createPack") { name: String, animated: Boolean ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      val pack = StickerStore.createPack(context, name, animated)
      serializePack(context, pack)
    }

    AsyncFunction("renamePack") { packId: String, name: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      StickerStore.renamePack(context, packId, name)
    }

    AsyncFunction("deletePack") { packId: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      StickerStore.deletePack(context, packId)
    }

    AsyncFunction("importSticker") {
      sourceUri: String,
      emojis: List<String>?,
      targetPackId: String?,
      optionsMap: Map<String, Any?>? ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      val usedEmojis = emojis ?: listOf("😊")
      val options = StickerConverter.ConvertOptions(
        maxFrames = (optionsMap?.get("maxFrames") as? Number)?.toInt() ?: 55,
        maxDurationMs = (optionsMap?.get("maxDurationMs") as? Number)?.toLong() ?: 9500L,
        maxFps = (optionsMap?.get("maxFps") as? Number)?.toInt() ?: 20,
        priority = (optionsMap?.get("priority") as? String) ?: "fps"
      )
      val result = StickerConverter.convertAndStore(context, sourceUri, usedEmojis, targetPackId, options)
      val file = File(StickerStore.packDir(context, result.packId), result.fileName)
      mapOf(
        "packId" to result.packId,
        "animated" to result.animated,
        "sticker" to mapOf(
          "id" to result.id,
          "fileName" to result.fileName,
          "uri" to Uri.fromFile(file).toString(),
          "emojis" to usedEmojis,
          "sizeBytes" to result.sizeBytes
        )
      )
    }

    AsyncFunction("deleteSticker") { packId: String, fileName: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      StickerStore.deleteSticker(context, packId, fileName)
    }

    AsyncFunction("sendPackToWhatsApp") { packId: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context no disponible")
      val activity = appContext.currentActivity ?: throw IllegalStateException("Activity no disponible")
      val pack = StickerStore.getPack(context, packId)
        ?: throw IllegalArgumentException("Pack no encontrado")

      if (pack.stickers.size < 3) {
        throw IllegalStateException("WhatsApp exige al menos 3 stickers en el pack (tienes ${pack.stickers.size}).")
      }

      val intent = Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK").apply {
        putExtra("sticker_pack_id", pack.identifier)
        putExtra("sticker_pack_authority", StickerStore.authority(context))
        putExtra("sticker_pack_name", pack.name)
      }

      try {
        activity.startActivityForResult(intent, 200)
        true
      } catch (_: ActivityNotFoundException) {
        throw IllegalStateException("WhatsApp no está instalado o no soporta importar stickers.")
      }
    }
  }
}
