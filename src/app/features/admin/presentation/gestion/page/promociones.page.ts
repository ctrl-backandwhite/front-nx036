import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBullhorn,
  faCircleCheck,
  faCircleXmark,
  faPen,
  faPlus,
  faTag,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { ImportesStore } from '../../../application/gestion/state/importes.store';
import {
  AlternaLaPromocion,
  AnunciaLaPromocion,
  BorraLaPromocion,
  ConsultaCategoriasDePromocion,
  ConsultaPromociones,
  GuardaLaPromocion,
} from '../../../application/gestion/use-case/promociones.use-case';
import {
  BorradorDePromocion,
  Promocion,
  descuentoLegible,
  estadoDePromocion,
  paraCampoDeFecha,
  promocionEnBlanco,
  resumenDeAmbito,
} from '../../../domain/gestion/model/promociones';
import { OpcionDeAmbito } from '../../../domain/gestion/port/precios.port';
import { PromocionesEditor } from '../component/promociones-editor';

/**
 * Rebajas y cupones.
 *
 * <p>REGLA DEL NEGOCIO: entre varias promociones aplicables gana la que MÁS descuenta; nunca se suman, y
 * ninguna baja del precio base del producto. Esa resolución la hace el backend al calcular el precio;
 * aquí solo se administran las reglas.
 *
 * <p>Sin código es una rebaja automática que se anuncia en la portada; con código es un cupón que hay que
 * teclear en el pago y que no se enseña en el catálogo.
 *
 * <p>ANUNCIAR escribe a TODA la base de usuarios y no se puede retirar, así que es una acción aparte de
 * guardar y se pregunta antes. Si fuera una casilla del formulario, corregir una errata volvería a
 * avisar a todo el mundo.
 *
 * <p>MOBILE FIRST: la tabla va en su propio contenedor con desplazamiento horizontal; en el móvil la
 * cabecera y el botón de alta se pliegan en dos líneas en vez de encogerse.
 */
