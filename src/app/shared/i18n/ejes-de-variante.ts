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

/**
 * Cuáles de esos ejes son la FAMILIA TALLA: los que se eligen por medida y van en la tabla con una
 * fila por valor, no en la tira de botones del eje principal.
 *
 * <p>Existe porque la detección se hacía con una expresión regular sobre el nombre —`/size|talla|尺码|
 * 尺寸/`— y el 3-oct-2026 el barrido de idiomas escribió el nombre canónico en español en `name`: un
 * eje que llegaba como `尺寸规格` pasó a llamarse «Medidas», que esa expresión NO reconoce. Resultado
 * medido: 336 productos de PRE y 110 de PRO se quedaron sin selector de talla, y como solo había un
 * selector, quien cambiaba de medida se llevaba al carrito SIEMPRE la misma variante
 * («1-2-1-5-1-8-2-0-867161777488», 165 combinaciones y un único selector).
 *
 * <p>La lección es la que obliga a que esto viva aquí: el nombre del eje es DATO TRADUCIDO, así que
 * reconocerlo por su texto en un idioma concreto se rompe en cuanto el dato se normaliza. El mapa de
 * arriba ya es la lista cerrada de nombres canónicos; la familia se declara sobre ella y no aparte.
 */
export const EJES_DE_TALLA: ReadonlySet<string> = new Set([
  'talla',
  'tamaño',
  'medidas',
  'medidas (largo x ancho en cm)',
  'longitud (cm)',
  'altura recomendada',
  'talla de calcetín infantil',
]);

/**
 * Cómo se reconoce la talla en lo que AÚN no está normalizado: el chino de origen y el inglés.
 *
 * <p>No se quita al añadir la lista canónica. Los ejes entran por el importador y el barrido pasa
 * después, así que entre una carga y la siguiente hay ejes con el nombre todavía en chino; y PRE
 * recibe altas a diario.
 */
const TALLA_SIN_NORMALIZAR = /size|talla|尺码|尺寸|鞋码|码数|适合身高|长度/i;

/** Si ese eje es de la familia talla, por su nombre canónico o por el de origen. */
export function esEjeDeTalla(...nombres: readonly (string | null | undefined)[]): boolean {
  return nombres.some((nombre) => {
    const limpio = (nombre ?? '').trim().toLowerCase();
    return limpio !== '' && (EJES_DE_TALLA.has(limpio) || TALLA_SIN_NORMALIZAR.test(limpio));
  });
}
