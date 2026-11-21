package com.solatkini.app.service

import android.content.Context
import android.content.SharedPreferences
import com.solatkini.app.model.DiagnosticLogLevel
import com.solatkini.app.model.MusaLogEntry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MusaDiagnosticLogger(private val context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("solatkini_musalog_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_LOGS_JSON = "musalog_entries_json"
        private const val MAX_STORAGE_BYTES = 2L * 1024L * 1024L // Had siling 2 MB (F.I.F.O)
        private const val MAX_MEMORY_LOGS = 300

        fun formatBytes(bytes: Long): String {
            if (bytes <= 0L) return "0 KB"
            val mb = bytes.toDouble() / (1024.0 * 1024.0)
            return if (mb >= 1.0) {
                String.format(Locale.US, "%.2f MB", mb)
            } else {
                String.format(Locale.US, "%.1f KB", bytes.toDouble() / 1024.0)
            }
        }
    }

    private val _logs = MutableStateFlow<List<MusaLogEntry>>(emptyList())
    val logs: StateFlow<List<MusaLogEntry>> = _logs.asStateFlow()

    private val _totalBytesUsed = MutableStateFlow(0L)
    val totalBytesUsed: StateFlow<Long> = _totalBytesUsed.asStateFlow()

    init {
        reloadLogs()
    }

    fun reloadLogs() {
        val raw = prefs.getString(KEY_LOGS_JSON, null)
        if (raw.isNullOrBlank()) {
            _logs.value = emptyList()
            _totalBytesUsed.value = 0L
            return
        }

        try {
            val arr = JSONArray(raw)
            val parsed = mutableListOf<MusaLogEntry>()
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val levelStr = obj.optString("level", "WARN").uppercase(Locale.US)
                val level = when (levelStr) {
                    "CRITICAL" -> DiagnosticLogLevel.CRITICAL
                    "ERROR" -> DiagnosticLogLevel.ERROR
                    else -> DiagnosticLogLevel.WARN
                }
                parsed.add(
                    MusaLogEntry(
                        id = obj.optLong("id", System.currentTimeMillis() + i),
                        date = obj.optString("date", ""),
                        time = obj.optString("time", ""),
                        level = level,
                        message = obj.optString("message", ""),
                        stackTrace = obj.optString("stackTrace", "").ifBlank { null }
                    )
                )
            }
            val latestFirst = parsed.take(MAX_MEMORY_LOGS)
            _logs.value = latestFirst
            _totalBytesUsed.value = computeByteSize(latestFirst)
        } catch (_: Exception) {
            _logs.value = emptyList()
            _totalBytesUsed.value = 0L
        }
    }

    fun recordLog(
        level: DiagnosticLogLevel,
        message: String,
        stackTrace: String? = null,
        now: Date = Date()
    ) {
        val dateStr = SimpleDateFormat("dd/MM/yyyy", Locale("en", "GB")).format(now)
        val timeStr = SimpleDateFormat("HH:mm:ss", Locale("en", "GB")).format(now)

        val formattedMsg = when (level) {
            DiagnosticLogLevel.CRITICAL ->
                if (Regex("azan|alarm|audio|penggera|sound|permission", RegexOption.IGNORE_CASE).containsMatchIn(message) &&
                    !message.startsWith("⚠️") && !message.startsWith("🚨")
                ) {
                    "⚠️ [ISU PENGGERA]: $message"
                } else {
                    message
                }
            DiagnosticLogLevel.WARN ->
                if (Regex("azan|alarm|audio|penggera|jadual|permission", RegexOption.IGNORE_CASE).containsMatchIn(message) &&
                    !message.startsWith("🔔")
                ) {
                    "🔔 [AMARAN AZAN]: $message"
                } else {
                    message
                }
            DiagnosticLogLevel.ERROR -> message
        }

        val entry = MusaLogEntry(
            id = now.time,
            date = dateStr,
            time = timeStr,
            level = level,
            message = formattedMsg,
            stackTrace = stackTrace
        )

        val fifoList = ArrayDeque<MusaLogEntry>(_logs.value.reversed())
        fifoList.addLast(entry)

        while (fifoList.size > 1 && computeByteSize(fifoList.toList()) > MAX_STORAGE_BYTES) {
            fifoList.removeFirst()
        }
        while (fifoList.size > MAX_MEMORY_LOGS) {
            fifoList.removeFirst()
        }

        val orderedDesc = fifoList.toList().reversed()
        persistLogs(orderedDesc)
        _logs.value = orderedDesc
        _totalBytesUsed.value = computeByteSize(orderedDesc)
    }

    fun triggerSelfTest() {
        recordLog(
            level = DiagnosticLogLevel.WARN,
            message = "🔔 [AMARAN AZAN]: Ujian Diagnostik: Pemantau sistem aktif & menapis amaran."
        )
        recordLog(
            level = DiagnosticLogLevel.ERROR,
            message = "⚠️ [ISU PENGGERA]: Gagal memainkan audio azan (Simulasi Ujian)."
        )
        recordLog(
            level = DiagnosticLogLevel.CRITICAL,
            message = "Simulasi Crash: Ralat runtime berjaya ditangkap oleh MusaDiagnosticLogger!",
            stackTrace = "at SelfTest (MusaDiagnosticLogger.kt:1)
    at triggerSelfTest (MusaDiagnosticLogger.kt:160)"
        )
    }

    fun clearAllLogs() {
        prefs.edit().remove(KEY_LOGS_JSON).apply()
        _logs.value = emptyList()
        _totalBytesUsed.value = 0L
    }

    fun buildExportText(currentLogs: List<MusaLogEntry> = _logs.value): String {
        val nowFormatted = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale("en", "GB")).format(Date())
        val bytesUsed = computeByteSize(currentLogs)
        val header = listOf(
            "=====================================================",
            " MUSA LOG REPORT - SOLATKINI MALAYSIA (KOTLIN)",
            " Tarikh Eksport: $nowFormatted",
            " Jumlah Rekod : ${currentLogs.size} entri",
            " Saiz Storan   : ${formatBytes(bytesUsed)} / 2.00 MB",
            "=====================================================
"
        ).joinToString("
")

        val body = currentLogs.joinToString("
-----------------------------------------------------
") { l ->
            val stackPart = if (!l.stackTrace.isNullOrBlank()) "
Stack Trace:
${l.stackTrace}" else ""
            "[${l.date} ${l.time}] [${l.level.name}]
${l.message}$stackPart"
        }
        return header + body
    }

    fun writeExportFileToCache(currentLogs: List<MusaLogEntry> = _logs.value): File {
        val exportDir = File(context.cacheDir, "diagnostics").apply { mkdirs() }
        val stamp = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", Locale.US).format(Date())
        val file = File(exportDir, "MusaLog_SolatKini_$stamp.txt")
        file.writeText(buildExportText(currentLogs), Charsets.UTF_8)
        return file
    }

    private fun computeByteSize(items: List<MusaLogEntry>): Long {
        if (items.isEmpty()) return 0L
        return serializeToJsonArray(items).toString().toByteArray(Charsets.UTF_8).size.toLong()
    }

    private fun serializeToJsonArray(items: List<MusaLogEntry>): JSONArray {
        val arr = JSONArray()
        for (l in items) {
            arr.put(
                JSONObject().apply {
                    put("id", l.id)
                    put("date", l.date)
                    put("time", l.time)
                    put("level", l.level.name)
                    put("message", l.message)
                    put("stackTrace", l.stackTrace ?: "")
                }
            )
        }
        return arr
    }

    private fun persistLogs(items: List<MusaLogEntry>) {
        prefs.edit().putString(KEY_LOGS_JSON, serializeToJsonArray(items).toString()).apply()
    }
}
