/**
 * El rastro del envío y lo que se le declaró al transportista.
 *
 * <p>Un pedido grande no cabe en un bulto: se reparte según los LÍMITES del transportista —que el panel
 * edita pero no recalcula— y cada guía avanza a su ritmo. Por eso hay eventos del pedido y eventos por
 * bulto: cuando uno se queda parado en aduana, los demás siguen.
 */

export interface EventoDeSeguimiento {
  readonly estado: string;
  readonly descripcion?: string;
  readonly lugar?: string;
  readonly ocurridoEl?: string;
}

export interface ArticuloDelBulto {
  readonly titulo?: string;
  readonly imagenUrl?: string;
  readonly variante?: string;
  readonly cantidad: number;
}

export interface Bulto {
  readonly secuencia: number;
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly estado?: string;
  readonly pesoGramos: number;
  readonly entregaPrevistaEl?: string;
  readonly eventos: readonly EventoDeSeguimiento[];
  /** Vacío en envíos anteriores a que se guardara el reparto. */
  readonly articulos: readonly ArticuloDelBulto[];
}

/** El destinatario tal como salió: nombre partido en dos y país en ISO-2, como pide la API del carrier. */
export interface DestinatarioDeclarado {
  readonly nombre?: string;
  readonly apellidos?: string;
  readonly pais?: string;
  readonly provincia?: string;
  readonly ciudad?: string;
  readonly lineas: readonly string[];
  readonly codigoPostal?: string;
  readonly telefono?: string;
  readonly email?: string;
}

/** Una partida declarada. La aduana clasifica y liquida por el HS code, así que va en columna propia. */
export interface LineaDeclarada {
  readonly descripcionEn?: string;
  readonly descripcionLocal?: string;
  readonly partidaArancelaria?: string;
  readonly cantidad: number;
  readonly valorUnitario?: number;
  readonly moneda?: string;
  readonly pesoUnitarioKg?: number;
}

/**
 * Copia de lo transmitido al crear la guía.
 *
 * <p>Antes solo se guardaba el resultado —guía, canal, peso y valor—, así que ante un rechazo de aduana
 * había que entrar al panel del transportista para saber qué se había mandado.
 */
export interface DeclaracionDeEnvio {
  readonly secuencia: number;
  readonly numeroDeGuia?: string;
  readonly destinatario?: DestinatarioDeclarado;
  readonly lineas: readonly LineaDeclarada[];
}

export interface Seguimiento {
  readonly estado?: string;
  readonly transportista?: string;
  readonly numeroDeSeguimiento?: string;
  readonly entregaPrevistaEl?: string;
  readonly ultimaConsultaEl?: string;
  readonly eventos: readonly EventoDeSeguimiento[];
  /** Vacío cuando el pedido viaja en un solo paquete: entonces basta con `eventos`. */
  readonly bultos: readonly Bulto[];
  /** Vacío fuera del panel y en envíos anteriores a que se archivara la declaración. */
  readonly declaraciones: readonly DeclaracionDeEnvio[];
}

/** El nombre del destinatario declarado, ya montado. Sin nombre no se pinta un hueco: se dice que falta. */
export function nombreDeclarado(destinatario: DestinatarioDeclarado | undefined): string {
  if (!destinatario) {
    return '';
  }
  return [destinatario.nombre, destinatario.apellidos].filter(Boolean).join(' ');
}

/** El valor unitario con su divisa. Sin importe no se inventa un cero: no es lo mismo que gratis. */
export function valorDeclarado(linea: LineaDeclarada): string | undefined {
  if (linea.valorUnitario == null) {
    return undefined;
  }
  return `${linea.valorUnitario} ${linea.moneda ?? ''}`.trim();
}

/**
 * Deja una descripción comparable: sin mayúsculas, sin tildes, sin puntuación y con un solo espacio
 * entre palabras. «Paquete recogido por el transportista.» y «Paquete Recogido por el transportista»
 * son el mismo texto para cualquiera que lo lea, así que también tienen que serlo aquí.
 */
function normaliza(texto: string | undefined): string {
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
 * internacional llega como enviado, así que agrupar solo por estado dejaría el seguimiento en un único
 * paso y se perdería justo lo que se viene a mirar—, y la descripción tiene que decir lo mismo: igual,
 * o una contenida en la otra. Esa segunda parte es la que el backend no puede cubrir: allí se compara
 * la frase literal, y el transportista publica el mismo nodo con dos redacciones según por dónde entre
 * el aviso (sondeo periódico o empuje).
 */
function esElMismoHito(uno: EventoDeSeguimiento, otro: EventoDeSeguimiento): boolean {
  if (uno.estado !== otro.estado) {
    return false;
  }
  const unoNormalizado = normaliza(uno.descripcion);
  const otroNormalizado = normaliza(otro.descripcion);
  if (!unoNormalizado || !otroNormalizado) {
    return unoNormalizado === otroNormalizado;
  }
  // Con espacios alrededor para comparar palabras enteras: «transito» no debe casar con «transitorio».
  return (
    ` ${unoNormalizado} `.includes(` ${otroNormalizado} `) ||
    ` ${otroNormalizado} `.includes(` ${unoNormalizado} `)
  );
}

/**
 * Los pasos que se enseñan: sin repetidos y del más reciente al más antiguo.
 *
 * <p>El repetido no se tira sin más. Se conserva el PRIMERO —la hora que importa es la del hecho, no la
 * del reanuncio, y es la que acaba en una reclamación— y se completan con el repetido los huecos que
 * traiga: el empuje suele llegar antes y sin ubicación, y el sondeo la trae después.
 *
 * <p>Sin esto aparecía «Entregado al destinatario» dos veces, y antes «Recogido por el transportista»
 * seguido de «Paquete recogido por el transportista»: el mismo hecho contado dos veces con otras
 * palabras. Un rastro que se repite hace dudar de todo lo demás que dice.
 */
export function pasosDelEnvio(
  eventos: readonly EventoDeSeguimiento[],
): readonly EventoDeSeguimiento[] {
  const unicos: EventoDeSeguimiento[] = [];
  for (const evento of eventos) {
    const yaEsta = unicos.findIndex((u) => esElMismoHito(u, evento));
    if (yaEsta === -1) {
      unicos.push(evento);
      continue;
    }
    const previo = unicos[yaEsta];
    unicos[yaEsta] = {
      ...previo,
      lugar: previo.lugar || evento.lugar,
      ocurridoEl: previo.ocurridoEl || evento.ocurridoEl,
    };
  }
  // El backend los manda del más antiguo al más nuevo; se invierten porque lo que se quiere saber al
  // abrir es dónde está AHORA el pedido.
  return unicos.reverse();
}
