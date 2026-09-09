import { Component, computed, inject, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faCartPlus,
  faCircleCheck,
  faFire,
  faHandHoldingDollar,
  faHeart as faCorazonLleno,
  faStar,
  faTruckFast,
  faTruckRampBox,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faCorazonVacio } from '@fortawesome/free-regular-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { ImagenSegura } from '@ds/component/marcador/imagen-segura';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { ResumenDeProducto, esSuperventas, ventasAbreviadas } from '../../domain/model/producto';
import { GRUPO_DEL_CARRITO } from '../../domain/model/criterio-de-busqueda';
import { FavoritosStore } from '../../application/state/favoritos.store';
import { SesionActual } from '@core/auth/sesion-actual';
import { ReferenciaDeCestaStore } from '../../application/state/referencia-de-cesta.store';
import { AlternaFavorito } from '../../application/use-case/alterna-favorito.use-case';
import { AnadeALaCesta, esMotivoDeRechazo } from '../../application/use-case/anade-a-la-cesta.use-case';
import { EtiquetaPrecio } from './etiqueta-precio';
import { DistintivoArancel } from './distintivo-arancel';

/** Cuánto se queda encendida la confirmación del botón de compra rápida. */
const CONFIRMACION_MS = 1400;

/**
 * La tarjeta de un producto en una cuadrícula.
 *
 * <p>Solo PINTA y avisa: quién decide qué variante entra en la cesta, si hay existencias o si el
 * corazón se puede marcar son casos de uso. Cuando esa lógica vivía aquí, cada pantalla que copiaba la
 * tarjeta acababa añadiendo con reglas distintas.
 *
 * <p>MOBILE FIRST: el botón de compra rápida está SIEMPRE visible en el móvil y solo aparece al pasar
 * el ratón a partir de `sm`. En una pantalla táctil no hay «pasar por encima», así que esconderlo ahí
 * lo dejaría inalcanzable.
 */
