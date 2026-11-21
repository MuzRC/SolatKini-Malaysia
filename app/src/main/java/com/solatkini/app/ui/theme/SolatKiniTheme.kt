package com.solatkini.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.solatkini.app.model.AppThemeId

data class SolatKiniPalette(
    val themeId: AppThemeId,
    val primary: Color,
    val primaryDark: Color,
    val primaryLight: Color,
    val surfaceCard: Color,
    val surfaceCardAlt: Color,
    val backgroundCanvas: Color = Color(0xFF070D0B),
    val textPrimary: Color = Color(0xFFF1F5F9),
    val textSecondary: Color = Color(0xFF94A3B8),
    val borderSubtle: Color = Color(0x26FFFFFF),
    val goldAccent: Color = Color(0xFFF59E0B)
) {
    fun toMaterialColorScheme(): ColorScheme = darkColorScheme(
        primary = primary,
        onPrimary = Color(0xFF05110C),
        primaryContainer = surfaceCardAlt,
        onPrimaryContainer = primaryLight,
        secondary = goldAccent,
        onSecondary = Color(0xFF1A1102),
        background = backgroundCanvas,
        onBackground = textPrimary,
        surface = surfaceCard,
        onSurface = textPrimary,
        surfaceVariant = surfaceCardAlt,
        onSurfaceVariant = textSecondary,
        outline = borderSubtle
    )
}

object SolatKiniThemeProvider {
    private val PALETTES: Map<AppThemeId, SolatKiniPalette> = mapOf(
        AppThemeId.EMERALD to SolatKiniPalette(
            themeId = AppThemeId.EMERALD,
            primary = Color(0xFF10B981),
            primaryDark = Color(0xFF059669),
            primaryLight = Color(0xFFA7F3D0),
            surfaceCard = Color(0xFF0B1914),
            surfaceCardAlt = Color(0xFF10261E)
        ),
        AppThemeId.GOLD to SolatKiniPalette(
            themeId = AppThemeId.GOLD,
            primary = Color(0xFFF59E0B),
            primaryDark = Color(0xFFD97706),
            primaryLight = Color(0xFFFDE68A),
            surfaceCard = Color(0xFF1C1306),
            surfaceCardAlt = Color(0xFF2E1E08)
        ),
        AppThemeId.BLUE to SolatKiniPalette(
            themeId = AppThemeId.BLUE,
            primary = Color(0xFF3B82F6),
            primaryDark = Color(0xFF2563EB),
            primaryLight = Color(0xFFBFDBFE),
            surfaceCard = Color(0xFF091426),
            surfaceCardAlt = Color(0xFF10223E)
        ),
        AppThemeId.TEAL to SolatKiniPalette(
            themeId = AppThemeId.TEAL,
            primary = Color(0xFF14B8A6),
            primaryDark = Color(0xFF0D9488),
            primaryLight = Color(0xFF99F6E4),
            surfaceCard = Color(0xFF081A18),
            surfaceCardAlt = Color(0xFF0E2B28)
        ),
        AppThemeId.PURPLE to SolatKiniPalette(
            themeId = AppThemeId.PURPLE,
            primary = Color(0xFFA855F7),
            primaryDark = Color(0xFF9333EA),
            primaryLight = Color(0xFFE9D5FF),
            surfaceCard = Color(0xFF170B26),
            surfaceCardAlt = Color(0xFF25113D)
        ),
        AppThemeId.RED to SolatKiniPalette(
            themeId = AppThemeId.RED,
            primary = Color(0xFFF43F5E),
            primaryDark = Color(0xFFE11D48),
            primaryLight = Color(0xFFFECDD3),
            surfaceCard = Color(0xFF20090E),
            surfaceCardAlt = Color(0xFF340E16)
        ),
        AppThemeId.SILVER to SolatKiniPalette(
            themeId = AppThemeId.SILVER,
            primary = Color(0xFF94A3B8),
            primaryDark = Color(0xFF64748B),
            primaryLight = Color(0xFFE2E8F0),
            surfaceCard = Color(0xFF11161F),
            surfaceCardAlt = Color(0xFF1C2331)
        )
    )

    fun paletteFor(themeId: AppThemeId): SolatKiniPalette =
        PALETTES[themeId] ?: PALETTES.getValue(AppThemeId.EMERALD)
}

val SolatKiniTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 34.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
)

@Composable
fun SolatKiniTheme(
    themeId: AppThemeId = AppThemeId.EMERALD,
    content: @Composable (SolatKiniPalette) -> Unit
) {
    val palette = SolatKiniThemeProvider.paletteFor(themeId)
    MaterialTheme(
        colorScheme = palette.toMaterialColorScheme(),
        typography = SolatKiniTypography
    ) {
        content(palette)
    }
}
