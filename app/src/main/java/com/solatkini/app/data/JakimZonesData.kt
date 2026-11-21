package com.solatkini.app.data

import com.solatkini.app.model.JakimZone
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

object JakimZonesData {
    val ZONES: List<JakimZone> = listOf(
        // Wilayah Persekutuan
        JakimZone("WLY01", "Wilayah Persekutuan", "Kuala Lumpur, Putrajaya", 3.1390, 101.6869),
        JakimZone("WLY02", "Wilayah Persekutuan", "Labuan", 5.2831, 115.2308),

        // Selangor
        JakimZone("SGR01", "Selangor", "Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam", 3.0738, 101.5183),
        JakimZone("SGR02", "Selangor", "Kuala Selangor, Sabak Bernam", 3.3409, 101.2505),
        JakimZone("SGR03", "Selangor", "Klang, Kuala Langat", 3.0449, 101.4456),

        // Johor
        JakimZone("JHR01", "Johor", "Pulau Aur dan Pulau Pemanggil", 2.4475, 104.5167),
        JakimZone("JHR02", "Johor", "Johor Bahru, Kota Tinggi, Kulai", 1.4927, 103.7414),
        JakimZone("JHR03", "Johor", "Kluang, Pontian", 2.0251, 103.3328),
        JakimZone("JHR04", "Johor", "Batu Pahat, Muar, Segamat, Tangkak", 2.0442, 102.5689),

        // Kedah
        JakimZone("KDH01", "Kedah", "Kota Setar, Kubang Pasu, Pokok Sena", 6.1210, 100.3601),
        JakimZone("KDH02", "Kedah", "Kuala Muda, Yan, Pendang", 5.6435, 100.4883),
        JakimZone("KDH03", "Kedah", "Padang Terap, Sik", 5.8236, 100.7447),
        JakimZone("KDH04", "Kedah", "Baling", 5.6766, 100.9189),
        JakimZone("KDH05", "Kedah", "Bandar Baharu, Kulim", 5.3650, 100.5553),
        JakimZone("KDH06", "Kedah", "Langkawi", 6.3500, 99.8000),
        JakimZone("KDH07", "Kedah", "Puncak Gunung Jerai", 5.7942, 100.4352),

        // Kelantan
        JakimZone("KTN01", "Kelantan", "Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat", 6.1254, 102.2386),
        JakimZone("KTN02", "Kelantan", "Gua Musang, Jeli, Kuala Krai", 4.8785, 101.9686),
        JakimZone("KTN03", "Kelantan", "Lojing", 4.6711, 101.4468),

        // Melaka
        JakimZone("MLK01", "Melaka", "Seluruh Negeri Melaka", 2.1896, 102.2501),

        // Negeri Sembilan
        JakimZone("NGS01", "Negeri Sembilan", "Tampin, Jempol", 2.4705, 102.2302),
        JakimZone("NGS02", "Negeri Sembilan", "Jelebu, Kuala Pilah, Port Dickson, Rembau, Seremban", 2.7258, 101.9424),

        // Pahang
        JakimZone("PHG01", "Pahang", "Pulau Tioman", 2.7902, 104.1698),
        JakimZone("PHG02", "Pahang", "Kuantan, Pekan, Rompin, Muadzam Shah", 3.8126, 103.3256),
        JakimZone("PHG03", "Pahang", "Jerantut, Temerloh, Maran, Bera, Chenor, Jengka", 3.4479, 102.4172),
        JakimZone("PHG04", "Pahang", "Bentong, Lipis, Raub", 3.5222, 101.9085),
        JakimZone("PHG05", "Pahang", "Genting Sempah, Janda Baik, Bukit Tinggi", 3.3106, 101.8682),
        JakimZone("PHG06", "Pahang", "Cameron Highlands, Genting Highlands, Bukit Fraser", 4.4714, 101.3764),

        // Perak
        JakimZone("PRK01", "Perak", "Tapah, Slim River, Tanjung Malim", 3.6841, 101.5204),
        JakimZone("PRK02", "Perak", "Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar", 4.5975, 101.0901),
        JakimZone("PRK03", "Perak", "Lenggong, Pengkalan Hulu, Grik", 5.4277, 101.1278),
        JakimZone("PRK04", "Perak", "Temengor, Belum", 5.5866, 101.4013),
        JakimZone("PRK05", "Perak", "Teluk Intan, Bagan Datuk, Kg Gajah, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor", 4.0259, 101.0199),
        JakimZone("PRK06", "Perak", "Selama, Taiping, Bagan Serai, Parit Buntar", 4.8500, 100.7333),
        JakimZone("PRK07", "Perak", "Bukit Larut (Maxwell Hill)", 4.8625, 100.7932),

        // Perlis
        JakimZone("PLS01", "Perlis", "Seluruh Negeri Perlis (Kangar, Padang Besar, Arau)", 6.4414, 100.1986),

        // Pulau Pinang
        JakimZone("PNG01", "Pulau Pinang", "Seluruh Negeri Pulau Pinang (George Town, Butterworth, Bayan Lepas)", 5.4141, 100.3288),

        // Sabah
        JakimZone("SBH01", "Sabah", "Bahagian Sandakan (Timur), Bukit Garam, Semawang, Temanggong, Tambisan", 5.8394, 118.1172),
        JakimZone("SBH02", "Sabah", "Beluran, Telupid, Pinangah, Terusan, Kuamut, Bahagian Sandakan (Barat)", 5.8906, 117.5594),
        JakimZone("SBH03", "Sabah", "Lahad Datu, Silabukan, Kunak, Sahabat, Semporna, Tungku, Bahagian Tawau (Timur)", 5.0267, 118.3270),
        JakimZone("SBH04", "Sabah", "Bandar Tawau, Balong, Merotai, Kalabakan, Bahagian Tawau (Barat)", 4.2498, 117.8871),
        JakimZone("SBH05", "Sabah", "Kudat, Kota Marudu, Pitas, Pulau Banggi, Bahagian Kudat", 6.8837, 116.8466),
        JakimZone("SBH06", "Sabah", "Gunung Kinabalu", 6.0750, 116.5583),
        JakimZone("SBH07", "Sabah", "Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan", 5.9804, 116.0735),
        JakimZone("SBH08", "Sabah", "Pensiangan, Keningau, Tambunan, Nabawan, Bahagian Pedalaman (Atas)", 5.3436, 116.1601),
        JakimZone("SBH09", "Sabah", "Beaufort, Kuala Penyu, Sipitang, Tenom, Long Pa Sia, Membakut", 5.3473, 115.7455),

        // Sarawak
        JakimZone("SWK01", "Sarawak", "Limbang, Lawas, Sundar, Trusan", 4.7500, 115.0000),
        JakimZone("SWK02", "Sarawak", "Miri, Niah, Bekenu, Sibuti, Marudi", 4.3995, 113.9914),
        JakimZone("SWK03", "Sarawak", "Pandan, Belaga, Suai, Tatau, Sebauh, Bintulu", 3.1667, 113.0333),
        JakimZone("SWK04", "Sarawak", "Sibu, Mukah, Dalat, Song, Igan, Oya, Balingian, Kanowit, Kapit", 2.2875, 111.8305),
        JakimZone("SWK05", "Sarawak", "Sarikei, Matu, Julau, Rajang, Daro, Bintangor, Belawai", 2.1167, 111.5167),
        JakimZone("SWK06", "Sarawak", "Lubok Antu, Sri Aman, Roban, Debak, Betong, Saratok, Kabong", 1.2333, 111.4500),
        JakimZone("SWK07", "Sarawak", "Serian, Simunjan, Samarahan, Sebuyau, Meludam", 1.1667, 110.5667),
        JakimZone("SWK08", "Sarawak", "Kuching, Bau, Lundu, Sematan", 1.5533, 110.3592),
        JakimZone("SWK09", "Sarawak", "Zon Khas (Kampung Matang)", 1.6033, 110.2592),

        // Terengganu
        JakimZone("TRG01", "Terengganu", "Kuala Terengganu, Marang, Kuala Nerus", 5.3296, 103.1370),
        JakimZone("TRG02", "Terengganu", "Besut, Setiu", 5.8333, 102.5500),
        JakimZone("TRG03", "Terengganu", "Hulu Terengganu (Kuala Berang)", 5.0667, 103.0167),
        JakimZone("TRG04", "Terengganu", "Dungun, Kemaman", 4.7756, 103.4246)
    )

