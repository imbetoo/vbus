import { useEffect } from 'react';
import MeshBackground from './components/ui/MeshBackground';
import Dashboard from './screens/Dashboard';
import { getBuses, getStop, VIGOBUS_API_URL, VIGOBUS_USE_MOCK } from './services/vigobus';
import { toBusArrivals, toStop } from './services/vigobusAdapter';

// TEMPORAL (Fase 2): prueba de conexión con VigoBusAPI. Solo en desarrollo y
// solo por consola; la UI sigue usando los datos de ejemplo.
const TEST_STOP_ID = 3014;

export default function App() {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([getStop(TEST_STOP_ID, { signal }), getBuses(TEST_STOP_ID, { signal })])
      .then(([stop, buses]) => {
        // Efecto ya cancelado (StrictMode lo monta dos veces en desarrollo).
        if (signal.aborted) return;
        console.log(`[VigoBusAPI] Parada ${TEST_STOP_ID} (${VIGOBUS_USE_MOCK ? 'datos simulados' : VIGOBUS_API_URL})`, {
          stop: toStop(stop),
          ...toBusArrivals(buses),
        });
      })
      .catch((error) => {
        if (signal.aborted) return;
        console.error(`[VigoBusAPI] Falló la prueba con la parada ${TEST_STOP_ID}: ${error.message}`, error);
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <MeshBackground />
      <Dashboard />
    </>
  );
}
