import { Injectable, computed, inject, signal } from '@angular/core';
import { Rol, Usuario, tieneRol } from '../../domain/model/usuario';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';

/**
 * Quién está dentro. Es el estado de sesión, y lo consulta media aplicación.
 *
 * <p>Solo GUARDA: no llama al backend ni decide nada. Quien entra, sale o consulta el perfil es un caso
 * de uso; si este almacén hiciera además las llamadas, cada pantalla podría provocar efectos desde
 * cualquier sitio y no habría un único lugar donde leer qué ocurre al iniciar sesión.
 *
 * <p>El país se propaga aquí y no en cada sitio que toca el usuario: es lo que viaja en cada petición
 * para calcular el margen, y tener dos escrituras distintas de un dato así acaba en precios que no
 * cuadran con lo que se pintó.
 */
@Injectable({ providedIn: 'root' })
export class SesionStore {
  private readonly pais = inject(PaisDelUsuario);

  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _cargando = signal(false);
  private readonly _resuelta = signal(false);

  readonly usuario = this._usuario.asReadonly();
  readonly cargando = this._cargando.asReadonly();

  /**
   * Si ya se sabe quién mira. Distinto de «hay sesión»: al arrancar no se sabe todavía, y pintar
   * «entra» durante ese instante hace parpadear la cabecera de toda la web.
   */
  readonly resuelta = this._resuelta.asReadonly();

  readonly haySesion = computed(() => this._usuario() !== null);
  readonly esAdministrador = computed(() => tieneRol(this._usuario(), 'ADMIN'));
  readonly esOperador = computed(() => tieneRol(this._usuario(), 'ADMIN', 'OPERATOR'));

  tiene(...roles: readonly Rol[]): boolean {
    return tieneRol(this._usuario(), ...roles);
  }

  fija(usuario: Usuario | null): void {
    this._usuario.set(usuario);
    this._resuelta.set(true);
    this.pais.fija(usuario?.pais ?? '');
  }

  marcaCargando(cargando: boolean): void {
    this._cargando.set(cargando);
  }

  limpia(): void {
    this.fija(null);
  }
}
