import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faCartPlus,
  faCircleCheck,
  faCircleInfo,
  faHeart as faCorazonLleno,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faCorazonVacio } from '@fortawesome/free-regular-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { FichaDeProducto, hayExistencias } from '../../domain/model/producto';
import { SeleccionDeLaFicha } from '../seleccion-de-la-ficha';
import { SesionActual } from '@core/auth/sesion-actual';
import { FavoritosStore } from '../../application/state/favoritos.store';
import { ColorElegido, SelectorColor } from './selector-color';
import { CambioDeTalla, TablaTallas } from './tabla-tallas';
import { SelectorCantidad } from './selector-cantidad';
import { BloquePrecio } from './bloque-precio';
import { BloqueEnvio } from './bloque-envio';
import { DistintivoArancel } from './distintivo-arancel';
import { BloqueSubsidios } from './bloque-subsidios';
import { PanelDeOrigen } from './admin/panel-de-origen';
import { DesgloseEditable } from './admin/desglose-editable';

/**
 * La columna con la que se decide la compra: título, precio, variantes, envío y los dos botones.
 *
 * <p>Va aparte de la pantalla porque son dos cosas distintas: la galería enseña el producto y esto
 * decide qué se lleva. Juntas pasaban de las cuatrocientas líneas que avisa el lint, y ese aviso casi
 * siempre significa que había dos componentes.
 *
 * <p>MOBILE FIRST: en el móvil `contents` deshace la columna y deja que sus hijos se recoloquen con
 * `order` dentro del flujo de la pantalla —título, PRECIO, foto, variantes—; el precio queda pegado al
 * título porque, más abajo, había que desplazarse para verlo. A partir de `lg` vuelve a ser una columna
 * normal, donde el precio ya se ve junto a la galería.
 */
@Component({
  selector: 'nx-panel-de-compra',
  imports: [
    FaIconComponent,
    SelectorColor,
    TablaTallas,
    SelectorCantidad,
    BloquePrecio,
    BloqueEnvio,
    DistintivoArancel,
    BloqueSubsidios,
    PanelDeOrigen,
    DesgloseEditable,
  ],
  template: `
    <aside class="contents lg:flex lg:flex-col lg:gap-4">
      <header class="order-1 lg:order-0">
        <div class="flex items-center gap-2 flex-wrap">
          @if (ficha().marca) {
            <span class="badge badge-ghost">{{ ficha().marca }}</span>
          }
          @if (ficha().valoracion !== undefined) {
            <span class="inline-flex items-center gap-1 text-warning text-[13px]">
              <fa-icon [icon]="iconos.estrella" /> {{ valoracion() }}
              <span class="opacity-60 text-[12px]">({{ ficha().numeroDeResenas }})</span>
            </span>
          }
          <!-- El código externo y la plataforma de ORIGEN no se enseñan a quien compra: van en el
               bloque de administración, que además solo se descarga para el administrador. -->
        </div>
        <h1 class="text-lg sm:text-2xl font-medium mt-1.5 leading-snug">{{ ficha().titulo }}</h1>
      </header>

      @if (sesion.esAdministrador()) {
        <div class="order-3 lg:order-0">
          @defer (on idle) {
            <nx-panel-de-origen
              [ficha]="ficha()"
              (cambiada)="actualizada.emit($event)"
              (borrada)="borrada.emit()"
            />
          }
        </div>
      }

      <div class="order-5 lg:order-0 flex flex-col gap-4">
        @if (seleccion.ejeDeColor(); as eje) {
          <nx-selector-color
            [eje]="eje"
            [elegido]="seleccion.color()"
            [puedeEditar]="sesion.esAdministrador()"
            (elige)="eligeColor.emit($event)"
            (borra)="borraVariante.emit($event)"
          />
        }
        @if (seleccion.ejeDeTalla(); as eje) {
          <nx-tabla-tallas
            [eje]="eje"
            [unidades]="seleccion.unidadesPorTalla()"
            [existencias]="seleccion.existenciasDeTalla"
            (cambia)="cambiaTalla($event)"
          />
        } @else {
          <nx-selector-cantidad
            [cantidad]="seleccion.cantidad()"
            (cantidadChange)="seleccion.fijaCantidad($event)"
            [minimo]="seleccion.minimoDelSelector()"
            [existencias]="seleccion.varianteElegida()?.existencias"
          />
        }
      </div>

      <div class="order-2 lg:order-0">
        <nx-bloque-precio [destacado]="seleccion.precioDestacado()" [moq]="ficha().moq">
          <!-- El desglose de conceptos es SOLO del administrador y se carga aparte. -->
          @if (sesion.esAdministrador() && ficha().desglose; as desglose) {
            @defer (on idle) {
              <nx-desglose-editable
                [idDelProducto]="ficha().id"
                [desglose]="desglose"
                [total]="seleccion.precioDestacado().formateado ?? '—'"
                (cambiado)="actualizada.emit($event)"
              />
            }
          }
        </nx-bloque-precio>
        <nx-distintivo-arancel [arancel]="ficha().arancel" (filtra)="filtraPorGrupo.emit()" />
        <!--
          Lo que pone la tienda va justo debajo del arancel y encima de los botones: es un argumento
          de compra y ahí es donde se está decidiendo. En la tarjeta son dos iconos mudos porque no
          hay sitio; aquí llevan el texto.
        -->
        <nx-bloque-subsidios
          class="mt-2"
          [envioCubierto]="!!ficha().envioCubierto"
          [arancelCubierto]="ficha().arancel.cubierto"
        />
      </div>

      <div class="order-6 lg:order-0"><nx-bloque-envio /></div>

      <div class="order-7 lg:order-0 flex flex-col gap-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            [disabled]="!sePuedeComprar() || trabajando()"
            (click)="anade.emit()"
            class="btn btn-outline min-h-12 sm:min-h-10"
          >
            <fa-icon [icon]="anadido() ? iconos.hecho : iconos.carrito" />
            {{ anadido() ? t('product.added') : t('product.add_to_cart') }}
          </button>
          <button
            type="button"
            [disabled]="!sePuedeComprar() || trabajando()"
            (click)="compraAhora.emit()"
            class="btn btn-primary min-h-12 sm:min-h-10"
          >
            <fa-icon [icon]="iconos.rayo" /> {{ t('product.order_now') }}
          </button>
        </div>

        @if (sesion.haySesion()) {
          <button
            type="button"
            (click)="marcaFavorito.emit()"
            class="btn btn-outline btn-sm min-h-11 sm:min-h-8"
            [class]="esFavorito() ? 'text-red-600 border-red-300 hover:bg-red-50' : ''"
          >
            <fa-icon [icon]="esFavorito() ? iconos.corazonLleno : iconos.corazonVacio" />
            {{ esFavorito() ? t('product.remove_favorite') : t('product.add_favorite') }}
          </button>
        }
      </div>

      <p class="order-8 lg:order-0 text-[11px] opacity-60 leading-relaxed">
        {{ t('product.price_disclosure') }}
      </p>
    </aside>
  `,
})
export class PanelDeCompra {
  readonly ficha = input.required<FichaDeProducto>();
  readonly trabajando = input(false);
  readonly anadido = input(false);
  /** El texto que explica por qué todavía no se puede comprar. Lo compone la pantalla. */

