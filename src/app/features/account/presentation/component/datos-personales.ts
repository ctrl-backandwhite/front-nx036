import { Component, computed, effect, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faTriangleExclamation, faUser } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { SelectorPais } from '@ds/component/pais/selector-pais';
import { Telefono } from '@ds/component/telefono/telefono';
import { DatosDePerfil, IDIOMAS_DEL_PERFIL } from '../../domain/model/perfil';
import { CuentaStore } from '../../application/state/cuenta.store';
import { GuardaPerfil } from '../../application/use-case/guarda-perfil.use-case';

/**
 * Los datos personales de la cuenta.
 *
 * <p>El correo no se edita aquí: cambiarlo es cambiar de identidad y pasa por una verificación aparte.
 * El PAPEL tampoco se enseña: expondría el modelo de permisos de la aplicación.
 *
 * <p>Mobile first: una columna, y dos desde `sm`.
 */
@Component({
  selector: 'nx-datos-personales',
  imports: [FaIconComponent, SelectorPais, Telefono],
  template: `
    <section class="card p-5">
      <h3 class="flex items-center gap-2">
        <fa-icon [icon]="iconos.persona" class="text-brand-600" /> {{ t('profile.section.personal') }}
      </h3>
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4" (submit)="envia($event)">
        <div>
          <label for="perfil-email" class="text-xs text-ink-500">{{ t('profile.email') }}</label>
          <input id="perfil-email" class="input mt-1 bg-ink-50" disabled [value]="correo()" />
        </div>

        <div>
          <label for="perfil-nombre" class="text-xs text-ink-500">{{ t('profile.first_name') }}</label>
          <input id="perfil-nombre" class="input mt-1" maxlength="80" [value]="datos().nombre"
                 (input)="escribe('nombre', $event)" />
        </div>

        <div>
          <label for="perfil-apellido-1" class="text-xs text-ink-500">{{ t('profile.last_name_1') }}</label>
          <input id="perfil-apellido-1" class="input mt-1" maxlength="80" [value]="datos().primerApellido"
                 (input)="escribe('primerApellido', $event)" />
        </div>

        <div>
          <label for="perfil-apellido-2" class="text-xs text-ink-500">{{ t('profile.last_name_2') }}</label>
          <input id="perfil-apellido-2" class="input mt-1" maxlength="80" [value]="datos().segundoApellido"
                 (input)="escribe('segundoApellido', $event)" />
        </div>

        <div>
          <label for="perfil-empresa" class="text-xs text-ink-500">{{ t('profile.company') }}</label>
          <input id="perfil-empresa" class="input mt-1" [value]="datos().empresa"
                 (input)="escribe('empresa', $event)" />
        </div>

        <div>
          <span class="text-xs text-ink-500">{{ t('profile.phone') }}</span>
          <!--
            El rótulo del PREFIJO se queda en el del sistema de diseño: llamarlo «país», como el país de
            la cuenta que hay justo debajo, dejaría dos desplegables con el mismo nombre accesible.
          -->
          <nx-telefono clase="mt-1" [valor]="datos().telefono" (valorChange)="cambia('telefono', $event)"
                       [etiquetaNumero]="t('profile.phone')" />
        </div>

        <div>
          <span class="text-xs text-ink-500">{{ t('profile.country') }}</span>
          <!--
            El país de REGISTRO. Lo detecta la dirección de red al darse de alta y es el que fija el
            margen y, con él, el precio de todo el escaparate. Por eso un cliente NO lo edita: solo
            quien administra. Y por eso tampoco se toca desde las direcciones de envío — cambiar adónde
            se manda un paquete no puede cambiar lo que cuesta.
          -->
          <nx-selector-pais [valor]="datos().pais" (valorChange)="cambia('pais', $event)"
                            [soloLectura]="!cuenta.puedeCambiarElPais()" [etiqueta]="t('profile.country')" />
        </div>

        <div>
          <label for="perfil-idioma" class="text-xs text-ink-500">{{ t('profile.language') }}</label>
          <select id="perfil-idioma" class="input mt-1" [value]="datos().idioma"
                  (change)="cambiaIdioma($event)">
            @for (idioma of idiomas; track idioma.codigo) {
              <option [value]="idioma.codigo" [selected]="idioma.codigo === datos().idioma">
                {{ idioma.nombre }}
              </option>
            }
          </select>
        </div>

        <div class="sm:col-span-2 flex items-center gap-3">
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">
            {{ guardando() ? t('common.saving') : t('profile.save') }}
          </button>
          @if (aviso(); as mensaje) {
            <span role="alert" [class]="'text-xs flex items-center gap-1 ' + (correcto() ? 'text-emerald-700' : 'text-red-700')">
              <fa-icon [icon]="correcto() ? iconos.bien : iconos.mal" /> {{ mensaje }}
            </span>
          }
        </div>
      </form>
    </section>
  `,
})
export class DatosPersonales {
  private readonly traduccion = inject(TraduccionService);
  private readonly guarda = inject(GuardaPerfil);

  protected readonly cuenta = inject(CuentaStore);
  protected readonly t = this.traduccion.t;
  protected readonly idiomas = IDIOMAS_DEL_PERFIL;
  protected readonly iconos = { persona: faUser, bien: faCheck, mal: faTriangleExclamation };

  protected readonly datos = signal<DatosDePerfil>(this.cuenta.datosDelFormulario());
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly correcto = signal(false);

  protected readonly correo = computed(() => this.cuenta.titular()?.email ?? '');

  constructor() {
    // El formulario se resiembra cuando se resuelve quién mira, y también después de guardar: el
    // servidor normaliza el teléfono y puede recortar los nombres, así que lo que se ve tiene que ser lo
    // que quedó guardado, no lo que se tecleó.
    effect(() => this.datos.set(this.cuenta.datosDelFormulario()));
  }

  protected escribe(campo: keyof DatosDePerfil, evento: Event): void {
    this.cambia(campo, (evento.target as HTMLInputElement).value);
  }

  protected cambiaIdioma(evento: Event): void {
    this.cambia('idioma', (evento.target as HTMLSelectElement).value);
  }

  protected cambia(campo: keyof DatosDePerfil, valor: string): void {
    this.datos.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected async envia(evento: Event): Promise<void> {
    evento.preventDefault();
    this.aviso.set(null);
    this.guardando.set(true);
    try {
      const resultado = await this.guarda.ejecuta(this.datos());
      this.correcto.set(resultado.ok);
      // Sin este aviso, un rechazo del servidor —un teléfono imposible, un país no admitido— dejaba la
      // pantalla exactamente igual que antes de pulsar y el cliente se iba creyendo que había guardado.
      this.aviso.set(
        resultado.ok ? this.t('profile.saved') : resultado.error.mensaje || this.t('common.error'),
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
