import { Component, computed, inject, input, model } from '@angular/core';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { BarraFiltros } from '@ds/component/filtros/barra-filtros';
import { FiltroDesplegable, OpcionDeFiltro } from '@ds/component/filtros/filtro-desplegable';
import { CampoBusqueda } from '@ds/component/campo-busqueda/campo-busqueda';
import { ESTADOS_DE_PEDIDO } from '../../domain/model/pedido';
import {
  CRITERIO_VACIO,
  CriterioDePedidos,
  filtrosPuestos,
} from '../../domain/model/criterio-de-pedidos';

function capitaliza(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/**
 * La barra de filtros del listado de pedidos.
 *
 * <p>Los años salen de los pedidos reales —no tiene sentido ofrecer 2019 si nadie compró ese año—;
 * meses y días son fijos, y los meses los traduce el propio navegador según el idioma activo, así que no
 * necesitan clave de diccionario.
 */
@Component({
  selector: 'nx-filtros-de-pedidos',
  imports: [BarraFiltros, FiltroDesplegable, CampoBusqueda],
  template: `
    <nx-barra-filtros
      [activos]="puestos()"
      [hayActivos]="puestos() > 0"
      (limpia)="criterio.set(vacio)"
    >
      <nx-campo-busqueda
        [valor]="criterio().texto"
        (valorChange)="cambia('texto', $event)"
        [marcador]="t('orders.filter.search_ph')"
        clase="w-full sm:min-w-[220px]"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('orders.filter.status')"
        [valor]="criterio().estado"
        (valorChange)="cambia('estado', $event)"
        [opciones]="opcionesDeEstado()"
        [marcador]="t('orders.filter.all')"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('orders.filter.year')"
        [valor]="criterio().ano"
        (valorChange)="cambia('ano', $event)"
        [opciones]="opcionesDeAno()"
        [marcador]="t('orders.filter.all')"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('orders.filter.month')"
        [valor]="criterio().mes"
        (valorChange)="cambia('mes', $event)"
        [opciones]="opcionesDeMes()"
        [marcador]="t('orders.filter.all')"
      />
      <nx-filtro-desplegable
        [etiqueta]="t('orders.filter.day')"
        [valor]="criterio().dia"
        (valorChange)="cambia('dia', $event)"
        [opciones]="opcionesDeDia()"
        [marcador]="t('orders.filter.all')"
      />
      <label class="flex items-center gap-1.5 text-xs text-ink-500" for="pedidos-desde">
        {{ t('orders.filter.from') }}
      </label>
      <input
        id="pedidos-desde"
        type="date"
        class="input input-sm w-35"
        [value]="criterio().desde"
        [max]="criterio().hasta || null"
        (change)="cambiaFecha('desde', $event)"
      />
      <label class="flex items-center gap-1.5 text-xs text-ink-500" for="pedidos-hasta">
        {{ t('orders.filter.to') }}
      </label>
      <input
        id="pedidos-hasta"
        type="date"
        class="input input-sm w-35"
        [value]="criterio().hasta"
        [min]="criterio().desde || null"
        (change)="cambiaFecha('hasta', $event)"
      />
    </nx-barra-filtros>
  `,
})
export class FiltrosDePedidos {
  readonly criterio = model.required<CriterioDePedidos>();
  /** Los años con pedidos, de más reciente a más antiguo. */
  readonly anos = input<readonly string[]>([]);

  protected readonly vacio = CRITERIO_VACIO;
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  protected readonly puestos = computed(() => filtrosPuestos(this.criterio()));

  protected readonly opcionesDeEstado = computed<readonly OpcionDeFiltro[]>(() =>
    ESTADOS_DE_PEDIDO.map((estado) => ({
      valor: estado,
      etiqueta: this.t(`orders.status.${estado}`),
    })),
  );

  protected readonly opcionesDeAno = computed<readonly OpcionDeFiltro[]>(() =>
    this.anos().map((ano) => ({ valor: ano, etiqueta: ano })),
  );

  protected readonly opcionesDeMes = computed<readonly OpcionDeFiltro[]>(() => {
    const idioma = this.traduccion.idioma();
    return Array.from({ length: 12 }, (_, mes) => ({
      valor: String(mes + 1),
      etiqueta: capitaliza(new Date(2000, mes, 1).toLocaleString(idioma, { month: 'long' })),
    }));
  });

  protected readonly opcionesDeDia = computed<readonly OpcionDeFiltro[]>(() =>
    Array.from({ length: 31 }, (_, dia) => ({ valor: String(dia + 1), etiqueta: String(dia + 1) })),
  );

  protected cambia(campo: 'texto' | 'estado' | 'ano' | 'mes' | 'dia', valor: string | null): void {
    this.criterio.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected cambiaFecha(campo: 'desde' | 'hasta', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.criterio.update((actual) => ({ ...actual, [campo]: valor }));
  }
}
