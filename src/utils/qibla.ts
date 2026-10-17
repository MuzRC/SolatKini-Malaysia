/**
 * Qibla Compass calculation using spherical trigonometry
 * Kaabah Coordinates: 21.422487° N, 39.826206° E
 */

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates Qibla direction in degrees from True North (0° = North, 90° = East, etc.)
 * In Malaysia, Qibla angle is typically between 291° and 294° West-Northwest.
 */
export function calculateQiblaDirection(userLat: number, userLng: number): number {
  const phiK = toRad(KAABA_LAT);
  const lambdaK = toRad(KAABA_LNG);
  const phi = toRad(userLat);
  const lambda = toRad(userLng);

  const deltaLambda = lambdaK - lambda;

  const y = Math.sin(deltaLambda);
  const x =
    Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(deltaLambda);

  let qiblaRad = Math.atan2(y, x);
  let qiblaDeg = toDeg(qiblaRad);

  // Normalize to 0 - 360 degrees
  qiblaDeg = (qiblaDeg + 360) % 360;

  return Math.round(qiblaDeg * 10) / 10;
}

/**
 * Calculates distance from user to Kaabah in kilometers
 */
export function calculateDistanceToKaaba(userLat: number, userLng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(KAABA_LAT - userLat);
  const dLng = toRad(KAABA_LNG - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
      Math.cos(toRad(KAABA_LAT)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
