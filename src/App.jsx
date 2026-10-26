import MeshBackground from './components/ui/MeshBackground';
import { useSettings } from './hooks/useSettings';
import Dashboard from './screens/Dashboard';

export default function App() {
  // Ajustes globales (se guardan en LocalStorage): afectan a todas las tarjetas.
  const { settings, updateSetting } = useSettings();

  return (
    <>
      <MeshBackground lite={settings.background === 'lite'} />
      <Dashboard settings={settings} onSettingChange={updateSetting} />
    </>
  );
}
