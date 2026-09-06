import { Component, inject, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CONCESIONES, separaPermisos } from '../../../domain/gestion/model/socios';
import { CreaElCliente } from '../../../application/gestion/use-case/socios.use-case';
import { VentanaModal } from './ventana-modal';

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
 */
@Component({
  selector: 'nx-socios-alta',
  imports: [FaIconComponent, VentanaModal],
  template: `
    <nx-ventana-modal [titulo]="t('admin.partners.actions.create')" (cierra)="cierra.emit()">
      <div class="space-y-2 text-sm">
        <div>
          <label class="text-xs text-ink-500" for="socios-nombre">
            {{ t('admin.partners.col.name') }}
          </label>
          <input id="socios-nombre" class="input" placeholder="Acme Inc."
                 [value]="nombre()" (input)="nombre.set(escrito($event))" />
        </div>
        <div>
          <label class="text-xs text-ink-500" for="socios-alias">
            {{ t('admin.partners.col.alias') }}
          </label>
          <input id="socios-alias" class="input font-mono" placeholder="acme-prod"
                 [value]="alias()" (input)="alias.set(escrito($event))" />
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
                 [value]="permisos()" (input)="permisos.set(escrito($event))" />
          <div class="text-[11px] text-ink-400 mt-0.5">{{ t('admin.partners.scopes_hint') }}</div>
        </div>
        <div>
          <label class="text-xs text-ink-500" for="socios-webhook">
            {{ t('admin.partners.col.webhook') }}
          </label>
          <input id="socios-webhook" class="input font-mono text-[12px]"
                 [placeholder]="t('admin.partners.webhook_placeholder')"
                 [value]="webhook()" (input)="webhook.set(escrito($event))" />
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-outline text-[12px]" (click)="cierra.emit()">
          {{ t('actions.cancel') }}
        </button>
        <button type="button" class="btn btn-primary text-[12px]" [disabled]="creando()"
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

  protected readonly nombre = signal('');
  protected readonly alias = signal('');
  protected readonly permisos = signal('catalog.read,orders.write');
  protected readonly webhook = signal('');
  protected readonly elegidas = signal<readonly string[]>(['client_credentials']);
  protected readonly creando = signal(false);

  protected escrito(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected alterna(concesion: string, evento: Event): void {
    const marcada = (evento.target as HTMLInputElement).checked;
    this.elegidas.update((lista) =>
      marcada ? [...lista, concesion] : lista.filter((c) => c !== concesion),
    );
  }

  protected async crea(): Promise<void> {
    // Sin nombre no se crea nada: es lo único que distingue un cliente de otro en la tabla.
    if (!this.nombre().trim()) {
      return;
    }
    this.creando.set(true);
    const resultado = await this.creaElCliente.ejecuta({
      nombre: this.nombre().trim(),
      permisos: separaPermisos(this.permisos()),
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
