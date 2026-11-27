package expo.modules.whatsappstickers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.graphics.Paint
import android.net.Uri
import android.os.Build
import wseemann.media.FFmpegMediaMetadataRetriever
import com.aureusapps.android.webpandroid.encoder.WebPAnimEncoder
import com.aureusapps.android.webpandroid.encoder.WebPAnimEncoderOptions
import com.aureusapps.android.webpandroid.encoder.WebPConfig
import com.aureusapps.android.webpandroid.encoder.WebPMuxAnimParams
import com.aureusapps.android.webpandroid.encoder.WebPPreset
import com.bumptech.glide.gifdecoder.GifDecoder
import com.bumptech.glide.gifdecoder.StandardGifDecoder
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

object StickerConverter {
  private const val CANVAS_SIZE = 512
  private const val MAX_STATIC_BYTES = 100 * 1024
  private const val MAX_ANIMATED_BYTES = 490 * 1024 // Safe margin under WhatsApp 500 KB limit
  private const val DEFAULT_MAX_DURATION_MS = 9500L // Safe margin under WhatsApp 10s limit
  private const val DEFAULT_MAX_FRAMES = 55
  private const val DEFAULT_MAX_FPS = 20

  private enum class MediaKind { STATIC, GIF, VIDEO, ANIMATED_WEBP }

  data class ConvertOptions(
    val maxFrames: Int = DEFAULT_MAX_FRAMES,
    val maxDurationMs: Long = DEFAULT_MAX_DURATION_MS,
    val maxFps: Int = DEFAULT_MAX_FPS,
    val priority: String = "fps"
  )

  data class ConvertedSticker(
    val id: String,
    val fileName: String,
    val packId: String,
    val animated: Boolean,
    val sizeBytes: Long,
    val trayPreview: Bitmap?
  )

  private data class EncodedFrame(
    val bitmap: Bitmap,
    val durationMs: Int
  )

  fun convertAndStore(
    context: Context,
    sourceUri: String,
    emojis: List<String>,
    targetPackId: String? = null,
    options: ConvertOptions = ConvertOptions()
  ): ConvertedSticker {
    val safeOptions = options.copy(
      maxFrames = options.maxFrames.coerceIn(5, 120),
      maxDurationMs = options.maxDurationMs.coerceIn(500L, 9800L),
      maxFps = options.maxFps.coerceIn(4, 30)
    )
    val tempFile = resolveToTempFile(context, sourceUri)
    try {
      val kind = detectMediaKind(tempFile)
      val id = UUID.randomUUID().toString().replace("-", "").take(12)
      val fileName = "st_$id.webp"

      return when (kind) {
        MediaKind.STATIC -> {
          val packId = StickerStore.resolveTargetPackId(context, animated = false, preferredPackId = targetPackId)
          val outFile = File(StickerStore.packDir(context, packId), fileName)
          val preview = convertStaticToWebP(tempFile, outFile)
          try {
            val record = StickerStore.addSticker(
              context = context,
              packId = packId,
              stickerId = id,
              fileName = fileName,
              emojis = emojis,
              sizeBytes = outFile.length(),
              trayPreview = preview
            )
            ConvertedSticker(record.id, record.fileName, packId, false, record.sizeBytes, null)
          } finally {
            preview.recycle()
          }
        }
        MediaKind.ANIMATED_WEBP -> {
          if (tempFile.length() > MAX_ANIMATED_BYTES) {
            throw IllegalStateException("Este WebP animado ya supera el límite de 500 KB de WhatsApp.")
          }
          val packId = StickerStore.resolveTargetPackId(context, animated = true, preferredPackId = targetPackId)
          val outFile = File(StickerStore.packDir(context, packId), fileName)
          tempFile.copyTo(outFile, overwrite = true)
          val record = StickerStore.addSticker(
            context = context,
            packId = packId,
            stickerId = id,
            fileName = fileName,
            emojis = emojis,
            sizeBytes = outFile.length(),
            trayPreview = null
          )
          ConvertedSticker(record.id, record.fileName, packId, true, record.sizeBytes, null)
        }
        MediaKind.GIF, MediaKind.VIDEO -> {
          val packId = StickerStore.resolveTargetPackId(context, animated = true, preferredPackId = targetPackId)
          val outFile = File(StickerStore.packDir(context, packId), fileName)
          val frames = if (kind == MediaKind.GIF) {
            extractGifFrames(tempFile, safeOptions)
          } else {
            extractVideoFrames(tempFile, safeOptions)
          }
          if (frames.isEmpty()) {
            throw IllegalStateException("No se pudieron extraer frames de la animación.")
          }
          val preview = frames.first().bitmap.copy(Bitmap.Config.ARGB_8888, false)
          try {
            encodeAnimatedWebP(context, frames, outFile, safeOptions.priority)
            val record = StickerStore.addSticker(
              context = context,
              packId = packId,
              stickerId = id,
              fileName = fileName,
              emojis = emojis,
              sizeBytes = outFile.length(),
              trayPreview = preview
            )
            ConvertedSticker(record.id, record.fileName, packId, true, record.sizeBytes, null)
          } finally {
            preview.recycle()
            frames.forEach { it.bitmap.recycle() }
          }
        }
      }
    } finally {
      tempFile.delete()
    }
  }

