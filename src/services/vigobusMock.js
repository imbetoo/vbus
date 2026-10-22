/**
 * Respuestas simuladas de VigoBusAPI con EXACTAMENTE la forma documentada en
 * su `docs/openapi.yaml` (schemas `Stop` y `BusesResponse`), para avanzar sin
 * el backend. Datos ilustrativos (no copiados de la parada real 3014).
 *
 * `bus_id` es, como en la API, el MD5 de `line` + `route`; `time` son minutos
 * (0 = llegando) y la lista viene ordenada por llegada.
 */

export const MOCK_STOPS = {
  3014: {
    stop_id: 3014,
    name: 'Policarpo Sanz, 40',
    original_name: 'Policarpo Sanz, 40',
    lat: 42.2386,
    lon: -8.7203,
    source: 'cache',
    created: '2026-10-22T08:00:00',
  },
};

export const MOCK_BUSES = {
  3014: [
    { line: 'C1', route: 'Centro por Praza de América', time: 0, bus_id: '23e65915cd79539e6384ae1857843c64' },
    { line: 'C3d', route: 'Encarnación por Praza de España', time: 2, bus_id: '3dfb5a2d39d8a584254416fe45f01024' },
    { line: '11', route: 'Hospital Álvaro Cunqueiro', time: 6, bus_id: 'e8275b93d693fd8ef22f2184370b079f' },
    { line: '15A', route: 'Samil por Beiramar', time: 9, bus_id: '6b4169a923b497514552d411838c53a5' },
    { line: 'C3i', route: 'Encarnación por Gran Vía', time: 14, bus_id: '8c19c4ca90e309359fce2fc0b68ac199' },
    { line: '4C', route: 'Coia por Florida', time: 18, bus_id: '89560e65e3c9d37255f8cc857970501e' },
    { line: '11', route: 'Hospital Álvaro Cunqueiro', time: 27, bus_id: 'e8275b93d693fd8ef22f2184370b079f' },
    { line: '15A', route: 'Samil por Beiramar', time: 31, bus_id: '6b4169a923b497514552d411838c53a5' },
  ],
};

// Como la API (`buses_normal_limit`): sin `get_all_buses` devuelve los 5 primeros.
const NORMAL_LIMIT = 5;

/** Cuerpo de `GET /buses/{stop_id}?get_all_buses=...` para una parada simulada. */
export function mockBusesResponse(stopId, all) {
  const buses = MOCK_BUSES[stopId] ?? [];
  return {
    buses: all ? buses : buses.slice(0, NORMAL_LIMIT),
    more_buses_available: !all && buses.length > NORMAL_LIMIT,
    source: 'cache',
  };
}
