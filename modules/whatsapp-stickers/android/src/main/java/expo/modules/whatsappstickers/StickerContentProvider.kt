package expo.modules.whatsappstickers

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File

class StickerContentProvider : ContentProvider() {
  companion object {
    const val METADATA = "metadata"
    const val STICKERS = "stickers"
    const val STICKERS_ASSET = "stickers_asset"

    private const val METADATA_CODE = 1
    private const val METADATA_SINGLE_CODE = 2
    private const val STICKERS_CODE = 3
    private const val STICKERS_ASSET_CODE = 4

    private val PACK_COLUMNS = arrayOf(
      "sticker_pack_identifier",
      "sticker_pack_name",
      "sticker_pack_publisher",
      "sticker_pack_icon",
      "android_play_store_link",
      "ios_app_download_link",
      "sticker_pack_publisher_email",
      "sticker_pack_publisher_website",
      "sticker_pack_privacy_policy_website",
      "sticker_pack_license_agreement_website",
      "image_data_version",
      "whatsapp_will_not_cache_stickers",
      "animated_sticker_pack"
    )

    private val STICKER_COLUMNS = arrayOf(
      "sticker_file_name",
      "sticker_emoji",
      "sticker_accessibility_text"
    )
  }

  private lateinit var matcher: UriMatcher
  private lateinit var authority: String

  override fun onCreate(): Boolean {
    val ctx = context ?: return false
    authority = StickerStore.authority(ctx)
    matcher = UriMatcher(UriMatcher.NO_MATCH).apply {
      addURI(authority, METADATA, METADATA_CODE)
      addURI(authority, "$METADATA/*", METADATA_SINGLE_CODE)
      addURI(authority, "$STICKERS/*", STICKERS_CODE)
      addURI(authority, "$STICKERS_ASSET/*/*", STICKERS_ASSET_CODE)
    }
    return true
  }

  override fun query(
    uri: Uri,
    projection: Array<String>?,
    selection: String?,
    selectionArgs: Array<String>?,
    sortOrder: String?
  ): Cursor? {
    val ctx = context ?: return null
    val packs = StickerStore.loadPacks(ctx)
    return when (matcher.match(uri)) {
      METADATA_CODE -> buildPackCursor(uri, packs)
      METADATA_SINGLE_CODE -> {
        val id = uri.lastPathSegment
        buildPackCursor(uri, packs.filter { it.identifier == id })
      }
      STICKERS_CODE -> {
        val id = uri.lastPathSegment
        val pack = packs.firstOrNull { it.identifier == id }
        val cursor = MatrixCursor(STICKER_COLUMNS)
        pack?.stickers?.forEach { sticker ->
          cursor.addRow(arrayOf<Any?>(sticker.fileName, sticker.emojis.joinToString(","), ""))
        }
        cursor.setNotificationUri(ctx.contentResolver, uri)
        cursor
      }
      else -> throw IllegalArgumentException("Unknown URI: $uri")
    }
  }

  private fun buildPackCursor(uri: Uri, packs: List<StickerPackRecord>): Cursor {
    val ctx = context!!
    val cursor = MatrixCursor(PACK_COLUMNS)
    for (pack in packs) {
      if (pack.stickers.size < 3) continue
      cursor.newRow().apply {
        add(pack.identifier)
        add(pack.name)
        add(pack.publisher)
        add(pack.trayImageFile)
        add("")
        add("")
        add("")
        add("")
        add("")
        add("")
        add(pack.version.toString())
        add(0)
        add(if (pack.animated) 1 else 0)
      }
    }
    cursor.setNotificationUri(ctx.contentResolver, uri)
    return cursor
  }

  override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor? {
    val ctx = context ?: return null
    if (matcher.match(uri) != STICKERS_ASSET_CODE) return null

    val segments = uri.pathSegments
    if (segments.size != 3) return null
    val packId = segments[1]
    val fileName = segments[2]

    // Prevent path traversal and validate file belongs to the pack
    if (fileName.contains("/") || fileName.contains("..")) return null
    val pack = StickerStore.getPack(ctx, packId) ?: return null
    val isTray = fileName == pack.trayImageFile
    val isSticker = pack.stickers.any { it.fileName == fileName }
    if (!isTray && !isSticker) return null

    val file = File(StickerStore.packDir(ctx, packId), fileName)
    if (!file.exists()) return null

    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    return AssetFileDescriptor(pfd, 0, AssetFileDescriptor.UNKNOWN_LENGTH)
  }

  override fun getType(uri: Uri): String = when (matcher.match(uri)) {
    METADATA_CODE -> "vnd.android.cursor.dir/vnd.$authority.$METADATA"
    METADATA_SINGLE_CODE -> "vnd.android.cursor.item/vnd.$authority.$METADATA"
    STICKERS_CODE -> "vnd.android.cursor.dir/vnd.$authority.$STICKERS"
    STICKERS_ASSET_CODE -> {
      val name = uri.lastPathSegment ?: ""
      if (name.endsWith(".png")) "image/png" else "image/webp"
    }
    else -> throw IllegalArgumentException("Unknown URI: $uri")
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri? =
    throw UnsupportedOperationException("Not supported")

  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?): Int =
    throw UnsupportedOperationException("Not supported")

  override fun update(
    uri: Uri,
    values: ContentValues?,
    selection: String?,
    selectionArgs: Array<String>?
  ): Int = throw UnsupportedOperationException("Not supported")
}
