import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCartShopping } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { CarritoStore } from '../../application/state/carrito.store';
import { CotizaElCarrito } from '../../application/use-case/cotiza-el-carrito.use-case';
import { AccionesDeLinea } from '../acciones-de-linea';
import { AvisoDeMinimoComponent } from '../component/aviso-de-minimo';
import { TablaDelCarrito } from '../component/tabla-del-carrito';
import { ResumenDelCarrito } from '../component/resumen-del-carrito';
import { ListaGuardada } from '../component/lista-guardada';

/**
 * La cesta.
 *
 * <p>Se cotizan DOS listas por separado, la cesta y lo guardado: son dos conjuntos de líneas distintos y
 * el servidor cotiza por conjunto. Pedir una sola cotización con todo mezclado daría un subtotal que
 * incluye lo apartado, que es precisamente lo que no se va a cobrar.
 *
 * <p>El peso total va a la derecha del título, el mismo sitio que en el cajón. Cuando alguna línea no
 * declara peso se antepone «desde»: sin esa palabra, quien compra tomaría por exacto un número al que le
 * falta parte.
 */
@Component({
  selector: 'nx-carrito-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvisoDeMinimoComponent,
    TablaDelCarrito,
    ResumenDelCarrito,
    ListaGuardada,
  ],
  providers: [AccionesDeLinea],
  template: `
    @if (estado.lineas().length === 0 && estado.guardadas().length === 0) {
      <div class="hero max-w-2xl mx-auto py-10">
        <div class="hero-content text-center flex-col">
          <fa-icon [icon]="iconoCesta" class="text-4xl opacity-30 mb-2" />
          <h1>{{ t('cart.empty') }}</h1>
          <p class="text-sm opacity-70">{{ t('cart.empty.desc') }}</p>
          <a routerLink="/catalog" class="btn btn-primary mt-2">{{ t('cart.see_catalog') }}</a>
        </div>
      </div>
    } @else {
      <div class="max-w-4xl mx-auto space-y-4">
        <div class="flex items-baseline justify-between gap-3">
          <h1>{{ t('cart.title') }}</h1>
          @if (cotizacion.pesoTotal(); as peso) {
            <span class="text-[13px] text-ink-500 whitespace-nowrap">
              {{ cotizacion.pesoIncompleto() ? tCon('cart.weight_from', { w: peso }) : peso }}
            </span>
          }
        </div>

        @if (estado.lineas().length === 0) {
          <div class="card bg-base-100 p-6 text-center">
            <p class="text-sm opacity-70">{{ t('cart.empty.desc') }}</p>
            <div class="mt-2">
              <a routerLink="/catalog" class="btn btn-outline btn-sm">{{ t('cart.see_catalog') }}</a>
            </div>
          </div>
        } @else {
          @if (acciones.aviso(); as aviso) {
            <nx-aviso-de-minimo
              [aviso]="aviso"
              (sacaElProducto)="acciones.sacaElProductoEntero()"
              (descarta)="acciones.descartaElAviso()"
            />
          }

          <nx-tabla-del-carrito [lineas]="estado.lineas()" [cotizacion]="cotizacion" />
          <nx-resumen-del-carrito [subtotal]="cotizacion.subtotal()" />
        }

        @if (estado.guardadas().length > 0) {
          <!-- «Guardado para más tarde» vive por debajo del pliegue y casi nunca es lo que se viene a
               mirar: su código solo se descarga cuando de verdad aparece en pantalla. -->
          @defer (on viewport) {
            <nx-lista-guardada
              [lineas]="estado.guardadas()"
              [cotizacion]="cotizacionGuardadas"
              [enLaCuenta]="estado.cestaDeLaCuenta()"
            />
          } @placeholder {
            <div class="card bg-base-100 p-4 text-sm opacity-70">
              {{ t('cart.saved_title') }} ({{ estado.guardadas().length }})
            </div>
          }
        }
      </div>
    }
  `,
})
export class CarritoPage {
  protected readonly estado = inject(CarritoStore);
  protected readonly acciones = inject(AccionesDeLinea);

  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;
  protected readonly tCon = this.traduccion.tCon;

  private readonly cotizador = inject(CotizaElCarrito);
  protected readonly cotizacion = this.cotizador.para(this.estado.lineas);
  protected readonly cotizacionGuardadas = this.cotizador.para(this.estado.guardadas);

  protected readonly iconoCesta = faCartShopping;
}