@Component({
  selector: 'nx-tarjeta-producto',
  imports: [
    RouterLink,
    NgOptimizedImage,
    FaIconComponent,
    ImagenSegura,
    EtiquetaPrecio,
    DistintivoArancel,
  ],
  template: `
    <a
      [routerLink]="destino()"
      class="card overflow-hidden transition-all duration-1000 hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 group focus-ring"
    >
      <div class="relative">
        <!--
          Las primeras tarjetas del listado son lo que decide cuándo se ve algo útil, así que su foto
          va con «priority»: se pide de inmediato, sin esperar a que el navegador la descubra. Las
          demás siguen por la imagen con red, que es la que sabe recuperarse de un enlace roto — y a
          la que no se le pone prioridad, porque competiría con la que sí importa.
        -->
        @if (prioritaria() && producto().imagenPrincipal; as foto) {
          <div class="relative aspect-square w-full">
            <img
              [ngSrc]="foto"
              fill
              priority
              [alt]="producto().titulo"
              class="object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
            />
          </div>
        } @else {
          <nx-imagen-segura
            [src]="producto().imagenPrincipal"
            [alt]="producto().titulo"
            clase="aspect-square w-full object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
            claseMarcador="aspect-square w-full"
          />
        }

        <div class="absolute top-2 left-2 flex flex-col gap-1">
          @if (superventas()) {
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500 text-white shadow-sm"
            >
              <fa-icon [icon]="iconos.fuego" class="text-[9px]" />
              {{ t('product.badge.bestseller') }}
            </span>
          }
          @if (etiquetas().includes('ready')) {
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-base-100/95 text-ink-700 border border-ink-200 shadow-sm"
            >
              <fa-icon [icon]="iconos.rayo" class="text-[9px] text-amber-500" />
              {{ t('product.badge.ready') }}
            </span>
          }
          @if (etiquetas().includes('free_shipping')) {
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-600 text-white shadow-sm"
              [attr.aria-label]="t('catalog.filters.free_shipping')"
            >
              <fa-icon [icon]="iconos.camion" class="text-[9px]" />
            </span>
          }
        </div>

        <!-- El corazón solo con sesión: sin cuenta no hay dónde guardar la lista. -->
        @if (sesion.haySesion()) {
          <button
            type="button"
            (click)="marcaFavorito($event)"
            [attr.aria-label]="t(esFavorito() ? 'product.remove_favorite' : 'product.add_favorite')"
            [title]="t(esFavorito() ? 'product.remove_favorite' : 'product.add_favorite')"
            class="absolute top-2 right-2 h-11 w-11 sm:h-8 sm:w-8 rounded-full bg-base-100/90 hover:bg-base-100 shadow-sm inline-flex items-center justify-center transition-transform hover:scale-110"
          >
            <fa-icon
              [icon]="esFavorito() ? iconos.corazonLleno : iconos.corazonVacio"
              [class]="esFavorito() ? 'text-red-500' : 'text-ink-400'"
            />
          </button>
        }
      </div>

      <div class="p-3">
        <p class="text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-brand-700">
          {{ producto().titulo }}
        </p>
        <div class="flex items-center justify-between mt-2">
          <nx-etiqueta-precio [precio]="producto().precio" tamano="sm" />
          <div class="flex items-center gap-2 text-xs text-ink-500">
            @if (producto().valoracion !== undefined) {
              <span class="flex items-center gap-0.5">
                <fa-icon [icon]="iconos.estrella" class="text-amber-400" />
                {{ valoracion() }}
              </span>
            }
            @if (producto().ventasMensuales > 0) {
              <span class="flex items-center gap-0.5">
                <fa-icon [icon]="iconos.fuego" class="text-amber-500" />
                {{ ventas() }}
              </span>
            }
            <!--
              La tienda paga el derecho de aduana de este producto. Va junto a la valoración y no en el
              bloque de abajo porque aquello compara con la cesta y esto es una propiedad del producto:
              se sabe siempre, también con la cesta vacía. Solo el icono: con letra competiría con el
              precio. El escudo ya significa «marca» en esta tarjeta, así que aquí va una mano que paga.
            -->
            <!--
              La etiqueta accesible va en el CONTENEDOR y no en el icono: FontAwesome marca su propio
              dibujo como decorativo, así que una etiqueta puesta ahí no llega a quien usa un lector de
              pantalla. Con el papel de imagen en el contenedor, el conjunto se anuncia una sola vez.
            -->
            @if (producto().arancel.cubierto) {
              <span
                class="flex items-center"
                role="img"
                [title]="t('catalog.duty.covered')"
                [attr.aria-label]="t('catalog.duty.covered')"
              >
                <fa-icon [icon]="iconos.manoQuePaga" class="text-emerald-600" />
              </span>
            }
            <!--
              La tienda pone parte del porte. Va al lado del arancel porque es lo mismo desde fuera —algo
              que paga la tienda y no quien compra— pero se sabe en TODOS los países: el arancel por
              artículo solo se cobra en la Unión, y la bolsa de envío se descuenta del porte vaya el
              pedido a donde vaya. Solo el icono, por lo mismo que el otro: con letra competiría con el
              precio.
            -->
            @if (producto().envioCubierto) {
              <span
                class="flex items-center"
                role="img"
                [title]="t('catalog.shipping.covered')"
                [attr.aria-label]="t('catalog.shipping.covered')"
              >
                <fa-icon [icon]="iconos.porteQuePonemos" class="text-emerald-600" />
              </span>
            }
          </div>
        </div>

        <nx-distintivo-arancel [arancel]="producto().arancel" (filtra)="filtraPorGrupo()" />

        <button
          type="button"
          (click)="compraRapida($event)"
          [disabled]="anadiendo()"
          [class]="anadido() ? 'btn-success' : 'btn-outline'"
          class="btn btn-sm sm:btn-xs w-full mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <fa-icon [icon]="anadido() ? iconos.hecho : iconos.anadir" class="text-[11px]" />
          {{ anadido() ? t('product.added') : t('product.add_to_cart') }}
        </button>
      </div>
    </a>
  `,
})
export class TarjetaProducto {
  readonly producto = input.required<ResumenDeProducto>();
  /**
   * Al navegar desde dentro del panel se conserva ese contexto: si la ficha se abriera en la ruta
   * pública, el administrador saldría de su marco al pulsar cualquier tarjeta.
   */
  readonly enPanel = input(false);
  /**
   * La tarjeta está en la primera fila y su foto es candidata a ser lo primero que se ve. Solo se
   * marcan unas pocas: poner prioridad a todas equivale a no ponérsela a ninguna.
   */
  readonly prioritaria = input(false);

