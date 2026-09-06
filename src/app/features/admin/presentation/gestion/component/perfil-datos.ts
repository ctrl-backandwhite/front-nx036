import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faPen, faUserPen } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SesionActual } from '@core/auth/sesion-actual';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { Usuario } from '@features/auth/domain/model/usuario';
import { iniciales, nombreDeIdioma, nombreDePais } from '../../../domain/gestion/model/perfil';
import {
  ConsultaElPerfil, GuardaElPerfil,
} from '../../../application/gestion/use-case/perfil.use-case';
import { PerfilCampo, PerfilCampoEditable } from './perfil-campo';

/**
 * La ficha de la propia cuenta: quién es, qué puede y qué datos suyos se pueden cambiar.
 *
 * <p>Al guardar NO se toca aquí el estado de sesión: de eso se ocupa el caso de uso, que republica quién
 * mira en `SesionActual` para que la cabecera y el saludo se enteren. Si además lo escribiera la
 * pantalla habría dos sitios haciendo lo mismo y uno de los dos se quedaría atrás.
 *
 * <p>Quién mira se lee del NÚCLEO y no del almacén de «auth»: el aislamiento entre contextos acotados
 * impide a «admin» entrar en la capa de aplicación de otro contexto, y este dato subió al núcleo
 * precisamente por eso.
 *
 * <p>MOBILE FIRST: los datos van en una columna y pasan a dos desde `sm`.
 */
@Component({
  selector: 'nx-perfil-datos',
  imports: [FaIconComponent, PerfilCampo, PerfilCampoEditable],
  template: `
    <div class="card p-6">
      <div class="flex items-start gap-4">
        <!-- El avatar puede venir de Google (avatarUrl); no hay subida de fichero, solo dirección. -->
        <div class="relative">
          @if (quien()?.avatarUrl; as foto) {
            <!-- Decorativa a propósito: el nombre está escrito justo al lado, y anunciar «avatar»
                 además del nombre solo repite lo mismo a quien usa lector de pantalla. -->
            <img [src]="foto" alt="" class="w-20 h-20 rounded-full object-cover border border-ink-200" />
          } @else {
            <div class="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center
                        justify-center text-2xl font-medium">{{ letras() }}</div>
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-lg truncate">{{ comoSeLlama() }}</div>
          <div class="text-[12px] text-ink-500 truncate">{{ correo() }}</div>
          <div class="text-[12px] text-ink-500">{{ papel() }}</div>
        </div>
        @if (!editando()) {
          <button type="button" class="btn btn-outline text-[12px]" (click)="empieza()">
            <fa-icon [icon]="iconos.editar" /> {{ t('admin.profile.edit') }}
          </button>
        }
      </div>

      @if (guardadoEl(); as instante) {
        <div class="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50
                    text-emerald-700 text-[11px] border border-emerald-200">
          <fa-icon [icon]="iconos.hecho" /> {{ t('admin.profile.saved') }} ({{ instante }})
        </div>
      }

      <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <nx-perfil-campo [etiqueta]="t('admin.profile.email')" [valor]="correo()" [soloLectura]="true" />
        @if (editando()) {
          <nx-perfil-campo-editable [etiqueta]="t('admin.profile.name')" [(valor)]="nombre" />
          <nx-perfil-campo-editable [etiqueta]="t('admin.profile.company')" [(valor)]="empresa" />
          <nx-perfil-campo-editable [etiqueta]="t('admin.profile.country')" [(valor)]="pais"
                                    [ayuda]="t('admin.profile.country_hint')" />
        } @else {
          <nx-perfil-campo [etiqueta]="t('admin.profile.name')" [valor]="comoSeLlama()" />
          <nx-perfil-campo [etiqueta]="t('admin.profile.company')" [valor]="ficha()?.empresa" />
          <nx-perfil-campo [etiqueta]="t('admin.profile.country')" [valor]="nombreDelPais()" />
        }
        <nx-perfil-campo [etiqueta]="t('admin.profile.language')" [valor]="nombreDelIdioma()" />
        <nx-perfil-campo [etiqueta]="t('admin.profile.role')" [valor]="papel()" />
        <nx-perfil-campo [etiqueta]="t('admin.profile.created')" [valor]="creado()" />
      </div>

      @if (editando()) {
        <div class="mt-4 flex gap-2 justify-end">
          <button type="button" class="btn btn-outline text-[12px]"
                  (click)="cancela()">{{ t('actions.cancel') }}</button>
          <button type="button" class="btn btn-primary text-[12px]" [disabled]="guardando()"
                  (click)="guarda()">
            <fa-icon [icon]="iconos.guardar" /> {{ t('admin.profile.save') }}
          </button>
        </div>
      }
    </div>
  `,
})
export class PerfilDatos {
  private readonly traduccion = inject(TraduccionService);
  private readonly sesion = inject(SesionActual);
  private readonly dialogo = inject(DialogoStore);
  private readonly consultaElPerfil = inject(ConsultaElPerfil);
  private readonly guardaElPerfil = inject(GuardaElPerfil);

