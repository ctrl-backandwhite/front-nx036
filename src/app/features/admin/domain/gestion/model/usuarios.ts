import { Rol } from '@features/auth/domain/model/usuario';

/**
 * Una cuenta vista desde el panel.
 *
 * <p>No es el `Usuario` de la sesión: aquel es quien mira, este es a quien se administra. Comparten el
 * tipo `Rol` —el vocabulario de papeles es uno solo en todo el producto— pero nada más: aquí interesan
 * los intentos fallidos y el bloqueo, que a quien navega la tienda no le importan.
 */
export interface UsuarioGestionado {
  readonly id: string;
  readonly email: string;
  readonly rol: Rol;
  readonly activo: boolean;
  readonly nombreVisible?: string;
  readonly empresa?: string;
  /** País de REGISTRO: es el que decide el margen, nunca el de envío. */
  readonly pais?: string;
  readonly idioma?: string;
  readonly bloqueadoHasta?: string | null;
  readonly accesosFallidos: number;
  readonly ultimoAcceso?: string | null;
  readonly creadoEl?: string | null;
}

/** Los papeles que se pueden asignar desde el panel, en el orden en que se enseñan. */
export const ROLES: readonly Rol[] = ['ADMIN', 'OPERATOR', 'PARTNER', 'USER'];

/** Lo que se puede cambiar de una cuenta desde la ficha de edición. */
export interface CambiosDeUsuario {
  readonly nombreVisible?: string | null;
  readonly empresa?: string | null;
  readonly pais?: string | null;
  readonly idioma?: string | null;
  readonly activo?: boolean;
}

/** Filtros del listado. Todo opcional: sin nada puesto se piden todas las cuentas. */
export interface FiltroDeUsuarios {
  readonly rol?: string;
  readonly pais?: string;
  readonly texto?: string;
  readonly pagina: number;
  readonly tamano: number;
}

/**
 * ¿Está bloqueada la cuenta AHORA?
 *
 * <p>La fecha de bloqueo se queda escrita cuando caduca, así que comprobar que el campo tiene valor no
 * basta: una cuenta bloqueada hace un mes se pintaría como bloqueada para siempre.
 */
export function estaBloqueado(usuario: UsuarioGestionado, ahora: Date = new Date()): boolean {
  return !!usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > ahora;
}

/** La fecha que se enseña en la lista: la de alta y, si no la hubiera, el último acceso. */
export function fechaDeReferencia(usuario: UsuarioGestionado): string | null {
  return usuario.creadoEl ?? usuario.ultimoAcceso ?? null;
}

/** Un correo con forma de correo. Basta para no mandar una invitación a «asdf». */
export function pareceCorreo(texto: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto.trim());
}

/** Los países presentes en la página actual, para poder filtrar por ellos sin pedir nada más. */
export function paisesPresentes(usuarios: readonly UsuarioGestionado[]): readonly string[] {
  return [...new Set(usuarios.map((u) => u.pais).filter((p): p is string => !!p))].sort();
}
