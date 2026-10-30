import { useEffect } from 'react';
import MeshBackground from './components/ui/MeshBackground';
import UpdateToast from './components/ui/UpdateToast';
import { useAppUpdate } from './hooks/useAppUpdate';
import { useSettings } from './hooks/useSettings';
import { loadStopsList } from './data/stops';
import Dashboard from './screens/Dashboard';
import { wakeApi } from './services/vigobus';

export default function App() {
  // Ajustes globales (se guardan en LocalStorage): afectan a todas las tarjetas.
  const { settings, updateSetting } = useSettings();
  // Versión nueva desplegada: aviso para actualizar (OTA).
  const appUpdate = useAppUpdate();

  // El backend puede estar dormido: se le avisa nada más abrir la app.
  useEffect(() => {
    wakeApi();
  }, []);

  // Lista de las 1157 paradas: se precarga en un momento libre tras arrancar,
  // así al abrir un buscador ya está lista y su carga no cae en mitad de la
  // animación de la hoja.
  useEffect(() => {
    let idle;
    const timer = setTimeout(() => {
      const preload = () => loadStopsList().catch(() => {});
      idle = window.requestIdleCallback ? requestIdleCallback(preload, { timeout: 3000 }) : setTimeout(preload, 0);
    }, 1500);
    return () => {
      clearTimeout(timer);
      if (idle && window.cancelIdleCallback) cancelIdleCallback(idle);
    };
  }, []);

  return (
    <>
      <MeshBackground lite={settings.background === 'lite'} />
      <Dashboard settings={settings} onSettingChange={updateSetting} />
      <UpdateToast
        open={appUpdate.available}
        updating={appUpdate.updating}
        onUpdate={appUpdate.update}
        onDismiss={appUpdate.dismiss}
      />
    </>
  );
}
