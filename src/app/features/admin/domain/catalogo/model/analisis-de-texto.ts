/**
 * Los formatos abreviados con los que se teclean listas y mapas en el alta de producto.
 *
 * <p>Existen porque el alta manual se rellena copiando de la ficha de origen, donde los datos vienen en
 * línea: obligar a escribir JSON para meter cuatro colores convertiría un minuto en diez. Todas estas
 * funciones son PURAS y toleran lo que se teclea de verdad —espacios de más, líneas vacías, un par a
 * medio escribir—, porque lo contrario es perder lo escrito por una coma.
 */

/** Un decimal, o nada si el campo está vacío o no es un número. */
export function numeroOpcional(texto: string): number | undefined {
  const limpio = texto.trim();
  if (limpio === '') {
    return undefined;
  }
  const numero = Number(limpio.replace(',', '.'));
  return Number.isNaN(numero) ? undefined : numero;
}

/** Un entero. Lo que llega con decimales se trunca en vez de rechazarse: «2,7 días» son 2 días. */
export function enteroOpcional(texto: string): number | undefined {
  const numero = numeroOpcional(texto);
  return numero === undefined ? undefined : Math.trunc(numero);
}

/** Una lista escrita con una entrada por línea. */
export function porLineas(texto: string): readonly string[] {
  return texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);
}

/** Una lista escrita con comas o saltos de línea, indistintamente. */
export function porComas(texto: string): readonly string[] {
  return texto
    .split(/[,\n]/)
    .map((trozo) => trozo.trim())
    .filter(Boolean);
}

/** «Color:Rojo, Talla:M» → {Color: 'Rojo', Talla: 'M'}. Los pares incompletos se descartan. */
export function paresPorComas(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const trozo of texto.split(',')) {
    const corte = trozo.indexOf(':');
    if (corte > 0) {
      const clave = trozo.slice(0, corte).trim();
      const valor = trozo.slice(corte + 1).trim();
      if (clave && valor) {
        salida[clave] = valor;
      }
    }
  }
  return salida;
}

/** Líneas «valor=dirección» → {valor: dirección}. Es como se pega la foto de cada color. */
export function asignacionesPorLinea(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const linea of texto.split('\n')) {
    const corte = linea.indexOf('=');
    if (corte > 0) {
      const clave = linea.slice(0, corte).trim();
      const valor = linea.slice(corte + 1).trim();
      if (clave && valor) {
        salida[clave] = valor;
      }
    }
  }
  return salida;
}

/** Líneas «valor=es:Blanco, en:White» → {valor: {es: 'Blanco', en: 'White'}}. */
export function traduccionesPorLinea(texto: string): Record<string, Record<string, string>> {
  const salida: Record<string, Record<string, string>> = {};
  for (const linea of texto.split('\n')) {
    const corte = linea.indexOf('=');
    if (corte <= 0) {
      continue;
    }
    const clave = linea.slice(0, corte).trim();
    if (!clave) {
      continue;
    }
    const traducciones = paresPorComas(linea.slice(corte + 1));
    const normalizadas: Record<string, string> = {};
    for (const [idioma, etiqueta] of Object.entries(traducciones)) {
      normalizadas[idioma.toLowerCase()] = etiqueta;
    }
    if (Object.keys(normalizadas).length) {
      salida[clave] = normalizadas;
    }
  }
  return salida;
}

/** «5:120, 4:30, 3:5» → {'5': 120, '4': 30, '3': 5}: el desglose de estrellas. */
export function conteosPorComas(texto: string): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [clave, valor] of Object.entries(paresPorComas(texto))) {
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      salida[clave] = numero;
    }
  }
  return salida;
}
