import { useEffect } from 'react';
import MeshBackground from './components/ui/MeshBackground';
import { useSettings } from './hooks/useSettings';
import Dashboard from './screens/Dashboard';
import { wakeApi } from './services/vigobus';

export default function App() {
  // Ajustes globales (se guardan en LocalStorage): afectan a todas las tarjetas.
  const { settings, updateSetting } = useSettings();

  // El backend puede estar dormido: se le avisa nada más abrir la app.
  useEffect(() => {
    wakeApi();
  }, []);

  return (
    <>
      <MeshBackground lite={settings.background === 'lite'} />
      <Dashboard settings={settings} onSettingChange={updateSetting} />
    </>
  );
}