  private readonly traduccion = inject(TraduccionService);
  private readonly favoritos = inject(FavoritosStore);
  private readonly alterna = inject(AlternaFavorito);
  private readonly anade = inject(AnadeALaCesta);
  private readonly avisos = inject(AvisosStore);
  private readonly enrutador = inject(Router);
  private readonly referencia = inject(ReferenciaDeCestaStore);

  protected readonly sesion = inject(SesionActual);
  protected readonly t = this.traduccion.t;

  protected readonly iconos = {
    estrella: faStar,
    fuego: faFire,
    camion: faTruckFast,
    // Deliberadamente DISTINTO del camión de «envío gratis»: dos cosas distintas no pueden compartir
    // dibujo en la misma tarjeta. Aquel promete que no se paga porte; este dice que la tienda pone
    // parte del que hay.
    porteQuePonemos: faTruckRampBox,
    rayo: faBolt,
    anadir: faCartPlus,
    hecho: faCircleCheck,
    manoQuePaga: faHandHoldingDollar,
    corazonLleno: faCorazonLleno,
    corazonVacio: faCorazonVacio,
  };

  protected readonly anadiendo = signal(false);
  protected readonly anadido = signal(false);

  protected readonly destino = computed(() =>
    this.enPanel() ? `/admin/browse/${this.producto().slug}` : `/catalog/${this.producto().slug}`,
  );
  protected readonly superventas = computed(() => esSuperventas(this.producto()));
  protected readonly etiquetas = computed(() => this.producto().etiquetas);
  protected readonly ventas = computed(() => ventasAbreviadas(this.producto().ventasMensuales));
  protected readonly esFavorito = computed(() => this.favoritos.ids().has(this.producto().id));
  protected readonly valoracion = computed(() => Number(this.producto().valoracion ?? 0).toFixed(1));

  /** El corazón no navega a la ficha: la tarjeta entera es un enlace y hay que detener el gesto. */
  protected async marcaFavorito(evento: Event): Promise<void> {
    evento.preventDefault();
    evento.stopPropagation();
    const resultado = await this.alterna.ejecuta(this.producto().id);
    if (!resultado.ok) {
      this.avisos.error(resultado.error.mensaje || this.t('common.error'));
    }
  }

  protected async compraRapida(evento: Event): Promise<void> {
    evento.preventDefault();
    evento.stopPropagation();
    this.anadiendo.set(true);
    try {
      const resultado = await this.anade.desdeLaTarjeta(this.producto());
      if (!resultado.ok) {
        // «No queda ninguna variante» no es un fallo del sistema: es una respuesta que hay que dar en
        // sus palabras, para que quien compra sepa que tiene que elegir otra en la ficha.
        this.avisos.error(
          esMotivoDeRechazo(resultado.error)
            ? this.t('product.variant_out_of_stock')
            : resultado.error.mensaje || this.t('cart.add_failed'),
        );
        return;
      }
      this.anadido.set(true);
      setTimeout(() => this.anadido.set(false), CONFIRMACION_MS);
    } finally {
      this.anadiendo.set(false);
    }
  }

  /**
   * Con cesta lleva a las líneas de declaración DE LA CESTA, no a la de esta tarjeta: quien lleva tres
   * productos de tres ternas paga tres derechos, y lo que no le suma arancel es lo que encaje en
   * cualquiera de las tres. Sin cesta no hay con qué comparar y la única referencia es este producto.
   */
  protected filtraPorGrupo(): void {
    const grupo = this.referencia.hayCesta() ? GRUPO_DEL_CARRITO : this.producto().arancel.grupo;
    void this.enrutador.navigate(['/catalog'], { queryParams: { grupo } });
  }
}
