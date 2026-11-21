# Mengekalkan nombor baris dan nama fail sumber untuk memudahkan semakan crash/stacktrace
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Kotlin & Coroutines
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# Mengekalkan anotasi @Keep dan kelas model data (berguna jika ada penghuraian JSON/API waktu solat)
-keep class androidx.annotation.Keep
-keep @androidx.annotation.Keep class * {*;}
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# Elakkan amaran R8 pada kelas standard Java/Android yang tidak digunakan
-dontwarn java.lang.invoke.**
