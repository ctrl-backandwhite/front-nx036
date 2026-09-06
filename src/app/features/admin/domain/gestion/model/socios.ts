/**
 * Socios de integración: clientes OAuth, aplicaciones conectadas y entregas de webhook.
 *
 * <p>El secreto de un cliente NO se guarda ni se enseña nunca: el backend solo lo devuelve una vez, al
 * crearlo o al rotarlo. Por eso en la tabla siempre hay puntos y la única forma de volver a verlo es
 * rotarlo — y rotarlo invalida el anterior, así que se pregunta antes.
 */
export interface ClienteOauth {
  readonly id: string;
  readonly identificador: string;
  readonly nombre: string;
  readonly concesiones: string;
  readonly permisos: string;
}

export interface AplicacionDeSocio {
  readonly id: string;
  readonly nombre: string;
  readonly identificador: string;
  readonly permisos: string;
  readonly webhook?: string;
  readonly activa: boolean;
}

export interface EntregaDeWebhook {
  readonly id: string;
  readonly evento: string;
  readonly estado: string;
  readonly intentos: number;
  readonly codigoDeRespuesta?: number | null;
  readonly creadaEl?: string;
}

/** Lo que se rellena para dar de alta un cliente. */
export interface AltaDeClienteOauth {
  readonly nombre: string;
  readonly permisos: readonly string[];
}

/** El secreto recién emitido. Solo existe en memoria y solo el tiempo de enseñarlo. */
export interface SecretoEmitido {
  readonly identificador: string;
  readonly secreto: string;
  readonly mensaje?: string;
}

export const CONCESIONES: readonly string[] = [
  'client_credentials', 'authorization_code', 'refresh_token',
];

/**
 * Un nombre que en realidad es un identificador no le dice nada a nadie.
 *
 * <p>Cuando se da de alta sin nombre, el backend copia el identificador técnico; enseñarlo dos veces en
 * la misma fila ocupa sitio sin informar, así que se cae al identificador y punto.
 */
const FORMA_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function nombreLegible(cliente: ClienteOauth): string {
  return FORMA_DE_UUID.test(cliente.nombre ?? '') ? cliente.identificador : cliente.nombre;
}

/**
 * Traduce una lista de concesiones o de permisos separada por comas o espacios.
 *
 * <p>Lo que no tenga traducción se enseña crudo: un permiso nuevo del backend tiene que verse aunque
 * todavía no esté en el diccionario, y no desaparecer de la fila.
 */
export function traduceLista(
  crudo: string | null | undefined,
  prefijo: string,
  t: (clave: string) => string,
): string {
  if (!crudo) {
    return '—';
  }
  const piezas = crudo
    .split(/[\s,]+/)
    .map((pieza) => pieza.trim())
    .filter(Boolean);
  if (!piezas.length) {
    return '—';
  }
  return piezas
    .map((pieza) => {
      const clave = `${prefijo}.${pieza.toLowerCase().replace(/[.-]/g, '_')}`;
      const traducida = t(clave);
      return traducida === clave ? pieza : traducida;
    })
    .join(' · ');
}

/** Los permisos se escriben separados por comas en un solo campo; aquí se parten para enviarlos. */
export function separaPermisos(texto: string): readonly string[] {
  return texto.split(',').map((p) => p.trim()).filter(Boolean);
}
