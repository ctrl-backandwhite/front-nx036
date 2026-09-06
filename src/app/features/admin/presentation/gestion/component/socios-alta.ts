import { Component, computed, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CONCESIONES, separaPermisos } from '../../../domain/gestion/model/socios';
import { CreaElCliente } from '../../../application/gestion/use-case/socios.use-case';
import { VentanaModal } from './ventana-modal';

/** El webhook del socio: solo se admite http(s), que es lo único que el backend sabe llamar. */
const URL_HTTP = /^https?:\/\/\S+$/;

/**
 * El alta de un cliente de integración.
 *
 * <p>El SECRETO se enseña aquí y solo aquí. El backend lo devuelve una única vez, al crear el cliente:
 * no se guarda en ningún signal ni se vuelve a pedir, porque no hay forma de recuperarlo — solo de
 * emitir otro, que invalida el anterior. Por eso sale en un diálogo que hay que cerrar a mano y no en un
 * aviso que se retira solo a los cuatro segundos.
 *
 * <p>OJO: hoy el alta solo manda NOMBRE y PERMISOS. La concesión, el identificador propuesto y la URL
 * del webhook se piden porque el socio los necesita acordados, pero el puerto (`AltaDeClienteOauth`) no
 * los lleva y el servidor los fija por su cuenta. Está anotado como carencia del contrato, no es un
 * descuido del porte.
 *
 * <p>Lo que exige el alta —nombre y al menos un permiso— vive en el ESQUEMA del formulario. Antes el
 * nombre se comprobaba dentro del manejador y el botón seguía encendido: se pulsaba y no pasaba nada,
 * sin decir por qué. Y los permisos no se comprobaban en absoluto: un cliente sin ninguno se creaba
 * igual y luego no podía llamar a nada.
 */
@Component({
  selector: 'nx-socios-alta',
  imports: [FaIconComponent, VentanaModal, FormField],
  template: `
    <nx-ventana-modal [titulo]="t('admin.partners.actions.create')" (cierra)="cierra.emit()">
      <div class="space-y-2 text-sm">
        <div>
          <label class="text-xs text-ink-500" for="socios-nombre">
            {{ t('admin.partners.col.name') }}
          </label>
          <input id="socios-nombre" class="input" placeholder="Acme Inc."
                 [formField]="formulario.nombre" />
          @if (formulario.nombre().touched() && formulario.nombre().errors().length) {
            <div role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.nombre().errors()[0].message }}
            </div>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="socios-alias">
            {{ t('admin.partners.col.alias') }}
          </label>
          <input id="socios-alias" class="input font-mono" placeholder="acme-prod"
                 [formField]="formulario.alias" />
        </div>
        <div>
          <span class="text-xs text-ink-500">{{ t('admin.partners.col.grants') }}</span>
          <div class="flex flex-wrap gap-2 mt-1">
            @for (concesion of concesiones; track concesion) {
              <label class="inline-flex items-center gap-1.5 text-[12px]">
                <input type="checkbox" [checked]="elegidas().includes(concesion)"
                       (change)="alterna(concesion, $event)" />
                {{ t('admin.partners.grants.' + concesion) }}
              </label>
            }
          </div>
        </div>
        <div>
          <label class="text-xs text-ink-500" for="socios-permisos">
            {{ t('admin.partners.col.scopes') }}
          </label>
          <input id="socios-permisos" class="input font-mono text-[12px]"
                 placeholder="catalog.read, orders.write"
                 [formField]="formulario.permisos" />
          <div class="text-[11px] text-ink-400 mt-0.5">{{ t('admin.partners.scopes_hint') }}</div>
          @if (formulario.permisos().touched() && formulario.permisos().errors().length) {
            <div role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.permisos().errors()[0].message }}
            </div>
          }
        </div>
        <div>
          <label class="text-xs text-ink-500" for="socios-webhook">
            {{ t('admin.partners.col.webhook') }}
          </label>
          <input id="socios-webhook" class="input font-mono text-[12px]"
                 [placeholder]="t('admin.partners.webhook_placeholder')"
                 [formField]="formulario.webhook" />
          @if (formulario.webhook().touched() && formulario.webhook().errors().length) {
            <div role="alert" class="text-[11px] text-error mt-0.5">
              {{ formulario.webhook().errors()[0].message }}
            </div>
          }
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button type="button" class="btn btn-primary text-[12px]"
                [disabled]="creando() || formulario().invalid()"
                (click)="crea()">
          <fa-icon [icon]="iconoMas" /> {{ t('admin.partners.actions.create') }}
        </button>
      </div>
    </nx-ventana-modal>
  `,
})
export class SociosAlta {
  readonly cierra = output<void>();
  readonly creado = output<void>();

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  private readonly tCon = this.traduccion.tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly creaElCliente = inject(CreaElCliente);

  protected readonly iconoMas = faPlus;
  protected readonly concesiones = CONCESIONES;

  protected readonly modelo = signal({
    nombre: '',
    alias: '',
    permisos: 'catalog.read,orders.write',
    webhook: '',
  });

  protected readonly formulario = form(this.modelo, (ruta) => {
    // Sin nombre no se crea nada: es lo único que distingue un cliente de otro en la tabla.
    required(ruta.nombre, { message: () => this.t('dialog.field.required') });
    // Un cliente sin ningún permiso se autentica y no puede llamar a nada: es un alta inútil.
    validate(ruta.permisos, ({ value }) =>
      separaPermisos(value()).length > 0
        ? null
        : { kind: 'permisos', message: this.t('dialog.field.required') },
    );
    // El webhook es opcional, pero si se escribe tiene que ser una dirección que se pueda llamar.
    validate(ruta.webhook, ({ value }) => {
      const escrito = value().trim();
      return escrito === '' || URL_HTTP.test(escrito)
        ? null
        : { kind: 'webhook', message: this.t('sourcing.url.invalid') };
    });
  });

  protected readonly elegidas = signal<readonly string[]>(['client_credentials']);
  protected readonly creando = signal(false);

  /** Los permisos ya partidos: se usan al crear y para saber si el formulario vale. */
  protected readonly permisosSeparados = computed(() => separaPermisos(this.modelo().permisos));

  protected alterna(concesion: string, evento: Event): void {
    const marcada = (evento.target as HTMLInputElement).checked;
    this.elegidas.update((lista) =>
      marcada ? [...lista, concesion] : lista.filter((c) => c !== concesion),
    );
  }

  protected async crea(): Promise<void> {
    if (this.formulario().invalid()) {
      return;
    }
    this.creando.set(true);
    const resultado = await this.creaElCliente.ejecuta({
      nombre: this.modelo().nombre.trim(),
      permisos: this.permisosSeparados(),
    });
    this.creando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.partners.error'));
      return;
    }
    const emitido = resultado.valor;
    // Se ESPERA a que cierre el diálogo antes de avisar de que hay que releer: si la lista se
    // refrescara debajo, el secreto podría quedar tapado por el repintado sin haberlo copiado.
    await this.dialogo.alerta(
      `${this.tCon('admin.partners.created', { alias: emitido.identificador })}\n\n` +
        `clientId: ${emitido.identificador}\nclientSecret: ${emitido.secreto}\n\n` +
        `${emitido.mensaje ?? ''}`,
      this.t('admin.partners.actions.create'),
      'success',
    );
    this.creado.emit();
  }
}
