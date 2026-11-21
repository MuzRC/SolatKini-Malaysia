package com.solatkini.app.domain

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.round
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

object QiblaCalculator {
    const val KAABAH_LAT = 21.422487
    const val KAABAH_LNG = 39.826206

    fun calculateQiblaDirection(userLat: Double, userLng: Double): Double {
        val phiK = Math.toRadians(KAABAH_LAT)
        val lambdaK = Math.toRadians(KAABAH_LNG)
        val phi = Math.toRadians(userLat)
        val lambda = Math.toRadians(userLng)

        val deltaLambda = lambdaK - lambda
        val y = sin(deltaLambda)
        val x = cos(phi) * tan(phiK) - sin(phi) * cos(deltaLambda)

        val qiblaRad = atan2(y, x)
        val qiblaDeg = (Math.toDegrees(qiblaRad) + 360.0) % 360.0
        return round(qiblaDeg * 10.0) / 10.0
    }

    fun calculateDistanceToKaabaKm(userLat: Double, userLng: Double): Int {
        val earthRadiusKm = 6371.0
        val dLat = Math.toRadians(KAABAH_LAT - userLat)
        val dLng = Math.toRadians(KAABAH_LNG - userLng)

        val sinDLat = sin(dLat / 2.0)
        val sinDLng = sin(dLng / 2.0)
        val a = sinDLat * sinDLat +
            cos(Math.toRadians(userLat)) *
            cos(Math.toRadians(KAABAH_LAT)) *
            sinDLng * sinDLng

        val c = 2.0 * atan2(sqrt(a), sqrt((1.0 - a).coerceAtLeast(0.0)))
        return (earthRadiusKm * c).toInt()
    }

    fun shortestAngleDiffDeg(targetDeg: Double, currentDeg: Double): Double {
        var diff = ((targetDeg - currentDeg + 180.0) % 360.0) - 180.0
        if (diff < -180.0) diff += 360.0
        return diff
    }

    fun relativeBearingFromDevice(qiblaDeg: Double, deviceHeadingDeg: Double): Double =
        ((qiblaDeg - deviceHeadingDeg + 540.0) % 360.0) - 180.0
}
