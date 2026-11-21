package com.solatkini.app.ui.screens

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.Bell
import androidx.compose.material.icons.filled.BellOff
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.solatkini.app.data.JakimZonesData
import com.solatkini.app.data.PrayerRepository
import com.solatkini.app.data.ThemeAndLocaleData
import com.solatkini.app.data.UiStringKey
import com.solatkini.app.data.WiridDoaData
import com.solatkini.app.domain.NextPrayerEngine
import com.solatkini.app.domain.PrayerCalculator
import com.solatkini.app.domain.QiblaCalculator
import com.solatkini.app.model.ActiveTab
import com.solatkini.app.model.AppLanguage
import com.solatkini.app.model.AppThemeId
import com.solatkini.app.model.AppUpdateInfo
import com.solatkini.app.model.AzanLogEntry
import com.solatkini.app.model.AzanLogStatus
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.DuaCategory
import com.solatkini.app.model.DuaItem
import com.solatkini.app.model.FardPrayerKey
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.model.ReadingFontSize
import com.solatkini.app.service.AzanAlarmScheduler
import com.solatkini.app.service.AzanAudioManager
import com.solatkini.app.ui.SolatKiniUiState
import com.solatkini.app.ui.theme.SolatKiniPalette
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun OnboardingScreen(
    palette: SolatKiniPalette,
    notificationsGranted: Boolean,
    locationGranted: Boolean,
    batteryIgnored: Boolean,
    onRequestNotification: () -> Unit,
    onRequestLocation: () -> Unit,
    onOpenBatteryModal: () -> Unit,
    onCompleteOnboarding: () -> Unit
) {
    val allReady = notificationsGranted && locationGranted

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.backgroundCanvas),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(palette.primary.copy(alpha = 0.16f))
                        .border(1.dp, palette.primary.copy(alpha = 0.4f), RoundedCornerShape(22.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.NightsStay,
                        contentDescription = null,
                        tint = palette.primary,
                        modifier = Modifier.size(34.dp)
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Selamat Datang ke SolatKini",
                    color = palette.textPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Sila aktifkan 3 tetapan penting ini agar laungan azan dan jadual waktu solat beroperasi dengan lancar.",
                    color = palette.textSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        // 1. Notifikasi
        item {
            PermissionStepCard(
                palette = palette,
                title = "Notifikasi & Laungan Azan",
                badge = "Wajib",
                description = "Memastikan penggera azan berbunyi tepat dan status waktu solat dipaparkan pada bar telefon.",
                isActive = notificationsGranted,
                activeText = "Aktif",
                actionText = "Benarkan",
                icon = Icons.Default.Bell,
                onAction = onRequestNotification
            )
        }

        // 2. Lokasi GPS
        item {
            PermissionStepCard(
                palette = palette,
                title = "Pengesanan Lokasi (GPS)",
                badge = "Disyorkan",
                description = "Menyelaraskan zon solat rasmi JAKIM mengikut koordinat semasa anda secara automatik.",
                isActive = locationGranted,
                activeText = "Aktif",
                actionText = "Aktifkan",
                icon = Icons.Default.LocationOn,
                onAction = onRequestLocation
            )
        }

        // 3. Bateri & Autostart
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (batteryIgnored) palette.surfaceCardAlt else Color(0xFF211708)
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        1.dp,
                        if (batteryIgnored) palette.primary.copy(alpha = 0.45f) else palette.goldAccent.copy(alpha = 0.4f),
                        RoundedCornerShape(20.dp)
                    )
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(
                                imageVector = Icons.Default.BatteryChargingFull,
                                contentDescription = null,
                                tint = if (batteryIgnored) palette.primary else palette.goldAccent
                            )
                            Text(
                                text = "Sekatan Bateri & Autostart",
                                color = palette.textPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                        if (batteryIgnored) {
                            Text(
                                text = "Bebas Sekatan",
                                color = palette.primary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                    Text(
                        text = "Pengguna Xiaomi, Vivo, Oppo, Realme atau Samsung wajib mematikan sekatan bateri agar peranti tidak membekukan azan semasa skrin ditutup.",
                        color = palette.textSecondary,
                        fontSize = 12.sp
                    )
                    OutlinedButton(
                        onClick = onOpenBatteryModal,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Buka Menu Kebenaran Bateri", color = palette.goldAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(6.dp))
            Button(
                onClick = onCompleteOnboarding,
                colors = ButtonDefaults.buttonColors(containerColor = palette.primary),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text(
                    text = if (allReady) "Sedia! Mula Guna SolatKini" else "Teruskan ke Aplikasi",
                    color = Color(0xFF04100B),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFF04100B))
            }
        }
    }
}

@Composable
private fun PermissionStepCard(
    palette: SolatKiniPalette,
    title: String,
    badge: String,
    description: String,
    isActive: Boolean,
    activeText: String,
    actionText: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onAction: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (isActive) palette.primary.copy(alpha = 0.5f) else palette.borderSubtle,
                RoundedCornerShape(20.dp)
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f).padding(end = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(icon, contentDescription = null, tint = palette.primary, modifier = Modifier.size(20.dp))
                    Text(title, color = palette.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(
                        text = badge,
                        color = palette.primaryLight,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(palette.primary.copy(alpha = 0.16f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Text(description, color = palette.textSecondary, fontSize = 12.sp)
            }

            if (isActive) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = palette.primary, modifier = Modifier.size(18.dp))
                    Text(activeText, color = palette.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            } else {
                Button(
                    onClick = onAction,
                    colors = ButtonDefaults.buttonColors(containerColor = palette.primaryDark),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(actionText, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PrayerDashboardScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette,
    onOpenZoneModal: () -> Unit,
    onDetectGps: () -> Unit,
    onClearLocationError: () -> Unit,
    onLiveSync: () -> Unit,
    onOpenDateSettings: () -> Unit,
    onRequestNotifPerm: () -> Unit,
    onOpenNotifSettings: () -> Unit,
    onRefreshSystemStatus: () -> Unit,
    onToggleUserFasting: () -> Unit,
    onTriggerTestAlarm: (PrayerKey, String, AzanVoice) -> Unit,
    onOpenAudioSettings: () -> Unit,
    onOpenDndGuide: () -> Unit,
    onTogglePrayerDone: (FardPrayerKey) -> Unit,
    onResetChecklist: () -> Unit,
    onTogglePrayerNotif: (PrayerKey) -> Unit
) {
    val prayerTimes = uiState.prayerTimes ?: return
    val nextPrayer = uiState.nextPrayerInfo ?: NextPrayerEngine.determineNextPrayer(prayerTimes, uiState.currentTime)
    val hijri = uiState.hijri ?: HijriCalendarEngine.getHijriDate(uiState.currentTime, uiState.hijriAdjustment)
    val isFastingActive = hijri.isRamadan || uiState.isUserFastingToday
    val fastingCd = uiState.fastingCountdown ?: NextPrayerEngine.getFastingCountdown(
        prayerTimes = prayerTimes,
        currentTime = uiState.currentTime,
        isRamadan = hijri.isRamadan,
        isUserFasting = uiState.isUserFastingToday
    )

    val currentMins = NextPrayerEngine.toMinutes(
        SimpleDateFormat("HH:mm", Locale.US).format(uiState.currentTime)
    )
    val subuhMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.SUBUH))
    val syurukMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.SYURUK))
    val zohorMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.ZOHOR))
    val asarMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.ASAR))
    val maghribMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.MAGHRIB))
    val isyakMins = NextPrayerEngine.toMinutes(prayerTimes.timeFor(PrayerKey.ISYAK))

    val completedFardCount = FardPrayerKey.ORDERED.count { uiState.prayerChecklist[it] == true }
    val fardPercentage = ((completedFardCount / 5.0) * 100.0).toInt()
    var confirmResetChecklist by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Header & Zon JAKIM
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            val statusColor = if (!uiState.isOnline || uiState.isOfflineCalculated) palette.goldAccent else palette.primary
                            val statusText = when {
                                !uiState.isOnline && uiState.isOfflineCalculated -> "Falak Luar Talian"
                                !uiState.isOnline -> "Luar Talian (Data Tersimpan)"
                                uiState.isOfflineCalculated -> "Kiraan Falak Tempatan"
                                else -> "e-Solat JAKIM Online"
                            }
                            if (!uiState.isOnline) {
                                Icon(Icons.Default.WifiOff, contentDescription = null, tint = statusColor, modifier = Modifier.size(14.dp))
                            } else {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(statusColor))
                            }
                            Text(statusText, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            if (uiState.lastSyncTime.isNotBlank()) {
                                Text(
                                    text = "dikemas kini ${uiState.lastSyncTime}",
                                    color = palette.textSecondary,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }

                        IconButton(onClick = onLiveSync, enabled = !uiState.isLiveSyncing) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Segerak",
                                tint = palette.primary
                            )
                        }
                    }

                    Text(
                        text = "SolatKini Malaysia",
                        color = palette.textPrimary,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

                    val gregorianStr = SimpleDateFormat("EEEE, d MMMM yyyy", Locale("ms", "MY")).format(uiState.currentTime)
                    Text(
                        text = "${hijri.formatted} · $gregorianStr",
                        color = palette.textSecondary,
                        fontSize = 13.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(palette.surfaceCardAlt)
                                .border(1.dp, palette.primary.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
                                .clickable { onOpenZoneModal() }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = palette.primary, modifier = Modifier.size(18.dp))
                                Column {
                                    Text(uiState.currentZone.code, color = palette.primary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                                    Text(
                                        text = uiState.currentZone.shortDaerah,
                                        color = palette.textPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = palette.primary)
                        }

                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(palette.surfaceCardAlt)
                                .border(1.dp, palette.borderSubtle, RoundedCornerShape(16.dp))
                                .clickable(enabled = !uiState.isLocating) { onDetectGps() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Explore,
                                contentDescription = "Kesan GPS",
                                tint = palette.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    uiState.locationError?.let { locErr ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color(0xFF2B1806))
                                .border(1.dp, palette.goldAccent.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(18.dp))
                                Text(locErr.message, color = palette.goldAccent, fontSize = 12.sp)
                            }
                            IconButton(onClick = onClearLocationError) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = palette.textSecondary)
                            }
                        }
                    }
                }
            }
        }

        // 2. Amaran Masa Automatik & Kebenaran Notifikasi
        if (!uiState.isAutoTimeEnabled) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF2B0E14)),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFFF43F5E).copy(alpha = 0.6f), RoundedCornerShape(20.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Masa Automatik Telefon Dimatikan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(
                            "Sekiranya jam telefon dianjak secara manual, jadual waktu solat dan laungan azan mungkin tidak tepat.",
                            color = palette.textSecondary,
                            fontSize = 12.sp
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onOpenDateSettings,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Buka Tetapan Tarikh & Masa", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            OutlinedButton(onClick = onRefreshSystemStatus, shape = RoundedCornerShape(12.dp)) {
                                Text("Semak Semula", color = palette.textPrimary, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        if (!uiState.notificationsGranted) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF261A08)),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, palette.goldAccent.copy(alpha = 0.6f), RoundedCornerShape(20.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Kebenaran Notifikasi Belum Diaktifkan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(
                            "Sila benarkan notifikasi sistem Android agar laungan azan dan penggera dapat berbunyi.",
                            color = palette.textSecondary,
                            fontSize = 12.sp
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onRequestNotifPerm,
                                colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Minta Kebenaran", color = Color(0xFF140D02), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            OutlinedButton(onClick = onOpenNotifSettings, shape = RoundedCornerShape(12.dp)) {
                                Text("Tetapan Notifikasi", color = palette.textPrimary, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        // 3. Kad Hero Waktu Solat Seterusnya
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCardAlt),
                shape = RoundedCornerShape(26.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, palette.primary.copy(alpha = 0.35f), RoundedCornerShape(26.dp))
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(palette.primary.copy(alpha = 0.16f))
                            .border(1.dp, palette.primary.copy(alpha = 0.35f), RoundedCornerShape(999.dp))
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = palette.primaryLight, modifier = Modifier.size(14.dp))
                        Text(
                            text = "Solat Seterusnya: ${nextPrayer.nextLabel}",
                            color = palette.primaryLight,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = nextPrayer.countdownFormatted,
                        color = Color.White,
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )

                    Text(
                        text = "Waktu masuk pada ${nextPrayer.nextDisplayTime} (${uiState.currentZone.daerah})",
                        color = palette.textSecondary,
                        fontSize = 13.sp
                    )

                    if (isFastingActive) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(palette.surfaceCard)
                                .border(1.dp, palette.primary.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${fastingCd.title}: ${fastingCd.remainingFormatted} (Berbuka: ${PrayerCalculator.formatDisplayTime(prayerTimes.timeFor(PrayerKey.MAGHRIB))})",
                                color = palette.primaryLight,
                                fontSize = 12.sp,
                                modifier = Modifier.weight(1f)
                            )
                            if (!hijri.isRamadan) {
                                Text(
                                    text = "Batal Puasa",
                                    color = palette.goldAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.clickable { onToggleUserFasting() }.padding(start = 8.dp)
                                )
                            }
                        }
                    } else if (uiState.recommendation?.isRecommended == true) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF241706))
                                .border(1.dp, palette.goldAccent.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${uiState.recommendation.type}: ${uiState.recommendation.description}",
                                color = palette.goldAccent,
                                fontSize = 12.sp,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "Saya Berpuasa",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(palette.goldAccent.copy(alpha = 0.25f))
                                    .clickable { onToggleUserFasting() }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val voice = if (nextPrayer.nextKey == PrayerKey.SUBUH && uiState.selectedVoice == AzanVoice.JAKIM) {
                                    AzanVoice.SUBUH_SPECIAL
                                } else {
                                    uiState.selectedVoice
                                }
                                onTriggerTestAlarm(nextPrayer.nextKey, nextPrayer.nextLabel, voice)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = palette.primary),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.VolumeUp, contentDescription = null, tint = Color(0xFF04100B), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Uji Azan", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }

                        OutlinedButton(
                            onClick = onOpenAudioSettings,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Tune, contentDescription = null, tint = palette.primary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Muadzin", color = palette.textPrimary, fontSize = 12.sp, maxLines = 1)
                        }
                    }

                    Text(
                        text = "Bypass Silent / DND Tetapan",
                        color = palette.goldAccent,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .clickable { onOpenDndGuide() }
                            .padding(vertical = 2.dp)
                    )
                }
            }
        }

        // 4. Checklist Solat Fardu Harian
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, palette.primary.copy(alpha = 0.3f), RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Checklist Solat Fardu Harian · $completedFardCount/5 ($fardPercentage%)",
                                color = palette.textPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "Tandakan 5 solat fardu yang telah disempurnakan hari ini.",
                                color = palette.textSecondary,
                                fontSize = 12.sp
                            )
                        }
                        if (completedFardCount > 0) {
                            Text(
                                text = if (confirmResetChecklist) "Sahkan?" else "Set Semula",
                                color = if (confirmResetChecklist) Color(0xFFF43F5E) else palette.textSecondary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    if (!confirmResetChecklist) {
                                        confirmResetChecklist = true
                                    } else {
                                        confirmResetChecklist = false
                                        onResetChecklist()
                                    }
                                }
                            )
                        }
                    }

                    LinearProgressIndicator(
                        progress = { fardPercentage / 100f },
                        color = palette.primary,
                        trackColor = palette.surfaceCardAlt,
                        modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape)
                    )

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        for (fard in FardPrayerKey.ORDERED) {
                            val isDone = uiState.prayerChecklist[fard] == true
                            val label = ThemeAndLocaleData.prayerLabel(fard.prayerKey, uiState.language)
                            val timeDisp = PrayerCalculator.formatDisplayTime(prayerTimes.timeFor(fard.prayerKey))
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (isDone) palette.surfaceCardAlt else palette.backgroundCanvas)
                                    .border(
                                        1.dp,
                                        if (isDone) palette.primary else palette.borderSubtle,
                                        RoundedCornerShape(16.dp)
                                    )
                                    .clickable { onTogglePrayerDone(fard) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Column {
                                    Text(label, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    Text(timeDisp, color = palette.textSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                                }
                                Box(
                                    modifier = Modifier
                                        .size(22.dp)
                                        .clip(CircleShape)
                                        .background(if (isDone) palette.primary else Color.Transparent)
                                        .border(1.5.dp, if (isDone) palette.primary else palette.textSecondary, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isDone) {
                                        Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF04100B), modifier = Modifier.size(14.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Senarai 7 Waktu Solat Hari Ini
        item {
            Text(
                text = "Jadual Waktu Solat Hari Ini (${uiState.currentZone.code})",
                color = palette.textPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }

        items(PrayerKey.ALL_ORDERED) { key ->
            val time24 = prayerTimes.timeFor(key)
            val displayTime = PrayerCalculator.formatDisplayTime(time24)
            val label = ThemeAndLocaleData.prayerLabel(key, uiState.language)
            val isNext = nextPrayer.nextKey == key
            val isCurrent = !isNext && when (key) {
                PrayerKey.SUBUH -> currentMins in subuhMins until syurukMins
                PrayerKey.ZOHOR -> currentMins in zohorMins until asarMins
                PrayerKey.ASAR -> currentMins in asarMins until maghribMins
                PrayerKey.MAGHRIB -> currentMins in maghribMins until isyakMins
                PrayerKey.ISYAK -> currentMins >= isyakMins || currentMins < subuhMins
                else -> false
            }
            val isAlertEnabled = uiState.notificationSettings.preferences[key]?.enabled == true
            val fardKey = FardPrayerKey.fromRaw(key.rawKey)
            val isFardDone = fardKey?.let { uiState.prayerChecklist[it] == true } ?: false

            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isNext || isCurrent) palette.surfaceCardAlt else palette.surfaceCard
                ),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        1.dp,
                        if (isNext || isCurrent) palette.primary else palette.borderSubtle,
                        RoundedCornerShape(20.dp)
                    )
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(label, color = palette.textPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            if (key == PrayerKey.IMSAK || key == PrayerKey.MAGHRIB) {
                                Text(
                                    text = if (key == PrayerKey.IMSAK) "Imsak" else "Berbuka",
                                    color = palette.goldAccent,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(palette.goldAccent.copy(alpha = 0.18f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            if (isNext || isCurrent) {
                                Text(
                                    text = if (isNext) "SETERUSNYA" else "SEDANG MASUK",
                                    color = palette.primaryLight,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(999.dp))
                                        .background(palette.primary.copy(alpha = 0.2f))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }

                        IconButton(onClick = { onTogglePrayerNotif(key) }) {
                            Icon(
                                imageVector = if (isAlertEnabled) Icons.Default.Bell else Icons.Default.BellOff,
                                contentDescription = null,
                                tint = if (isAlertEnabled) palette.primary else palette.textSecondary
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = displayTime,
                            color = Color.White,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = "$time24 (24 Jam)",
                            color = palette.textSecondary,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    if (fardKey != null) {
                        OutlinedButton(
                            onClick = { onTogglePrayerDone(fardKey) },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = if (isFardDone) palette.primary else palette.textSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isFardDone) "Telah Solat" else "Tanda Selesai",
                                color = if (isFardDone) palette.primaryLight else palette.textSecondary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QiblaCompassScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette
) {
    val context = LocalContext.current
    val fallbackLat = uiState.currentZone.lat
    val fallbackLng = uiState.currentZone.lng
    val qiblaAngle = remember(fallbackLat, fallbackLng) {
        QiblaCalculator.calculateQiblaDirection(fallbackLat, fallbackLng)
    }

    var deviceHeading by remember { mutableFloatStateOf(0f) }
    var sensorAccuracy by remember { mutableStateOf("medium") }

    DisposableEffect(context) {
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val rotationSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        val listener = object : SensorEventListener {
            private val rotMatrix = FloatArray(9)
            private val orientation = FloatArray(3)
            private var samples = 0

            override fun onSensorChanged(event: SensorEvent?) {
                if (event?.sensor?.type == Sensor.TYPE_ROTATION_VECTOR) {
                    SensorManager.getRotationMatrixFromVector(rotMatrix, event.values)
                    SensorManager.getOrientation(rotMatrix, orientation)
                    val azimuthDeg = ((Math.toDegrees(orientation[0].toDouble()) + 360.0) % 360.0).toFloat()
                    val diff = QiblaCalculator.shortestAngleDiffDeg(azimuthDeg.toDouble(), deviceHeading.toDouble())
                    deviceHeading = ((deviceHeading + diff * 0.16) + 360.0).toFloat() % 360f
                    samples++
                    if (samples > 12) {
                        sensorAccuracy = "high"
                    }
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
                sensorAccuracy = when (accuracy) {
                    SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "high"
                    SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "medium"
                    else -> "unreliable"
                }
            }
        }

        if (sensorManager != null && rotationSensor != null) {
            sensorManager.registerListener(listener, rotationSensor, SensorManager.SENSOR_DELAY_UI)
        }

        onDispose {
            sensorManager?.unregisterListener(listener)
        }
    }

    val relAngle = QiblaCalculator.relativeBearingFromDevice(qiblaAngle, deviceHeading.toDouble())
    val isAligned = abs(relAngle) <= 3.0

    LaunchedEffect(isAligned) {
        if (isAligned) {
            try {
                val pattern = longArrayOf(0L, 40L, 60L, 40L)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    val vib = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    vib?.vibrate(pattern, -1)
                }
            } catch (_: Exception) {
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            val accColor = when (sensorAccuracy) {
                "high" -> palette.primary
                "medium" -> palette.goldAccent
                else -> Color(0xFFF43F5E)
            }
            val accLabel = when (sensorAccuracy) {
                "high" -> "Sensor Stabil & Tepat"
                "medium" -> "Sensor Sedang Menyelaras"
                else -> "Perlu Kalibrasi Angka 8"
            }
            Row(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(palette.surfaceCard)
                    .border(1.dp, palette.borderSubtle, CircleShape)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(accColor))
                Text(accLabel, color = palette.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Text("Kompas Arah Kiblat", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            Text(
                text = "Zon ${uiState.currentZone.shortDaerah} (${uiState.currentZone.code}) · Kiblat: ${String.format(Locale.US, "%.1f°", qiblaAngle)}",
                color = palette.textSecondary,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        Box(
            modifier = Modifier
                .size(270.dp)
                .clip(CircleShape)
                .background(palette.surfaceCard)
                .border(2.dp, if (isAligned) palette.primary else palette.borderSubtle, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize().rotate(-deviceHeading)) {
                val radius = size.minDimension / 2f - 18f
                val center = Offset(size.width / 2f, size.height / 2f)
                drawCircle(
                    color = Color.White.copy(alpha = 0.15f),
                    radius = radius,
                    center = center,
                    style = Stroke(width = 2f)
                )

                for (deg in 0 until 360 step 30) {
                    val rad = Math.toRadians(deg.toDouble() - 90.0)
                    val tickLen = if (deg % 90 == 0) 14f else 7f
                    val start = Offset(
                        center.x + (radius - tickLen) * cos(rad).toFloat(),
                        center.y + (radius - tickLen) * sin(rad).toFloat()
                    )
                    val end = Offset(
                        center.x + radius * cos(rad).toFloat(),
                        center.y + radius * sin(rad).toFloat()
                    )
                    drawLine(
                        color = if (deg == 0) Color(0xFFF43F5E) else Color.White.copy(alpha = 0.55f),
                        start = start,
                        end = end,
                        strokeWidth = if (deg % 90 == 0) 3f else 1.5f,
                        cap = StrokeCap.Round
                    )
                }

                val qiblaRad = Math.toRadians(qiblaAngle - 90.0)
                val tip = Offset(
                    center.x + (radius - 22f) * cos(qiblaRad).toFloat(),
                    center.y + (radius - 22f) * sin(qiblaRad).toFloat()
                )
                drawLine(
                    color = Color(0xFFF59E0B),
                    start = center,
                    end = tip,
                    strokeWidth = 5f,
                    cap = StrokeCap.Round
                )
            }

            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(if (isAligned) palette.primary else Color(0xFFF59E0B))
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = if (isAligned) palette.surfaceCardAlt else palette.surfaceCard),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    if (isAligned) {
                        Text("Kiblat Tepat!", color = palette.primary, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                        Text("Peranti anda kini menghadap ke arah Baitullah Al-Haram, Makkah.", color = palette.textSecondary, fontSize = 12.sp)
                    } else {
                        val dirText = if (relAngle > 0) "${abs(relAngle.toInt())}° ke Kanan" else "${abs(relAngle.toInt())}° ke Kiri"
                        Text("Pusing telefon anda $dirText", color = palette.goldAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(
                            "Hadap: ${deviceHeading.toInt()}° · Kiblat: ${qiblaAngle.toInt()}°",
                            color = palette.textSecondary,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            Text(
                text = "Jauhkan telefon daripada magnet atau logam. Hayunkan peranti membentuk angka 8 di udara jika perlu kalibrasi.",
                color = palette.textSecondary,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun FastingTrackerScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette,
    onAdjustHijri: (Int) -> Unit,
    onToggleUserFasting: () -> Unit,
    onUpdateGantiTarget: (Int) -> Unit,
    onIncrementGanti: () -> Unit,
    onDecrementGanti: () -> Unit,
    onResetGanti: () -> Unit,
    onUpdateSunnah: (String, Int) -> Unit,
    onToggleRamadanDay: (Int) -> Unit,
    onMarkPastRamadan: (Int) -> Unit,
    onResetRamadan: () -> Unit,
    onCopyText: (String) -> Unit
) {
    val times = uiState.prayerTimes ?: return
    val hijri = uiState.hijri ?: return
    val ramadan = uiState.ramadanInfo ?: return
    val isFastingActive = hijri.isRamadan || uiState.isUserFastingToday
    val fastingCd = uiState.fastingCountdown ?: NextPrayerEngine.getFastingCountdown(
        times, uiState.currentTime, hijri.isRamadan, uiState.isUserFastingToday
    )

    var chartTab by remember(hijri.isRamadan) {
        mutableStateOf(if (hijri.isRamadan) "ramadan" else "sunnah")
    }
    var confirmResetRamadan by remember { mutableStateOf(false) }
    var confirmResetGanti by remember { mutableStateOf(false) }

    val ramadanPct = ((uiState.ramadanCompletedDays.size / 30.0) * 100.0).toInt()
    val totalSunnah = uiState.sunnahCounts.isninKhamisCompleted +
        uiState.sunnahCounts.ayyamulBidhCompleted +
        uiState.gantiCompleted +
        uiState.sunnahCounts.otherSunnahCompleted
    val remainingGanti = (uiState.gantiTarget - uiState.gantiCompleted).coerceAtLeast(0)
    val estRamadanStr = SimpleDateFormat("d MMMM yyyy", Locale("ms", "MY")).format(Date(ramadan.estimatedRamadanStartEpoch))
    val doaPuasa = remember { WiridDoaData.DUA_COLLECTION.filter { it.category == DuaCategory.PUASA } }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Banner Imsak & Berbuka
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = if (isFastingActive) fastingCd.title else "Jadual Waktu Berbuka & Imsak",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Zon ${uiState.currentZone.code} (${uiState.currentZone.shortDaerah}) · ${hijri.formatted}",
                        color = palette.textSecondary,
                        fontSize = 12.sp
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color(0xFF241706))
                                .border(1.dp, palette.goldAccent.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Waktu Imsak", color = palette.goldAccent, fontSize = 11.sp)
                            Text(PrayerCalculator.formatDisplayTime(times.timeFor(PrayerKey.IMSAK)), color = palette.goldAccent, fontSize = 20.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(palette.surfaceCardAlt)
                                .border(1.dp, palette.primary.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Waktu Berbuka", color = palette.primaryLight, fontSize = 11.sp)
                            Text(PrayerCalculator.formatDisplayTime(times.timeFor(PrayerKey.MAGHRIB)), color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        }
                    }

                    // Pelarasan Takwim Hijrah
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val adjLabel = if (uiState.hijriAdjustment == 0) "" else " (${if (uiState.hijriAdjustment > 0) "+${uiState.hijriAdjustment}" else uiState.hijriAdjustment}h)"
                        Text("Takwim: ${hijri.formatted}$adjLabel", color = palette.textSecondary, fontSize = 11.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedButton(onClick = { onAdjustHijri(-1) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                                Text("-1h", fontSize = 11.sp)
                            }
                            OutlinedButton(onClick = { onAdjustHijri(0) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                                Text("Auto", fontSize = 11.sp)
                            }
                            OutlinedButton(onClick = { onAdjustHijri(1) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                                Text("+1h", fontSize = 11.sp)
                            }
                        }
                    }

                    if (!hijri.isRamadan) {
                        Button(
                            onClick = onToggleUserFasting,
                            colors = ButtonDefaults.buttonColors(containerColor = if (uiState.isUserFastingToday) palette.goldAccent else palette.primary),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (uiState.isUserFastingToday) "Nyahaktifkan Mod Puasa Hari Ini" else "Saya Sedang Berpuasa Hari Ini",
                                color = Color(0xFF04100B),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }

                    if (isFastingActive) {
                        LinearProgressIndicator(
                            progress = { (fastingCd.percentage / 100f).coerceIn(0f, 1f) },
                            color = palette.primary,
                            trackColor = palette.surfaceCardAlt,
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape)
                        )
                        Text(fastingCd.remainingFormatted, color = palette.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Kemajuan Ramadan / Sunnah
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = chartTab == "sunnah",
                            onClick = { chartTab = "sunnah" },
                            label = { Text("Sunat & Qadha ($totalSunnah)", fontSize = 12.sp) }
                        )
                        FilterChip(
                            selected = chartTab == "ramadan",
                            onClick = { chartTab = "ramadan" },
                            label = { Text("Ramadan (${uiState.ramadanCompletedDays.size}/30)", fontSize = 12.sp) }
                        )
                    }

                    if (chartTab == "ramadan") {
                        if (!hijri.isRamadan) {
                            Text(
                                text = "${ramadan.daysUntilNextRamadan} Hari Lagi Menuju 1 Ramadan ${ramadan.nextRamadanHijriYear}H (Anggaran: $estRamadanStr)",
                                color = palette.goldAccent,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text("Kadar Kejayaan Ramadan ${ramadan.ramadanYearKey}H: $ramadanPct%", color = palette.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        LinearProgressIndicator(
                            progress = { (ramadanPct / 100f).coerceIn(0f, 1f) },
                            color = palette.primary,
                            trackColor = palette.surfaceCardAlt,
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape)
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (hijri.isRamadan) {
                                OutlinedButton(onClick = { onMarkPastRamadan(hijri.day) }) {
                                    Text("Tanda Hingga Hari ke-${hijri.day}", fontSize = 11.sp)
                                }
                            }
                            if (uiState.ramadanCompletedDays.isNotEmpty()) {
                                OutlinedButton(onClick = {
                                    if (!confirmResetRamadan) confirmResetRamadan = true
                                    else {
                                        confirmResetRamadan = false
                                        onResetRamadan()
                                    }
                                }) {
                                    Text(if (confirmResetRamadan) "Sahkan Reset?" else "Reset", fontSize = 11.sp, color = Color(0xFFF43F5E))
                                }
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            for (row in 0 until 5) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    for (col in 1..6) {
                                        val dayNum = row * 6 + col
                                        val isDone = uiState.ramadanCompletedDays.contains(dayNum)
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(36.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(if (isDone) palette.primaryDark else palette.surfaceCardAlt)
                                                .clickable { onToggleRamadanDay(dayNum) },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("$dayNum", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        SunnahCounterRow(palette, "Isnin & Khamis", "${uiState.sunnahCounts.isninKhamisCompleted} / ${uiState.sunnahCounts.isninKhamisTarget}", { onUpdateSunnah("isninKhamis", -1) }, { onUpdateSunnah("isninKhamis", 1) })
                        SunnahCounterRow(palette, "Ayyamul Bidh", "${uiState.sunnahCounts.ayyamulBidhCompleted} / ${uiState.sunnahCounts.ayyamulBidhTarget}", { onUpdateSunnah("ayyamulBidh", -1) }, { onUpdateSunnah("ayyamulBidh", 1) })
                        SunnahCounterRow(palette, "Puasa Qada'", "${uiState.gantiCompleted} / ${uiState.gantiTarget}", onDecrementGanti, onIncrementGanti)
                        SunnahCounterRow(palette, "Sunat Lain", "${uiState.sunnahCounts.otherSunnahCompleted} / ${uiState.sunnahCounts.otherSunnahTarget}", { onUpdateSunnah("otherSunnah", -1) }, { onUpdateSunnah("otherSunnah", 1) })
                    }
                }
            }
        }

        // Penjejak Puasa Ganti
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Penjejak Puasa Ganti (Qada')", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Sasaran:", color = palette.textSecondary, fontSize = 12.sp)
                            OutlinedButton(onClick = { onUpdateGantiTarget(-1) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) { Text("-") }
                            Text("${uiState.gantiTarget}", color = palette.goldAccent, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            OutlinedButton(onClick = { onUpdateGantiTarget(1) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) { Text("+") }
                        }
                    }

                    Text("${uiState.gantiCompleted} / ${uiState.gantiTarget} Hari Selesai · Baki: $remainingGanti hari", color = palette.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onIncrementGanti, colors = ButtonDefaults.buttonColors(containerColor = palette.primary), shape = RoundedCornerShape(14.dp)) {
                            Text("Tanda 1 Hari Selesai", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        if (uiState.gantiCompleted > 0) {
                            OutlinedButton(onClick = {
                                if (!confirmResetGanti) confirmResetGanti = true
                                else {
                                    confirmResetGanti = false
                                    onResetGanti()
                                }
                            }, shape = RoundedCornerShape(14.dp)) {
                                Text(if (confirmResetGanti) "Sahkan Reset?" else "Reset", fontSize = 12.sp, color = Color(0xFFF43F5E))
                            }
                        }
                    }
                }
            }
        }

        // Koleksi Niat & Doa Berbuka
        items(doaPuasa) { item ->
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(20.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(item.title, color = palette.goldAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        IconButton(onClick = { onCopyText("${item.title}

${item.arabic}

${item.translation}") }) {
                            Icon(Icons.Default.Share, contentDescription = null, tint = palette.textSecondary, modifier = Modifier.size(18.dp))
                        }
                    }
                    Text(item.arabic, color = palette.primaryLight, fontSize = 20.sp, textAlign = TextAlign.End, modifier = Modifier.fillMaxWidth())
                    Text(""${item.transliteration}"", color = palette.textPrimary, fontSize = 12.sp)
                    Text(item.translation, color = palette.textSecondary, fontSize = 12.sp)
                    item.reference?.let { Text("Rujukan: $it", color = palette.primary, fontSize = 11.sp) }
                }
            }
        }
    }
}

@Composable
private fun SunnahCounterRow(
    palette: SolatKiniPalette,
    label: String,
    valueText: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(palette.surfaceCardAlt)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(label, color = palette.textPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(valueText, color = palette.primary, fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onMinus, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) { Text("-") }
            Button(onClick = onPlus, colors = ButtonDefaults.buttonColors(containerColor = palette.primary), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)) {
                Text("+", color = Color(0xFF04100B), fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun TasbihWiridScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette,
    onSelectTasbih: (String, Int) -> Unit,
    onSetTasbihTarget: (Int) -> Unit,
    onIncrementTasbih: () -> Unit,
    onResetTasbihCount: () -> Unit,
    onResetTasbihAll: () -> Unit,
    onToggleTasbihSound: () -> Unit,
    onToggleTasbihFreeTouch: () -> Unit,
    onSetWiridFontSize: (ReadingFontSize) -> Unit,
    onToggleArabic: () -> Unit,
    onToggleRumi: () -> Unit,
    onToggleTranslation: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var section by remember { mutableStateOf("tasbih") }
    var confirmResetAll by remember { mutableStateOf(false) }

    val activeTasbih = remember(uiState.tasbihSelectedId) {
        WiridDoaData.TASBIH_LIST.find { it.id == uiState.tasbihSelectedId } ?: WiridDoaData.TASBIH_LIST.first()
    }
    val availableTargets = remember(activeTasbih.defaultTarget) {
        listOf(33, 99, 100, activeTasbih.defaultTarget, 0).filter { it >= 0 }.distinct().sortedWith { a, b ->
            when {
                a == 0 -> 1
                b == 0 -> -1
                else -> a.compareTo(b)
            }
        }
    }

    val tapAction: () -> Unit = {
        onIncrementTasbih()
        if (uiState.tasbihSoundEnabled) {
            scope.launch {
                try {
                    val tg = android.media.ToneGenerator(android.media.AudioManager.STREAM_SYSTEM, 60)
                    tg.startTone(android.media.ToneGenerator.TONE_PROP_BEEP, 45)
                    delay(60L)
                    tg.release()
                } catch (_: Exception) {
                }
            }
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(30L, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vib = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vib?.vibrate(30L)
            }
        } catch (_: Exception) {
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = section == "tasbih",
                    onClick = { section = "tasbih" },
                    label = { Text("Kaunter Tasbih Digital", fontWeight = FontWeight.Bold) }
                )
                FilterChip(
                    selected = section == "wirid",
                    onClick = { section = "wirid" },
                    label = { Text("Wirid Selepas Solat", fontWeight = FontWeight.Bold) }
                )
            }
        }

        if (section == "tasbih") {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
                        .clickable(enabled = uiState.tasbihFreeTouchEnabled) { tapAction() }
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Pilih Zikir / Tasbih:", color = palette.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.TouchApp, contentDescription = null, tint = palette.primary, modifier = Modifier.size(16.dp))
                                Text("Sentuhan Bebas", color = palette.textSecondary, fontSize = 11.sp)
                                Switch(
                                    checked = uiState.tasbihFreeTouchEnabled,
                                    onCheckedChange = { onToggleTasbihFreeTouch() }
                                )
                            }
                        }

                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(WiridDoaData.TASBIH_LIST) { preset ->
                                FilterChip(
                                    selected = preset.id == activeTasbih.id,
                                    onClick = { onSelectTasbih(preset.id, preset.defaultTarget) },
                                    label = { Text(preset.name, fontSize = 11.sp, maxLines = 1) }
                                )
                            }
                        }

                        Text(
                            text = activeTasbih.arabic,
                            color = palette.primaryLight,
                            fontSize = (22f * uiState.wiridFontSize.scaleMultiplier).sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = ""${activeTasbih.transliteration}"",
                            color = palette.textPrimary,
                            fontSize = (13f * uiState.wiridFontSize.scaleMultiplier).sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = activeTasbih.translation,
                            color = palette.textSecondary,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = "Fadilat: ${activeTasbih.fadilat}",
                            color = palette.goldAccent,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = palette.surfaceCardAlt),
                    shape = RoundedCornerShape(26.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, palette.primary.copy(alpha = 0.35f), RoundedCornerShape(26.dp))
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(availableTargets) { tVal ->
                                FilterChip(
                                    selected = uiState.tasbihTarget == tVal,
                                    onClick = { onSetTasbihTarget(tVal) },
                                    label = { Text(if (tVal == 0) "Bebas" else "${tVal}x", fontSize = 11.sp) }
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Pusingan: ${uiState.tasbihLaps}", color = palette.goldAccent, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            Text("·", color = palette.textSecondary)
                            Text("Sasaran: ${if (uiState.tasbihTarget == 0) "Bebas" else uiState.tasbihTarget}", color = palette.primary, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            IconButton(onClick = onToggleTasbihSound) {
                                Icon(
                                    imageVector = if (uiState.tasbihSoundEnabled) Icons.Default.VolumeUp else Icons.Default.BellOff,
                                    contentDescription = null,
                                    tint = palette.primary
                                )
                            }
                            OutlinedButton(onClick = {
                                if (!confirmResetAll) confirmResetAll = true
                                else {
                                    confirmResetAll = false
                                    onResetTasbihAll()
                                }
                            }) {
                                Text(if (confirmResetAll) "Sahkan?" else "Reset", fontSize = 11.sp, color = Color(0xFFF43F5E))
                            }
                        }

                        Box(
                            modifier = Modifier
                                .size(210.dp)
                                .clip(CircleShape)
                                .background(palette.surfaceCard)
                                .border(4.dp, palette.primary.copy(alpha = 0.55f), CircleShape)
                                .clickable { tapAction() },
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("KETIK DI SINI", color = palette.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "${uiState.tasbihCount}",
                                    color = Color.White,
                                    fontSize = 54.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = if (uiState.tasbihTarget > 0) "Baki: ${(uiState.tasbihTarget - uiState.tasbihCount).coerceAtLeast(0)}" else "Jumlah Zikir",
                                    color = palette.textSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        OutlinedButton(onClick = onResetTasbihCount) {
                            Text("Reset Kiraan Semasa ke 0", fontSize = 12.sp)
                        }
                    }
                }
            }
        } else {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            for (sz in ReadingFontSize.entries) {
                                FilterChip(
                                    selected = uiState.wiridFontSize == sz,
                                    onClick = { onSetWiridFontSize(sz) },
                                    label = { Text(sz.badgeLabel, fontSize = 11.sp) }
                                )
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = uiState.showArabic, onClick = onToggleArabic, label = { Text("Jawi", fontSize = 11.sp) })
                            FilterChip(selected = uiState.showRumi, onClick = onToggleRumi, label = { Text("Rumi", fontSize = 11.sp) })
                            FilterChip(selected = uiState.showTranslation, onClick = onToggleTranslation, label = { Text("Maksud", fontSize = 11.sp) })
                        }
                    }
                }
            }

            items(WiridDoaData.WIRID_LIST) { item ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(20.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("${item.order}. ${item.title}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("${item.targetCount}x", color = palette.goldAccent, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                        if (uiState.showArabic) {
                            Text(
                                text = item.arabic,
                                color = palette.primaryLight,
                                fontSize = (20f * uiState.wiridFontSize.scaleMultiplier).sp,
                                textAlign = TextAlign.End,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (uiState.showRumi) {
                            Text(""${item.transliteration}"", color = palette.textPrimary, fontSize = (12.5f * uiState.wiridFontSize.scaleMultiplier).sp)
                        }
                        if (uiState.showTranslation) {
                            Text(item.translation, color = palette.textSecondary, fontSize = (12f * uiState.wiridFontSize.scaleMultiplier).sp)
                        }
                        item.fadilat?.let { Text("Fadilat: $it", color = palette.primary, fontSize = 11.sp) }
                        item.note?.let { Text(it, color = palette.goldAccent, fontSize = 11.sp) }
                    }
                }
            }
        }
    }
}

@Composable
fun DuaCollectionScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette,
    onToggleBookmark: (String) -> Unit,
    onSetFontSize: (ReadingFontSize) -> Unit,
    onToggleArabic: () -> Unit,
    onToggleRumi: () -> Unit,
    onToggleTranslation: () -> Unit,
    onCopyText: (String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(DuaCategory.SEMUA) }

    val filtered = remember(query, category, uiState.duaBookmarks) {
        WiridDoaData.DUA_COLLECTION.filter { item ->
            val matchesCat = when (category) {
                DuaCategory.SEMUA -> true
                DuaCategory.KEGEMARAN -> uiState.duaBookmarks.contains(item.id)
                else -> item.category == category
            }
            if (!matchesCat) return@filter false
            val q = query.trim().lowercase(Locale.ROOT)
            if (q.isEmpty()) true
            else item.title.lowercase(Locale.ROOT).contains(q) ||
                item.transliteration.lowercase(Locale.ROOT).contains(q) ||
                item.translation.lowercase(Locale.ROOT).contains(q)
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Koleksi Doa Harian", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Doa-doa sahih bersumberkan Al-Quran dan Hadis Nabawi", color = palette.textSecondary, fontSize = 12.sp)

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (sz in ReadingFontSize.entries) {
                            FilterChip(
                                selected = uiState.duaFontSize == sz,
                                onClick = { onSetFontSize(sz) },
                                label = { Text(sz.badgeLabel, fontSize = 11.sp) }
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = uiState.showArabic, onClick = onToggleArabic, label = { Text("Jawi", fontSize = 11.sp) })
                        FilterChip(selected = uiState.showRumi, onClick = onToggleRumi, label = { Text("Rumi", fontSize = 11.sp) })
                        FilterChip(selected = uiState.showTranslation, onClick = onToggleTranslation, label = { Text("Maksud", fontSize = 11.sp) })
                    }

                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = { Text("Cari doa (cth: rezeki, ibu bapa, azan)...", fontSize = 12.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(DuaCategory.entries) { cat ->
                            FilterChip(
                                selected = category == cat,
                                onClick = { category = cat },
                                label = { Text(cat.labelMs, fontSize = 11.sp) }
                            )
                        }
                    }
                }
            }
        }

        items(filtered) { dua ->
            val isSaved = uiState.duaBookmarks.contains(dua.id)
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCard),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.borderSubtle, RoundedCornerShape(20.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(dua.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.weight(1f))
                        Row {
                            IconButton(onClick = { onToggleBookmark(dua.id) }) {
                                Icon(
                                    imageVector = if (isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                    contentDescription = null,
                                    tint = if (isSaved) palette.goldAccent else palette.textSecondary
                                )
                            }
                            IconButton(onClick = { onCopyText("${dua.title}

${dua.arabic}

${dua.translation}") }) {
                                Icon(Icons.Default.Share, contentDescription = null, tint = palette.textSecondary)
                            }
                        }
                    }
                    if (uiState.showArabic) {
                        Text(
                            text = dua.arabic,
                            color = palette.primaryLight,
                            fontSize = (20f * uiState.duaFontSize.scaleMultiplier).sp,
                            textAlign = TextAlign.End,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    if (uiState.showRumi) {
                        Text(""${dua.transliteration}"", color = palette.textPrimary, fontSize = (12.5f * uiState.duaFontSize.scaleMultiplier).sp)
                    }
                    if (uiState.showTranslation) {
                        Text(dua.translation, color = palette.textSecondary, fontSize = (12f * uiState.duaFontSize.scaleMultiplier).sp)
                    }
                    dua.reference?.let { Text("Sumber: $it", color = palette.primary, fontSize = 11.sp) }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    uiState: SolatKiniUiState,
    palette: SolatKiniPalette,
    onSelectLanguage: (AppLanguage) -> Unit,
    onSelectTheme: (AppThemeId) -> Unit,
    onTogglePersistentNotif: () -> Unit,
    onToggleAutoStart: () -> Unit,
    onOpenAutostartSettings: () -> Unit,
    onRequestBatteryIgnore: () -> Unit,
    onSelectVoice: (AzanVoice) -> Unit,
    onTestVoiceOnAlarm: (AzanVoice, String) -> Unit,
    onStopAudio: () -> Unit,
    onOpenExactAlarmSettings: () -> Unit,
    onOpenDndGuide: () -> Unit,
    onClearLogs: () -> Unit
) {
    val playback by AzanAudioManager.playbackState.collectAsStateSafe()
    var confirmClearLogs by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = palette.surfaceCardAlt),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, palette.primary.copy(alpha = 0.35f), RoundedCornerShape(24.dp))
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(ThemeAndLocaleData.string(UiStringKey.SETTINGS_TITLE, uiState.language), color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    Text(ThemeAndLocaleData.string(UiStringKey.SETTINGS_DESC, uiState.language), color = palette.textSecondary, fontSize = 12.sp)
                }
            }
        }

        // Bahasa
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(ThemeAndLocaleData.string(UiStringKey.LANG_TITLE, uiState.language), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (lang in ThemeAndLocaleData.LANGUAGE_OPTIONS) {
                            FilterChip(
                                selected = uiState.language == lang,
                                onClick = { onSelectLanguage(lang) },
                                label = { Text("${lang.flag} ${lang.nativeName}", fontSize = 12.sp) }
                            )
                        }
                    }
                }
            }
        }

        // 7 Tema Warna
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(ThemeAndLocaleData.string(UiStringKey.THEME_TITLE, uiState.language), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    for (th in ThemeAndLocaleData.THEME_OPTIONS) {
                        val isSelected = uiState.themeId == th
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) palette.surfaceCardAlt else palette.backgroundCanvas)
                                .border(1.dp, if (isSelected) palette.primary else palette.borderSubtle, RoundedCornerShape(14.dp))
                                .clickable { onSelectTheme(th) }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                                Box(modifier = Modifier.size(16.dp).clip(CircleShape).background(Color(th.accentHex)))
                                Column {
                                    Text(ThemeAndLocaleData.themeName(th, uiState.language), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text(ThemeAndLocaleData.themeDescription(th, uiState.language), color = palette.textSecondary, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = palette.primary)
                            }
                        }
                    }
                }
            }
        }

        // Notifikasi Berterusan & Auto-Start
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Notifikasi Waktu Solat Berterusan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Paparkan waktu solat seterusnya secara kekal pada panel notifikasi", color = palette.textSecondary, fontSize = 11.sp)
                        }
                        Switch(checked = uiState.notificationSettings.persistentNotification, onCheckedChange = { onTogglePersistentNotif() })
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Auto-Start Selepas Restart Telefon", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Jadualkan semula azan secara automatik bila telefon dihidupkan", color = palette.textSecondary, fontSize = 11.sp)
                        }
                        Switch(checked = uiState.autoStartBoot, onCheckedChange = { onToggleAutoStart() })
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onOpenAutostartSettings, modifier = Modifier.weight(1f)) {
                            Text("Menu Autostart", fontSize = 11.sp)
                        }
                        OutlinedButton(onClick = onRequestBatteryIgnore, modifier = Modifier.weight(1f)) {
                            Text("Bebas Bateri", fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        // Pilihan Muadzin & Ujian STREAM_ALARM
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(ThemeAndLocaleData.string(UiStringKey.ALARM_CARD_TITLE, uiState.language), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)

                    if (playback.isPlaying) {
                        Button(
                            onClick = onStopAudio,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Hentikan Azan Sedang Berbunyi", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }

                    for (opt in AzanAudioManager.AZAN_OPTIONS) {
                        val isActive = uiState.selectedVoice == opt.id
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isActive) palette.surfaceCardAlt else palette.backgroundCanvas)
                                .border(1.dp, if (isActive) palette.primary else palette.borderSubtle, RoundedCornerShape(14.dp))
                                .clickable {
                                    onSelectVoice(opt.id)
                                    onTestVoiceOnAlarm(opt.id, opt.title)
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(opt.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text(opt.reciter, color = palette.primary, fontSize = 11.sp)
                            }
                            if (isActive) {
                                Text("AKTIF", color = palette.primary, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp)
                            } else {
                                Text("Uji & Pilih", color = palette.textSecondary, fontSize = 11.sp)
                            }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onOpenExactAlarmSettings, modifier = Modifier.weight(1f)) {
                            Text("Exact Alarm", fontSize = 11.sp)
                        }
                        OutlinedButton(onClick = onOpenDndGuide, modifier = Modifier.weight(1f)) {
                            Text("Panduan DND", fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        // Log Diagnostik Azan 24 Jam
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Log Diagnostik Azan (24 Jam)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        if (uiState.azanLogs24h.isNotEmpty()) {
                            OutlinedButton(onClick = {
                                if (!confirmClearLogs) confirmClearLogs = true
                                else {
                                    confirmClearLogs = false
                                    onClearLogs()
                                }
                            }) {
                                Text(if (confirmClearLogs) "Sahkan Padam?" else "Padam", fontSize = 11.sp, color = Color(0xFFF43F5E))
                            }
                        }
                    }

                    if (uiState.azanLogs24h.isEmpty()) {
                        Text("Tiada rekod laungan azan dalam tempoh 24 jam lalu.", color = palette.textSecondary, fontSize = 12.sp)
                    } else {
                        for (log in uiState.azanLogs24h) {
                            AzanLogRow(palette, log)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AzanLogRow(palette: SolatKiniPalette, log: AzanLogEntry) {
    val badgeColor = when (log.status) {
        AzanLogStatus.BERJAYA -> palette.primary
        AzanLogStatus.DICETUSKAN -> palette.goldAccent
        AzanLogStatus.GAGAL -> Color(0xFFF43F5E)
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(palette.backgroundCanvas)
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("${log.prayerName} · ${log.timeFormatted}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
            Text(log.status.name, color = badgeColor, fontWeight = FontWeight.Bold, fontSize = 10.sp)
        }
        Text(log.details, color = palette.textSecondary, fontSize = 11.sp)
    }
}

@Composable
fun CreditsScreen(
    palette: SolatKiniPalette,
    onNavigateToTab: (ActiveTab) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCardAlt), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Kredit & Pembangunan SolatKini", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "Inisiatif perisian waktu solat moden, kompas kiblat tepat, dan peringatan azan luar talian berteraskan data rasmi JAKIM.",
                        color = palette.textSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }

        item {
            Card(colors = CardDefaults.cardColors(containerColor = palette.surfaceCard), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Ketua Projek & Idea", color = palette.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("Musa Bin Sarudin", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                    Text("60 Zon Waktu Solat JAKIM · Sandaran Falak Luar Talian · Kompas Kiblat Geodesik · Sifar Iklan", color = palette.textSecondary, fontSize = 12.sp)
                    Text("Versi Aplikasi: v${PrayerRepository.CURRENT_APP_VERSION} (Build #${PrayerRepository.CURRENT_VERSION_CODE})", color = palette.goldAccent, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { onNavigateToTab(ActiveTab.SOLAT) }, colors = ButtonDefaults.buttonColors(containerColor = palette.primary), modifier = Modifier.weight(1f)) {
                    Text("Waktu Solat", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
                OutlinedButton(onClick = { onNavigateToTab(ActiveTab.KIBLAT) }, modifier = Modifier.weight(1f)) {
                    Text("Kompas Kiblat", fontSize = 12.sp)
                }
                OutlinedButton(onClick = { onNavigateToTab(ActiveTab.DOA) }, modifier = Modifier.weight(1f)) {
                    Text("Koleksi Doa", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun <T> kotlinx.coroutines.flow.StateFlow<T>.collectAsStateSafe(): androidx.compose.runtime.State<T> {
    val state = remember { mutableStateOf(value) }
    LaunchedEffect(this) {
        collect { state.value = it }
    }
    return state
}
