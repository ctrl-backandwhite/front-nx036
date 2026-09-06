/**
 * Un aviso del buzón: lo que la plataforma le cuenta a quien tiene cuenta —un pedido que sale, una
 * comisión aprobada, un mensaje del personal— y lo que los clientes le cuentan a la casa por el
 * formulario de contacto.
 *
 * <p>Es un modelo de NEGOCIO, no la respuesta del backend: el adaptador traduce. Cuando el modelo tiene
 * la forma del JSON, la dependencia está invertida y el buzón queda atado al transporte.
 */
export type Carpeta = 'inbox' | 'archived' | 'trash';

/** El flujo de gestión de un aviso accionable. `NEW` es el estado de partida y no se elige a mano. */
export const ESTADOS_DE_GESTION = ['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'RESOLVED'] as const;
export type EstadoDeGestion = (typeof ESTADOS_DE_GESTION)[number];

/** De dónde viene el aviso. Sirve para la etiqueta de color y para el filtro por tipo. */
export type Categoria =
  | 'support'
  | 'affiliate'
  | 'order'
  | 'billing'
  | 'newsletter'
  | 'system'
  | 'general';

export interface Aviso {
  readonly id: string;
  /** Código del suceso que lo originó, tal cual lo nombra el backend (`ORDER_SHIPPED`, `CONTACT`…). */
  readonly tipoDeSuceso: string;
  readonly titulo: string;
  readonly cuerpo?: string;
  readonly canal: string;
  /** Datos del suceso. De aquí sale el correo al que responder cuando es una petición de contacto. */
  readonly datos?: Readonly<Record<string, unknown>>;
  readonly leidoEl?: string | null;
  readonly estado?: EstadoDeGestion | string;
  readonly creadoEl: string;
}

/**
 * ¿Está sin leer?
 *
 * <p>OJO con este criterio: el backend NO manda un booleano, manda `leidoEl` y `estado`. Cuando la
 * interfaz declaraba un `leido: boolean` que nunca llegaba, «no leído» era siempre cierto y la campana
 * contaba TODOS los avisos para siempre — marcarlos leídos no cambiaba nada. La campana, el desplegable
 * y el buzón usan esta misma función para que no puedan contradecirse.
 */
export function sinLeer(aviso: Aviso): boolean {
  return !aviso.leidoEl || (aviso.estado ?? 'NEW') === 'NEW';
}

/**
 * De qué va el aviso, deducido del código del suceso.
 *
 * <p>Se deduce en vez de venir dado porque el backend añade sucesos nuevos sin avisar al front: con una
 * tabla de códigos, cada suceso nuevo aparecería sin etiqueta. Aquí, uno que hable de pedidos cae en
 * «pedido» aunque nadie lo haya dado de alta.
 */
export function categoriaDe(tipoDeSuceso: string): Categoria {
  const codigo = (tipoDeSuceso || '').toUpperCase();
  if (/CONTACT|SUPPORT|TICKET/.test(codigo)) {
    return 'support';
  }
  if (/AFFILIATE|REFERRAL|LOYAL|FIDEL/.test(codigo)) {
    return 'affiliate';
  }
  if (/ORDER|SHIP|DELIVER|FORWARD/.test(codigo)) {
    return 'order';
  }
  if (/SUBSCRIPTION|BILLING|PAYMENT|PLAN|INVOICE|WALLET|RECHARGE/.test(codigo)) {
    return 'billing';
  }
  if (/NEWSLETTER/.test(codigo)) {
    return 'newsletter';
  }
  if (/ADMIN|BROADCAST|SYSTEM|MESSAGE/.test(codigo)) {
    return 'system';
  }
  return 'general';
}

/** El correo de quien escribió, si el aviso lo lleva. Es a quien se responde. */
export function correoDeRespuesta(aviso: Aviso): string | null {
  const correo = aviso.datos?.['email'];
  return typeof correo === 'string' && correo.includes('@') ? correo : null;
}

/**
 * ¿Hay algo que gestionar, o es solo informativo?
 *
 * <p>Solo lo de soporte y lo que trae un correo al que contestar tiene flujo de estados. Un aviso de
 * «pedido enviado» no se «resuelve»: enseñarle un selector de estado sería ofrecer una acción sin
 * sentido.
 */
export function esAccionable(aviso: Aviso): boolean {
  return categoriaDe(aviso.tipoDeSuceso) === 'support' || correoDeRespuesta(aviso) !== null;
}

/** El asunto con el que se contesta, con el prefijo de respuesta ya puesto. */
export function asuntoDeRespuesta(aviso: Aviso): string {
  const asunto = aviso.datos?.['subject'];
  return `Re: ${typeof asunto === 'string' && asunto ? asunto : aviso.titulo}`;
}

/** Los que quedan tras aplicar el filtro por tipo. Sin filtro, todos. */
export function filtraPorCategoria(
  avisos: readonly Aviso[],
  categoria: Categoria | '',
): readonly Aviso[] {
  return categoria ? avisos.filter((a) => categoriaDe(a.tipoDeSuceso) === categoria) : avisos;
}

/** Las categorías presentes en una bandeja, para no ofrecer filtros que no filtran nada. */
export function categoriasPresentes(avisos: readonly Aviso[]): readonly Categoria[] {
  return Array.from(new Set(avisos.map((a) => categoriaDe(a.tipoDeSuceso))));
}
