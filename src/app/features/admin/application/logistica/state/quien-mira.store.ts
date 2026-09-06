import { Service, computed, signal } from '@angular/core';
import { Rol, Usuario, tieneRol } from '@features/auth/domain/model/usuario';

/**
 * Quién está mirando el panel, y con qué papel.
 *
 * <p>Solo GUARDA. Es una caché de una sola lectura: sin ella, el guardián preguntaría al backend en
 * cada navegación entre pantallas del panel, y son diez.
 *
 * <p>El modelo `Usuario` viene del DOMINIO de «auth», que es contrato público entre contextos. Lo que no
 * se puede tocar es su almacén de sesión —vive en su capa de aplicación— y por eso este contexto guarda
 * el suyo en vez de reutilizarlo.
 *
 * <p>Va en la RAÍZ y no colgando de la ruta porque lo consulta el guardián, y un guardián se resuelve
 * antes de que exista el ámbito de la ruta que protege. Además así el panel entero comparte una sola
 * lectura en vez de preguntar por el perfil en cada salto entre pantallas.
 */
@Service()
export class QuienMiraStore {
  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _resuelto = signal(false);

  readonly usuario = this._usuario.asReadonly();

  /**
   * Si ya se sabe quién mira. Distinto de «hay sesión»: al arrancar todavía no se sabe, y decidir en
   * ese instante echaría del panel a quien sí había entrado.
   */
  readonly resuelto = this._resuelto.asReadonly();

  readonly esAdministrador = computed(() => tieneRol(this._usuario(), 'ADMIN'));

  tiene(...roles: readonly Rol[]): boolean {
    return tieneRol(this._usuario(), ...roles);
  }

  fija(usuario: Usuario | null): void {
    this._usuario.set(usuario);
    this._resuelto.set(true);
  }
}
