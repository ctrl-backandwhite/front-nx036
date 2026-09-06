import { Service, computed, inject, signal } from '@angular/core';
import { Rol, Usuario, nombreParaSaludar, tieneRol } from '../../domain/model/usuario';
import { PaisDelUsuario } from '@core/http/pais-del-usuario';
import { SesionActual } from '@core/auth/sesion-actual';

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
 *
 * <p>Y publica el HECHO de que hay alguien dentro en `SesionActual`, del núcleo. Esa es la ÚNICA
 * escritura permitida sobre él en toda la aplicación, y es lo que permite que la cabecera, el panel o
 * el guardián de rutas sepan quién mira sin tener que entrar en las tripas de este contexto. Aquí queda
 * la cuenta ENTERA —empresa, teléfono, idioma—; allí solo lo mínimo para decidir qué se enseña.
 */
@Service()
export class SesionStore {
  private readonly pais = inject(PaisDelUsuario);
  private readonly sesionActual = inject(SesionActual);

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
    this.sesionActual.publica(
      usuario
        ? {
            id: usuario.id,
            rol: usuario.rol,
            nombreVisible: nombreParaSaludar(usuario),
            pais: usuario.pais ?? '',
            ...(usuario.avatarUrl ? { avatarUrl: usuario.avatarUrl } : {}),
          }
        : null,
    );
  }

  marcaCargando(cargando: boolean): void {
    this._cargando.set(cargando);
  }

  limpia(): void {
    this.fija(null);
  }
}
