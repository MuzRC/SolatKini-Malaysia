package com.solatkini.app.ui

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.solatkini.app.data.JakimZonesData
import com.solatkini.app.data.PrayerRepository
import com.solatkini.app.data.SunnahFastingCounts
import com.solatkini.app.data.UserPreferencesStore
import com.solatkini.app.domain.FastingCountdownEngine
import com.solatkini.app.domain.HijriCalendarEngine
import com.solatkini.app.domain.NextPrayerEngine
import com.solatkini.app.domain.PrayerCalculator
import com.solatkini.app.model.ActiveTab
import com.solatkini.app.model.AppLanguage
import com.solatkini.app.model.AppNotificationSettings
import com.solatkini.app.model.AppThemeId
import com.solatkini.app.model.AppUpdateInfo
import com.solatkini.app.model.AzanLogEntry
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.DayPrayerTimes
import com.solatkini.app.model.FardPrayerKey
import com.solatkini.app.model.FastingCountdownInfo
import com.solatkini.app.model.FastingRecommendation
import com.solatkini.app.model.HijriDateInfo
import com.solatkini.app.model.JakimZone
import com.solatkini.app.model.NextPrayerInfo
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.model.PrayerTimeItem
import com.solatkini.app.model.RamadanCountdownInfo
import com.solatkini.app.model.ReadingFontSize
import com.solatkini.app.service.AzanAlarmScheduler
import com.solatkini.app.service.AzanAudioManager
import com.solatkini.app.service.MusaDiagnosticLogger
import com.solatkini.app.service.SolatWidgetManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date

data class LocationErrorBanner(
    val message: String,
    val isDenied: Boolean
)

data class GeoBannerStatus(
    val message: String,
    val zoneName: String
)

data class AlarmModalUiState(
    val isOpen: Boolean = false,
    val prayerKey: PrayerKey = PrayerKey.SUBUH,
    val prayerName: String = "Subuh",
    val voice: AzanVoice = AzanVoice.JAKIM
)

data class SolatKiniUiState(
    val showOnboarding: Boolean = false,
    val activeTab: ActiveTab = ActiveTab.SOLAT,
    val language: AppLanguage = AppLanguage.MS,
    val themeId: AppThemeId = AppThemeId.EMERALD,
    val currentZone: JakimZone = JakimZonesData.DEFAULT_ZONE,
    val prayerTimes: DayPrayerTimes? = null,
    val isLoading: Boolean = true,
    val isLiveSyncing: Boolean = false,
    val isOfflineCalculated: Boolean = false,
    val lastSyncTime: String = "",
    val currentTime: Date = Date(),
    val nextPrayerInfo: NextPrayerInfo? = null,
    val hijri: HijriDateInfo? = null,
    val hijriAdjustment: Int = 0,
    val ramadanInfo: RamadanCountdownInfo? = null,
    val recommendation: FastingRecommendation? = null,
    val isOnline: Boolean = true,
    val isLocating: Boolean = false,
    val locationError: LocationErrorBanner? = null,
    val geoBanner: GeoBannerStatus? = null,
    val notificationsGranted: Boolean = true,
    val exactAlarmAllowed: Boolean = true,
    val batteryIgnored: Boolean = false,
    val isAutoTimeEnabled: Boolean = true,
    val autoStartBoot: Boolean = true,
    val selectedVoice: AzanVoice = AzanVoice.JAKIM,
    val notificationSettings: AppNotificationSettings = AppNotificationSettings(),
    val isUserFastingToday: Boolean = false,
    val fastingCountdown: FastingCountdownInfo? = null,
    val prayerChecklist: Map<FardPrayerKey, Boolean> = FardPrayerKey.ORDERED.associateWith { false },
    val gantiCompleted: Int = 0,
    val gantiTarget: Int = 7,
    val sunnahCounts: SunnahFastingCounts = SunnahFastingCounts(),
    val ramadanCompletedDays: List<Int> = emptyList(),
    val duaBookmarks: Set<String> = emptySet(),
    val duaFontSize: ReadingFontSize = ReadingFontSize.LARGE,
    val wiridFontSize: ReadingFontSize = ReadingFontSize.LARGE,
    val showArabic: Boolean = true,
    val showRumi: Boolean = true,
    val showTranslation: Boolean = true,
    val tasbihSelectedId: String = "tasbih",
    val tasbihCount: Int = 0,
    val tasbihTarget: Int = 33,
    val tasbihLaps: Int = 0,
    val tasbihSoundEnabled: Boolean = true,
    val tasbihFreeTouchEnabled: Boolean = false,
    val azanLogs24h: List<AzanLogEntry> = emptyList(),
    val updateBanner: AppUpdateInfo? = null,
    val alarmModal: AlarmModalUiState = AlarmModalUiState(),
    val toastMessage: String? = null
)

