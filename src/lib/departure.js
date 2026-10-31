/**
 * Modo salida (alarma de origen): "avísame cuando al C3d le falten 5 min
 * para llegar a mi parada". Validación de los minutos, sin React.
 */
import { t } from '../i18n';

/** Atajos de la hoja de configuración. */
export const QUICK_LEADS = [2, 3, 5];
// Más antelación que esto no tiene sentido para salir de casa (y la API rara
// vez da tiempos tan lejanos).
export const MAX_LEAD_MINUTES = 90;

/** Texto del campo → minutos enteros, o `null` si está vacío. Solo dígitos. */
export function parseLead(text) {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/**
 * Por qué no se puede avisar con `lead` minutos a un autobús al que le faltan
 * `eta` minutos, o `null` si se puede:
 *
 * - `empty`: sin número; `range`: fuera de 1–90 min.
 * - `arriving`: el autobús ya está llegando (menos de 1 min).
 * - `too-late`: ya está a `lead` minutos o menos: el aviso sonaría al momento.
 */
export function leadProblem(lead, eta) {
  if (lead == null) return 'empty';
  if (!Number.isInteger(lead) || lead < 1 || lead > MAX_LEAD_MINUTES) return 'range';
  if (eta < 1) return 'arriving';
  if (lead >= eta) return 'too-late';
  return null;
}

/** Antelación propuesta al abrir: el mayor atajo que aún cabe (o 1 min). */
export function defaultLead(eta) {
  for (let i = QUICK_LEADS.length - 1; i >= 0; i--) if (QUICK_LEADS[i] < eta) return QUICK_LEADS[i];
  return 1;
}

/** "cuando falte 1 min" / "cuando falten 5 min". */
export const whenLeft = (lead) => t('departure.whenLeft', { n: lead });
