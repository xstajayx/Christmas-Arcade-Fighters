// World units and 60 Hz simulation ticks. Keep tuning separate from rendering.
export const balance = {
  pushHeight: 65,
  superReferenceHealth: 1200,
  superFraction: 0.28,
  healthScale: 11.5,
  damageScale: 4.5,
  acceleration: 0.45,
  braking: 0.6,
  strideDistance: 96,
  meterOnHit: 8,
  meterOnGuard: 3,
  meterOnReceive: 5,
  comboFloor: 0.42,
  comboStep: 0.1,
  maxCombo: 6,
  maxJuggles: 3,
};
export const bodyWidths = {
  jamie: 120,
  nash: 124,
  bucket: 120,
  beardy: 122,
  frost: 120,
  rob: 124,
  santa: 124,
};
// Contact endpoints measured from the feet anchor, in world units; small character differences retained.
export const strikeReach = {
  jamie: [84, 92],
  nash: [86, 94],
  bucket: [84, 92],
  beardy: [85, 93],
  frost: [84, 92],
  rob: [86, 94],
  santa: [86, 94],
};
export const normalDamage = {
  punch: 30,
  kick: 38,
  heavyPunch: 54,
  heavyKick: 65,
  low: 32,
  air: 40,
  grab: 85,
};
