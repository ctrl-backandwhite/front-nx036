import { Component, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faClockRotateLeft,
  faCoins,
  faLock,
  faSliders,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import {
  DetalleDeCartera,
  MovimientoDeCartera,
  referenciaDelMovimiento,
} from '../../../domain/gestion/model/carteras';
import { paginasAlMenosUna } from '../../../domain/gestion/model/pagina';
import {
  AjustaLaCartera,
  ConsultaLaCartera,
  ConsultaMovimientos,
} from '../../../application/gestion/use-case/carteras.use-case';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import { Paginacion } from '../component/paginacion';
import {
  CarterasModalSaldo,
  ImporteConMotivo,
} from '../component/carteras-modal-saldo';

/** Cuántos apuntes por página del libro mayor. Los mismos que pedía el panel anterior. */
const POR_PAGINA = 30;

/**
 * El detalle de la cartera de un cliente.
 *
 * <p>Enseña los tres saldos —disponible, retenido y total—, el libro mayor paginado y el ajuste manual.
 * Reemplazó al antiguo «Ir al usuario»: quien entra aquí viene a mirar dinero, no una ficha de cuenta.
 *
 * <p>DOS CLAVES DISTINTAS, y no son intercambiables: la ficha y el ajuste se piden por el identificador
 * del USUARIO —que es el que viaja en la dirección—, y los movimientos por el de la CARTERA, que solo se
 * conoce después de leer la ficha. Confundirlas devuelve un 404 que en pantalla se lee como «sin
 * movimientos», que es un vacío muy distinto.
 *
 * <p>Todos los importes son DÓLARES canónicos y se escriben en la divisa activa con `ImportesStore`. El
 * SALDO RESULTANTE de cada apunte es el que persistió el backend, no una suma hecha aquí: recalcularlo
 * haría que un apunte perdido reescribiera todo el histórico hacia atrás.
 *
 * <p>MOBILE FIRST: las tres tarjetas de saldo van en una columna y pasan a tres desde `sm`; la tabla se
 * desplaza dentro de su caja.
 */
@Component({
  selector: 'nx-cartera-detalle-admin',
  imports: [RouterLink, FaIconComponent, Paginacion, CarterasModalSaldo],
  template: `
    <div class="space-y-5">
      <div>
        <a routerLink="/admin/wallets" class="text-brand-700 text-[12px]">
          <fa-icon [icon]="iconos.atras" /> {{ t('admin.wallets.detail.back') }}
        </a>
      </div>

      @if (cargando()) {
        <div class="text-ink-500 text-sm">{{ t('common.loading') }}</div>
      } @else if (cartera(); as c) {
        <header class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="flex items-center gap-2">
              <fa-icon [icon]="iconos.cartera" class="text-brand-600" />
              {{ t('admin.wallets.detail.title') }}
            </h1>
            <p class="text-sm text-ink-500 mt-1">
              <span class="font-mono">{{ c.email }}</span>
              @if (c.nombre) {
                <span class="text-ink-400"> · {{ c.nombre }}</span>
              }
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
              [class.bg-emerald-100]="c.estado === 'ACTIVE'"
              [class.text-emerald-700]="c.estado === 'ACTIVE'"
              [class.bg-amber-100]="c.estado !== 'ACTIVE'"
              [class.text-amber-700]="c.estado !== 'ACTIVE'"
            >
              {{ t('admin.wallets.status.' + c.estado) }}
            </span>
            <button type="button" (click)="ajustando.set(true)" class="btn btn-primary text-[12px]">
              <fa-icon [icon]="iconos.ajuste" /> {{ t('admin.wallets.detail.adjust_cta') }}
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="card p-4">
            <div class="flex items-center gap-2 text-[12px] text-ink-500">
              <fa-icon [icon]="iconos.disponible" /> {{ t('admin.wallets.detail.available') }}
            </div>
            <div class="text-2xl font-semibold mt-1">{{ saldo(c.disponibleUsd) }}</div>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-[12px] text-ink-500">
              <fa-icon [icon]="iconos.retenido" /> {{ t('admin.wallets.detail.held') }}
            </div>
            <div class="text-2xl font-semibold mt-1 text-ink-600">{{ saldo(c.retenidoUsd) }}</div>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-[12px] text-ink-500">
              <fa-icon [icon]="iconos.cartera" /> {{ t('admin.wallets.detail.total') }}
            </div>
            <div class="text-2xl font-semibold mt-1">{{ saldo(c.saldoUsd) }}</div>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div
            class="flex items-center gap-2 px-4 py-3 border-b border-ink-100 text-[13px] font-medium"
          >
            <fa-icon [icon]="iconos.movimientos" class="text-ink-400" />
            {{ t('admin.wallets.detail.movements') }}
            <span class="text-[11px] text-ink-400 ml-auto font-normal">{{ total() }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm">
              <thead class="bg-ink-50 text-ink-500 text-left text-[12px]">
                <tr>
                  <th class="px-4 py-2 font-medium">{{ t('admin.wallets.detail.col.date') }}</th>
                  <th class="px-4 py-2 font-medium">{{ t('admin.wallets.detail.col.type') }}</th>
                  <th class="px-4 py-2 font-medium text-right">
                    {{ t('admin.wallets.detail.col.amount') }}
                  </th>
                  <th class="px-4 py-2 font-medium">
                    {{ t('admin.wallets.detail.col.reference') }}
                  </th>
                  <th class="px-4 py-2 font-medium text-right">
                    {{ t('admin.wallets.detail.col.balance') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @if (cargandoMovimientos()) {
                  <tr>
                    <td colspan="5" class="px-4 py-10 text-center text-ink-500 text-[12px]">
                      {{ t('common.loading') }}
                    </td>
                  </tr>
                } @else {
                  @for (movimiento of movimientos(); track movimiento.id) {
                    <tr class="border-t border-ink-100 hover:bg-ink-50/50 text-[12px]">
                      <td class="px-4 py-2 text-ink-500 whitespace-nowrap">
                        {{ fecha(movimiento) }}
                      </td>
                      <td class="px-4 py-2">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 text-[11px] font-medium"
                        >
                          {{ clase(movimiento) }}
                        </span>
                      </td>
                      <!-- El signo se pinta con color Y con el símbolo: distinguir un cargo de un abono
                           solo por el color deja fuera a quien no lo percibe. -->
                      <td
                        class="px-4 py-2 text-right font-mono"
                        [class.text-rose-600]="movimiento.importeCentimos < 0"
                        [class.text-emerald-700]="movimiento.importeCentimos >= 0"
                      >
                        {{ movimiento.importeCentimos > 0 ? '+' : ''
                        }}{{ importe(movimiento.importeCentimos) }}
                      </td>
                      <td class="px-4 py-2 text-ink-600">{{ referencia(movimiento) }}</td>
                      <td class="px-4 py-2 text-right font-mono text-ink-500">
                        {{ importe(movimiento.saldoResultanteCentimos) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-12 text-center">
                        <fa-icon [icon]="iconos.movimientos" class="text-3xl text-ink-300 mb-2" />
                        <div class="text-ink-600 font-medium">
                          {{ t('admin.wallets.detail.movements_empty') }}
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

        <nx-paginacion [pagina]="pagina()" [paginas]="paginas()" (cambia)="pagina.set($event)" />

        @if (ajustando()) {
          <nx-carteras-modal-saldo
            [clase]="'ajuste'"
            [email]="c.email"
            [enviando]="enviando()"
            (cierra)="ajustando.set(false)"
            (confirma)="ajusta($event)"
          />
        }
      } @else {
        <div class="card p-6 text-ink-500">{{ t('admin.wallets.detail.not_found') }}</div>
      }
    </div>
  `,
})
export class CarteraDetallePage {
  /**
   * Llega por la dirección (`/admin/wallets/:userId`) gracias al enlace de entradas del enrutador, que
   * el proyecto activa en `app.config.ts` con `withComponentInputBinding()`. Conserva el nombre del
   * parámetro de la ruta: si no coincide, Angular no lo enlaza y no avisa de nada.
   */
  readonly userId = input('');

  protected readonly iconos = {
    atras: faArrowLeft,
    cartera: faWallet,
    ajuste: faSliders,
    disponible: faCoins,
    retenido: faLock,
    movimientos: faClockRotateLeft,
  };

  protected readonly t = inject(TraduccionService).t;

  private readonly consulta = inject(ConsultaLaCartera);
  private readonly movimientosDe = inject(ConsultaMovimientos);
  private readonly ajustador = inject(AjustaLaCartera);
  private readonly avisos = inject(AvisosStore);
  private readonly importes = inject(ImportesStore);

  protected readonly cartera = signal<DetalleDeCartera | null>(null);
  protected readonly cargando = signal(true);

  /** Al cambiar de cartera se vuelve al principio del libro mayor: la página 7 de otra no significa nada. */
  protected readonly pagina = linkedSignal<string, number>({
    source: () => this.userId(),
    computation: () => 0,
  });

  protected readonly movimientos = signal<readonly MovimientoDeCartera[]>([]);
  protected readonly total = signal(0);
  protected readonly paginas = signal(1);
  protected readonly cargandoMovimientos = signal(false);

  protected readonly ajustando = signal(false);
  protected readonly enviando = signal(false);

  constructor() {
    void this.importes.carga();
    effect(() => {
      void this.cargaFicha(this.userId());
    });
    // El libro mayor depende de la CARTERA, que solo se conoce tras leer la ficha; por eso va en un
    // efecto aparte y no encadenado, o cambiar de página volvería a pedir también la ficha.
    effect(() => {
      const actual = this.cartera();
      const pagina = this.pagina();
      if (actual) {
        void this.cargaMovimientos(actual.id, pagina);
      }
    });
  }

  private async cargaFicha(idUsuario: string): Promise<void> {
    if (!idUsuario) {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    try {
      const resultado = await this.consulta.ejecuta(idUsuario);
      // Un fallo deja la ficha vacía y se pinta «no encontrado»: es lo que quien mira necesita saber.
      this.cartera.set(resultado.ok ? resultado.valor : null);
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargaMovimientos(idCartera: string, pagina: number): Promise<void> {
    this.cargandoMovimientos.set(true);
    try {
      const resultado = await this.movimientosDe.ejecuta(idCartera, pagina, POR_PAGINA);
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('errors.generic'));
        this.movimientos.set([]);
        return;
      }
      this.movimientos.set(resultado.valor.elementos);
      this.total.set(resultado.valor.total);
      this.paginas.set(paginasAlMenosUna(resultado.valor.paginas));
    } finally {
      this.cargandoMovimientos.set(false);
    }
  }

  protected async ajusta(importe: ImporteConMotivo): Promise<void> {
    this.enviando.set(true);
    try {
      const resultado = await this.ajustador.ejecuta({
        idUsuario: this.userId(),
        importeCentimos: importe.importeCentimos,
        descripcion: importe.descripcion,
      });
      if (!resultado.ok) {
        this.avisos.error(resultado.error.mensaje || this.t('admin.wallets.adjust.error'));
        return;
      }
      this.ajustando.set(false);
      this.avisos.exito(this.t('admin.wallets.adjust.ok'));
      // Se relee la ficha ENTERA: el ajuste cambia el saldo y añade un apunte, y enseñar uno sin el
      // otro deja la pantalla contando dos historias distintas.
      await this.cargaFicha(this.userId());
    } finally {
      this.enviando.set(false);
    }
  }

  /** La cartera se lleva en DÓLARES: hay que declararlo o la conversión partiría de la divisa activa. */
  protected saldo(usd: number): string {
    return this.importes.escribe(usd, 'USD');
  }

  protected importe(centimos: number): string {
    return this.importes.escribeCentimos(centimos, 'USD');
  }

  /** La clase del apunte, con respaldo al código: `t()` devuelve la clave cuando falta la traducción. */
  protected clase(movimiento: MovimientoDeCartera): string {
    const clave = `admin.wallets.kind.${movimiento.clase}`;
    const texto = this.t(clave);
    return texto === clave ? movimiento.clase : texto;
  }

  /** El pedido si lo hay; si no, la nota del backend traducida. La regla vive en el dominio. */
  protected referencia(movimiento: MovimientoDeCartera): string {
    return referenciaDelMovimiento(movimiento, this.t);
  }

  protected fecha(movimiento: MovimientoDeCartera): string {
    return new Date(movimiento.creadoEl).toLocaleString();
  }
}
