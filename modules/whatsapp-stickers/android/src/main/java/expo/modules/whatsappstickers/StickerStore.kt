package expo.modules.whatsappstickers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

data class StickerRecord(
  val id: String,
  val fileName: String,
  val emojis: List<String>,
  val sizeBytes: Long
)

data class StickerPackRecord(
  val identifier: String,
  val name: String,
  val publisher: String,
  val animated: Boolean,
  val version: Int,
  val trayImageFile: String,
  val stickers: MutableList<StickerRecord>
)

object StickerStore {
  const val STATIC_PACK_ID = "stickers_static_1"
  const val ANIMATED_PACK_ID = "stickers_animated_1"
  const val MAX_STICKERS_PER_PACK = 30
  private const val DEFAULT_PUBLISHER = "Mis stickers"
  private const val TRAY_FILE_NAME = "tray.png"

  private val lock = Any()

  fun rootDir(context: Context): File =
    File(context.filesDir, "whatsapp_stickers").apply { mkdirs() }

  fun packDir(context: Context, packId: String): File =
    File(rootDir(context), packId).apply { mkdirs() }

  private fun manifestFile(context: Context): File =
    File(rootDir(context), "packs.json")

  fun authority(context: Context): String =
    "${context.packageName}.stickercontentprovider"

  fun loadPacks(context: Context): MutableList<StickerPackRecord> = synchronized(lock) {
    val file = manifestFile(context)
    val packs = mutableListOf<StickerPackRecord>()
    if (file.exists()) {
      val root = JSONObject(file.readText())
      val arr = root.optJSONArray("packs") ?: JSONArray()
      for (i in 0 until arr.length()) {
        val obj = arr.getJSONObject(i)
        val stickersArr = obj.optJSONArray("stickers") ?: JSONArray()
        val stickers = mutableListOf<StickerRecord>()
        for (j in 0 until stickersArr.length()) {
          val s = stickersArr.getJSONObject(j)
          val emojisArr = s.optJSONArray("emojis") ?: JSONArray()
          val emojis = mutableListOf<String>()
          for (k in 0 until emojisArr.length()) {
            emojis.add(emojisArr.getString(k))
          }
          val fileName = s.getString("fileName")
          val stickerFile = File(packDir(context, obj.getString("identifier")), fileName)
          if (stickerFile.exists()) {
            stickers.add(
              StickerRecord(
                id = s.getString("id"),
                fileName = fileName,
                emojis = if (emojis.isEmpty()) listOf("😊") else emojis,
                sizeBytes = stickerFile.length()
              )
            )
          }
        }
        packs.add(
          StickerPackRecord(
            identifier = obj.getString("identifier"),
            name = obj.getString("name"),
            publisher = obj.getString("publisher"),
            animated = obj.getBoolean("animated"),
            version = obj.optInt("version", 1),
            trayImageFile = obj.optString("trayImageFile", TRAY_FILE_NAME),
            stickers = stickers
          )
        )
      }
    }

    ensureDefaultPacks(context, packs)
    packs
  }

  private fun ensureDefaultPacks(context: Context, packs: MutableList<StickerPackRecord>) {
    var changed = false
    for (i in packs.indices) {
      val p = packs[i]
      val nextName = when {
        p.identifier == "byb_static" && p.name == "byb Stickers" -> "Stickers"
        p.identifier == "byb_animated" && p.name == "byb Animados" -> "Animados"
        else -> p.name
      }
      val nextPublisher = if (p.publisher == "byb") DEFAULT_PUBLISHER else p.publisher
      if (nextName != p.name || nextPublisher != p.publisher) {
        packs[i] = p.copy(name = nextName, publisher = nextPublisher)
        changed = true
      }
    }
    if (packs.none { !it.animated }) {
      packs.add(
        StickerPackRecord(
          identifier = STATIC_PACK_ID,
          name = "Stickers",
          publisher = DEFAULT_PUBLISHER,
          animated = false,
          version = 1,
          trayImageFile = TRAY_FILE_NAME,
          stickers = mutableListOf()
        )
      )
      changed = true
    }
    if (packs.none { it.animated }) {
      packs.add(
        StickerPackRecord(
          identifier = ANIMATED_PACK_ID,
          name = "Animados",
          publisher = DEFAULT_PUBLISHER,
          animated = true,
          version = 1,
          trayImageFile = TRAY_FILE_NAME,
          stickers = mutableListOf()
        )
      )
      changed = true
    }
    for (pack in packs) {
      val trayFile = File(packDir(context, pack.identifier), pack.trayImageFile)
      if (!trayFile.exists()) {
        writeFallbackTrayIcon(trayFile)
      }
    }
    if (changed) {
      savePacksLocked(context, packs)
    }
  }

  private fun savePacksLocked(context: Context, packs: List<StickerPackRecord>) {
    val arr = JSONArray()
    for (p in packs) {
      val stickersArr = JSONArray()
      for (s in p.stickers) {
        stickersArr.put(
          JSONObject().apply {
            put("id", s.id)
            put("fileName", s.fileName)
            put("emojis", JSONArray(s.emojis))
            put("sizeBytes", s.sizeBytes)
          }
        )
      }
      arr.put(
        JSONObject().apply {
          put("identifier", p.identifier)
          put("name", p.name)
          put("publisher", p.publisher)
          put("animated", p.animated)
          put("version", p.version)
          put("trayImageFile", p.trayImageFile)
          put("stickers", stickersArr)
        }
      )
    }
    val payload = JSONObject().apply { put("packs", arr) }.toString(2)
    val tmp = File(rootDir(context), "packs.json.tmp")
    tmp.writeText(payload)
    tmp.renameTo(manifestFile(context))
  }

