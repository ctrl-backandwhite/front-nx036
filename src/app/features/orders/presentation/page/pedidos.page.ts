import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxOpen, faFilterCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ResumenDePedido } from '../../domain/model/pedido';
import {
  CRITERIO_VACIO,
  CriterioDePedidos,
  anosConPedidos,
  filtraPedidos,
} from '../../domain/model/criterio-de-pedidos';
import { ListaPedidos } from '../../application/use-case/lista-pedidos.use-case';
import { FiltrosDePedidos } from '../component/filtros-de-pedidos';
import { TablaDePedidos } from '../component/tabla-de-pedidos';
import { TarjetasDePedidos } from '../component/tarjetas-de-pedidos';
import { CancelacionDePedido } from '../service/cancelacion-de-pedido';

/**
 * Los pedidos de quien mira.
 *
 * <p>La pantalla solo pide, filtra y pinta: quién habla con el backend es el caso de uso, y qué pedidos
 * casan con el criterio lo decide el dominio.
 *
 * <p>«Sin ningún pedido» y «sin resultados tras filtrar» son dos vacíos DISTINTOS y se dicen distinto.
 * Enseñar «no tienes pedidos» a alguien que acaba de filtrar por 2019 le hace creer que ha perdido su
 * historial.
 */
@Component({
  selector: 'nx-pedidos',
  imports: [RouterLink, FaIconComponent, FiltrosDePedidos, TablaDePedidos, TarjetasDePedidos],
  template: `
    @if (cargando()) {
      <p class="text-sm text-ink-500">{{ t('orders.loading') }}</p>
    } @else if (pedidos().length === 0) {
      <div class="max-w-2xl mx-auto card p-10 text-center">
        <fa-icon [icon]="iconos.caja" class="text-4xl text-ink-300 mb-3" />
        <h1>{{ t('orders.empty.title') }}</h1>
        <p class="text-sm text-ink-500 mt-2">{{ t('orders.empty.desc') }}</p>
        <a routerLink="/catalog" class="btn btn-primary inline-flex mt-5">
          {{ t('cart.see_catalog') }}
        </a>
      </div>
    } @else {
      <div class="max-w-5xl mx-auto space-y-4">
        <header>
          <h1>{{ t('orders.title') }}</h1>
          <p class="text-sm text-ink-500 mt-1">{{ t('orders.subtitle') }}</p>
        </header>

        <nx-filtros-de-pedidos [(criterio)]="criterio" [anos]="anos()" />

        <p class="text-xs text-ink-500">
          {{ t('orders.filter.showing') }}
          <strong class="text-ink-700">{{ filtrados().length }}</strong> / {{ pedidos().length }}
        </p>

        @if (filtrados().length === 0) {
          <div class="card p-10 text-center">
            <fa-icon [icon]="iconos.sinResultados" class="text-3xl text-ink-300 mb-3" />
            <p class="text-sm text-ink-500">{{ t('orders.no_results') }}</p>
            <button type="button" (click)="criterio.set(vacio)" class="btn btn-ghost btn-sm mt-4">
              {{ t('filters.clear') }}
            </button>
          </div>
        } @else {
          <div class="card overflow-hidden">
            <nx-tabla-de-pedidos [pedidos]="filtrados()" (cancela)="pideCancelar($event)" />
            <nx-tarjetas-de-pedidos [pedidos]="filtrados()" (cancela)="pideCancelar($event)" />
          </div>
        }
      </div>
    }
  `,
})
export class PedidosPage {
  private readonly lista = inject(ListaPedidos);
  private readonly cancelacion = inject(CancelacionDePedido);

  protected readonly t = inject(TraduccionService).t;
  protected readonly iconos = { caja: faBoxOpen, sinResultados: faFilterCircleXmark };
  protected readonly vacio = CRITERIO_VACIO;

  protected readonly pedidos = signal<readonly ResumenDePedido[]>([]);
  protected readonly cargando = signal(true);
  protected readonly criterio = signal<CriterioDePedidos>(CRITERIO_VACIO);

  protected readonly anos = computed(() => anosConPedidos(this.pedidos()));
  protected readonly filtrados = computed(() => filtraPedidos(this.pedidos(), this.criterio()));

  constructor() {
    void this.carga();
  }

  private async carga(): Promise<void> {
    this.cargando.set(true);
    try {
      const resultado = await this.lista.ejecuta();
      // Un fallo deja la lista vacía a propósito: se enseña el mismo vacío que sin pedidos, que es lo
      // que hacía el front anterior. El aviso del error ya lo da el interceptor.
      this.pedidos.set(resultado.ok ? resultado.valor : []);
    } finally {
      this.cargando.set(false);
    }
  }

  protected async pideCancelar(pedido: ResumenDePedido): Promise<void> {
    if (await this.cancelacion.pide(pedido.id, pedido.metodoDePago)) {
      // El pedido cambia de estado y deja de ser cancelable: se relee en vez de tocar la fila a mano,
      // porque el servidor es quien decide si además pasó a REEMBOLSADO.
      await this.carga();
    }
  }
}
