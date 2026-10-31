/**
 * Píldora de aviso ("Enlace copiado", "Enlace inválido"; el texto lo da
 * `useToast`): siempre montada (`role="status"`, los lectores de pantalla la
 * leen al cambiar) y entra y sale solo con `transform`/`opacity`. `className`
 * la coloca (fija abajo en la pantalla o dentro de un diálogo, que deja inerte
 * lo de fuera).
 */
export default function Toast({ message, className = '' }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`pointer-events-none z-50 w-max max-w-[calc(100vw-2.5rem)] rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-black shadow-lg shadow-black/30 transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
        message ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      } ${className}`}
    >
      {message ?? ''}
    </p>
  );
}
