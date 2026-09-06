import { SolicitudDeAlta } from './usuario';

/**
 * Las reglas del alta que no dependen de nada externo. Se comprueban ANTES de llamar al backend para
 * que quien rellena el formulario vea el problema donde lo puede arreglar, y no en forma de rechazo.
 *
 * <p>La FORTALEZA de la contraseña llega ya resuelta como un booleano y no se recalcula aquí. La lista
 * de reglas (ocho caracteres, mayúscula, minúscula, dígito y símbolo) es copia exacta de la que aplica
 * el servidor y vive en `@shared/validation/politica-contrasena`, que el dominio SÍ puede
 * importar desde que se movió allí — ver la cabecera de ese fichero. La fortaleza se sigue
 * recibiendo como argumento para no acoplar esta regla a una política concreta, pero ya no es por una
 * limitación de la arquitectura, sino por decisión. Volver a escribirla sería tener dos listas: acaban divergiendo, y el síntoma es el peor
 * posible —un formulario que se da por bueno y un servidor que lo rechaza—. Ese fichero es puro y su
 * sitio natural sería `shared/`; mientras siga en el sistema de diseño, el dato entra por el argumento.
 */
export type FalloDelAlta =
  | 'contrasenas-no-coinciden'
  | 'contrasena-debil'
  | 'condiciones-sin-aceptar'
  | 'captcha-pendiente';

export interface BorradorDeAlta extends SolicitudDeAlta {
  readonly repiteContrasena: string;
}

/**
 * Qué impide crear la cuenta ahora mismo, o `null` si nada.
 *
 * <p>Se devuelve UN motivo y no una lista: el formulario enseña un aviso, y cinco a la vez sobre nueve
 * campos no se leen. El orden es el de lectura del formulario.
 */
export function queFaltaParaElAlta(
  borrador: BorradorDeAlta,
  contrasenaSegura: boolean,
  hayCaptcha: boolean,
): FalloDelAlta | null {
  if (borrador.contrasena !== borrador.repiteContrasena) {
    return 'contrasenas-no-coinciden';
  }
  if (!contrasenaSegura) {
    return 'contrasena-debil';
  }
  if (!borrador.aceptaCondiciones) {
    return 'condiciones-sin-aceptar';
  }
  if (!hayCaptcha) {
    return 'captcha-pendiente';
  }
  return null;
}

/**
 * Limpia el borrador para mandarlo: recorta los espacios y convierte en AUSENCIA lo que quedó vacío.
 *
 * <p>Una cadena vacía y un campo ausente no son lo mismo para el backend: la primera se guarda como un
 * nombre en blanco y la segunda deja el dato sin poner.
 */
export function aSolicitudDeAlta(borrador: BorradorDeAlta): SolicitudDeAlta {
  const opcional = (valor: string | undefined): string | undefined => valor?.trim() || undefined;
  return {
    email: borrador.email.trim(),
    contrasena: borrador.contrasena,
    nombre: opcional(borrador.nombre),
    primerApellido: opcional(borrador.primerApellido),
    segundoApellido: opcional(borrador.segundoApellido),
    empresa: opcional(borrador.empresa),
    pais: opcional(borrador.pais),
    idioma: borrador.idioma,
    aceptaCondiciones: borrador.aceptaCondiciones,
    versionDeCondiciones: borrador.versionDeCondiciones,
    aceptaComunicaciones: borrador.aceptaComunicaciones,
  };
}
