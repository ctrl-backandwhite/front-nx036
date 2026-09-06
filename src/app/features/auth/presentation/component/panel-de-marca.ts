import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faCircleNodes,
  faGlobe,
  faQuoteLeft,
  faShield,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La columna de marca de las pantallas de acceso y alta.
 *
 * <p>Solo PINTA: el texto de los almacenes se lo dan hecho. Si se lo pidiera ella al backend, este
 * componente dejaría de ser reutilizable en la pantalla de alta y en cualquier otra, y habría que
 * probarlo montando una llamada de red para comprobar un rótulo.
 *
 * <p>Se OCULTA en pantallas pequeñas (`hidden lg:flex`): en un móvil, el formulario tiene que ser lo
 * primero y lo único.
 */
@Component({
  selector: 'nx-panel-de-marca',
  imports: [RouterLink, FaIconComponent],
  template: `
    <aside
      class="hero auth-hero-img relative hidden lg:flex flex-col justify-between p-10 text-primary-content isolate overflow-hidden bg-primary"
    >
      <div aria-hidden="true" class="absolute inset-0 -z-10">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-secondary/80 to-accent"></div>
        <div class="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-base-100/30 blur-3xl"></div>
        <div class="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-accent/30 blur-3xl"></div>
      </div>

      <a routerLink="/" class="inline-flex items-center gap-2 font-bold text-lg">
        <fa-icon [icon]="iconoMarca" /> NX036
      </a>

      <div>
        <h2 class="text-3xl lg:text-4xl font-medium tracking-tight max-w-md">
          {{ t('login.brand.title') }}
        </h2>
        <p class="mt-3 text-primary-content/90 max-w-md leading-relaxed">{{ t('login.brand.body') }}</p>

        <ul class="mt-6 space-y-2.5 text-[14px]">
          @for (ventaja of ventajas(); track ventaja.texto) {
            <li class="flex items-start gap-2.5">
              <span class="inline-flex w-6 h-6 items-center justify-center rounded bg-base-100/20">
                <fa-icon [icon]="ventaja.icono" class="text-[12px]" />
              </span>
              <span class="text-primary-content/95 leading-relaxed">{{ ventaja.texto }}</span>
            </li>
          }
        </ul>
      </div>

      <!--
        El bloque de la cita tuvo un fallo de contraste en producción («negro sobre negro»): el fondo
        translúcido sobre el azul de marca más un texto con el token de contenido colapsaban a un
        contraste ilegible en tema oscuro. Se dejó fondo más opaco, borde claro y texto explícitamente
        claro, que da 4,5:1 en los dos temas sin depender de tokens que fluctúan.
      -->
      <figure class="card bg-primary-content/5 backdrop-blur border border-primary-content/20 max-w-md">
        <div class="card-body p-4">
          <fa-icon [icon]="iconoCita" class="text-primary-content/60 text-2xl mb-2" />
          <blockquote class="text-[14px] text-primary-content leading-relaxed">
            {{ t('login.brand.quote') }}
          </blockquote>
          <figcaption class="mt-2 text-[12px] text-primary-content/80">
            — {{ t('login.brand.quote_author') }}
          </figcaption>
        </div>
      </figure>
    </aside>
  `,
})
export class PanelDeMarca {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  /** El rótulo de almacenes ya resuelto: con cifras reales si se pudieron consultar, genérico si no. */
  readonly textoDeAlmacenes = input.required<string>();

  protected readonly iconoMarca = faCircleNodes;
  protected readonly iconoCita = faQuoteLeft;

  protected readonly ventajas = () => [
    { icono: faShield, texto: this.t('login.brand.perk1') },
    { icono: faBolt, texto: this.t('login.brand.perk2') },
    { icono: faGlobe, texto: this.textoDeAlmacenes() },
  ];
}
