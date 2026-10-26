// Rebote al pulsar, imitando a iOS: se encoge al 97 % y vuelve con una curva
// elástica. `transform` no afecta al layout, así que no mueve flex ni grid.
// Solo se transicionan propiedades baratas (nunca `all`: arrastraría cualquier
// cambio de layout o de sombra).
export const PRESSABLE =
  'transition-[transform,opacity,background-color] duration-[400ms] ease-spring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';
