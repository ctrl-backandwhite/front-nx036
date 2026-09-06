import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import {
  AgenteResumido,
  Cotizacion,
  NuevaSolicitud,
  SolicitudDeAprovisionamiento,
} from '../../domain/model/aprovisionamiento';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import {
  AGENTES_DE_APROVISIONAMIENTO_PORT,
  COTIZACIONES_PORT,
  SOLICITUDES_DE_APROVISIONAMIENTO_PORT,
} from '../../domain/port/aprovisionamiento.port';
import { TASAS_DE_CAMBIO_PORT } from '../../domain/port/tasas-de-cambio.port';
import { CreaSolicitudDeAprovisionamiento } from '../../application/use-case/crea-solicitud-de-aprovisionamiento.use-case';
import { AgentesDeAprovisionamiento } from '../component/agentes-de-aprovisionamiento';
import { DialogoNuevaSolicitud } from '../component/dialogo-nueva-solicitud';
import { TarjetaDeSolicitud } from '../component/tarjeta-de-solicitud';

/** Las dos pestañas de la pantalla. */
type Pestana = 'requests' | 'agents';

/**
 * Aprovisionamiento: pedir un producto que todavía no está en el catálogo.
 *
 * <p>Las acciones avisan al fallar, y la peor de todas era elegir una cotización: sin aviso, quien la
 * elegía se quedaba esperando un pedido que nadie había puesto en marcha.
 */
@Component({
  selector: 'nx-aprovisionamiento',
  imports: [
    FaIconComponent,
    TarjetaDeSolicitud,
    DialogoNuevaSolicitud,
    AgentesDeAprovisionamiento,
  ],
  template: `
    <div class="space-y-5">
      <header>
        <h1>{{ t('sourcing.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('sourcing.subtitle') }}</p>
      </header>

      <div role="tablist" class="flex gap-1 border-b border-ink-100">
        @for (nombre of pestanas; track nombre) {
          <button
            role="tab"
            type="button"
            [attr.aria-selected]="pestana() === nombre"
            class="px-3 py-2 text-[13px] -mb-px border-b-2 transition-colors"
            [class.border-brand-600]="pestana() === nombre"
            [class.text-brand-700]="pestana() === nombre"
            [class.font-medium]="pestana() === nombre"
            [class.border-transparent]="pestana() !== nombre"
            [class.text-ink-500]="pestana() !== nombre"
            (click)="pestana.set(nombre)"
          >
            {{ t('sourcing.tab.' + nombre) }}
          </button>
        }
      </div>

      @if (pestana() === 'requests') {
        <div>
          <div class="flex justify-end mb-3">
            <button type="button" class="btn btn-primary" (click)="formularioAbierto.set(true)">
              <fa-icon [icon]="iconoMas" /> {{ t('sourcing.new') }}
            </button>
          </div>

          @if (solicitudes().length === 0) {
            <div class="card p-8 text-center text-ink-500">{{ t('sourcing.empty') }}</div>
          }

          <div class="space-y-3">
            @for (solicitud of solicitudes(); track solicitud.id) {
              <nx-tarjeta-de-solicitud
                [solicitud]="solicitud"
                [cotizaciones]="cotizacionesDe(solicitud.id)"
                [tasas]="tasas()"
                [divisa]="divisa()"
                (despliega)="cargaCotizaciones(solicitud.id)"
                (elige)="elige(solicitud.id, $event)"
                (cancela)="cancela(solicitud)"
                (elimina)="elimina(solicitud)"
              />
            }
          </div>
        </div>
      } @else {
        <nx-agentes-de-aprovisionamiento [agentes]="agentes()" />
      }

      @if (formularioAbierto()) {
        <nx-dialogo-nueva-solicitud
          [enviando]="creando()"
          [error]="errorDelFormulario()"
          (crea)="crea($event)"
          (limpiaError)="errorDelFormulario.set(null)"
          (cancela)="cierraFormulario()"
        />
      }
    </div>
  `,
})
export class AprovisionamientoPage {
  private readonly puertoDeSolicitudes = inject(SOLICITUDES_DE_APROVISIONAMIENTO_PORT);
  private readonly puertoDeCotizaciones = inject(COTIZACIONES_PORT);
  private readonly puertoDeAgentes = inject(AGENTES_DE_APROVISIONAMIENTO_PORT);
  private readonly puertoDeTasas = inject(TASAS_DE_CAMBIO_PORT);
  private readonly creaSolicitud = inject(CreaSolicitudDeAprovisionamiento);
  private readonly dialogo = inject(DialogoStore);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = inject(TraduccionService).t;

