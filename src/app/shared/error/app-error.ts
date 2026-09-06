/**
 * El error tal y como lo entiende la aplicación, ya despegado del transporte.
 *
 * <p>La distinción importa: al dominio no le sirve «HTTP 409». Le sirve saber si el problema es que hacen
 * falta credenciales, que el servidor dijo que no, o que sencillamente no había red. Traducir de lo uno
 * a lo otro es trabajo de la infraestructura; de aquí para dentro solo circula esto.
 *
 * <p>El MENSAJE lo escribe el backend. Es la regla del proyecto y no se cambia aquí: los textos de error
 * se localizan en el servidor a partir de su enumeración de códigos, resueltos con la cabecera `X-Lang`.
 * El front pinta lo que llega. Si no llegara nada, el respaldo sale del diccionario de la interfaz.
 */
export type TipoDeError =
  /** No hubo respuesta: sin red, el servidor caído o la petición cancelada. */
  | 'sin-conexion'
  /** Hace falta identificarse, o la sesión ya no vale. */
  | 'no-autenticado'
  /** Identificado, pero sin permiso para esto. */
  | 'sin-permiso'
  /** Lo pedido no existe. */
  | 'no-encontrado'
  /** El servidor rechazó los datos enviados. */
  | 'peticion-invalida'
  /** Choca con el estado actual: ya existe, ya se pagó, el saldo cambió. */
  | 'conflicto'
  /** Demasiadas peticiones. */
  | 'demasiadas-peticiones'
  /** Falló el servidor. */
  | 'error-del-servidor'
  /** Cualquier otra cosa. */
  | 'desconocido';

export interface AppError {
  readonly tipo: TipoDeError;
  /** Mensaje ya localizado por el backend, listo para enseñar. Vacío si no vino ninguno. */
  readonly mensaje: string;
  /** Código de la enumeración del backend, cuando lo manda. Sirve para reaccionar, no para pintar. */
  readonly codigo?: string;
  /** Código de estado HTTP, si lo hubo. Solo para diagnóstico. */
  readonly estado?: number;
  /** Errores por campo de un formulario rechazado. */
  readonly porCampo?: Readonly<Record<string, string>>;
  /**
   * El detalle que acompaña al error, cuando el backend lo manda.
   *
   * <p>Hace falta para poder reaccionar y no solo informar: «una línea de tu cesta ha caducado» sin
   * decir CUÁL obliga a quien compra a repasarla entera. El mensaje sigue viniendo traducido del
   * servidor; esto es el dato con el que la pantalla decide qué señalar.
   */
  readonly detalles?: Readonly<Record<string, unknown>>;
}

export function creaError(
  tipo: TipoDeError,
  mensaje = '',
  extra: Partial<Omit<AppError, 'tipo' | 'mensaje'>> = {},
): AppError {
  return { tipo, mensaje, ...extra };
}

/** ¿Merece la pena reintentar? Sí para lo pasajero; no para lo que volvería a fallar igual. */
export function esReintentable(error: AppError): boolean {
  return (
    error.tipo === 'sin-conexion' ||
    error.tipo === 'error-del-servidor' ||
    error.tipo === 'demasiadas-peticiones'
  );
}
