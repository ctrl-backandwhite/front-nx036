/**
 * Los datos personales editables de la cuenta.
 *
 * <p>El PAÍS que hay aquí es el de REGISTRO: es el que fija el margen y, con él, el precio que se ve en
 * todo el escaparate. No se toca desde las direcciones de envío —cambiar adónde se manda un paquete no
 * puede cambiar lo que cuesta— y en la pantalla solo lo edita quien administra.
 */
export interface DatosDePerfil {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  empresa: string;
  pais: string;
  idioma: string;
  telefono: string;
}

/** Los ocho idiomas de la interfaz, en el orden en que se ofrecen. */
export const IDIOMAS_DEL_PERFIL: readonly { readonly codigo: string; readonly nombre: string }[] = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'pt', nombre: 'Português' },
  { codigo: 'zh', nombre: '中文' },
  { codigo: 'fr', nombre: 'Français' },
  { codigo: 'de', nombre: 'Deutsch' },
  { codigo: 'it', nombre: 'Italiano' },
  { codigo: 'nl', nombre: 'Nederlands' },
];

export interface CambioDeContrasena {
  readonly actual: string;
  readonly nueva: string;
}

/**
 * De dónde sale el nombre de pila al abrir el perfil.
 *
 * <p>Las cuentas antiguas solo tienen nombre visible, sin partirlo en nombre y apellidos. Si el campo
 * se dejara vacío, el primer guardado del cliente BORRARÍA el nombre que tenía sin que él lo tocara.
 */
export function siembraNombre(
  nombre: string | undefined,
  primerApellido: string | undefined,
  segundoApellido: string | undefined,
  nombreVisible: string | undefined,
): string {
  if (nombre) {
    return nombre;
  }
  const tienePartes = !!(primerApellido || segundoApellido);
  return tienePartes ? '' : (nombreVisible ?? '');
}

/** Cada regla de la política de contraseñas, con su clave de texto y si se cumple. */
export interface RequisitoDeContrasena {
  readonly clave: string;
  readonly cumple: boolean;
}

/**
 * La política de contraseñas, la MISMA que aplica el backend.
 *
 * <p>Se comprueba en vivo mientras se escribe para no mandar al servidor algo que va a rechazar, pero
 * quien manda sigue siendo él: esto es cortesía, no seguridad.
 */
export function requisitosDeContrasena(clave: string): readonly RequisitoDeContrasena[] {
  return [
    { clave: 'profile.pwd_req_length', cumple: clave.length >= 8 },
    { clave: 'profile.pwd_req_upper', cumple: /[A-Z]/.test(clave) },
    { clave: 'profile.pwd_req_lower', cumple: /[a-z]/.test(clave) },
    { clave: 'profile.pwd_req_digit', cumple: /\d/.test(clave) },
    { clave: 'profile.pwd_req_symbol', cumple: /[^A-Za-z0-9]/.test(clave) },
  ];
}

export function contrasenaCumpleLaPolitica(clave: string): boolean {
  return requisitosDeContrasena(clave).every((requisito) => requisito.cumple);
}

/**
 * El código con el que se confirma la baja de la cuenta.
 *
 * <p>Cuatro caracteres, no seis: el original aceptaba el envío a partir de cuatro y el servidor es quien
 * decide si vale. Estrecharlo aquí bloquearía a quien recibió un código más corto.
 */
export function codigoDeBajaSuficiente(codigo: string): boolean {
  return codigo.trim().length >= 4;
}
