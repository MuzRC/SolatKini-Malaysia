package com.solatkini.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.solatkini.app.data.JakimZonesData
import com.solatkini.app.data.WiridDoaData
import com.solatkini.app.model.AzanVoice
import com.solatkini.app.model.DuaCategory
import com.solatkini.app.model.DuaItem
import com.solatkini.app.model.JakimZone
import com.solatkini.app.model.PrayerKey
import com.solatkini.app.service.AzanAudioManager
import com.solatkini.app.ui.AlarmModalUiState
import com.solatkini.app.ui.theme.SolatKiniPalette
import java.util.Locale

@Composable
fun ZoneSelectDialog(
    currentZone: JakimZone,
    palette: SolatKiniPalette,
    onDismiss: () -> Unit,
    onSelectZone: (JakimZone) -> Unit
) {
    var search by remember { mutableStateOf("") }
    var selectedState by remember { mutableStateOf("Semua") }
    val states = remember { JakimZonesData.allStates() }

    val filtered = remember(search, selectedState) {
        val q = search.trim().lowercase(Locale.ROOT)
        JakimZonesData.ZONES.filter { z ->
            val matchState = selectedState == "Semua" || z.state == selectedState
            if (!matchState) return@filter false
            if (q.isEmpty()) true
            else z.code.lowercase(Locale.ROOT).contains(q) ||
                z.daerah.lowercase(Locale.ROOT).contains(q) ||
                z.state.lowercase(Locale.ROOT).contains(q)
        }
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(palette.surfaceCard)
                .border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Pilih Zon Waktu Solat JAKIM", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = null, tint = palette.textSecondary) }
            }

            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text("Cari daerah, negeri, atau kod (cth: Beaufort, SBH09)...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            )

            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(states) { st ->
                    FilterChip(
                        selected = selectedState == st,
                        onClick = { selectedState = st },
                        label = { Text(st, fontSize = 11.sp) }
                    )
                }
            }

            LazyColumn(
                modifier = Modifier.height(340.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filtered) { z ->
                    val isSel = z.code == currentZone.code
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isSel) palette.surfaceCardAlt else palette.backgroundCanvas)
                            .border(1.dp, if (isSel) palette.primary else palette.borderSubtle, RoundedCornerShape(14.dp))
                            .clickable {
                                onSelectZone(z)
                                onDismiss()
                            }
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("${z.code} · ${z.state}", color = palette.primary, fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                            Text(z.daerah, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        }
                        if (isSel) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = palette.primary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AudioSettingsDialog(
    selectedVoice: AzanVoice,
    nextPrayerKey: PrayerKey,
    nextPrayerLabel: String,
    palette: SolatKiniPalette,
    onDismiss: () -> Unit,
    onSelectVoice: (AzanVoice) -> Unit,
    onTriggerTestAlarm: (PrayerKey, String, AzanVoice, Int) -> Unit,
    onStopAudio: () -> Unit
) {
    val playbackState = remember { mutableStateOf(AzanAudioManager.playbackState.value) }
    LaunchedEffect(Unit) {
        AzanAudioManager.playbackState.collect { playbackState.value = it }
    }

    Dialog(onDismissRequest = {
        onStopAudio()
        onDismiss()
    }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(palette.surfaceCard)
                .border(1.dp, palette.borderSubtle, RoundedCornerShape(24.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Pilihan Audio Azan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                IconButton(onClick = {
                    onStopAudio()
                    onDismiss()
                }) { Icon(Icons.Default.Close, contentDescription = null, tint = palette.textSecondary) }
            }

            Button(
                onClick = {
                    val v = if (nextPrayerKey == PrayerKey.SUBUH && selectedVoice == AzanVoice.JAKIM) {
                        AzanVoice.SUBUH_SPECIAL
                    } else {
                        selectedVoice
                    }
                    onTriggerTestAlarm(nextPrayerKey, nextPrayerLabel, v, 3)
                },
                colors = ButtonDefaults.buttonColors(containerColor = palette.primary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Uji Penggera Asli Telefon (3 Saat)", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }

            LazyColumn(
                modifier = Modifier.height(340.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(AzanAudioManager.AZAN_OPTIONS) { opt ->
                    val isActive = opt.id == selectedVoice
                    val isPlayingThis = playbackState.value.isPlaying && playbackState.value.activeVoice == opt.id
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isActive) palette.surfaceCardAlt else palette.backgroundCanvas)
                            .border(1.dp, if (isActive) palette.primary else palette.borderSubtle, RoundedCornerShape(14.dp))
                            .clickable { onSelectVoice(opt.id) }
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(opt.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(opt.reciter, color = palette.primary, fontSize = 11.sp)
                            Text(opt.description, color = palette.textSecondary, fontSize = 11.sp)
                        }
                        IconButton(onClick = {
                            if (isPlayingThis) onStopAudio()
                            else onTriggerTestAlarm(nextPrayerKey, nextPrayerLabel, opt.id, 0)
                        }) {
                            Icon(
                                imageVector = if (isPlayingThis) Icons.Default.Stop else Icons.Default.PlayArrow,
                                contentDescription = null,
                                tint = palette.primary
                            )
                        }
                    }
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Button(onClick = {
                    onStopAudio()
                    onDismiss()
                }, colors = ButtonDefaults.buttonColors(containerColor = palette.primary)) {
                    Text("Selesai", color = Color(0xFF04100B), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun AzanAlarmDialog(
    modalState: AlarmModalUiState,
    palette: SolatKiniPalette,
    onStopAudio: () -> Unit,
    onReplayAudio: () -> Unit,
    onDismissAndStop: () -> Unit
) {
    if (!modalState.isOpen) return

    val playback = remember { mutableStateOf(AzanAudioManager.playbackState.value) }
    LaunchedEffect(Unit) {
        AzanAudioManager.playbackState.collect { playback.value = it }
    }

    var showDoa by remember { mutableStateOf(false) }
    val doaAzan: DuaItem = remember {
        WiridDoaData.DUA_COLLECTION.find { it.id == "dua-selepas-azan" }
            ?: DuaItem(
                id = "dua-selepas-azan",
                category = DuaCategory.SELEPAS_SOLAT,
                title = "Doa Selepas Azan Selesai",
                arabic = "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
                transliteration = "Allahumma Rabba hazihid-da'watit-tammah, was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah, wab'athhu maqamam-mahmudanil-lazi wa'adtah.",
                translation = "Ya Allah, Tuhan yang menguasai seruan yang sempurna ini dan solat yang didirikan. Berikanlah kepada Nabi Muhammad kedudukan yang tinggi dan keutamaan, dan bangkitkanlah baginda pada kedudukan terpuji yang telah Engkau janjikan.",
                reference = "HR Al-Bukhari (No. 614)"
            )
    }

    val voiceTitle = AzanAudioManager.AZAN_OPTIONS.find { it.id == modalState.voice }?.title ?: "Azan Rasmi JAKIM"

    Dialog(onDismissRequest = onDismissAndStop, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(palette.surfaceCardAlt)
                .border(1.dp, palette.primary.copy(alpha = 0.5f), RoundedCornerShape(28.dp))
                .padding(22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("PEMBERITAHUAN WAKTU SOLAT JAKIM", color = palette.goldAccent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text("Masuk Waktu ${modalState.prayerName}", color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
            Text(voiceTitle, color = palette.primaryLight, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                if (playback.value.isPlaying) {
                    OutlinedButton(onClick = onStopAudio, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Stop, contentDescription = null, tint = Color(0xFFF43F5E))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Hentikan", fontSize = 12.sp)
                    }
                } else {
                    Button(onClick = onReplayAudio, colors = ButtonDefaults.buttonColors(containerColor = palette.primaryDark), modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Mainkan", color = Color.White, fontSize = 12.sp)
                    }
                }

                Button(onClick = { showDoa = !showDoa }, colors = ButtonDefaults.buttonColors(containerColor = palette.primary), modifier = Modifier.weight(1f)) {
                    Text(if (showDoa) "Tutup Doa" else "Doa Azan", color = Color(0xFF04100B), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }

            if (showDoa) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(palette.surfaceCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(doaAzan.arabic, color = palette.primaryLight, fontSize = 18.sp, textAlign = TextAlign.End, modifier = Modifier.fillMaxWidth())
                    Text(""${doaAzan.transliteration}"", color = palette.textPrimary, fontSize = 12.sp)
                    Text(doaAzan.translation, color = palette.textSecondary, fontSize = 12.sp)
                }
            }

            TextButton(onClick = onDismissAndStop) {
                Text("Tutup Paparan", color = palette.textSecondary)
            }
        }
    }
}

@Composable
fun DndGuideDialog(
    palette: SolatKiniPalette,
    onDismiss: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onOpenExactAlarmSettings: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = palette.surfaceCard,
        title = { Text("Panduan Bypass Silent & DND", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("1. Audio azan dimainkan melalui saluran penggera sistem (USAGE_ALARM).", color = palette.textSecondary, fontSize = 12.sp)
                Text("2. Di Settings > Apps > SolatKini > Notifications, aktifkan Override Do Not Disturb jika tersedia.", color = palette.textSecondary, fontSize = 12.sp)
                Text("3. Pastikan kebenaran Exact Alarm dan pengecualian bateri diaktifkan.", color = palette.textSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onOpenNotificationSettings, modifier = Modifier.weight(1f)) {
                        Text("Notifikasi", fontSize = 11.sp)
                    }
                    OutlinedButton(onClick = onOpenExactAlarmSettings, modifier = Modifier.weight(1f)) {
                        Text("Exact Alarm", fontSize = 11.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = palette.primary)) {
                Text("Faham & Tutup", color = Color(0xFF04100B), fontWeight = FontWeight.Bold)
            }
        }
    )
}

@Composable
fun BatteryGuideDialog(
    palette: SolatKiniPalette,
    batteryIgnored: Boolean,
    onDismiss: () -> Unit,
    onRequestBattery: () -> Unit,
    onOpenAutostart: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = palette.surfaceCard,
        title = { Text("Sekatan Bateri & Autostart", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Untuk mengelakkan sistem operasi membekukan azan semasa skrin berkunci, nyahaktif sekatan bateri dan benarkan Autostart.",
                    color = palette.textSecondary,
                    fontSize = 12.sp
                )
                Button(
                    onClick = onRequestBattery,
                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (batteryIgnored) "Sekatan Bateri Dinyahaktifkan" else "Nyahaktif Sekatan Bateri",
                        color = Color(0xFF140D02),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
                OutlinedButton(onClick = onOpenAutostart, modifier = Modifier.fillMaxWidth()) {
                    Text("Buka Menu Autostart Telefon", fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = palette.primary)) {
                Text("Selesai", color = Color(0xFF04100B), fontWeight = FontWeight.Bold)
            }
        }
    )
}
