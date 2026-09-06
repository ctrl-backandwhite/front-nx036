/** Lo que hace falta para dar de alta el segundo factor en la aplicación del móvil. */
export interface AltaDeDobleFactor {
  /** La semilla en base32, para teclearla a mano si no se puede escanear. */
  readonly secreto: string;
  /**
   * La dirección `otpauth://` que se convierte en código QR.
   *
   * <p>Lleva DENTRO el secreto, así que el código se dibuja en el propio navegador. Enviarla a un
   * servicio externo de códigos QR —que es lo que se hacía— regalaba la semilla del segundo factor.
   */
  readonly urlOtpauth: string;
}

/** Un dispositivo con la sesión abierta. */
export interface SesionActiva {
  readonly id: string;
  readonly dispositivo: string;
  readonly ip?: string;
  readonly creadaEl: string;
  readonly ultimoUsoEl: string;
  /** La sesión desde la que se está mirando. No se puede cerrar a sí misma. */
  readonly actual: boolean;
}

/** Para elegir el icono: móvil o portátil. Es una regla sobre el dato, no sobre la pantalla. */
export function esDispositivoMovil(dispositivo: string): boolean {
  return /iphone|ipad|android|ios|mobile/i.test(dispositivo);
}

/** Los códigos de un solo uso son de seis dígitos: antes de eso no hay nada que verificar. */
export function codigoTotpCompleto(codigo: string): boolean {
  return /^\d{6}$/.test(codigo.trim());
}
