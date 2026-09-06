import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelopeOpenText, faPaperPlane, faUsers } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { CampanaDelBoletin, ResumenDelBoletin, envioValido } from '../../../domain/gestion/model/contenido';
import {
  ConsultaElBoletin, EnviaElBoletin,
} from '../../../application/gestion/use-case/contenido.use-case';

/**
 * El boletín: a cuántos llega, qué se ha mandado y mandar uno nuevo.
 *
 * <p>Enviar es IRREVERSIBLE —sale un correo por suscriptor— así que se confirma con la cifra delante.
 *
 * <p>MOBILE FIRST: redacción y vista previa se apilan en el móvil y pasan a dos columnas desde `lg`,
 * igual que en el panel de React.
 */
@Component({
  selector: 'nx-boletin-admin',
  imports: [FaIconComponent],
  template: `
    <div class="space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{{ t('admin.newsletter.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.newsletter.subtitle') }}</p>
        </div>
        <div class="badge badge-lg badge-ghost gap-2">
          <fa-icon [icon]="iconos.suscriptores" />
          {{ suscriptores() }} {{ t('admin.newsletter.subscribers') }}
        </div>
      </header>

      <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card p-5 space-y-3">
          <h2 class="font-medium text-sm flex items-center gap-2">
            <fa-icon [icon]="iconos.redactar" /> {{ t('admin.newsletter.compose') }}
          </h2>
          <div>
            <!-- Las etiquetas iban sueltas encima del campo, sin atarlo: el lector de pantalla
                 anunciaba «cuadro de texto» sin decir cuál y pulsar sobre el texto no llevaba el foco
                 al campo. Cada una va con su «for». -->
            <label for="boletin-asunto" class="text-xs text-ink-500">
              {{ t('admin.newsletter.subject') }}
            </label>
            <input id="boletin-asunto" class="input input-bordered w-full"
                   [placeholder]="t('admin.newsletter.subject_ph')"
                   [value]="asunto()" (input)="asunto.set(escrito($event))" />
          </div>
          <div>
            <label for="boletin-contenido" class="text-xs text-ink-500">
              {{ t('admin.newsletter.content') }}
            </label>
            <textarea id="boletin-contenido"
                      class="textarea textarea-bordered w-full h-48 text-[13px]"
                      [placeholder]="t('admin.newsletter.content_ph')"
                      [value]="cuerpo()" (input)="cuerpo.set(escrito($event))"></textarea>
            <p class="text-[11px] text-ink-400 mt-1">{{ t('admin.newsletter.html_hint') }}</p>
          </div>
          <div class="flex justify-end">
            <button type="button" class="btn btn-primary btn-sm"
                    [disabled]="!sePuedeEnviar() || enviando()" (click)="envia()">
              <fa-icon [icon]="iconos.enviar" /> {{ t('admin.newsletter.send') }}
            </button>
          </div>
        </div>

        <div class="card p-5">
          <h2 class="font-medium text-sm mb-2">{{ t('admin.newsletter.preview') }}</h2>
          <div class="border border-ink-100 rounded-box p-4 bg-base-200/40 min-h-[12rem]">
            <div class="font-semibold mb-2">{{ asunto() || t('admin.newsletter.subject_ph') }}</div>
            <!-- El cuerpo se teclea en HTML y aquí se PINTA. La asociación «innerHTML» basta: Angular lo pasa por
                 su saneador antes de escribirlo, que quita las etiquetas de guion, los atributos «on…» y los enlaces «javascript:».
                 Por eso no se añade ninguna librería de saneado — sería sanear dos veces. -->
            @if (cuerpo()) {
              <div class="text-[13px] text-ink-700 prose-sm" [innerHTML]="cuerpo()"></div>
            } @else {
              <div class="text-[13px] text-ink-400 prose-sm">
                {{ t('admin.newsletter.content_ph') }}
              </div>
            }
          </div>
        </div>
      </section>

      <!--
        El histórico de envíos queda por debajo del pliegue: se baja a él para comprobar qué se mandó,
        no al entrar a redactar. Diferirlo deja el formulario y su vista previa sin competencia.
      -->
      @defer (on viewport) {
      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.newsletter.history') }}</span></div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.newsletter.col.date') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.newsletter.col.subject') }}</th>
                <th class="px-4 py-2 font-medium text-right">
                  {{ t('admin.newsletter.col.recipients') }}
                </th>
                <th class="px-4 py-2 font-medium">{{ t('admin.newsletter.col.status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (campana of campanas(); track campana.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2 text-[12px] text-ink-500">{{ fecha(campana) }}</td>
                  <td class="px-4 py-2">{{ campana.asunto }}</td>
                  <td class="px-4 py-2 text-right">{{ campana.destinatarios }}</td>
                  <td class="px-4 py-2">
                    <span class="badge badge-success badge-sm">{{ campana.estado }}</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-ink-400 text-[13px]">
                    {{ t('admin.newsletter.empty') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      } @placeholder {
        <section class="card h-40"></section>
      }
    </div>
  `,
})
export class BoletinPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  private readonly tCon = this.traduccion.tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaElBoletin);
  private readonly enviaElBoletin = inject(EnviaElBoletin);

  protected readonly iconos = {
    suscriptores: faUsers, redactar: faEnvelopeOpenText, enviar: faPaperPlane,
  };

  protected readonly resumen = signal<ResumenDelBoletin | null>(null);
  protected readonly asunto = signal('');
  protected readonly cuerpo = signal('');
  protected readonly enviando = signal(false);

  protected readonly suscriptores = computed(() => this.resumen()?.suscriptores ?? 0);
  protected readonly campanas = computed<readonly CampanaDelBoletin[]>(
    () => this.resumen()?.campanas ?? [],
  );

  /** Sin asunto, sin cuerpo o sin nadie a quien mandárselo, el botón no se puede pulsar. */
  protected readonly sePuedeEnviar = computed(() =>
    envioValido(this.asunto(), this.cuerpo(), this.suscriptores()),
  );

  constructor() {
    void this.carga();
  }

  protected escrito(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected fecha(campana: CampanaDelBoletin): string {
    return campana.creadaEl ? new Date(campana.creadaEl).toLocaleString() : '—';
  }

  protected async envia(): Promise<void> {
    // Sale UN correo por suscriptor y no hay vuelta atrás: se pregunta con la cifra delante.
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.newsletter.confirm', { n: this.suscriptores() }),
    );
    if (!confirmado) {
      return;
    }
    this.enviando.set(true);
    const resultado = await this.enviaElBoletin.ejecuta(this.asunto(), this.cuerpo());
    this.enviando.set(false);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    // El formulario se vacía solo tras el envío: dejarlo lleno invita a mandarlo dos veces.
    this.asunto.set('');
    this.cuerpo.set('');
    this.avisos.exito(this.tCon('admin.newsletter.sent', { n: resultado.valor }));
    void this.carga();
  }

  private async carga(): Promise<void> {
    const resultado = await this.consulta.ejecuta();
    if (!resultado.ok) {
      // Sin resumen no se puede enviar —`suscriptores` es 0— y el historial sale vacío. Es correcto:
      // mejor no dejar mandar que mandar a ciegas.
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    this.resumen.set(resultado.valor);
  }
}
