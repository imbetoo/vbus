// Por debajo de este umbral (en minutos) una llegada se marca como urgente.
export const URGENT_MINUTES = 3;

export function isUrgent(minutes) {
  return minutes < URGENT_MINUTES;
}
