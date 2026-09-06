import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleCheck,
  faCreditCard,
  faEnvelope,
  faServer,
  faStore,
  faTriangleExclamation,
  faTruckFast,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { Plataforma } from '@core/platform/plataforma';
import {
  COMPONENTES_DEL_SERVICIO,
  claveDeLaInsignia,
  claveDelTitular,
} from '../../domain/model/estado-del-servicio';
import { CompruebaEstadoDelServicio } from '../../application/use-case/comprueba-estado-del-servicio.use-case';

/**
 * El estado del servicio.
 *
 * <p>Sustituye al enlace roto a un panel de estado externo. Se comprueba en vivo pinchando un endpoint
 * público: si responde, los componentes se marcan como operativos.
 *
 * <p>MOBILE FIRST: una columna con las filas apiladas, que es como se lee bien en el móvil; el ancho
 * máximo solo limita en pantallas grandes.
 */
@Component({
  selector: 'nx-estado-del-servicio',
  imports: [FaIconComponent],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <header class="text-center">
        <h1>{{ t('status.title') }}</h1>
        <p class="text-sm text-ink-500 mt-1">{{ t('status.subtitle') }}</p>
      </header>

      <div
        role="status"
        class="card p-5 flex items-center gap-3"
        [class.bg-emerald-50]="!degradado()"
        [class.border-emerald-200]="!degradado()"
        [class.bg-amber-50]="degradado()"
        [class.border-amber-200]="degradado()"
      >
        <fa-icon
          [icon]="degradado() ? iconos.aviso : iconos.correcto"
          class="text-2xl"
          [class.text-emerald-600]="!degradado()"
          [class.text-amber-600]="degradado()"
        />
        <div>
          <div class="font-medium">{{ t(claveDelTitular()) }}</div>
          <!--
            La hora se calcula en el NAVEGADOR, no al prerenderizar. Al construir hay otro instante y
            otro formato local, así que el texto escrito nunca coincidiría con el hidratado y Angular
            tiraría el HTML de la página entera. Hasta que llega, no se enseña hora: es preferible a
            enseñar una que no es la de quien mira.
          -->
          <div class="text-xs text-ink-500">{{ t('status.updated') }} {{ comprobadoA() }}</div>
        </div>
      </div>

      <!--
        La lista detallada se hidrata al llegar a ella. Lo que decide si alguien se queda tranquilo es
        el rótulo de arriba —«todos los sistemas operativos»—, y ese sí llega pintado y vivo.
      -->
      @defer (hydrate on viewport) {
      <div class="space-y-2">
        @for (componente of componentes; track componente) {
          <div class="card p-4 flex items-center justify-between">
            <span class="flex items-center gap-3 text-[14px]">
              <fa-icon [icon]="iconoDe(componente)" class="text-ink-400" />
              {{ t('status.comp.' + componente) }}
            </span>
            <span
              class="badge badge-sm"
              [class.bg-emerald-100]="!degradado()"
              [class.text-emerald-700]="!degradado()"
              [class.bg-amber-100]="degradado()"
              [class.text-amber-700]="degradado()"
            >
              {{ t(claveDeLaInsignia()) }}
            </span>
          </div>
        }
      </div>
      }
    </div>
  `,
})
export class EstadoDelServicioPage {
  private readonly plataforma = inject(Plataforma);
  private readonly comprueba = inject(CompruebaEstadoDelServicio);
  protected readonly t = inject(TraduccionService).t;

  protected readonly componentes = COMPONENTES_DEL_SERVICIO;

  private readonly salud = signal<'comprobando' | 'operativo' | 'degradado'>('comprobando');
  protected readonly comprobadoA = signal('');

  protected readonly degradado = computed(() => this.salud() === 'degradado');
  protected readonly claveDelTitular = computed(() => claveDelTitular(this.salud()));
  protected readonly claveDeLaInsignia = computed(() => claveDeLaInsignia(this.salud()));

  private readonly iconosPorComponente: Readonly<Record<string, typeof faServer>> = {
    api: faServer,
    catalog: faStore,
    payments: faCreditCard,
    shipping: faTruckFast,
    email: faEnvelope,
    wallet: faWallet,
  };

  protected readonly iconos = { correcto: faCircleCheck, aviso: faTriangleExclamation };

  constructor() {
    // Al prerenderizar NO se comprueba nada: el HTML escrito al construir diría «operativo» para
    // siempre, aunque el servicio se caiga cinco minutos después. El estado se mide cuando alguien
    // mira, y por eso esta pantalla arranca en «comprobando» y se resuelve en el navegador.
    if (this.plataforma.esNavegador) {
      void this.mide();
    }
  }

  protected iconoDe(componente: string): typeof faServer {
    return this.iconosPorComponente[componente] ?? faServer;
  }

  private async mide(): Promise<void> {
    this.salud.set(await this.comprueba.ejecuta());
    this.comprobadoA.set(new Date().toLocaleString());
  }
}
