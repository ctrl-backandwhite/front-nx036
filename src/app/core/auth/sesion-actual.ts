import { Injectable, computed, signal } from '@angular/core';

/**
 * El HECHO de que haya alguien dentro, y lo mínimo que hay que saber de esa persona.
 *
 * <p>Vive en el núcleo porque lo consulta MEDIA aplicación y desde todas partes: la cabecera, para
 * decidir si pinta «entrar» o el menú de la cuenta; el panel, para ocultar secciones; la cesta, para
 * saber si puede guardar. Ninguno de esos sitios pertenece al contexto de autenticación, y obligarlos a
 * importar su estado interno los ataba a él —de hecho ocurrió: el panel acabó importando el almacén de
 * sesión de «auth» y la regla de dependencia lo delató.
 *
 * <p>Lo que hay aquí es DELIBERADAMENTE poco: identificador, papel, país y cómo llamar a la persona. La
 * cuenta completa —dirección, teléfono, empresa, preferencias— sigue siendo del contexto «auth», que es
 * quien la pide y quien la sabe mantener. El núcleo no gestiona identidad: solo publica el hecho.
 *
 * <p>Quien ESCRIBE aquí es únicamente el almacén de sesión de «auth», al entrar y al salir. Todos los
 * demás leen.
 */
export type RolDeSesion = 'ADMIN' | 'OPERATOR' | 'PARTNER' | 'USER';

export interface DatosDeSesion {
  readonly id: string;
  readonly rol: RolDeSesion;
  readonly nombreVisible: string;
  /** País de REGISTRO: el que decide el margen. Nunca el de la dirección de envío. */
  readonly pais: string;
  readonly avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SesionActual {
  private readonly _datos = signal<DatosDeSesion | null>(null);
  private readonly _resuelta = signal(false);

  readonly datos = this._datos.asReadonly();

  /**
   * Si ya se sabe quién mira. Es distinto de «hay sesión»: al arrancar todavía no se sabe, y pintar
   * «entrar» durante ese instante hace parpadear la cabecera de toda la web.
   */
  readonly resuelta = this._resuelta.asReadonly();

  readonly haySesion = computed(() => this._datos() !== null);
  readonly rol = computed<RolDeSesion | null>(() => this._datos()?.rol ?? null);
  readonly esAdministrador = computed(() => this.rol() === 'ADMIN');
  readonly esPersonalInterno = computed(() => {
    const rol = this.rol();
    return rol === 'ADMIN' || rol === 'OPERATOR';
  });

  /** ¿Tiene alguno de estos papeles? Para ocultar lo que no va a poder usar. */
  tiene(...roles: readonly RolDeSesion[]): boolean {
    const rol = this.rol();
    return rol !== null && roles.includes(rol);
  }

  /**
   * Publica quién está dentro. Solo lo llama el almacén de sesión de «auth».
   *
   * <p>Esto NO es la seguridad. La seguridad la aplica el backend en cada petición; aquí solo se decide
   * qué se enseña. Cambiar este valor a mano en el navegador enseña pantallas vacías, no da permisos.
   */
  publica(datos: DatosDeSesion | null): void {
    this._datos.set(datos);
    this._resuelta.set(true);
  }
}
