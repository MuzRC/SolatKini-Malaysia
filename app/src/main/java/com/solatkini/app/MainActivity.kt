package com.solatkini.app

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Award
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.Radio
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solatkini.app.data.ThemeAndLocaleData
import com.solatkini.app.data.UiStringKey
import com.solatkini.app.model.ActiveTab
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.service.AzanAlarmScheduler
import com.solatkini.app.service.PrayerAlarmReceiver
import com.solatkini.app.service.SolatWidgetManager
import com.solatkini.app.ui.SolatKiniViewModel
import com.solatkini.app.ui.components.AudioSettingsDialog
import com.solatkini.app.ui.components.AzanAlarmDialog
import com.solatkini.app.ui.components.BatteryGuideDialog
import com.solatkini.app.ui.components.DndGuideDialog
import com.solatkini.app.ui.components.ZoneSelectDialog
import com.solatkini.app.ui.screens.CreditsScreen
import com.solatkini.app.ui.screens.DuaCollectionScreen
import com.solatkini.app.ui.screens.FastingTrackerScreen
import com.solatkini.app.ui.screens.OnboardingScreen
import com.solatkini.app.ui.screens.PrayerDashboardScreen
import com.solatkini.app.ui.screens.QiblaCompassScreen
import com.solatkini.app.ui.screens.SettingsScreen
import com.solatkini.app.ui.screens.TasbihWiridScreen
import com.solatkini.app.ui.theme.SolatKiniTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val vm: SolatKiniViewModel = viewModel()
            SolatKiniRootApp(vm = vm)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolatKiniRootApp(vm: SolatKiniViewModel) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val uiState by vm.uiState.collectAsState()
    val scheduler = remember { AzanAlarmScheduler(context) }

    var isZoneModalOpen by remember { mutableStateOf(false) }
    var isAudioModalOpen by remember { mutableStateOf(false) }
    var isDndGuideOpen by remember { mutableStateOf(false) }
    var isBatteryModalOpen by remember { mutableStateOf(false) }

    var locationGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }

    val notifPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        vm.refreshSystemStatus()
        if (!granted) {
            scheduler.openNotificationSettings()
        }
    }

    val locationPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        locationGranted = granted
        if (granted) {
            vm.detectGpsLocation(isSilentAuto = false)
        } else {
            vm.onLocationPermissionDenied()
        }
    }

    val requestNotificationPermission: () -> Unit = {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            scheduler.openNotificationSettings()
        }
    }

    val requestLocationPermission: () -> Unit = {
        val alreadyGranted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (alreadyGranted) {
            locationGranted = true
            vm.detectGpsLocation(isSilentAuto = false)
        } else {
            locationPermLauncher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
            )
        }
    }

    // Resume lifecycle refresh
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                locationGranted =
                    ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                vm.refreshSystemStatus()
                vm.triggerAutoLocateIfNeeded()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Broadcast receiver untuk acara azan & segerak dari notifikasi tetap
    DisposableEffect(context) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                if (intent == null) return
                when (intent.action) {
                    PrayerAlarmReceiver.ACTION_AZAN_TRIGGERED_EVENT -> {
                        val key = PrayerKey.fromRaw(intent.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_KEY))
                        val name = intent.getStringExtra(AzanAlarmScheduler.EXTRA_PRAYER_NAME).orEmpty().ifBlank { "Solat" }
                        val voice = AzanVoice.fromId(intent.getStringExtra(AzanAlarmScheduler.EXTRA_AZAN_VOICE))
                        vm.onNativeAlarmTriggered(key, name, voice)
                    }
                    SolatWidgetManager.ACTION_SYNC_PRAYER -> {
                        vm.loadPrayerData(forceLive = true)
                    }
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(PrayerAlarmReceiver.ACTION_AZAN_TRIGGERED_EVENT)
            addAction(SolatWidgetManager.ACTION_SYNC_PRAYER)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            context.registerReceiver(receiver, filter)
        }
        onDispose {
            try {
                context.unregisterReceiver(receiver)
            } catch (_: Exception) {
            }
        }
    }

    SolatKiniTheme(themeId = uiState.themeId) { palette ->
        if (uiState.showOnboarding) {
            OnboardingScreen(
                palette = palette,
                notificationsGranted = uiState.notificationsGranted,
                locationGranted = locationGranted,
                batteryIgnored = uiState.batteryIgnored,
                onRequestNotification = requestNotificationPermission,
                onRequestLocation = requestLocationPermission,
                onOpenBatteryModal = { isBatteryModalOpen = true },
                onCompleteOnboarding = {
                    vm.completeOnboarding()
                    if (!locationGranted) {
                        requestLocationPermission()
                    }
                }
            )
            if (isBatteryModalOpen) {
                BatteryGuideDialog(
                    palette = palette,
                    batteryIgnored = uiState.batteryIgnored,
                    onDismiss = {
                        isBatteryModalOpen = false
                        vm.refreshSystemStatus()
                    },
                    onRequestBattery = { scheduler.requestIgnoreBatteryOptimization() },
                    onOpenAutostart = { scheduler.openAutostartSettings() }
                )
            }
            return@SolatKiniTheme
        }

        val navTabs = listOf(
            Triple(ActiveTab.SOLAT, ThemeAndLocaleData.string(UiStringKey.NAV_SOLAT, uiState.language), Icons.Default.Schedule),
            Triple(ActiveTab.KIBLAT, ThemeAndLocaleData.string(UiStringKey.NAV_KIBLAT, uiState.language), Icons.Default.NightsStay),
            Triple(ActiveTab.PUASA, ThemeAndLocaleData.string(UiStringKey.NAV_PUASA, uiState.language), Icons.Default.NightsStay),
            Triple(ActiveTab.WIRID, ThemeAndLocaleData.string(UiStringKey.NAV_WIRID, uiState.language), Icons.Default.Radio),
            Triple(ActiveTab.DOA, ThemeAndLocaleData.string(UiStringKey.NAV_DOA, uiState.language), Icons.Default.MenuBook),
            Triple(ActiveTab.TETAPAN, ThemeAndLocaleData.string(UiStringKey.NAV_TETAPAN, uiState.language), Icons.Default.Settings),
            Triple(ActiveTab.KREDIT, ThemeAndLocaleData.string(UiStringKey.NAV_KREDIT, uiState.language), Icons.Default.Award)
        )

        Scaffold(
            containerColor = palette.backgroundCanvas,
            topBar = {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = palette.backgroundCanvas),
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.clickable { vm.setActiveTab(ActiveTab.SOLAT) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(palette.primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.NightsStay, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            }
                            Text("SolatKini", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                            Text("Malaysia", color = palette.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    },
                    actions = {
                        Row(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(palette.primary)
                                .clickable { vm.triggerTestAlarm(PrayerKey.ZOHOR, "Zohor", uiState.selectedVoice) }
                                .padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(Icons.Default.VolumeUp, contentDescription = null, tint = Color(0xFF04100B), modifier = Modifier.size(15.dp))
                            Text("Uji Azan", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                )
            },
            bottomBar = {
                NavigationBar(
                    containerColor = palette.surfaceCard,
                    contentColor = palette.textSecondary
                ) {
                    for ((tab, label, icon) in navTabs) {
                        val selected = uiState.activeTab == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { vm.setActiveTab(tab) },
                            icon = { Icon(icon, contentDescription = label, modifier = Modifier.size(20.dp)) },
                            label = { Text(label, fontSize = 9.sp, maxLines = 1) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = palette.primary,
                                selectedTextColor = palette.primary,
                                indicatorColor = palette.primary.copy(alpha = 0.16f),
                                unselectedIconColor = palette.textSecondary,
                                unselectedTextColor = palette.textSecondary
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                if (uiState.isLoading || uiState.prayerTimes == null) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        CircularProgressIndicator(color = palette.primary)
                        Text("Memuatkan Waktu Solat JAKIM...", color = palette.textSecondary, fontSize = 13.sp)
                    }
                } else {
                    when (uiState.activeTab) {
                        ActiveTab.SOLAT -> PrayerDashboardScreen(
                            uiState = uiState,
                            palette = palette,
                            onOpenZoneModal = { isZoneModalOpen = true },
                            onDetectGps = { requestLocationPermission() },
                            onClearLocationError = { vm.clearLocationError() },
                            onLiveSync = { vm.loadPrayerData(forceLive = true) },
                            onOpenDateSettings = { scheduler.openDateSettings() },
                            onRequestNotifPerm = requestNotificationPermission,
                            onOpenNotifSettings = { scheduler.openNotificationSettings() },
                            onRefreshSystemStatus = { vm.refreshSystemStatus() },
                            onToggleUserFasting = { vm.toggleUserFastingToday() },
                            onTriggerTestAlarm = { k, n, v -> vm.triggerTestAlarm(k, n, v) },
                            onOpenAudioSettings = { isAudioModalOpen = true },
                            onOpenDndGuide = { isDndGuideOpen = true },
                            onTogglePrayerDone = { vm.togglePrayerDone(it) },
                            onResetChecklist = { vm.resetPrayerChecklist() },
                            onTogglePrayerNotif = { vm.togglePrayerNotification(it) }
                        )

                        ActiveTab.KIBLAT -> QiblaCompassScreen(uiState = uiState, palette = palette)

                        ActiveTab.PUASA -> FastingTrackerScreen(
                            uiState = uiState,
                            palette = palette,
                            onAdjustHijri = { vm.adjustHijri(it) },
                            onToggleUserFasting = { vm.toggleUserFastingToday() },
                            onUpdateGantiTarget = { vm.updateGantiTarget(it) },
                            onIncrementGanti = { vm.incrementGantiCompleted() },
                            onDecrementGanti = { vm.decrementGantiCompleted() },
                            onResetGanti = { vm.resetGantiCompleted() },
                            onUpdateSunnah = { f, d -> vm.updateSunnahCount(f, d) },
                            onToggleRamadanDay = { vm.toggleRamadanDay(it) },
                            onMarkPastRamadan = { vm.markPastRamadanDaysUpTo(it) },
                            onResetRamadan = { vm.resetRamadanDays() },
                            onCopyText = { txt ->
                                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                cm?.setPrimaryClip(android.content.ClipData.newPlainText("SolatKini", txt))
                                vm.showToast("Disalin ke papan keratan.")
                            }
                        )

                        ActiveTab.WIRID, ActiveTab.TASBIH -> TasbihWiridScreen(
                            uiState = uiState,
                            palette = palette,
                            onSelectTasbih = { id, t -> vm.selectTasbihPreset(id, t) },
                            onSetTasbihTarget = { vm.setTasbihTarget(it) },
                            onIncrementTasbih = { vm.incrementTasbih() },
                            onResetTasbihCount = { vm.resetTasbihCurrentCount() },
                            onResetTasbihAll = { vm.resetTasbihAll() },
                            onToggleTasbihSound = { vm.toggleTasbihSound() },
                            onToggleTasbihFreeTouch = { vm.toggleTasbihFreeTouch() },
                            onSetWiridFontSize = { vm.setWiridFontSize(it) },
                            onToggleArabic = { vm.toggleShowArabic() },
                            onToggleRumi = { vm.toggleShowRumi() },
                            onToggleTranslation = { vm.toggleShowTranslation() }
                        )

                        ActiveTab.DOA -> DuaCollectionScreen(
                            uiState = uiState,
                            palette = palette,
                            onToggleBookmark = { vm.toggleDuaBookmark(it) },
                            onSetFontSize = { vm.setDuaFontSize(it) },
                            onToggleArabic = { vm.toggleShowArabic() },
                            onToggleRumi = { vm.toggleShowRumi() },
                            onToggleTranslation = { vm.toggleShowTranslation() },
                            onCopyText = { txt ->
                                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                cm?.setPrimaryClip(android.content.ClipData.newPlainText("SolatKini", txt))
                                vm.showToast("Disalin ke papan keratan.")
                            }
                        )

                        ActiveTab.TETAPAN, ActiveTab.WIDGET -> SettingsScreen(
                            uiState = uiState,
                            palette = palette,
                            onSelectLanguage = { vm.setLanguage(it) },
                            onSelectTheme = { vm.setTheme(it) },
                            onTogglePersistentNotif = { vm.togglePersistentNotification() },
                            onToggleAutoStart = { vm.toggleAutoStartBoot() },
                            onOpenAutostartSettings = { scheduler.openAutostartSettings() },
                            onRequestBatteryIgnore = { scheduler.requestIgnoreBatteryOptimization() },
                            onSelectVoice = { vm.selectAzanVoice(it) },
                            onTestVoiceOnAlarm = { v, title -> vm.triggerTestAlarm(PrayerKey.ZOHOR, title, v, 0, 20) },
                            onStopAudio = { vm.stopAzanPlaybackOnly() },
                            onOpenExactAlarmSettings = { scheduler.openExactAlarmSettings() },
                            onOpenDndGuide = { isDndGuideOpen = true },
                            onClearLogs = { vm.clearDiagnosticLogs() }
                        )

                        ActiveTab.KREDIT -> CreditsScreen(
                            palette = palette,
                            onNavigateToTab = { vm.setActiveTab(it) }
                        )
                    }
                }

                // Banner Geo Auto-Detect
                uiState.geoBanner?.let { geo ->
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(palette.surfaceCardAlt)
                            .border(1.dp, palette.primary.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Lokasi: ${geo.zoneName} · ${geo.message}",
                            color = Color.White,
                            fontSize = 12.sp,
                            modifier = Modifier.weight(1f)
                        )
                        Text("Tutup", color = palette.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { vm.clearGeoBanner() })
                    }
                }

                // Banner Kemaskini APK
                uiState.updateBanner?.let { upd ->
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(palette.surfaceCardAlt)
                            .border(1.dp, palette.primary.copy(alpha = 0.6f), RoundedCornerShape(18.dp))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Kemaskini Baharu v${upd.latestVersion}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text(upd.releaseNotes, color = palette.textSecondary, fontSize = 11.sp, maxLines = 2)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "Muat Turun",
                                color = Color(0xFF04100B),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(palette.primary)
                                    .clickable {
                                        try {
                                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(upd.downloadUrl)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                                        } catch (_: Exception) {
                                        }
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                            Text("Nanti", color = palette.textSecondary, fontSize = 11.sp, modifier = Modifier.clickable { vm.dismissUpdateBanner() }.padding(6.dp))
                        }
                    }
                }

                // Toast Ringkas
                uiState.toastMessage?.let { msg ->
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 4.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(palette.surfaceCardAlt)
                            .border(1.dp, palette.primary.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(msg, color = palette.primaryLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        if (isZoneModalOpen) {
            ZoneSelectDialog(
                currentZone = uiState.currentZone,
                palette = palette,
                onDismiss = { isZoneModalOpen = false },
                onSelectZone = { vm.selectZone(it) }
            )
        }

        if (isAudioModalOpen) {
            val nextInfo = uiState.nextPrayerInfo
            AudioSettingsDialog(
                selectedVoice = uiState.selectedVoice,
                nextPrayerKey = nextInfo?.nextKey ?: PrayerKey.SUBUH,
                nextPrayerLabel = nextInfo?.nextLabel ?: "Subuh",
                palette = palette,
                onDismiss = { isAudioModalOpen = false },
                onSelectVoice = { vm.selectAzanVoice(it) },
                onTriggerTestAlarm = { k, n, v, autoStop -> vm.triggerTestAlarm(k, n, v, 0, autoStop) },
                onStopAudio = { vm.stopAzanPlaybackOnly() }
            )
        }

        if (isDndGuideOpen) {
            DndGuideDialog(
                palette = palette,
                onDismiss = { isDndGuideOpen = false },
                onOpenNotificationSettings = { scheduler.openNotificationSettings() },
                onOpenExactAlarmSettings = { scheduler.openExactAlarmSettings() }
            )
        }

        if (isBatteryModalOpen) {
            BatteryGuideDialog(
                palette = palette,
                batteryIgnored = uiState.batteryIgnored,
                onDismiss = {
                    isBatteryModalOpen = false
                    vm.refreshSystemStatus()
                },
                onRequestBattery = { scheduler.requestIgnoreBatteryOptimization() },
                onOpenAutostart = { scheduler.openAutostartSettings() }
            )
        }

        AzanAlarmDialog(
            modalState = uiState.alarmModal,
            palette = palette,
            onStopAudio = { vm.stopAzanPlaybackOnly() },
            onReplayAudio = {
                vm.triggerTestAlarm(
                    key = uiState.alarmModal.prayerKey,
                    name = uiState.alarmModal.prayerName,
                    voice = uiState.alarmModal.voice
                )
            },
            onDismissAndStop = { vm.closeAlarmModalAndStopAudio() }
        )
    }
}