class SolatKiniViewModel(application: Application) : AndroidViewModel(application) {
    private val appContext: Context = application.applicationContext
    private val prefsStore = UserPreferencesStore(appContext)
    private val alarmScheduler = AzanAlarmScheduler(appContext)
    private val widgetManager = SolatWidgetManager(appContext)
    val diagnosticLogger = MusaDiagnosticLogger(appContext)

    private val repository = PrayerRepository(
        context = appContext,
        localCalculator = { d, lat, lng, tz ->
            PrayerCalculator.calculateLocalPrayerTimes(d, lat, lng, tz)
        },
        hijriFormatter = { d ->
            HijriCalendarEngine.getHijriDate(d, prefsStore.getHijriAdjustment()).formatted
        }
    )

    private val _uiState = MutableStateFlow(buildInitialState())
    val uiState: StateFlow<SolatKiniUiState> = _uiState.asStateFlow()

    private var tickerJob: Job? = null
    private var midnightJob: Job? = null
    private var hasAutoLocated = false
    private var connectivityCallback: ConnectivityManager.NetworkCallback? = null

    init {
        registerNetworkMonitor()
        startTickerLoop()
        startMidnightWatcher()
        refreshSystemStatus()
        loadPrayerData(forceLive = false)
        scheduleSilentUpdateCheck()
    }

    private fun buildInitialState(): SolatKiniUiState {
        val now = Date()
        val zone = JakimZonesData.findZoneByCode(prefsStore.getActiveZoneCode())
        val adj = prefsStore.getHijriAdjustment()
        val hijri = HijriCalendarEngine.getHijriDate(now, adj)
        val ramadan = HijriCalendarEngine.getRamadanCountdownInfo(now, adj)
        val rec = HijriCalendarEngine.getFastingRecommendation(now, hijri)
        val userFasting = prefsStore.isUserFastingToday(now)
        val todayStr = PrayerRepository.getLocalDateString(now)
        val perms = alarmScheduler.checkPermissions()
        val autoTime = alarmScheduler.checkAutoTime()

        return SolatKiniUiState(
            showOnboarding = !prefsStore.isOnboardingCompleted(),
            activeTab = ActiveTab.SOLAT,
            language = prefsStore.getLanguage(),
            themeId = prefsStore.getTheme(),
            currentZone = zone,
            hijri = hijri,
            hijriAdjustment = adj,
            ramadanInfo = ramadan,
            recommendation = rec,
            isOnline = checkInitialNetworkState(),
            notificationsGranted = perms.notificationsGranted,
            exactAlarmAllowed = perms.exactAlarmAllowed,
            batteryIgnored = alarmScheduler.isIgnoringBatteryOptimizations(),
            isAutoTimeEnabled = autoTime.isAutoTimeEnabled && autoTime.isAutoTimeZoneEnabled,
            autoStartBoot = prefsStore.isAutoStartBootEnabled(),
            selectedVoice = prefsStore.getAzanVoice(),
            notificationSettings = prefsStore.getNotificationSettings(),
            isUserFastingToday = userFasting,
            prayerChecklist = prefsStore.getPrayerChecklist(todayStr),
            gantiCompleted = prefsStore.getGantiCompleted(),
            gantiTarget = prefsStore.getGantiTarget(),
            sunnahCounts = prefsStore.getSunnahFastingCounts(),
            ramadanCompletedDays = prefsStore.getRamadanCompletedDays(ramadan.ramadanYearKey),
            duaBookmarks = prefsStore.getDuaBookmarks(),
            duaFontSize = prefsStore.getDuaFontSize(),
            wiridFontSize = prefsStore.getWiridFontSize(),
            showArabic = prefsStore.isShowArabic(),
            showRumi = prefsStore.isShowRumi(),
            showTranslation = prefsStore.isShowTranslation(),
            tasbihSelectedId = prefsStore.getTasbihSelectedId(),
            tasbihCount = prefsStore.getTasbihCount(),
            tasbihTarget = prefsStore.getTasbihTarget(33),
            tasbihLaps = prefsStore.getTasbihLaps(),
            tasbihSoundEnabled = prefsStore.isTasbihSoundEnabled(),
            tasbihFreeTouchEnabled = prefsStore.isTasbihFreeTouchEnabled(),
            azanLogs24h = alarmScheduler.getDiagnosticLogs24h()
        )
    }

