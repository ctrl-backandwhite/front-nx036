import { Component, computed, inject, input, model } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { FiltroSeleccion, OpcionFiltro } from '@ds/component/filtros/filtro-seleccion';
import { EstadoPedido } from '../../../domain/logistica/model/pedido';
// Las dos fechas viajan JUNTAS: son un intervalo, y el dominio ya tiene el tipo para decirlo. Tenerlas
// como dos campos sueltos obligaba a coordinarlas desde fuera, una a una.
import { RangoDeFechas } from '../../../domain/logistica/model/operador';

/** Los treinta y un días. Se listan todos: no se sabe de qué mes se filtrará. */
const DIAS: readonly OpcionFiltro[] = Array.from({ length: 31 }, (_, indice) => ({
  value: String(indice + 1),
  label: String(indice + 1),
}));

/**
 * Los selectores de estado y fecha del listado de pedidos.
 *
 * <p>Los meses se nombran con el idioma ACTIVO y no con una lista escrita a mano: son ocho idiomas, y
 * mantener ocho listas de doce nombres es garantía de que una se quede a medias.
 */
@Component({
  selector: 'nx-filtros-de-pedidos',
  imports: [FiltroSeleccion, FormField],
  template: `
    <nx-filtro-seleccion
      [etiqueta]="t('filters.status')"
      [(valor)]="estado"
      [opciones]="opcionesDeEstado()"
      [marcador]="t('filters.all')"
    />
    <nx-filtro-seleccion
      [etiqueta]="t('orders.filter.year')"
      [(valor)]="anio"
      [opciones]="opcionesDeAnio()"
      [marcador]="t('orders.filter.all')"
    />
    <nx-filtro-seleccion
      [etiqueta]="t('orders.filter.month')"
      [(valor)]="mes"
      [opciones]="meses()"
      [marcador]="t('orders.filter.all')"
    />
    <nx-filtro-seleccion
      [etiqueta]="t('orders.filter.day')"
      [(valor)]="dia"
      [opciones]="dias"
      [marcador]="t('orders.filter.all')"
    />
    <label class="text-[11px] text-ink-500 flex items-center gap-1">
      {{ t('admin.orders.filter.from') }}
      <input
        type="date"
        class="border border-ink-200 rounded px-2 py-1 text-[12px]"
        [formField]="formulario.desde"
      />
    </label>
    <label class="text-[11px] text-ink-500 flex items-center gap-1">
      {{ t('admin.orders.filter.to') }}
      <input
        type="date"
        class="border border-ink-200 rounded px-2 py-1 text-[12px]"
        [formField]="formulario.hasta"
      />
    </label>
  `,
})
export class FiltrosDePedidos {
  readonly estado = model<string | null>(null);
  readonly anio = model<string | null>(null);
  readonly mes = model<string | null>(null);
  readonly dia = model<string | null>(null);
  readonly rango = model<RangoDeFechas>({ desde: '', hasta: '' });

  readonly estados = input.required<readonly EstadoPedido[]>();
  readonly anios = input.required<readonly string[]>();

  protected readonly dias = DIAS;

  /**
   * El formulario se monta SOBRE el propio `model`, no sobre una copia: así lo que se escribe llega a
   * quien usa el componente sin ningún puente que mantener, y las dos fechas siguen siendo una sola
   * cosa —el intervalo— también por dentro.
   */
  protected readonly formulario = form(this.rango);

  private readonly traduccion = inject(TraduccionService);
  private readonly preferencias = inject(PreferenciasService);
  protected readonly t = this.traduccion.t;

  /** Sin traducción se enseña el código: así un estado nuevo del backend se ve en vez de quedar vacío. */
  protected readonly opcionesDeEstado = computed<readonly OpcionFiltro[]>(() =>
    this.estados().map((estado) => {
      const clave = `orders.status.${estado}`;
      const etiqueta = this.traduccion.t(clave);
      return { value: estado, label: etiqueta === clave ? estado : etiqueta };
    }),
  );

  protected readonly opcionesDeAnio = computed<readonly OpcionFiltro[]>(() =>
    this.anios().map((anio) => ({ value: anio, label: anio })),
  );

  protected readonly meses = computed<readonly OpcionFiltro[]>(() => {
    const idioma = this.preferencias.idioma();
    return Array.from({ length: 12 }, (_, indice) => {
      const nombre = new Date(2000, indice, 1).toLocaleString(idioma, { month: 'long' });
      return {
        value: String(indice + 1),
        label: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      };
    });
  });
}
