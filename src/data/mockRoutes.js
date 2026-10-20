/**
 * Rutinas de ejemplo para la Fase 1 (datos estáticos).
 *
 * `icon` es el nombre de un icono de lucide (ver `ROUTE_ICONS` en RouteCard)
 * para que la rutina se pueda serializar tal cual en LocalStorage.
 * `color` es la clase de Tailwind del distintivo de la línea.
 */
export const MOCK_ROUTES = [
  {
    id: 1,
    title: 'Ir al Instituto',
    stopName: 'Urzaiz, 13',
    icon: 'GraduationCap',
    buses: [
      { line: 'C3', color: 'bg-blue-600', time: 2, destination: 'Por Plaza España' },
      { line: '11', color: 'bg-emerald-600', time: 12, destination: 'San Miguel' },
    ],
  },
  {
    id: 2,
    title: 'Volver a Casa',
    stopName: 'Plaza España',
    icon: 'Home',
    buses: [
      { line: 'C3', color: 'bg-blue-600', time: 5, destination: 'Por Camelias' },
      { line: '15A', color: 'bg-amber-600', time: 25, destination: 'Samil' },
    ],
  },
];