  fun addSticker(
    context: Context,
    packId: String,
    stickerId: String,
    fileName: String,
    emojis: List<String>,
    sizeBytes: Long,
    trayPreview: Bitmap?
  ): StickerRecord = synchronized(lock) {
    val packs = loadPacks(context)
    val index = packs.indexOfFirst { it.identifier == packId }
    if (index == -1) throw IllegalArgumentException("Pack no encontrado: $packId")

    val pack = packs[index]
    if (pack.stickers.size >= MAX_STICKERS_PER_PACK) {
      throw IllegalStateException("Este pack ya alcanzó el máximo de $MAX_STICKERS_PER_PACK stickers de WhatsApp.")
    }

    val record = StickerRecord(
      id = stickerId,
      fileName = fileName,
      emojis = if (emojis.isEmpty()) listOf("😊") else emojis.take(3),
      sizeBytes = sizeBytes
    )
    pack.stickers.add(record)
    packs[index] = pack.copy(version = pack.version + 1)

    if (pack.stickers.size == 1 && trayPreview != null) {
      val trayFile = File(packDir(context, packId), pack.trayImageFile)
      writeTrayIconFromBitmap(trayFile, trayPreview)
    }

    savePacksLocked(context, packs)
    record
  }

  fun deleteSticker(context: Context, packId: String, fileName: String): Unit = synchronized(lock) {
    val packs = loadPacks(context)
    val index = packs.indexOfFirst { it.identifier == packId }
    if (index == -1) return@synchronized

    val pack = packs[index]
    val removed = pack.stickers.removeAll { it.fileName == fileName }
    if (removed) {
      File(packDir(context, packId), fileName).delete()
      packs[index] = pack.copy(version = pack.version + 1)
      savePacksLocked(context, packs)
    }
  }

  fun resolveTargetPackId(context: Context, animated: Boolean, preferredPackId: String?): String = synchronized(lock) {
    val packs = loadPacks(context)
    if (preferredPackId != null) {
      val preferred = packs.firstOrNull { it.identifier == preferredPackId }
      if (preferred != null && preferred.animated == animated) {
        if (preferred.stickers.size >= MAX_STICKERS_PER_PACK) {
          throw IllegalStateException("El pack \"${preferred.name}\" está lleno (30/30). Crea uno nuevo con '+ Nuevo'.")
        }
        return@synchronized preferred.identifier
      }
    }
    val available = packs.firstOrNull { it.animated == animated && it.stickers.size < MAX_STICKERS_PER_PACK }
      ?: throw IllegalStateException(
        "Todos tus packs ${if (animated) "animados" else "estáticos"} están llenos (30/30). Crea uno nuevo con '+ Nuevo'."
      )
    available.identifier
  }

  fun createPack(context: Context, rawName: String, animated: Boolean): StickerPackRecord = synchronized(lock) {
    val name = rawName.trim()
    if (name.isEmpty()) throw IllegalArgumentException("El nombre del pack no puede estar vacío.")
    if (name.length > 60) throw IllegalArgumentException("El nombre del pack es muy largo (máximo 60 caracteres).")

    val packs = loadPacks(context)
    val id = "pack_" + UUID.randomUUID().toString().replace("-", "").take(12)
    val pack = StickerPackRecord(
      identifier = id,
      name = name,
      publisher = DEFAULT_PUBLISHER,
      animated = animated,
      version = 1,
      trayImageFile = TRAY_FILE_NAME,
      stickers = mutableListOf()
    )
    val trayFile = File(packDir(context, id), TRAY_FILE_NAME)
    writeFallbackTrayIcon(trayFile)
    packs.add(pack)
    savePacksLocked(context, packs)
    pack
  }

  fun renamePack(context: Context, packId: String, rawName: String): Unit = synchronized(lock) {
    val name = rawName.trim()
    if (name.isEmpty()) throw IllegalArgumentException("El nombre del pack no puede estar vacío.")
    if (name.length > 60) throw IllegalArgumentException("El nombre del pack es muy largo (máximo 60 caracteres).")

    val packs = loadPacks(context)
    val index = packs.indexOfFirst { it.identifier == packId }
    if (index == -1) throw IllegalArgumentException("Pack no encontrado.")

    packs[index] = packs[index].copy(name = name, version = packs[index].version + 1)
    savePacksLocked(context, packs)
  }

  fun deletePack(context: Context, packId: String): Unit = synchronized(lock) {
    val packs = loadPacks(context)
    val target = packs.firstOrNull { it.identifier == packId } ?: return@synchronized
    val sameKindCount = packs.count { it.animated == target.animated }
    if (sameKindCount <= 1) {
      throw IllegalStateException("Debe quedar al menos un pack de cada tipo.")
    }
    packs.removeAll { it.identifier == packId }
    packDir(context, packId).deleteRecursively()
    savePacksLocked(context, packs)
  }

  fun getPack(context: Context, packId: String): StickerPackRecord? =
    loadPacks(context).firstOrNull { it.identifier == packId }

  private fun writeTrayIconFromBitmap(target: File, source: Bitmap) {
    val scaled = Bitmap.createScaledBitmap(source, 96, 96, true)
    FileOutputStream(target).use { out ->
      scaled.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    if (scaled !== source) scaled.recycle()
  }

  private fun writeFallbackTrayIcon(target: File) {
    val bmp = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#F08A8B") }
    canvas.drawCircle(48f, 48f, 44f, paint)
    FileOutputStream(target).use { out ->
      bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    bmp.recycle()
  }
}
