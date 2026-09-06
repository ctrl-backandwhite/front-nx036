/**
 * Quien ha entrado en la aplicación.
 *
 * <p>Es un modelo de DOMINIO, no la respuesta del backend: si mañana el servidor devuelve otra forma, se
 * cambia el adaptador y esto sigue igual. Cuando un modelo de dominio tiene exactamente la forma del
 * JSON que llega, la dependencia está invertida y el negocio ha quedado atado al transporte.
 */
export type Rol = 'ADMIN' | 'OPERATOR' | 'PARTNER' | 'USER';

export interface Usuario {
  readonly id: string;
  readonly email: string;
  readonly rol: Rol;
  readonly activo: boolean;
  readonly nombreVisible?: string;
  readonly nombre?: string;
  readonly primerApellido?: string;
  readonly segundoApellido?: string;
  readonly nombreCompleto?: string;
  readonly empresa?: string;
  /**
   * País de REGISTRO. No es dónde vive ni adónde envía: es el que decide el margen que se le aplica.
   * Cambiar la dirección de entrega no puede cambiar el precio, y por eso este dato no sale de allí.
   */
  readonly pais?: string;
  readonly idioma?: string;
  readonly telefono?: string;
  readonly avatarUrl?: string;
  readonly creadoEl: string;
  readonly ultimoAccesoEl?: string;
  readonly permisos: readonly string[];
}

/** ¿Tiene alguno de estos papeles? Es una regla de negocio, así que vive en el dominio. */
export function tieneRol(usuario: Usuario | null, ...roles: readonly Rol[]): boolean {
  return usuario !== null && roles.includes(usuario.rol);
}

/** El nombre con el que dirigirse a alguien, con los respaldos en el orden que se quiere leer. */
export function nombreParaSaludar(usuario: Usuario): string {
  return usuario.nombreVisible || usuario.nombre || usuario.nombreCompleto || usuario.email;
}

export interface Credenciales {
  readonly email: string;
  readonly contrasena: string;
  /**
   * Segundo factor. Solo se manda cuando la cuenta lo tiene activo y el backend ya rechazó el primer
   * intento pidiéndolo. Nunca se manda «por si acaso».
   */
  readonly codigoDeUnSoloUso?: string;
  /**
   * Vincular el acceso social a esta cuenta. Llega desde la dirección (`?link=required`) y significa que
   * quien entra tiene que demostrar que controla la cuenta local antes de que se enlace la externa.
   */
  readonly vinculaAccesoSocial?: boolean;
}

export interface SolicitudDeAlta {
  readonly email: string;
  readonly contrasena: string;
  readonly nombre?: string;
  readonly primerApellido?: string;
  readonly segundoApellido?: string;
  readonly nombreVisible?: string;
  readonly empresa?: string;
  readonly pais?: string;
  readonly idioma?: string;
  /** Aceptación explícita de las condiciones, con la versión aceptada, para poder acreditarla. */
  readonly aceptaCondiciones?: boolean;
  readonly versionDeCondiciones?: string;
  /** Consentimiento comercial, SEPARADO del alta: nunca va implícito en aceptar las condiciones. */
  readonly aceptaComunicaciones?: boolean;
}

/** Lo que devuelve una entrada correcta: con quién se ha entrado y las credenciales de la sesión. */
export interface SesionIniciada {
  readonly usuario: Usuario;
  readonly token: string;
  readonly tokenDeRefresco: string;
}