  protected readonly t = this.traduccion.t;
  protected readonly iconos = { editar: faUserPen, guardar: faPen, hecho: faCircleCheck };

  /** Quién mira, tal y como lo publica el núcleo: identificador, papel, nombre, país y avatar. */
  protected readonly quien = this.sesion.datos;

  /**
   * La cuenta ENTERA, pedida al backend por el puerto del área.
   *
   * <p>Trae lo que el núcleo no publica —correo, empresa, idioma y fecha de alta—, que es justo lo que
   * enseña esta ficha. Mientras no llega se pinta lo que sí sabe la sesión, así que la pantalla nunca
   * aparece en blanco esperando una respuesta.
   */
  protected readonly ficha = signal<Usuario | null>(null);

  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly guardadoEl = signal<string | null>(null);

  protected readonly nombre = signal('');
  protected readonly empresa = signal('');
  protected readonly pais = signal('');

  protected readonly comoSeLlama = computed(
    () => this.ficha()?.nombreVisible ?? this.quien()?.nombreVisible ?? '',
  );
  protected readonly correo = computed(() => this.ficha()?.email ?? '');
  protected readonly letras = computed(() => iniciales(this.comoSeLlama() || this.correo()));
  protected readonly papel = computed(() => {
    const rol = this.ficha()?.rol ?? this.quien()?.rol;
    return rol ? this.t(`admin.users.role.${rol}`) : '—';
  });
  protected readonly nombreDelPais = computed(() =>
    nombreDePais(this.ficha()?.pais ?? this.quien()?.pais, this.traduccion.idioma()),
  );
  protected readonly nombreDelIdioma = computed(() => nombreDeIdioma(this.ficha()?.idioma));
  protected readonly creado = computed(() => {
    const fecha = this.ficha()?.creadoEl;
    return fecha ? new Date(fecha).toLocaleString() : '—';
  });

  constructor() {
    void this.carga();
  }

  /** Un fallo al leer no vacía la pantalla: se queda lo que publica la sesión, que ya es algo. */
  private async carga(): Promise<void> {
    const resultado = await this.consultaElPerfil.ejecuta();
    if (resultado.ok) {
      this.ficha.set(resultado.valor);
    }
  }

  /**
   * Abrir y cerrar la edición parten SIEMPRE de lo que hay en la cuenta.
   *
   * <p>Antes el texto tecleado sobrevivía a «Cancelar»: al volver a editar reaparecía lo descartado y el
   * siguiente «Guardar» lo persistía. Además cubre el caso de que el perfil llegue del backend después
   * del primer pintado, cuando los campos se habrían quedado con lo que había —nada— al montar.
   */
  protected empieza(): void {
    this.copiaDeLaCuenta();
    this.editando.set(true);
  }

  protected cancela(): void {
    this.copiaDeLaCuenta();
    this.editando.set(false);
  }

  private copiaDeLaCuenta(): void {
    this.nombre.set(this.comoSeLlama());
    this.empresa.set(this.ficha()?.empresa ?? '');
    this.pais.set(this.ficha()?.pais ?? this.quien()?.pais ?? '');
  }

  protected async guarda(): Promise<void> {
    this.guardando.set(true);
    try {
      const resultado = await this.guardaElPerfil.ejecuta({
        nombreVisible: this.nombre() || undefined,
        empresa: this.empresa() || undefined,
        pais: this.pais() || undefined,
      });
      if (!resultado.ok) {
        // El motivo lo escribe el backend, ya traducido. Sin él, un texto que cuente algo.
        await this.dialogo.alerta(
          resultado.error.mensaje || this.t('admin.profile.save_failed'), undefined, 'error',
        );
        return;
      }
      this.guardadoEl.set(new Date().toLocaleTimeString());
      this.editando.set(false);
      // Se vuelve a leer: el caso de uso republica en la sesión lo mínimo —nombre, país, avatar—, pero
      // la empresa y lo demás solo están en la ficha, y sin releerla se quedarían con el valor viejo.
      await this.carga();
      await this.dialogo.alerta(this.t('admin.profile.saved_ok'), undefined, 'success');
    } finally {
      this.guardando.set(false);
    }
  }
}
