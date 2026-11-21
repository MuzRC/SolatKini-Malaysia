package com.solatkini.app.model

enum class DuaCategory(val id: String, val labelMs: String) {
    SEMUA("semua", "Semua Doa"),
    KEGEMARAN("kegemaran", "Kegemaran"),
    SELEPAS_SOLAT("selepas_solat", "Selepas Solat"),
    PAGI_PETANG("pagi_petang", "Pagi & Petang"),
    HARIAN("harian", "Doa Harian"),
    PUASA("puasa", "Puasa & Berbuka"),
    IBU_BAPA_KELUARGA("ibu_bapa_keluarga", "Ibu Bapa & Keluarga"),
    PERLINDUNGAN_REZEKI("perlindungan_rezeki", "Rezeki & Perlindungan");

    companion object {
        fun fromId(id: String?): DuaCategory =
            entries.find { it.id.equals(id?.trim(), ignoreCase = true) } ?: SEMUA
    }
}

data class DuaItem(
    val id: String,
    val category: DuaCategory,
    val title: String,
    val arabic: String,
    val transliteration: String,
    val translation: String,
    val reference: String? = null,
    val benefits: String? = null
)

data class WiridItem(
    val id: String,
    val order: Int,
    val title: String,
    val arabic: String,
    val transliteration: String,
    val translation: String,
    val targetCount: Int,
    val note: String? = null,
    val audioAssetPath: String? = null,
    val fadilat: String? = null
)

data class TasbihPreset(
    val id: String,
    val name: String,
    val arabic: String,
    val transliteration: String,
    val translation: String,
    val defaultTarget: Int,
    val fadilat: String
)