@Component({
  selector: 'nx-promociones-admin',
  imports: [FaIconComponent, PromocionesEditor],
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <fa-icon [icon]="iconos.etiqueta" /> {{ t('admin.nav.promotions') }}
        </h2>
        <button type="button" class="btn btn-primary btn-sm" (click)="abreAlta()">
          <fa-icon [icon]="iconos.mas" /> {{ t('admin.promo.new') }}
        </button>
      </div>

      <p class="text-sm text-ink-500">{{ t('admin.promo.help') }}</p>

      @if (cargando()) {
        <p class="text-sm text-ink-500">{{ t('common.loading') }}</p>
      } @else if (promociones().length === 0) {
        <p class="text-sm text-ink-500">{{ t('admin.promo.empty') }}</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>{{ t('admin.promo.col_name') }}</th>
                <th>{{ t('admin.promo.col_code') }}</th>
                <th>{{ t('admin.promo.col_discount') }}</th>
                <th>{{ t('admin.promo.col_scope') }}</th>
                <th>{{ t('admin.promo.col_window') }}</th>
                <th>{{ t('admin.promo.col_uses') }}</th>
                <th>{{ t('admin.promo.col_state') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (promocion of promociones(); track promocion.id) {
                @let alcance = alcanceDe(promocion);
                <tr>
                  <td class="font-medium">{{ promocion.nombre }}</td>
                  <td>
                    @if (promocion.codigo) {
                      <code class="text-xs">{{ promocion.codigo }}</code>
                    } @else {
                      <span class="text-ink-400">—</span>
                    }
                  </td>
                  <td>{{ descuento(promocion) }}</td>
                  <td class="text-xs">
                    {{ t(alcance.clave) }}@if (promocion.ambito !== 'ALL') {
                      <span> ({{ alcance.cuantos }})</span>
                    }
                  </td>
                  <td class="text-xs">
                    {{ fecha(promocion.empiezaEl) }} → {{ fecha(promocion.terminaEl, '∞') }}
                  </td>
                  <td class="text-xs">
                    {{ promocion.usos }}@if (promocion.usosMaximos) {
                      <span> / {{ promocion.usosMaximos }}</span>
                    }
                  </td>
                  <td>
                    <!--
                      Se mira si está DESCONTANDO ahora, no la casilla de activa: una promoción marcada
                      activa pero fuera de fechas no rebaja nada, y pintarla igual que una viva haría
                      creer que el escaparate está de rebajas.
                    -->
                    <fa-icon
                      [icon]="promocion.vigente ? iconos.si : iconos.no"
                      [class.text-emerald-600]="promocion.vigente"
                      [class.text-ink-400]="!promocion.vigente"
                      [title]="tituloDeEstado(promocion)"
                    />
                  </td>
                  <td class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      [title]="t('common.edit')"
                      [attr.aria-label]="t('common.edit')"
                      (click)="abreEdicion(promocion)"
                    >
                      <fa-icon [icon]="iconos.lapiz" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      [title]="
                        promocion.activa ? t('admin.promo.turn_off') : t('admin.promo.turn_on')
                      "
                      [attr.aria-label]="
                        promocion.activa ? t('admin.promo.turn_off') : t('admin.promo.turn_on')
                      "
                      (click)="alterna(promocion)"
                    >
                      <fa-icon [icon]="promocion.activa ? iconos.no : iconos.si" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      [title]="t('admin.promo.announce')"
                      [attr.aria-label]="t('admin.promo.announce')"
                      (click)="anuncia(promocion)"
                    >
                      <fa-icon [icon]="iconos.megafono" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs text-rose-600"
                      [title]="t('common.delete')"
                      [attr.aria-label]="t('common.delete')"
                      (click)="borra(promocion)"
                    >
                      <fa-icon [icon]="iconos.papelera" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (borrador(); as inicial) {
        <nx-promociones-editor
          [inicial]="inicial"
          [editando]="editandoId() !== null"
          [categorias]="categorias()"
          [guardando]="guardando()"
          [error]="error()"
          (cancela)="cierra()"
          (guarda)="guardaLa($event)"
        />
      }
    </div>
  `,
})
export class PromocionesPage {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  private readonly consulta = inject(ConsultaPromociones);
  private readonly guardador = inject(GuardaLaPromocion);
  private readonly alternador = inject(AlternaLaPromocion);
  private readonly anunciador = inject(AnunciaLaPromocion);
  private readonly eliminador = inject(BorraLaPromocion);
  private readonly consultaCategorias = inject(ConsultaCategoriasDePromocion);
  private readonly dialogo = inject(DialogoStore);
  private readonly importes = inject(ImportesStore);

  protected readonly iconos = {
    etiqueta: faTag,
    mas: faPlus,
    lapiz: faPen,
    papelera: faTrash,
    megafono: faBullhorn,
    si: faCircleCheck,
    no: faCircleXmark,
  };

  protected readonly promociones = signal<readonly Promocion[]>([]);
  protected readonly categorias = signal<readonly OpcionDeAmbito[]>([]);
  protected readonly cargando = signal(true);

  protected readonly borrador = signal<BorradorDePromocion | null>(null);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.importes.carga();
    void this.recarga();
    void this.cargaCategorias();
  }

  private async recarga(): Promise<void> {
    this.cargando.set(true);
    const resultado = await this.consulta.ejecuta();
    this.promociones.set(resultado.ok ? resultado.valor : []);
    this.cargando.set(false);
  }

  private async cargaCategorias(): Promise<void> {
    this.categorias.set(await this.consultaCategorias.ejecuta());
  }

  protected abreAlta(): void {
    this.editandoId.set(null);
    this.error.set(null);
    this.borrador.set(promocionEnBlanco());
  }

  /**
   * Las fechas se recortan a lo que entiende `datetime-local`: con la zona al final el campo se queda
   * vacío sin decir nada y quien edita cree que la promoción no tenía fecha.
   */
  protected abreEdicion(promocion: Promocion): void {
    this.editandoId.set(promocion.id);
    this.error.set(null);
    this.borrador.set({
      nombre: promocion.nombre,
      codigo: promocion.codigo ?? '',
      clase: promocion.clase,
      ambito: promocion.ambito,
      porcentaje: promocion.porcentaje,
      importeCentimos: promocion.importeCentimos,
      empiezaEl: paraCampoDeFecha(promocion.empiezaEl),
      terminaEl: paraCampoDeFecha(promocion.terminaEl),
      activa: promocion.activa,
      prioridad: promocion.prioridad,
      usosMaximos: promocion.usosMaximos,
      pedidoMinimoCentimos: promocion.pedidoMinimoCentimos,
      usosPorPersona: promocion.usosPorPersona,
      categorias: promocion.categorias,
      productos: promocion.productos,
    });
  }

  protected cierra(): void {
    this.borrador.set(null);
    this.editandoId.set(null);
    this.error.set(null);
  }

  /** El código vacío significa «sin código»: una cadena en blanco convertiría la rebaja en un cupón mudo. */
  protected async guardaLa(borrador: BorradorDePromocion): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      const codigo = borrador.codigo?.trim();
      const resultado = await this.guardador.ejecuta(
        { ...borrador, codigo: codigo ? codigo.toUpperCase() : undefined },
        this.editandoId() ?? undefined,
      );
      if (!resultado.ok) {
        this.error.set(resultado.error.mensaje || this.t('errors.generic'));
        return;
      }
      this.cierra();
      await this.recarga();
    } finally {
      this.guardando.set(false);
    }
  }

  protected async alterna(promocion: Promocion): Promise<void> {
    const resultado = await this.alternador.ejecuta(promocion.id);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('errors.generic'),
        undefined,
        'error',
      );
      return;
    }
    await this.recarga();
  }

  /**
   * Avisar manda una notificación a TODA la base de usuarios y no se puede retirar, así que se pregunta
   * antes. Es la única acción de esta pantalla con consecuencias fuera de la aplicación.
   */
  protected async anuncia(promocion: Promocion): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.t('admin.promo.notify'),
      this.t('admin.promo.announce'),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.anunciador.ejecuta(promocion.id);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('errors.generic'),
        undefined,
        'error',
      );
      return;
    }
    await this.dialogo.alerta(this.traduccion.tCon('admin.promo.announced', { n: resultado.valor }));
  }

  protected async borra(promocion: Promocion): Promise<void> {
    const confirmado = await this.dialogo.confirma(
      this.traduccion.tCon('admin.promo.delete_confirm', { n: promocion.nombre }),
    );
    if (!confirmado) {
      return;
    }
    const resultado = await this.eliminador.ejecuta(promocion.id);
    if (!resultado.ok) {
      await this.dialogo.alerta(
        resultado.error.mensaje || this.t('errors.generic'),
        undefined,
        'error',
      );
      return;
    }
    await this.recarga();
  }

  protected alcanceDe(promocion: Promocion): { clave: string; cuantos: number } {
    return resumenDeAmbito(promocion);
  }

  /**
   * El descuento en una línea.
   *
   * <p>El porcentaje sale del dominio tal cual; el importe fijo pasa por `ImportesStore` para que se lea
   * en la divisa activa y CON su símbolo. Un «-12,00» a secas no dice de qué moneda habla.
   */
  protected descuento(promocion: Promocion): string {
    if (!promocion.porcentaje && promocion.importeCentimos) {
      return `-${this.importes.escribeCentimos(promocion.importeCentimos)}`;
    }
    return descuentoLegible(promocion);
  }

  protected tituloDeEstado(promocion: Promocion): string {
    switch (estadoDePromocion(promocion)) {
      case 'viva':
        return this.t('admin.promo.live');
      case 'programada':
        return this.t('admin.promo.scheduled');
      default:
        return this.t('admin.promo.off');
    }
  }

  /** Solo el día: la hora de una vigencia no le dice nada a quien administra en un listado. */
  protected fecha(iso: string | undefined, sinValor = '—'): string {
    if (!iso) {
      return sinValor;
    }
    const momento = new Date(iso);
    return Number.isNaN(momento.getTime())
      ? sinValor
      : momento.toLocaleDateString(this.traduccion.idioma());
  }
}
