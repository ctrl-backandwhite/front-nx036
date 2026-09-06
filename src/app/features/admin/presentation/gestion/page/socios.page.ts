import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCopy, faEye, faEyeSlash, faPaperPlane, faPlus, faRotateRight, faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  ClienteOauth, EntregaDeWebhook, nombreLegible, traduceLista,
} from '../../../domain/gestion/model/socios';
import {
  BorraElCliente, ConsultaSocios, PanoramaDeSocios, PruebaLosWebhooks, RotaElSecreto,
} from '../../../application/gestion/use-case/socios.use-case';
import { SociosAlta } from '../component/socios-alta';

/**
 * Lo que se enseña en la columna del secreto.
 *
 * <p>Nunca hay secreto que enseñar: el backend solo lo devuelve al crear el cliente y al rotarlo. El ojo
 * no revela nada, recuerda POR QUÉ no hay nada que revelar — sin ese texto, quien administra pulsaba el
 * ojo esperando ver el valor y lo daba por roto.
 */
const OCULTO = '••••••••';
const SIN_REVELAR = '••••••••-rotate-to-view';

/** El drenaje de la cola de webhooks corre cada 5 s; sin esta espera la tabla se relee vacía. */
const ESPERA_DEL_DRENAJE_MS = 1500;

/**
 * Socios de integración: clientes OAuth, aplicaciones conectadas y entregas de webhook.
 *
 * <p>Las tres tablas se cargan de una vez y ninguna tumba a las otras: que fallen los webhooks no puede
 * dejar sin ver los clientes, que es lo que de verdad se administra aquí.
 *
 * <p>MOBILE FIRST: cada tabla se desplaza dentro de su propia caja (`overflow-x-auto`), de modo que la
 * página no se mueve de lado en el móvil; la cabecera pliega sus botones con `flex-wrap`.
 */