  protected readonly pestanas: readonly Pestana[] = ['requests', 'agents'];
  protected readonly pestana = signal<Pestana>('requests');
  protected readonly iconoMas = faPlus;

  protected readonly solicitudes = signal<readonly SolicitudDeAprovisionamiento[]>([]);
  protected readonly agentes = signal<readonly AgenteResumido[]>([]);
  protected readonly tasas = signal<readonly TasaDeCambio[]>([]);
  protected readonly divisa = this.preferencias.moneda;

  /** Las cotizaciones ya traídas, por solicitud. Se piden solo al desplegar cada tarjeta. */
  private readonly cotizaciones = signal<Readonly<Record<string, readonly Cotizacion[]>>>({});

  protected readonly formularioAbierto = signal(false);
  protected readonly creando = signal(false);
  protected readonly errorDelFormulario = signal<string | null>(null);

  constructor() {
    void this.recarga();
    void this.cargaAgentes();
    void this.cargaTasas();
  }

  protected cotizacionesDe(id: string): readonly Cotizacion[] {
    return this.cotizaciones()[id] ?? [];
  }

  protected async cargaCotizaciones(id: string): Promise<void> {
    const resultado = await this.puertoDeCotizaciones.deLaSolicitud(id);
    if (resultado.ok) {
      this.cotizaciones.update((previas) => ({ ...previas, [id]: resultado.valor }));
    }
  }

  protected async crea(solicitud: NuevaSolicitud): Promise<void> {
    this.creando.set(true);
    try {
      const resultado = await this.creaSolicitud.ejecuta(solicitud);
      if (!resultado.ok) {
        // El código lo pone el caso de uso cuando el rechazo es nuestro; si viene del servidor, el
        // mensaje ya llega traducido y se enseña tal cual.
        const claves: Readonly<Record<string, string>> = {
          URL_INVALIDA: 'sourcing.url.invalid',
          MERCADO_NO_SOPORTADO: 'sourcing.url.unsupported',
        };
        const clave = resultado.error.codigo ? claves[resultado.error.codigo] : undefined;
        this.errorDelFormulario.set(
          clave ? this.t(clave) : resultado.error.mensaje || this.t('sourcing.url.invalid'),
        );
        return;
      }
      this.cierraFormulario();
      await this.recarga();
    } finally {
      this.creando.set(false);
    }
  }

  protected async elige(idSolicitud: string, idCotizacion: string): Promise<void> {
    const resultado = await this.puertoDeCotizaciones.elige(idSolicitud, idCotizacion);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected async cancela(solicitud: SolicitudDeAprovisionamiento): Promise<void> {
    const resultado = await this.puertoDeSolicitudes.cancela(solicitud.id);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected async elimina(solicitud: SolicitudDeAprovisionamiento): Promise<void> {
    // Eliminar es definitivo: se pregunta. Cancelar, que es reversible, no lo pregunta.
    const confirmado = await this.dialogo.confirma(
      this.t('sourcing.delete_confirm'),
      this.t('sourcing.delete_title'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.puertoDeSolicitudes.elimina(solicitud.id);
    if (!resultado.ok) {
      await this.avisa(resultado.error.mensaje);
      return;
    }
    await this.recarga();
  }

  protected cierraFormulario(): void {
    this.formularioAbierto.set(false);
    this.errorDelFormulario.set(null);
  }

  private async recarga(): Promise<void> {
    const resultado = await this.puertoDeSolicitudes.mias();
    if (resultado.ok) {
      this.solicitudes.set(resultado.valor);
    }
  }

  private async cargaAgentes(): Promise<void> {
    const resultado = await this.puertoDeAgentes.lista();
    if (resultado.ok) {
      this.agentes.set(resultado.valor);
    }
  }

  private async cargaTasas(): Promise<void> {
    const resultado = await this.puertoDeTasas.consulta();
    if (resultado.ok) {
      this.tasas.set(resultado.valor);
    }
  }

  private async avisa(mensaje: string): Promise<void> {
    await this.dialogo.alerta(mensaje || this.t('common.error'), undefined, 'error');
  }
}