    private fun checkInitialNetworkState(): Boolean {
        val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
        val active = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(active) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun registerNetworkMonitor() {
        val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                _uiState.update { it.copy(isOnline = true) }
            }

            override fun onLost(network: Network) {
                _uiState.update { it.copy(isOnline = checkInitialNetworkState()) }
            }
        }
        connectivityCallback = cb
        try {
            cm.registerNetworkCallback(
                NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),
                cb
            )
        } catch (_: Exception) {
        }
    }

    fun showToast(msg: String) {
        _uiState.update { it.copy(toastMessage = msg) }
        viewModelScope.launch {
            delay(3500L)
            _uiState.update { if (it.toastMessage == msg) it.copy(toastMessage = null) else it }
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }

    fun setActiveTab(tab: ActiveTab) {
        _uiState.update { it.copy(activeTab = tab) }
        if (tab == ActiveTab.TETAPAN) {
            refreshDiagnosticLogs()
        }
    }

    fun completeOnboarding() {
        prefsStore.setOnboardingCompleted(true)
        prefsStore.setActiveZoneCode(_uiState.value.currentZone.code)
        _uiState.update { it.copy(showOnboarding = false) }
        loadPrayerData(forceLive = false)
        triggerAutoLocateIfNeeded()
    }

    fun refreshSystemStatus() {
        val perms = alarmScheduler.checkPermissions()
        val autoTime = alarmScheduler.checkAutoTime()
        val batteryIgnored = alarmScheduler.isIgnoringBatteryOptimizations()
        val now = Date()
        val todayStr = PrayerRepository.getLocalDateString(now)
        val userFasting = prefsStore.isUserFastingToday(now)

        _uiState.update { state ->
            val currentTimes = state.prayerTimes
            val nextInfo = if (currentTimes != null) {
                NextPrayerEngine.determineNextPrayer(currentTimes, now)
            } else {
                state.nextPrayerInfo
            }
            val hijri = HijriCalendarEngine.getHijriDate(now, state.hijriAdjustment)
            val fastingCd = if (currentTimes != null) {
                FastingCountdownEngine.compute(currentTimes, now, hijri.isRamadan, userFasting)
            } else {
                state.fastingCountdown
            }

            if (currentTimes != null) {
                widgetManager.syncPersistentNotification(
                    prayerTimes = currentTimes,
                    zone = state.currentZone,
                    nextLabel = nextInfo?.nextLabel ?: "Waktu Solat",
                    nextTime = nextInfo?.nextDisplayTime ?: "--:--",
                    countdownText = nextInfo?.countdownFormatted ?: "",
                    nextTimestampMs = nextInfo?.targetTimestamp ?: 0L,
                    hijriFormatted = hijri.formatted,
                    enabled = state.notificationSettings.persistentNotification
                )
            }

            state.copy(
                currentTime = now,
                nextPrayerInfo = nextInfo,
                hijri = hijri,
                recommendation = HijriCalendarEngine.getFastingRecommendation(now, hijri),
                fastingCountdown = fastingCd,
                isUserFastingToday = userFasting,
                prayerChecklist = if (currentTimes?.date == todayStr) {
                    prefsStore.getPrayerChecklist(todayStr)
                } else {
                    state.prayerChecklist
                },
                notificationsGranted = perms.notificationsGranted,
                exactAlarmAllowed = perms.exactAlarmAllowed,
                batteryIgnored = batteryIgnored,
                isAutoTimeEnabled = autoTime.isAutoTimeEnabled && autoTime.isAutoTimeZoneEnabled,
                isOnline = checkInitialNetworkState(),
                azanLogs24h = alarmScheduler.getDiagnosticLogs24h()
            )
        }
    }

    private fun startTickerLoop() {
        tickerJob?.cancel()
        tickerJob = viewModelScope.launch {
            while (isActive) {
                delay(1000L)
                val now = Date()
                _uiState.update { state ->
                    val times = state.prayerTimes ?: return@update state.copy(currentTime = now)
                    val prevNextKey = state.nextPrayerInfo?.nextKey
                    val nextInfo = NextPrayerEngine.determineNextPrayer(times, now)
                    val hijri = HijriCalendarEngine.getHijriDate(now, state.hijriAdjustment)
                    val fastingCd = FastingCountdownEngine.compute(
                        prayerTimes = times,
                        currentTime = now,
                        isRamadan = hijri.isRamadan,
                        isUserFasting = state.isUserFastingToday
                    )

                    if (prevNextKey != null && prevNextKey != nextInfo.nextKey) {
                        widgetManager.syncPersistentNotification(
                            prayerTimes = times,
                            zone = state.currentZone,
                            nextLabel = nextInfo.nextLabel,
                            nextTime = nextInfo.nextDisplayTime,
                            countdownText = nextInfo.countdownFormatted,
                            nextTimestampMs = nextInfo.targetTimestamp,
                            hijriFormatted = hijri.formatted,
                            enabled = state.notificationSettings.persistentNotification
                        )
                    }

                    state.copy(
                        currentTime = now,
                        nextPrayerInfo = nextInfo,
                        fastingCountdown = fastingCd
                    )
                }
            }
        }
    }

    private fun startMidnightWatcher() {
        midnightJob?.cancel()
        midnightJob = viewModelScope.launch {
            var lastDay = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
            while (isActive) {
                delay(30_000L)
                val nowDay = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
                if (nowDay != lastDay) {
                    lastDay = nowDay
                    loadPrayerData(forceLive = true)
                }
            }
        }
    }

    fun loadPrayerData(forceLive: Boolean = false) {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (!forceLive && currentState.prayerTimes == null) {
                _uiState.update { it.copy(isLoading = true) }
            } else if (forceLive) {
                _uiState.update { it.copy(isLiveSyncing = true) }
            }

            val zone = currentState.currentZone
            val online = checkInitialNetworkState()
            val result = repository.fetchDayPrayerTimes(
                zone = zone,
                date = Date(),
                forceLive = forceLive,
                isNetworkOnline = online
            )

            val now = Date()
            val todayStr = PrayerRepository.getLocalDateString(now)
            val hijri = HijriCalendarEngine.getHijriDate(now, currentState.hijriAdjustment)
            val ramadan = HijriCalendarEngine.getRamadanCountdownInfo(now, currentState.hijriAdjustment)
            val userFasting = prefsStore.isUserFastingToday(now)
            val nextInfo = NextPrayerEngine.determineNextPrayer(result.times, now)
            val fastingCd = FastingCountdownEngine.compute(result.times, now, hijri.isRamadan, userFasting)
            val upcomingDays = repository.getCachedDaysFromDate(zone.code, result.times.date, limit = 14)

            _uiState.update {
                it.copy(
                    prayerTimes = result.times,
                    isOfflineCalculated = result.isOfflineCalculated,
                    lastSyncTime = result.lastSyncTime,
                    isLoading = false,
                    isLiveSyncing = false,
                    currentTime = now,
                    nextPrayerInfo = nextInfo,
                    hijri = hijri,
                    ramadanInfo = ramadan,
                    recommendation = HijriCalendarEngine.getFastingRecommendation(now, hijri),
                    isUserFastingToday = userFasting,
                    fastingCountdown = fastingCd,
                    prayerChecklist = prefsStore.getPrayerChecklist(todayStr),
                    ramadanCompletedDays = prefsStore.getRamadanCompletedDays(ramadan.ramadanYearKey)
                )
            }

            syncAlarmsAndWidgets(result.times, zone, nextInfo, hijri, currentState.selectedVoice, currentState.notificationSettings, upcomingDays)
        }
    }

    private fun syncAlarmsAndWidgets(
        times: DayPrayerTimes,
        zone: JakimZone,
        nextInfo: NextPrayerInfo,
        hijri: HijriDateInfo,
        voice: AzanVoice,
        notifSettings: AppNotificationSettings,
        upcomingDays: List<DayPrayerTimes>
    ) {
        val enabledMap = PrayerKey.ALL_ORDERED.associateWith { key ->
            notifSettings.preferences[key]?.enabled ?: (key in PrayerKey.OBLIGATORY_ORDERED)
        }
        val items = PrayerKey.ALL_ORDERED.map { key ->
            val rawTime = times.timeFor(key)
            val itemVoice = if (key == PrayerKey.SUBUH && voice == AzanVoice.JAKIM) {
                AzanVoice.SUBUH_SPECIAL
            } else {
                voice
            }
            PrayerTimeItem(
                key = key,
                label = key.rawKey.replaceFirstChar { it.uppercase() },
                time = rawTime,
                displayTime = PrayerCalculator.formatDisplayTime(rawTime),
                voice = itemVoice
            )
        }

        alarmScheduler.schedulePrayers(
            prayerTimes = items,
            defaultVoice = voice,
            enabledPrayers = enabledMap
        )

        widgetManager.syncWidget(
            prayerTimes = times,
            zone = zone,
            nextLabel = nextInfo.nextLabel,
            nextTime = nextInfo.nextDisplayTime,
            hijriFormatted = hijri.formatted,
            upcomingDays = if (upcomingDays.isNotEmpty()) upcomingDays else listOf(times)
        )

        if (notifSettings.persistentNotification) {
            widgetManager.syncPersistentNotification(
                prayerTimes = times,
                zone = zone,
                nextLabel = nextInfo.nextLabel,
                nextTime = nextInfo.nextDisplayTime,
                countdownText = nextInfo.countdownFormatted,
                nextTimestampMs = nextInfo.targetTimestamp,
                hijriFormatted = hijri.formatted,
                enabled = true
            )
        } else {
            widgetManager.cancelPersistentNotification()
        }
    }

    fun selectZone(zone: JakimZone) {
        prefsStore.setActiveZoneCode(zone.code)
        _uiState.update { it.copy(currentZone = zone, locationError = null) }
        loadPrayerData(forceLive = false)
    }

    fun clearLocationError() {
        _uiState.update { it.copy(locationError = null) }
    }

    fun clearGeoBanner() {
        _uiState.update { it.copy(geoBanner = null) }
    }

    fun triggerAutoLocateIfNeeded() {
        if (_uiState.value.showOnboarding || hasAutoLocated) return
        hasAutoLocated = true
        detectGpsLocation(isSilentAuto = true)
    }

    @SuppressLint("MissingPermission")
    fun detectGpsLocation(isSilentAuto: Boolean = false) {
        val lm = appContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (lm == null) {
            if (!isSilentAuto) {
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        locationError = LocationErrorBanner(
                            message = "Peranti anda tidak menyokong pengesanan geolokasi GPS.",
                            isDenied = false
                        )
                    )
                }
            }
            return
        }

        val gpsEnabled = try {
            lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
        } catch (_: Exception) {
            false
        }
        val netEnabled = try {
            lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        } catch (_: Exception) {
            false
        }

        if (!gpsEnabled && !netEnabled) {
            if (!isSilentAuto) {
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        locationError = LocationErrorBanner(
                            message = "GPS peranti dimatikan atau tiada isyarat. Sila hidupkan suis Lokasi di bar atas telefon.",
                            isDenied = false
                        )
                    )
                }
            }
            return
        }

        if (!isSilentAuto) {
            _uiState.update { it.copy(isLocating = true, locationError = null) }
        }

        viewModelScope.launch {
            var bestLoc: Location? = try {
                val p1 = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                val p2 = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                when {
                    p1 != null && p2 != null -> if (p1.time >= p2.time) p1 else p2
                    else -> p1 ?: p2
                }
            } catch (_: Exception) {
                null
            }

            if (bestLoc == null && !isSilentAuto) {
                delay(1200L)
                bestLoc = try {
                    lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                        ?: lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                } catch (_: Exception) {
                    null
                }
            }

            if (bestLoc != null) {
                val nearest = JakimZonesData.findNearestZone(bestLoc.latitude, bestLoc.longitude)
                val prevZone = _uiState.value.currentZone
                prefsStore.setActiveZoneCode(nearest.code)
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        currentZone = nearest,
                        locationError = null,
                        geoBanner = if (prevZone.code != nearest.code || !isSilentAuto) {
                            GeoBannerStatus(
                                message = "Zon waktu solat JAKIM diselaraskan mengikut koordinat GPS anda.",
                                zoneName = "${nearest.shortDaerah} (${nearest.code})"
                            )
                        } else {
                            it.geoBanner
                        }
                    )
                }
                loadPrayerData(forceLive = false)
            } else if (!isSilentAuto) {
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        locationError = LocationErrorBanner(
                            message = "Masa carian GPS tamat atau lokasi belum tersedia. Sila cuba lagi atau pilih zon solat secara manual.",
                            isDenied = false
                        )
                    )
                }
            }
        }
    }

    fun onLocationPermissionDenied() {
        _uiState.update {
            it.copy(
                isLocating = false,
                locationError = LocationErrorBanner(
                    message = "Kebenaran lokasi telah disekat oleh Android. Sila benarkan akses Lokasi pada menu Keizinan Aplikasi (App Info > Permissions) di Tetapan Telefon.",
                    isDenied = true
                )
            )
        }
    }

    fun toggleUserFastingToday() {
        val now = Date()
        val next = !_uiState.value.isUserFastingToday
        prefsStore.setUserFastingToday(next, now)
        _uiState.update { state ->
            val times = state.prayerTimes
            val fastingCd = if (times != null) {
                FastingCountdownEngine.compute(times, now, state.hijri?.isRamadan == true, next)
            } else {
                state.fastingCountdown
            }
            state.copy(isUserFastingToday = next, fastingCountdown = fastingCd)
        }
    }

    fun togglePrayerDone(fardKey: FardPrayerKey) {
        val now = Date()
        val dateStr = _uiState.value.prayerTimes?.date ?: PrayerRepository.getLocalDateString(now)
        val currentMap = _uiState.value.prayerChecklist.toMutableMap()
        currentMap[fardKey] = !(currentMap[fardKey] ?: false)
        prefsStore.savePrayerChecklist(dateStr, currentMap)
        _uiState.update { it.copy(prayerChecklist = currentMap) }
    }

    fun resetPrayerChecklist() {
        val now = Date()
        val dateStr = _uiState.value.prayerTimes?.date ?: PrayerRepository.getLocalDateString(now)
        val empty = FardPrayerKey.ORDERED.associateWith { false }
        prefsStore.clearPrayerChecklist(dateStr)
        _uiState.update { it.copy(prayerChecklist = empty) }
    }

    fun selectAzanVoice(voice: AzanVoice) {
        prefsStore.setAzanVoice(voice)
        alarmScheduler.setActiveVoice(voice)

        val currentPrefs = _uiState.value.notificationSettings.preferences.toMutableMap()
        val subuhVoice = if (voice == AzanVoice.JAKIM) AzanVoice.SUBUH_SPECIAL else voice
        currentPrefs[PrayerKey.SUBUH] = (currentPrefs[PrayerKey.SUBUH] ?: com.solatkini.app.model.PrayerAlertConfig()).copy(voice = subuhVoice)
        for (k in listOf(PrayerKey.ZOHOR, PrayerKey.ASAR, PrayerKey.MAGHRIB, PrayerKey.ISYAK)) {
            currentPrefs[k] = (currentPrefs[k] ?: com.solatkini.app.model.PrayerAlertConfig()).copy(voice = voice)
        }
        val updatedNotif = _uiState.value.notificationSettings.copy(preferences = currentPrefs)
        prefsStore.saveNotificationSettings(updatedNotif)

        _uiState.update { it.copy(selectedVoice = voice, notificationSettings = updatedNotif) }

        val times = _uiState.value.prayerTimes
        val nextInfo = _uiState.value.nextPrayerInfo
        val hijri = _uiState.value.hijri
        if (times != null && nextInfo != null && hijri != null) {
            syncAlarmsAndWidgets(
                times = times,
                zone = _uiState.value.currentZone,
                nextInfo = nextInfo,
                hijri = hijri,
                voice = voice,
                notifSettings = updatedNotif,
                upcomingDays = repository.getCachedDaysFromDate(_uiState.value.currentZone.code, times.date, limit = 14)
            )
        }
    }

    fun togglePrayerNotification(key: PrayerKey) {
        val currentSettings = _uiState.value.notificationSettings
        val currentPref = currentSettings.preferences[key] ?: com.solatkini.app.model.PrayerAlertConfig()
        val updatedPrefs = currentSettings.preferences.toMutableMap().apply {
            put(key, currentPref.copy(enabled = !currentPref.enabled))
        }
        val updatedSettings = currentSettings.copy(preferences = updatedPrefs)
        prefsStore.saveNotificationSettings(updatedSettings)
        _uiState.update { it.copy(notificationSettings = updatedSettings) }

        val times = _uiState.value.prayerTimes
        val nextInfo = _uiState.value.nextPrayerInfo
        val hijri = _uiState.value.hijri
        if (times != null && nextInfo != null && hijri != null) {
            syncAlarmsAndWidgets(
                times = times,
                zone = _uiState.value.currentZone,
                nextInfo = nextInfo,
                hijri = hijri,
                voice = _uiState.value.selectedVoice,
                notifSettings = updatedSettings,
                upcomingDays = repository.getCachedDaysFromDate(_uiState.value.currentZone.code, times.date, limit = 14)
            )
        }
    }

    fun togglePersistentNotification() {
        val nextVal = !_uiState.value.notificationSettings.persistentNotification
        val updatedSettings = _uiState.value.notificationSettings.copy(persistentNotification = nextVal)
        prefsStore.saveNotificationSettings(updatedSettings)
        _uiState.update { it.copy(notificationSettings = updatedSettings) }

        val times = _uiState.value.prayerTimes
        val nextInfo = _uiState.value.nextPrayerInfo
        val hijri = _uiState.value.hijri
        if (times != null && nextInfo != null && hijri != null) {
            widgetManager.syncPersistentNotification(
                prayerTimes = times,
                zone = _uiState.value.currentZone,
                nextLabel = nextInfo.nextLabel,
                nextTime = nextInfo.nextDisplayTime,
                countdownText = nextInfo.countdownFormatted,
                nextTimestampMs = nextInfo.targetTimestamp,
                hijriFormatted = hijri.formatted,
                enabled = nextVal
            )
        }
    }

    fun setLanguage(lang: AppLanguage) {
        prefsStore.setLanguage(lang)
        _uiState.update { it.copy(language = lang) }
    }

    fun setTheme(theme: AppThemeId) {
        prefsStore.setTheme(theme)
        _uiState.update { it.copy(themeId = theme) }
    }

    fun toggleAutoStartBoot() {
        val nextVal = !_uiState.value.autoStartBoot
        prefsStore.setAutoStartBootEnabled(nextVal)
        _uiState.update { it.copy(autoStartBoot = nextVal) }
        if (nextVal) {
            alarmScheduler.openAutostartSettings()
        }
        showToast(
            if (nextVal) "Auto-start selepas restart telefon diaktifkan."
            else "Auto-start selepas restart telefon dimatikan."
        )
    }

    fun adjustHijri(delta: Int) {
        val nextAdj = if (delta == 0) prefsStore.setHijriAdjustment(0)
        else prefsStore.setHijriAdjustment(_uiState.value.hijriAdjustment + delta)

        val now = Date()
        val hijri = HijriCalendarEngine.getHijriDate(now, nextAdj)
        val ramadan = HijriCalendarEngine.getRamadanCountdownInfo(now, nextAdj)
        val rec = HijriCalendarEngine.getFastingRecommendation(now, hijri)
        val ramadanDays = prefsStore.getRamadanCompletedDays(ramadan.ramadanYearKey)

        _uiState.update { state ->
            val fastingCd = state.prayerTimes?.let {
                FastingCountdownEngine.compute(it, now, hijri.isRamadan, state.isUserFastingToday)
            }
            state.copy(
                hijriAdjustment = nextAdj,
                hijri = hijri,
                ramadanInfo = ramadan,
                recommendation = rec,
                ramadanCompletedDays = ramadanDays,
                fastingCountdown = fastingCd
            )
        }
    }

    fun updateGantiTarget(delta: Int) {
        val next = (_uiState.value.gantiTarget + delta).coerceAtLeast(0)
        prefsStore.setGantiTarget(next)
        _uiState.update { it.copy(gantiTarget = next) }
    }

    fun incrementGantiCompleted() {
        val next = (_uiState.value.gantiCompleted + 1).coerceAtLeast(0)
        prefsStore.setGantiCompleted(next)
        _uiState.update { it.copy(gantiCompleted = next) }
    }

    fun decrementGantiCompleted() {
        val next = (_uiState.value.gantiCompleted - 1).coerceAtLeast(0)
        prefsStore.setGantiCompleted(next)
        _uiState.update { it.copy(gantiCompleted = next) }
    }

    fun resetGantiCompleted() {
        prefsStore.setGantiCompleted(0)
        _uiState.update { it.copy(gantiCompleted = 0) }
    }

    fun updateSunnahCount(field: String, delta: Int) {
        val cur = _uiState.value.sunnahCounts
        val updated = when (field) {
            "isninKhamis" -> cur.copy(isninKhamisCompleted = (cur.isninKhamisCompleted + delta).coerceAtLeast(0))
            "ayyamulBidh" -> cur.copy(ayyamulBidhCompleted = (cur.ayyamulBidhCompleted + delta).coerceAtLeast(0))
            "otherSunnah" -> cur.copy(otherSunnahCompleted = (cur.otherSunnahCompleted + delta).coerceAtLeast(0))
            else -> cur
        }
        prefsStore.saveSunnahFastingCounts(updated)
        _uiState.update { it.copy(sunnahCounts = updated) }
    }

    fun toggleRamadanDay(dayNum: Int) {
        if (dayNum !in 1..30) return
        val yearKey = _uiState.value.ramadanInfo?.ramadanYearKey ?: "1448"
        val cur = _uiState.value.ramadanCompletedDays.toMutableList()
        if (cur.contains(dayNum)) cur.remove(dayNum) else cur.add(dayNum)
        val sorted = cur.distinct().sorted()
        prefsStore.saveRamadanCompletedDays(yearKey, sorted)
        _uiState.update { it.copy(ramadanCompletedDays = sorted) }
    }

    fun markPastRamadanDaysUpTo(maxDay: Int) {
        val clampedMax = maxDay.coerceIn(1, 30)
        val yearKey = _uiState.value.ramadanInfo?.ramadanYearKey ?: "1448"
        val list = (1..clampedMax).toList()
        prefsStore.saveRamadanCompletedDays(yearKey, list)
        _uiState.update { it.copy(ramadanCompletedDays = list) }
    }

    fun resetRamadanDays() {
        val yearKey = _uiState.value.ramadanInfo?.ramadanYearKey ?: "1448"
        prefsStore.saveRamadanCompletedDays(yearKey, emptyList())
        _uiState.update { it.copy(ramadanCompletedDays = emptyList()) }
    }

    fun toggleDuaBookmark(id: String) {
        val cur = _uiState.value.duaBookmarks.toMutableSet()
        if (!cur.add(id)) cur.remove(id)
        prefsStore.saveDuaBookmarks(cur)
        _uiState.update { it.copy(duaBookmarks = cur) }
    }

    fun setDuaFontSize(size: ReadingFontSize) {
        prefsStore.setDuaFontSize(size)
        _uiState.update { it.copy(duaFontSize = size) }
    }

    fun setWiridFontSize(size: ReadingFontSize) {
        prefsStore.setWiridFontSize(size)
        _uiState.update { it.copy(wiridFontSize = size) }
    }

    fun toggleShowArabic() {
        val next = !_uiState.value.showArabic
        prefsStore.setShowArabic(next)
        _uiState.update { it.copy(showArabic = next) }
    }

    fun toggleShowRumi() {
        val next = !_uiState.value.showRumi
        prefsStore.setShowRumi(next)
        _uiState.update { it.copy(showRumi = next) }
    }

    fun toggleShowTranslation() {
        val next = !_uiState.value.showTranslation
        prefsStore.setShowTranslation(next)
        _uiState.update { it.copy(showTranslation = next) }
    }

    fun selectTasbihPreset(id: String, defaultTarget: Int) {
        prefsStore.setTasbihSelectedId(id)
        prefsStore.setTasbihCount(0)
        prefsStore.setTasbihLaps(0)
        prefsStore.setTasbihTarget(defaultTarget)
        _uiState.update {
            it.copy(
                tasbihSelectedId = id,
                tasbihCount = 0,
                tasbihLaps = 0,
                tasbihTarget = defaultTarget
            )
        }
    }

    fun setTasbihTarget(target: Int) {
        val safe = target.coerceAtLeast(0)
        prefsStore.setTasbihTarget(safe)
        prefsStore.setTasbihCount(0)
        _uiState.update { it.copy(tasbihTarget = safe, tasbihCount = 0) }
    }

    fun incrementTasbih() {
        val curCount = _uiState.value.tasbihCount
        val target = _uiState.value.tasbihTarget
        val curLaps = _uiState.value.tasbihLaps
        val nextCount = curCount + 1

        if (target > 0 && nextCount >= target) {
            val nextLaps = curLaps + 1
            prefsStore.setTasbihCount(0)
            prefsStore.setTasbihLaps(nextLaps)
            _uiState.update { it.copy(tasbihCount = 0, tasbihLaps = nextLaps) }
        } else {
            prefsStore.setTasbihCount(nextCount)
            _uiState.update { it.copy(tasbihCount = nextCount) }
        }
    }

    fun resetTasbihCurrentCount() {
        prefsStore.setTasbihCount(0)
        _uiState.update { it.copy(tasbihCount = 0) }
    }

    fun resetTasbihAll() {
        prefsStore.setTasbihCount(0)
        prefsStore.setTasbihLaps(0)
        _uiState.update { it.copy(tasbihCount = 0, tasbihLaps = 0) }
    }

    fun toggleTasbihSound() {
        val next = !_uiState.value.tasbihSoundEnabled
        prefsStore.setTasbihSoundEnabled(next)
        _uiState.update { it.copy(tasbihSoundEnabled = next) }
    }

    fun toggleTasbihFreeTouch() {
        val next = !_uiState.value.tasbihFreeTouchEnabled
        prefsStore.setTasbihFreeTouchEnabled(next)
        _uiState.update { it.copy(tasbihFreeTouchEnabled = next) }
    }

    fun triggerTestAlarm(key: PrayerKey, name: String, voice: AzanVoice, delaySec: Int = 0, autoStopSec: Int = 0) {
        val resolved = if (key == PrayerKey.SUBUH && voice == AzanVoice.JAKIM) AzanVoice.SUBUH_SPECIAL else voice
        _uiState.update {
            it.copy(
                alarmModal = AlarmModalUiState(
                    isOpen = true,
                    prayerKey = key,
                    prayerName = name,
                    voice = resolved
                )
            )
        }
        alarmScheduler.testAlarmNow(
            prayerName = name,
            prayerKey = key,
            voice = resolved,
            delaySeconds = delaySec,
            autoStopSeconds = autoStopSec
        )
        refreshDiagnosticLogs()
    }

    fun onNativeAlarmTriggered(key: PrayerKey, name: String, voice: AzanVoice) {
        _uiState.update {
            it.copy(
                alarmModal = AlarmModalUiState(
                    isOpen = true,
                    prayerKey = key,
                    prayerName = name,
                    voice = voice
                )
            )
        }
        refreshDiagnosticLogs()
    }

    fun stopAzanPlaybackOnly() {
        alarmScheduler.stopAzanAudio()
    }

    fun closeAlarmModalAndStopAudio() {
        alarmScheduler.stopAzanAudio()
        _uiState.update { it.copy(alarmModal = it.alarmModal.copy(isOpen = false)) }
    }

    fun refreshDiagnosticLogs() {
        _uiState.update { it.copy(azanLogs24h = alarmScheduler.getDiagnosticLogs24h()) }
    }

    fun clearDiagnosticLogs() {
        alarmScheduler.clearDiagnosticLogs()
        _uiState.update { it.copy(azanLogs24h = emptyList()) }
    }

    fun dismissUpdateBanner() {
        _uiState.update { it.copy(updateBanner = null) }
    }

    private fun scheduleSilentUpdateCheck() {
        viewModelScope.launch {
            delay(5000L)
            if (_uiState.value.showOnboarding) return@launch
            val res = repository.checkForAppUpdate(
                forceCheck = false,
                isNetworkOnline = checkInitialNetworkState()
            )
            if (res.info != null) {
                _uiState.update { it.copy(updateBanner = res.info) }
            }
        }
    }

    override fun onCleared() {
        tickerJob?.cancel()
        midnightJob?.cancel()
        connectivityCallback?.let { cb ->
            try {
                val cm = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                cm?.unregisterNetworkCallback(cb)
            } catch (_: Exception) {
            }
        }
        super.onCleared()
    }
}
