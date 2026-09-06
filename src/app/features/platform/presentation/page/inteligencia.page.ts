import { Component, effect, inject, signal } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  AlertaDeTendencia,
  ProductoGanador,
  TendenciaDeAnuncio,
} from '../../domain/model/inteligencia';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import { ALERTAS_DE_TENDENCIA_PORT, TENDENCIAS_PORT } from '../../domain/port/inteligencia.port';
import { TASAS_DE_CAMBIO_PORT } from '../../domain/port/tasas-de-cambio.port';
import { CreaAlertaDeTendencia } from '../../application/use-case/crea-alerta-de-tendencia.use-case';
import { AlertasDeTendencia, PeticionDeAlerta } from '../component/alertas-de-tendencia';
import { RejillaDeProductos } from '../component/rejilla-de-productos';
import { TendenciasDeAnuncios } from '../component/tendencias-de-anuncios';

type Pestana = 'ads' | 'sales' | 'winning' | 'alerts';

/**
 * Inteligencia de mercado: anuncios, ventas, productos ganadores y alertas.
 *
 * <p>Cada pestaña es un componente, y la pantalla solo decide cuál se enseña y trae sus datos. Cuando
 * las cuatro vivían en el mismo fichero, tocar la tabla de anuncios obligaba a leer el formulario de
 * alertas para asegurarse de no romperlo.
 *
 * <p>Una alerta que no llega a crearse y no lo dice es peor que no tener alertas: quien la configuró se
 * queda esperando un aviso que no va a llegar nunca. Por eso los fallos se avisan.
 */
@Component({
  selector: 'nx-inteligencia',
  imports: [TendenciasDeAnuncios, RejillaDeProductos, AlertasDeTendencia],
  template: `
    <div class="space-y-5">
      <header>
        <h1>{{ t('intel.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('intel.subtitle') }}</p>
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
            {{ t('intel.tab.' + nombre) }}
          </button>
        }
      </div>

      @switch (pestana()) {
        @case ('ads') {
          <nx-tendencias-de-anuncios
            [tendencias]="anuncios()"
            [fuente]="fuente()"
            (cambiaFuente)="fuente.set($event)"
          />
        }
        @case ('sales') {
          <nx-rejilla-de-productos [productos]="ventas()" [tasas]="tasas()" [divisa]="divisa()" />
        }
        @case ('winning') {
          <nx-rejilla-de-productos [productos]="ganadores()" [tasas]="tasas()" [divisa]="divisa()" />
        }
        @default {
          <nx-alertas-de-tendencia
            [alertas]="alertas()"
            [creando]="creandoAlerta()"
            (crea)="creaAlerta($event)"
            (elimina)="eliminaAlerta($event)"
          />
        }
      }
    </div>
  `,
})
export class InteligenciaPage {
  private readonly tendencias = inject(TENDENCIAS_PORT);
  private readonly puertoDeAlertas = inject(ALERTAS_DE_TENDENCIA_PORT);
  private readonly puertoDeTasas = inject(TASAS_DE_CAMBIO_PORT);
  private readonly creaAlertaDeTendencia = inject(CreaAlertaDeTendencia);
  private readonly avisos = inject(AvisosStore);
  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = this.traduccion.t;

  protected readonly pestanas: readonly Pestana[] = ['ads', 'sales', 'winning', 'alerts'];
  protected readonly pestana = signal<Pestana>('ads');
  protected readonly fuente = signal('');

  protected readonly anuncios = signal<readonly TendenciaDeAnuncio[]>([]);
  protected readonly ventas = signal<readonly ProductoGanador[]>([]);
  protected readonly ganadores = signal<readonly ProductoGanador[]>([]);
  protected readonly alertas = signal<readonly AlertaDeTendencia[]>([]);
  protected readonly tasas = signal<readonly TasaDeCambio[]>([]);
  protected readonly divisa = this.preferencias.moneda;
  protected readonly creandoAlerta = signal(false);

  constructor() {
    // Los anuncios se recargan al cambiar de fuente; las dos rejillas, al cambiar de idioma, porque
    // sus títulos vienen ya traducidos del backend. Son ejes distintos y por eso son efectos distintos.
    effect(() => {
      void this.cargaAnuncios(this.fuente());
    });
    effect(() => {
      void this.cargaProductos(this.traduccion.idioma());
    });
    void this.cargaAlertas();
    void this.cargaTasas();
  }

  protected async creaAlerta(peticion: PeticionDeAlerta): Promise<void> {
    this.creandoAlerta.set(true);
    try {
      const resultado = await this.creaAlertaDeTendencia.ejecuta(
        peticion.palabraClave,
        peticion.umbralSobreCien,
        peticion.canal,
      );
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('common.error'));
        return;
      }
      await this.cargaAlertas();
    } finally {
      this.creandoAlerta.set(false);
    }
  }

  protected async eliminaAlerta(id: string): Promise<void> {
    const resultado = await this.puertoDeAlertas.elimina(id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
      return;
    }
    await this.cargaAlertas();
  }

  private async cargaAnuncios(fuente: string): Promise<void> {
    const resultado = await this.tendencias.anuncios(fuente || undefined, 50);
    if (resultado.ok) {
      this.anuncios.set(resultado.valor);
    }
  }

  private async cargaProductos(idioma: string): Promise<void> {
    const [ventas, ganadores] = await Promise.all([
      this.tendencias.ventas(idioma, 30),
      this.tendencias.ganadores(idioma, 30),
    ]);
    if (ventas.ok) {
      this.ventas.set(ventas.valor);
    }
    if (ganadores.ok) {
      this.ganadores.set(ganadores.valor);
    }
  }

  private async cargaAlertas(): Promise<void> {
    const resultado = await this.puertoDeAlertas.lista();
    if (resultado.ok) {
      this.alertas.set(resultado.valor);
    }
  }

  private async cargaTasas(): Promise<void> {
    const resultado = await this.puertoDeTasas.consulta();
    if (resultado.ok) {
      this.tasas.set(resultado.valor);
    }
  }
}