  readonly anade = output<void>();
  readonly compraAhora = output<void>();
  readonly marcaFavorito = output<void>();
  readonly eligeColor = output<ColorElegido>();
  readonly cambia = output<CambioDeTalla>();
  readonly borraVariante = output<string>();
  readonly filtraPorGrupo = output<void>();
  readonly recarga = output<void>();

  /**
   * Una edición que YA trae la ficha recalculada, para pintarla sin volver a pedir nada.
   *
   * <p>Va aparte de `recarga` a propósito: son dos cosas distintas. `recarga` dice «algo cambió, vuelve
   * a leer» y sigue haciendo falta para los gestos que aún no devuelven su resultado; esto dice «toma,
   * así queda», que es lo que evita repintar la página entera para cambiar un importe.
   */
  readonly actualizada = output<FichaDeProducto>();
  readonly borrada = output<void>();

  private readonly favoritos = inject(FavoritosStore);
  protected readonly seleccion = inject(SeleccionDeLaFicha);
  protected readonly sesion = inject(SesionActual);
  protected readonly t = inject(TraduccionService).t;

  protected readonly iconos = {
    estrella: faStar,
    carrito: faCartPlus,
    rayo: faBolt,
    hecho: faCircleCheck,
    informacion: faCircleInfo,
    corazonLleno: faCorazonLleno,
    corazonVacio: faCorazonVacio,
  };

  protected readonly valoracion = computed(() => Number(this.ficha().valoracion ?? 0).toFixed(1));
  protected readonly esFavorito = computed(() => this.favoritos.ids().has(this.ficha().id));

  /**
   * El botón se APAGA solo por lo que no tiene arreglo pulsándolo —falta elegir variante, o la elegida
   * está agotada—. Lo demás se explica al pulsar: un botón apagado sin decir por qué es un callejón.
   */
  protected readonly sePuedeComprar = computed(() => {
    const impedimento = this.seleccion.impedimento();
    return (
      hayExistencias(this.ficha()) &&
      impedimento !== 'falta-elegir-variante' &&
      impedimento !== 'variante-sin-existencias'
    );
  });

  protected cambiaTalla(cambio: CambioDeTalla): void {
    this.cambia.emit(cambio);
  }
}
