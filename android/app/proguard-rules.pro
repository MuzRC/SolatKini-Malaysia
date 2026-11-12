# ===================================================================
# 1. PERATURAN TERAS CAPACITOR & WEBVIEW BRIDGE
# ===================================================================
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-keepattributes JavascriptInterface

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# Lindungi semua kelas yang menggunakan anotasi CapacitorPlugin & PluginMethod
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.PermissionCallback public <methods>;
}

# ===================================================================
# 2. LINDUNGI PLUGIN ASLI SOLATKINI, WIDGET & ALARM RECEIVER
# ===================================================================
-keep class com.solatkini.app.** { *; }
-keepclassmembers class com.solatkini.app.** { *; }

# Kekalkan rujukan sumber R.raw dan R.layout supaya tidak dipadam oleh shrinkResources
-keepclassmembers class **.R$raw {
    public static final int *;
}
-keepclassmembers class **.R$layout {
    public static final int widget_solat;
}
-keepclassmembers class **.R$id {
    public static final int widget_*;
}

# Kekalkan perkhidmatan penggera latar belakang, widget & boot receiver
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.appwidget.AppWidgetProvider

# ===================================================================
# 3. ABAIKAN AMARAN PERPUSTAKAAN PIHAK KETIGA
# ===================================================================
-dontwarn com.google.android.gms.**
-dontwarn androidx.**
-dontwarn org.apache.commons.**

-allowaccessmodification