    val DEFAULT_ZONE: JakimZone = ZONES.first()

    fun allStates(): List<String> =
        listOf("Semua") + ZONES.map { it.state.trim() }.filter { it.isNotEmpty() }.distinct()

    fun findZoneByCode(code: String?): JakimZone {
        if (code.isNullOrBlank()) return DEFAULT_ZONE
        return ZONES.find { it.code.equals(code.trim(), ignoreCase = true) } ?: DEFAULT_ZONE
    }

    fun findNearestZone(lat: Double, lng: Double): JakimZone {
        var minDistance = Double.POSITIVE_INFINITY
        var nearest = DEFAULT_ZONE

        val latRad = Math.toRadians(lat)
        for (zone in ZONES) {
            val dLat = Math.toRadians(zone.lat - lat)
            val dLng = Math.toRadians(zone.lng - lng)
            val zoneLatRad = Math.toRadians(zone.lat)

            val sinDLat = sin(dLat / 2.0)
            val sinDLng = sin(dLng / 2.0)
            val a = sinDLat * sinDLat + cos(latRad) * cos(zoneLatRad) * sinDLng * sinDLng
            val c = 2.0 * atan2(sqrt(a), sqrt((1.0 - a).coerceAtLeast(0.0)))
            val distanceKm = 6371.0 * c

            if (distanceKm < minDistance) {
                minDistance = distanceKm
                nearest = zone
            }
        }
        return nearest
    }
}
