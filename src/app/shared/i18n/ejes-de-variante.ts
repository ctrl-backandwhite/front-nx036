/**
 * Cómo se llama cada eje de variante en el idioma de quien mira.
 *
 * <p>El nombre del eje se guarda en la base EN ESPAÑOL y no tiene tabla de traducción —«Color»,
 * «Talla», «Altura recomendada»—, así que sin esto se pintaría igual en los ocho idiomas: quien
 * compraba en alemán leía «Farbe» en una etiqueta y «Talla» en la de al lado.
 *
 * <p>Es un MAPA y no una clave calculada a propósito: hay nombres con paréntesis y símbolos
 * —«Medidas (largo x ancho en cm)»— donde cualquier normalización automática produce claves que
 * nadie encuentra al buscarlas en el diccionario.
 *
 * <p><b>Por qué vive aquí y no dentro de un componente.</b> Lo necesitan DOS sitios: el selector de
 * color y la cabecera de la báscula de pesos. Mientras cada uno tuvo el suyo, divergieron: la
 * báscula calculaba la clave con {@code 'attr.' + nombre.toLowerCase()}, que acierta con «Color»
 * —existe `attr.color`— y falla con «Talla», porque esa clave se llama `attr.size`. Resultado: la
 * columna de tallas salía en español fijo en los ocho idiomas (3-oct-2026).
 */
export const CLAVES_DE_EJE: Readonly<Record<string, string>> = {
  color: 'attr.color',
  talla: 'attr.size',
  tamaño: 'attr.size',
  'altura recomendada': 'attr.recommended_height',
  medidas: 'attr.measurements',
  'medidas (largo x ancho en cm)': 'attr.measurements_lw_cm',
  estampado: 'attr.print',
  'longitud (cm)': 'attr.length_cm',
  modelo: 'attr.model',
  'talla de calcetín infantil': 'attr.kids_sock_size',
  'color de la montura': 'attr.frame_color',
  pureza: 'attr.purity',
  capacidad: 'attr.capacity',
  'formato del producto': 'attr.product_format',
  cristal: 'attr.lens',
};

/**
 * La clave de traducción de ese eje, o `undefined` si no está en el mapa.
 *
 * <p>Quien no la encuentra enseña el nombre tal como vino: un término desconocido en su idioma de
 * origen se lee peor, pero se lee; una clave cruda como `attr.foo` no dice nada a nadie.
 */
export function claveDeEje(nombre: string | null | undefined): string | undefined {
  const limpio = (nombre ?? '').trim().toLowerCase();
  return limpio ? CLAVES_DE_EJE[limpio] : undefined;
}