  private fun resolveToTempFile(context: Context, sourceUri: String): File {
    val tmp = File.createTempFile("sticker_src_", ".tmp", context.cacheDir)
    when {
      sourceUri.startsWith("http://") || sourceUri.startsWith("https://") -> {
        var currentUrl = sourceUri
        var conn: HttpURLConnection? = null
        var redirects = 0
        try {
          while (redirects < 5) {
            conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
              instanceFollowRedirects = false
              connectTimeout = 15_000
              readTimeout = 30_000
              setRequestProperty("User-Agent", "byb-stickers/1.0")
            }
            val code = conn.responseCode
            if (code in 300..399) {
              val location = conn.getHeaderField("Location") ?: break
              conn.disconnect()
              currentUrl = URL(URL(currentUrl), location).toString()
              redirects++
              continue
            }
            if (code !in 200..299) {
              throw IllegalStateException("Error al descargar el archivo (HTTP $code).")
            }
            conn.inputStream.use { input ->
              FileOutputStream(tmp).use { output -> input.copyTo(output) }
            }
            break
          }
        } finally {
          conn?.disconnect()
        }
      }
      sourceUri.startsWith("content://") -> {
        val uri = Uri.parse(sourceUri)
        val input = context.contentResolver.openInputStream(uri)
          ?: throw IllegalStateException("No se pudo abrir el archivo seleccionado.")
        input.use { src ->
          FileOutputStream(tmp).use { dst -> src.copyTo(dst) }
        }
      }
      else -> {
        val path = if (sourceUri.startsWith("file://")) Uri.parse(sourceUri).path!! else sourceUri
        File(path).inputStream().use { src ->
          FileOutputStream(tmp).use { dst -> src.copyTo(dst) }
        }
      }
    }
    if (!tmp.exists() || tmp.length() == 0L) {
      throw IllegalStateException("El archivo de entrada está vacío.")
    }
    return tmp
  }

  private fun detectMediaKind(file: File): MediaKind {
    val header = ByteArray(64)
    val read = file.inputStream().use { it.read(header) }
    if (read >= 6) {
      val ascii6 = String(header, 0, 6, Charsets.US_ASCII)
      if (ascii6 == "GIF87a" || ascii6 == "GIF89a") {
        return MediaKind.GIF
      }
    }
    if (read >= 12) {
      val riff = String(header, 0, 4, Charsets.US_ASCII)
      val webp = String(header, 8, 4, Charsets.US_ASCII)
      if (riff == "RIFF" && webp == "WEBP") {
        val chunkScan = String(header, 12, read - 12, Charsets.US_ASCII)
        if (chunkScan.contains("ANIM")) {
          return MediaKind.ANIMATED_WEBP
        }
      }
    }
    if (read >= 8) {
      val ftyp = String(header, 4, 4, Charsets.US_ASCII)
      if (ftyp == "ftyp") {
        return MediaKind.VIDEO
      }
    }
    if (read >= 4 &&
      header[0] == 0x1A.toByte() &&
      header[1] == 0x45.toByte() &&
      header[2] == 0xDF.toByte() &&
      header[3] == 0xA3.toByte()
    ) {
      return MediaKind.VIDEO
    }
    return MediaKind.STATIC
  }

  private fun convertStaticToWebP(inputFile: File, outFile: File): Bitmap {
    val rawBitmap = decodeStaticBitmap(inputFile)
    val canvasBitmap = fitToStickerCanvas(rawBitmap)
    if (rawBitmap !== canvasBitmap) rawBitmap.recycle()

    val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Bitmap.CompressFormat.WEBP_LOSSY
    } else {
      @Suppress("DEPRECATION")
      Bitmap.CompressFormat.WEBP
    }

    var encodedBytes: ByteArray? = null
    for (contentSize in listOf(CANVAS_SIZE, 384)) {
      val candidate = if (contentSize == CANVAS_SIZE) {
        canvasBitmap
      } else {
        fitToStickerCanvas(canvasBitmap, contentSize)
      }
      try {
        for (quality in listOf(85, 70, 55, 40, 25, 15, 8)) {
          val baos = ByteArrayOutputStream()
          candidate.compress(format, quality, baos)
          val bytes = baos.toByteArray()
          encodedBytes = bytes
          if (bytes.size <= MAX_STATIC_BYTES) {
            FileOutputStream(outFile).use { it.write(bytes) }
            return canvasBitmap
          }
        }
      } finally {
        if (candidate !== canvasBitmap) candidate.recycle()
      }
    }

    canvasBitmap.recycle()
    val lastKb = (encodedBytes?.size ?: 0) / 1024
    throw IllegalStateException("La imagen pesa $lastKb KB incluso comprimida (máximo 100 KB en WhatsApp).")
  }

  private fun decodeStaticBitmap(file: File): Bitmap {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val source = ImageDecoder.createSource(file)
      return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        val w = info.size.width
        val h = info.size.height
        val maxDim = max(w, h)
        if (maxDim > CANVAS_SIZE * 2) {
          val scale = (CANVAS_SIZE * 2f) / maxDim
          decoder.setTargetSize((w * scale).roundToInt().coerceAtLeast(1), (h * scale).roundToInt().coerceAtLeast(1))
        }
      }
    }
    return BitmapFactory.decodeFile(file.absolutePath)
      ?: throw IllegalStateException("No se pudo leer la imagen.")
  }

  private fun extractGifFrames(gifFile: File, options: ConvertOptions): List<EncodedFrame> {
    val bytes = gifFile.readBytes()
    val decoder = StandardGifDecoder(SimpleGifBitmapProvider())
    decoder.setDefaultBitmapConfig(Bitmap.Config.ARGB_8888)
    val status = decoder.read(bytes)
    if (status != GifDecoder.STATUS_OK && decoder.frameCount == 0) {
      decoder.clear()
      throw IllegalStateException("No se pudo decodificar el GIF.")
    }

    val delays = mutableListOf<Int>()
    var totalDuration = 0L
    for (i in 0 until decoder.frameCount) {
      val rawDelay = decoder.getDelay(i)
      val delay = if (rawDelay <= 0) 100 else max(16, rawDelay)
      if (totalDuration + delay > options.maxDurationMs && delays.isNotEmpty()) break
      delays.add(delay)
      totalDuration += delay
    }

    val minFpsIntervalMs = max(16L, 1000L / options.maxFps)
    val maxFramesIntervalMs = ceil(totalDuration.toDouble() / options.maxFrames).toLong()
    val minKeepIntervalMs = max(minFpsIntervalMs, maxFramesIntervalMs)

    val result = mutableListOf<EncodedFrame>()
    decoder.resetFrameIndex()
    var accumulatedDelay = 0
    for (i in delays.indices) {
      decoder.advance()
      // Always decode every frame so GIF disposal/delta compositing stays intact.
      val frameBitmap = decoder.nextFrame
      val delay = delays[i]
      accumulatedDelay += delay
      val shouldKeep =
        (i == 0 || accumulatedDelay >= minKeepIntervalMs || (i == delays.lastIndex && result.isEmpty())) &&
          result.size < options.maxFrames
      if (frameBitmap != null) {
        if (shouldKeep) {
          result.add(EncodedFrame(fitToStickerCanvas(frameBitmap), max(16, accumulatedDelay)))
          accumulatedDelay = 0
        }
        frameBitmap.recycle()
      }
    }
    if (accumulatedDelay > 0 && result.isNotEmpty()) {
      val last = result.removeAt(result.lastIndex)
      result.add(last.copy(durationMs = last.durationMs + accumulatedDelay))
    }

    decoder.clear()
    return result
  }

  private fun extractVideoFrames(videoFile: File, options: ConvertOptions): List<EncodedFrame> {
    val retriever = FFmpegMediaMetadataRetriever()
    val result = mutableListOf<EncodedFrame>()
    try {
      retriever.setDataSource(videoFile.absolutePath)
      val durationStr = retriever.extractMetadata(FFmpegMediaMetadataRetriever.METADATA_KEY_DURATION)
      val rawDurationMs = durationStr?.toLongOrNull()?.takeIf { it > 0L } ?: 3000L
      val clipDurationMs = min(max(rawDurationMs, 200L), options.maxDurationMs)

      val minFpsStepMs = max(16L, 1000L / options.maxFps)
      val stepMs = max(minFpsStepMs, ceil(clipDurationMs.toDouble() / options.maxFrames).toLong())
      var tMs = 0L
      while (tMs < clipDurationMs && result.size < options.maxFrames) {
        val frame = retriever.getFrameAtTime(tMs * 1000L, FFmpegMediaMetadataRetriever.OPTION_CLOSEST)
          ?: retriever.getFrameAtTime(tMs * 1000L, FFmpegMediaMetadataRetriever.OPTION_CLOSEST_SYNC)
        if (frame != null) {
          val canvas = fitToStickerCanvas(frame)
          if (canvas !== frame) frame.recycle()
          val remaining = clipDurationMs - tMs
          val frameDuration = min(stepMs, remaining).toInt().coerceAtLeast(16)
          result.add(EncodedFrame(canvas, frameDuration))
        }
        tMs += stepMs
      }
      if (result.isEmpty()) {
        val fallback = retriever.getFrameAtTime()
        if (fallback != null) {
          val canvas = fitToStickerCanvas(fallback)
          if (canvas !== fallback) fallback.recycle()
          result.add(EncodedFrame(canvas, 500))
        }
      }
    } finally {
      retriever.release()
    }
    return result
  }

  private data class AnimAttempt(
    val quality: Float,
    val stride: Int,
    val contentSize: Int = CANVAS_SIZE,
    val alphaQuality: Int = 80
  )

  private fun encodeAnimatedWebP(
    context: Context,
    frames: List<EncodedFrame>,
    outFile: File,
    priority: String
  ) {
    val attempts = if (priority == "quality") {
      listOf(
        AnimAttempt(quality = 72f, stride = 1),
        AnimAttempt(quality = 48f, stride = 1, alphaQuality = 60),
        AnimAttempt(quality = 35f, stride = 2, alphaQuality = 50),
        AnimAttempt(quality = 24f, stride = 2, contentSize = 384, alphaQuality = 40),
        AnimAttempt(quality = 18f, stride = 3, contentSize = 320, alphaQuality = 30),
        AnimAttempt(quality = 10f, stride = 4, contentSize = 256, alphaQuality = 20)
      )
    } else {
      // Prioritize keeping all frames (stride = 1) by lowering quality/inner scale first.
      listOf(
        AnimAttempt(quality = 65f, stride = 1, alphaQuality = 70),
        AnimAttempt(quality = 40f, stride = 1, alphaQuality = 50),
        AnimAttempt(quality = 28f, stride = 1, contentSize = 384, alphaQuality = 40),
        AnimAttempt(quality = 20f, stride = 1, contentSize = 320, alphaQuality = 30),
        AnimAttempt(quality = 14f, stride = 1, contentSize = 256, alphaQuality = 25),
        AnimAttempt(quality = 16f, stride = 2, contentSize = 256, alphaQuality = 20),
        AnimAttempt(quality = 10f, stride = 3, contentSize = 224, alphaQuality = 15)
      )
    }

    var lastSizeBytes = 0L
    for (attempt in attempts) {
      val subset = if (attempt.stride == 1) frames else subsampleFrames(frames, attempt.stride)
      val tempScaled = if (attempt.contentSize == CANVAS_SIZE) null else mutableListOf<Bitmap>()

      // Delete before assembling: webp-android opens "w" without truncating existing bytes.
      if (outFile.exists()) outFile.delete()

      val encoder = WebPAnimEncoder(
        context = context,
        width = CANVAS_SIZE,
        height = CANVAS_SIZE,
        options = WebPAnimEncoderOptions(
          minimizeSize = true,
          animParams = WebPMuxAnimParams(
            backgroundColor = Color.TRANSPARENT,
            loopCount = 0
          )
        )
      )
      try {
        encoder.configure(
          config = WebPConfig(
            lossless = WebPConfig.COMPRESSION_LOSSY,
            quality = attempt.quality,
            alphaQuality = attempt.alphaQuality,
            method = 4
          ),
          preset = WebPPreset.WEBP_PRESET_DEFAULT
        )
        var timestamp = 0L
        for (frame in subset) {
          val bmp = if (attempt.contentSize == CANVAS_SIZE) {
            frame.bitmap
          } else {
            fitToStickerCanvas(frame.bitmap, attempt.contentSize).also { tempScaled?.add(it) }
          }
          encoder.addFrame(timestamp, bmp)
          timestamp += frame.durationMs
        }
        encoder.assemble(timestamp, Uri.fromFile(outFile))
      } finally {
        encoder.release()
        tempScaled?.forEach { if (!it.isRecycled) it.recycle() }
      }

      if (outFile.exists()) {
        lastSizeBytes = outFile.length()
        if (lastSizeBytes in 1L..MAX_ANIMATED_BYTES) {
          return
        }
      }
    }

    outFile.delete()
    throw IllegalStateException(
      "El sticker animado quedó en ${lastSizeBytes / 1024} KB y supera el límite de 500 KB de WhatsApp."
    )
  }

  private fun subsampleFrames(frames: List<EncodedFrame>, stride: Int): List<EncodedFrame> {
    if (frames.size <= 2) return frames
    val out = mutableListOf<EncodedFrame>()
    var pendingDelay = 0
    for (i in frames.indices) {
      pendingDelay += frames[i].durationMs
      if (i % stride == 0) {
        out.add(EncodedFrame(frames[i].bitmap, max(16, pendingDelay)))
        pendingDelay = 0
      }
    }
    if (pendingDelay > 0 && out.isNotEmpty()) {
      val last = out.removeAt(out.lastIndex)
      out.add(last.copy(durationMs = last.durationMs + pendingDelay))
    }
    return out
  }

  private fun fitToStickerCanvas(src: Bitmap, contentBox: Int = CANVAS_SIZE): Bitmap {
    val out = Bitmap.createBitmap(CANVAS_SIZE, CANVAS_SIZE, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    canvas.drawColor(Color.TRANSPARENT)

    val scale = min(
      contentBox.toFloat() / src.width.toFloat(),
      contentBox.toFloat() / src.height.toFloat()
    )
    val dstW = (src.width * scale).roundToInt().coerceAtLeast(1)
    val dstH = (src.height * scale).roundToInt().coerceAtLeast(1)
    val left = (CANVAS_SIZE - dstW) / 2f
    val top = (CANVAS_SIZE - dstH) / 2f

    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    val scaled = Bitmap.createScaledBitmap(src, dstW, dstH, true)
    canvas.drawBitmap(scaled, left, top, paint)
    if (scaled !== src) scaled.recycle()
    return out
  }

  private class SimpleGifBitmapProvider : GifDecoder.BitmapProvider {
    override fun obtain(width: Int, height: Int, config: Bitmap.Config): Bitmap =
      Bitmap.createBitmap(width, height, config)

    override fun release(bitmap: Bitmap) {
      if (!bitmap.isRecycled) bitmap.recycle()
    }

    override fun obtainByteArray(size: Int): ByteArray = ByteArray(size)
    override fun release(bytes: ByteArray) {}
    override fun obtainIntArray(size: Int): IntArray = IntArray(size)
    override fun release(array: IntArray) {}
  }
}
