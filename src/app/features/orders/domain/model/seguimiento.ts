/**
 * El seguimiento de un envío: dónde está el paquete y por dónde ha pasado.
 *
 * <p>La lógica de esta unidad —decidir qué dos avisos del transportista cuentan el MISMO hecho— es
 * negocio puro y por eso vive aquí y no en la pantalla: se prueba sin montar nada y no cambia si mañana
 * el seguimiento se pinta de otra forma.
 */
export interface HitoDeSeguimiento {
  readonly estado: string;
  readonly descripcion?: string;
  readonly ubicacion?: string;
  readonly ocurridoEl?: string;
}

/** Qué va dentro de un bulto. Vacío en envíos anteriores a que se guardara el reparto. */
export interface ContenidoDeBulto {
  readonly titulo?: string;
  readonly imagenUrl?: string;
  readonly variante?: string;
  readonly cantidad: number;
}

/**
 * Un bulto del pedido con su propia trazabilidad. Un pedido grande no cabe en un solo paquete: se
 * reparte según los límites del transportista y cada guía avanza a su ritmo.
 */
export interface Bulto {
  readonly secuencia: number;
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly pesoGramos: number;
  readonly entregaEstimadaEl?: string;
  readonly hitos: readonly HitoDeSeguimiento[];
  readonly contenido: readonly ContenidoDeBulto[];
}

export interface Seguimiento {
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly entregaEstimadaEl?: string;
  readonly hitos: readonly HitoDeSeguimiento[];
  /** Vacío cuando el pedido viaja en un solo paquete: entonces basta con `hitos`. */
  readonly bultos: readonly Bulto[];
}

/**
 * Deja una descripción comparable: sin mayúsculas, sin tildes, sin puntuación y con un solo espacio
 * entre palabras. «Paquete recogido por el transportista.» y «Paquete Recogido por el transportista»
 * son el mismo texto para cualquiera que lo lea, así que también tienen que serlo aquí.
 */
export function normalizaDescripcion(texto?: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * ¿Estos dos pasos cuentan el MISMO hecho?
 *
 * <p>Dos condiciones, y las dos hacen falta. El estado tiene que coincidir —todo el trayecto
 * internacional llega como SHIPPED, así que colapsar por estado dejaría el seguimiento en un único paso
 * y el comprador perdería justo lo que viene a mirar—, y la descripción tiene que decir lo mismo: igual,
 * o una contenida en la otra («Recogido por el transportista» dentro de «Paquete recogido por el
 * transportista»). Esa segunda parte es la que el backend no puede cubrir: allí la deduplicación compara
 * la frase literal, y el transportista publica el mismo nodo con dos redacciones según por dónde entre
 * el aviso (sondeo periódico o push).
 */
export function esElMismoHito(a: HitoDeSeguimiento, b: HitoDeSeguimiento): boolean {
  if ((a.estado ?? '') !== (b.estado ?? '')) {
    return false;
  }
  const da = normalizaDescripcion(a.descripcion);
  const db = normalizaDescripcion(b.descripcion);
  if (!da || !db) {
    return da === db;
  }
  // Con espacios alrededor para comparar palabras enteras: «transito» no debe casar con «transitorio».
  return ` ${da} `.includes(` ${db} `) || ` ${db} `.includes(` ${da} `);
}

/**
 * Los pasos que se le enseñan al cliente: sin repetidos y del más reciente al más antiguo.
 *
 * <p>El repetido no se tira sin más. Se conserva el PRIMERO —la hora que importa es la del hecho, no la
 * del reanuncio, y es la que acaba en una reclamación— y se completan con el repetido los huecos que
 * traiga (el push suele llegar antes y sin ubicación; el sondeo la trae después).
 *
 * <p>Sin esto, al cliente le aparecía «Entregado al destinatario» dos veces, y antes «Recogido por el
 * transportista» seguido de «Paquete recogido por el transportista»: el mismo hecho contado dos veces
 * con otras palabras. Un seguimiento que se repite hace dudar de todo lo demás que dice.
 */
export function pasosDelEnvio(
  hitos: readonly HitoDeSeguimiento[] = [],
): readonly HitoDeSeguimiento[] {
  const unicos: HitoDeSeguimiento[] = [];
  for (const hito of hitos) {
    const yaEsta = unicos.findIndex((u) => esElMismoHito(u, hito));
    if (yaEsta === -1) {
      unicos.push(hito);
      continue;
    }
    const previo = unicos[yaEsta];
    unicos[yaEsta] = {
      ...previo,
      ubicacion: previo.ubicacion || hito.ubicacion,
      ocurridoEl: previo.ocurridoEl || hito.ocurridoEl,
    };
  }
  // El backend los manda de más antiguo a más nuevo; se invierten aquí porque lo que el cliente quiere
  // saber al abrir es dónde está AHORA su pedido.
  return unicos.reverse();
}

/** ¿Hay algo que enseñar? Sin guía, sin pasos y sin bultos, la sección sobra. */
export function tieneAlgoQueContar(seguimiento: Seguimiento): boolean {
  return (
    !!seguimiento.numeroDeSeguimiento ||
    seguimiento.hitos.length > 0 ||
    seguimiento.bultos.length > 0
  );
}
