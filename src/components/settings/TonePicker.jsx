import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { ALARM_TONES, previewTone } from '../../lib/alerts';
import { haptics } from '../../lib/haptics';
import ChoiceList from '../ui/ChoiceList';

/**
 * "Tono de alarma": lista al estilo de los sonidos de iOS. Tocar una fila la
 * elige y la hace sonar (una vez, en el mismo toque: Safari no deja sonar
 * fuera de un gesto); tocar la ya elegida la vuelve a escuchar. Mientras
 * suena, un altavoz late junto a su nombre.
 */
export default function TonePicker({ value, onChange }) {
  const t = useT();
  const [playing, setPlaying] = useState(null);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => setPlaying(null), playing.ms);
    return () => clearTimeout(timer);
  }, [playing]);

  const select = (tone) => {
    if (tone !== value) {
      haptics.select();
      onChange(tone);
    }
    setPlaying({ tone, ms: previewTone(tone) });
  };

  return (
    <ChoiceList
      label={t('settings.tone')}
      value={value}
      onSelect={select}
      options={ALARM_TONES.map((tone) => ({
        value: tone,
        label: t(`tone.${tone}`),
        hint: t(`tone.${tone}.hint`),
        icon:
          playing?.tone === tone ? (
            <Volume2
              className="h-4 w-4 animate-pulse text-accent motion-reduce:animate-none"
              strokeWidth={2.5}
              aria-label={t('tone.playing')}
            />
          ) : null,
      }))}
    />
  );
}
