// Rebote al pulsar, imitando a iOS: se encoge al 97 % y vuelve con una curva
// elástica. `transform` no afecta al layout, así que no mueve flex ni grid.
export const PRESSABLE =
  'transition-all duration-[400ms] ease-spring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';
