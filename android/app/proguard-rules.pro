# ===================================================================
# 1. PERATURAN TERAS CAPACITOR & WEBVIEW BRIDGE
# ===================================================================
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# ===================================================================
# 2. LINDUNGI PLUGIN ASLI SOLATKINI & ALARM RECEIVER
# ===================================================================
# Kekalkan class plugin Azan natif dan sebarang BroadcastReceiver
-keep class com.solatkini.app.** { *; }
-keepclassmembers class com.solatkini.app.** { *; }

# Kekalkan perkhidmatan penggera latar belakang & boot
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver

# ===================================================================
# 3. ABAIKAN AMARAN PERPUSTAKAAN PIHAK KETIGA
# ===================================================================
-dontwarn com.google.android.gms.**
-dontwarn androidx.**
-dontwarn org.apache.commons.**

# Optimumkan saiz bytecode secara agresif
-repackageclasses ''
-allowaccessmodification