@Component({
  selector: 'nx-socios-admin',
  imports: [FaIconComponent, SociosAlta],
  template: `
    <div class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">{{ t('admin.partners.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('admin.partners.subtitle') }}</p>
        </div>
        <button type="button" class="btn btn-primary text-[12px]" (click)="creando.set(true)">
          <fa-icon [icon]="iconos.mas" /> {{ t('admin.partners.actions.create') }}
        </button>
      </header>

      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.partners.section.oauth') }}</span></div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.alias') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.name') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.grants') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.scopes') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.secret') }}</th>
                <th class="px-4 py-2 font-medium w-44">{{ t('admin.partners.col.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (cliente of panorama().clientes; track cliente.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2 font-mono text-xs">{{ cliente.identificador }}</td>
                  <td class="px-4 py-2">{{ legible(cliente) }}</td>
                  <td class="px-4 py-2 text-xs text-ink-500">{{ concesiones(cliente) }}</td>
                  <td class="px-4 py-2 text-xs text-ink-500">{{ permisos(cliente.permisos) }}</td>
                  <td class="px-4 py-2 text-[11px] font-mono">
                    {{ revelados().has(cliente.id) ? sinRevelar : oculto }}
                    <button type="button" class="ml-1 text-ink-500 hover:text-ink-700"
                            [attr.aria-label]="t('admin.partners.col.secret')"
                            (click)="alternaSecreto(cliente.id)">
                      <fa-icon [icon]="revelados().has(cliente.id) ? iconos.tapar : iconos.ver"
                               class="text-[11px]" />
                    </button>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button type="button" class="btn btn-outline btn-square text-[11px]"
                              [attr.title]="t('admin.partners.actions.copy_id')"
                              [attr.aria-label]="t('admin.partners.actions.copy_id')"
                              (click)="copia(cliente.identificador)">
                        <fa-icon [icon]="iconos.copiar" />
                      </button>
                      <button type="button" class="btn btn-outline btn-square text-[11px]"
                              [attr.title]="t('admin.partners.actions.rotate')"
                              [attr.aria-label]="t('admin.partners.actions.rotate')"
                              (click)="rota(cliente.identificador)">
                        <fa-icon [icon]="iconos.rotar" />
                      </button>
                      <button type="button"
                              class="btn btn-outline btn-square text-[11px] hover:border-red-300 hover:text-red-700"
                              [attr.title]="t('admin.partners.actions.delete')"
                              [attr.aria-label]="t('admin.partners.actions.delete')"
                              (click)="borra(cliente.identificador)">
                        <fa-icon [icon]="iconos.borrar" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!--
        Las aplicaciones conectadas y las entregas de webhook quedan por debajo del pliegue: se baja a
        ellas para diagnosticar, no al entrar. Diferirlas deja que la tabla de clientes —lo que de
        verdad se administra aquí— llegue sin competencia.
      -->
      @defer (on viewport) {
      <section class="card overflow-hidden">
        <div class="card-header"><span>{{ t('admin.partners.section.apps') }}</span></div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.name') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.alias') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.scopes') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.webhook') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (aplicacion of panorama().aplicaciones; track aplicacion.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2">{{ aplicacion.nombre }}</td>
                  <td class="px-4 py-2 font-mono text-xs">{{ aplicacion.identificador }}</td>
                  <td class="px-4 py-2 text-xs">{{ permisos(aplicacion.permisos) }}</td>
                  <td class="px-4 py-2 text-xs">{{ aplicacion.webhook ?? '—' }}</td>
                  <td class="px-4 py-2">
                    <span class="badge"
                          [class]="aplicacion.activa
                            ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-200 text-ink-600'">
                      {{ aplicacion.activa ? t('common.yes') : t('common.no') }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-4 py-8 text-center text-ink-500">
                    {{ t('admin.partners.empty_apps') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="card-header flex items-center justify-between">
          <span>{{ t('admin.partners.section.webhooks') }}</span>
          <button type="button" class="btn btn-outline btn-xs text-[12px]" [disabled]="probando()"
                  (click)="pruebaWebhooks()">
            <fa-icon [icon]="iconos.enviar" [animation]="probando() ? 'spin' : undefined" />
            {{ t('admin.partners.webhook_test') }}
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm">
            <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
              <tr>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.event') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.status') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.attempts') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.response') }}</th>
                <th class="px-4 py-2 font-medium">{{ t('admin.partners.col.date') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (entrega of panorama().entregas; track entrega.id) {
                <tr class="border-t border-ink-100">
                  <td class="px-4 py-2">{{ entrega.evento }}</td>
                  <td class="px-4 py-2">{{ entrega.estado }}</td>
                  <td class="px-4 py-2">{{ entrega.intentos }}</td>
                  <td class="px-4 py-2">{{ entrega.codigoDeRespuesta ?? '—' }}</td>
                  <td class="px-4 py-2 text-xs">{{ fecha(entrega) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-4 py-8 text-center text-ink-500">
                    {{ t('admin.partners.empty_hooks') }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      } @placeholder {
        <!-- UN solo elemento raíz: es el que el disparador observa. Reserva el alto de las dos tablas
             para que la página no dé un salto cuando llegan. -->
        <section class="h-80"></section>
      }

      <!-- El alta va FUERA del diferido: la abre un botón de la cabecera, así que tiene que existir
           aunque nadie haya bajado la página. -->
      @if (creando()) {
        <nx-socios-alta (cierra)="creando.set(false)" (creado)="altaHecha()" />
      }
    </div>
  `,
})
export class SociosPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  private readonly tCon = this.traduccion.tCon;
  private readonly dialogo = inject(DialogoStore);
  private readonly avisos = inject(AvisosStore);
  private readonly consulta = inject(ConsultaSocios);
  private readonly rotaElSecreto = inject(RotaElSecreto);
  private readonly borraElCliente = inject(BorraElCliente);
  private readonly pruebaLosWebhooks = inject(PruebaLosWebhooks);

  protected readonly iconos = {
    mas: faPlus, rotar: faRotateRight, borrar: faTrash, ver: faEye, tapar: faEyeSlash,
    copiar: faCopy, enviar: faPaperPlane,
  };
  protected readonly oculto = OCULTO;
  protected readonly sinRevelar = SIN_REVELAR;

  protected readonly panorama = signal<PanoramaDeSocios>({
    clientes: [], aplicaciones: [], entregas: [],
  });
  protected readonly revelados = signal<ReadonlySet<string>>(new Set());
  protected readonly creando = signal(false);
  protected readonly probando = signal(false);

  constructor() {
    void this.carga();
  }

  protected legible(cliente: ClienteOauth): string {
    return nombreLegible(cliente);
  }

  protected concesiones(cliente: ClienteOauth): string {
    return traduceLista(cliente.concesiones, 'admin.partners.grants', this.t);
  }

  protected permisos(crudo: string | null | undefined): string {
    return traduceLista(crudo, 'admin.partners.scopes', this.t);
  }

  protected fecha(entrega: EntregaDeWebhook): string {
    return entrega.creadaEl ?? '—';
  }

  protected alternaSecreto(id: string): void {
    this.revelados.update((previos) => {
      const siguiente = new Set(previos);
      if (!siguiente.delete(id)) {
        siguiente.add(id);
      }
      return siguiente;
    });
  }

  protected async copia(identificador: string): Promise<void> {
    await navigator.clipboard?.writeText(identificador);
    this.avisos.exito(this.t('admin.partners.copied'));
  }

  /**
   * Rotar el secreto.
   *
   * <p>Rotar INVALIDA el anterior al instante: la integración que lo use deja de entrar hasta que
   * alguien actualice su configuración. Por eso se pregunta antes, y por eso el nuevo secreto sale en un
   * diálogo que hay que cerrar a mano: es la ÚNICA vez que va a verse.
   */
  protected async rota(identificador: string): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.partners.rotate_confirm', { alias: identificador }),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.rotaElSecreto.ejecuta(identificador);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.partners.error'));
      return;
    }
    const emitido = resultado.valor;
    await this.dialogo.alerta(
      `${this.tCon('admin.partners.rotate_done', { alias: identificador })}\n\n` +
        `clientSecret: ${emitido.secreto}\n${emitido.mensaje ?? ''}`,
      this.t('admin.partners.actions.rotate'),
      'success',
    );
    void this.carga();
  }

  protected async borra(identificador: string): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.tCon('admin.partners.delete_confirm', { alias: identificador }),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.borraElCliente.ejecuta(identificador);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('admin.partners.error'));
      return;
    }
    this.avisos.exito(this.tCon('admin.partners.delete_done', { alias: identificador }));
    void this.carga();
  }

  /** DROP-663: dispara un webhook de prueba a las aplicaciones activas y refresca la tabla. */
  protected async pruebaWebhooks(): Promise<void> {
    this.probando.set(true);
    const resultado = await this.pruebaLosWebhooks.ejecuta();
    if (!resultado.ok) {
      this.probando.set(false);
      this.avisos.error(this.t('admin.partners.webhook_test_error'));
      return;
    }
    // Se le da tiempo al drenaje de la cola a registrar los intentos: releer al instante enseñaría la
    // tabla igual que antes y parecería que la prueba no salió.
    await new Promise((sigue) => setTimeout(sigue, ESPERA_DEL_DRENAJE_MS));
    await this.carga();
    this.probando.set(false);
    this.avisos.exito(this.tCon('admin.partners.webhook_test_sent', { n: resultado.valor }));
  }

  protected altaHecha(): void {
    this.creando.set(false);
    void this.carga();
  }

  private async carga(): Promise<void> {
    this.panorama.set(await this.consulta.ejecuta());
  }
}
