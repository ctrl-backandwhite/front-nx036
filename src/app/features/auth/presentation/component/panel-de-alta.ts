import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBolt, faCircleNodes, faGlobe, faShield } from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * La columna de marca de la pantalla de ALTA.
 *
 * <p>Es hermana de `nx-panel-de-marca` pero no la misma: aquel cuenta por qué entrar y este por qué
 * registrarse, con otras claves y con dos cifras vivas —a cuántos países se envía y cuántas divisas hay
 * activas—. Fundirlos en uno con un interruptor de textos habría dejado un componente que hace dos
 * cosas y una plantilla llena de condiciones.
 *
 * <p>Solo PINTA: las cifras se las dan hechas. Si las pidiera él, habría que montar una llamada de red
 * para comprobar un rótulo.
 *
 * <p>Se OCULTA en pantallas pequeñas (`hidden lg:flex`): en un móvil, el formulario tiene que ser lo
 * primero y lo único.
 */
@Component({
  selector: 'nx-panel-de-alta',
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
          {{ t('register.hero.title') }}
        </h2>
        <p class="mt-3 text-primary-content/90 max-w-md leading-relaxed">{{ t('register.hero.body') }}</p>

        <ul class="mt-6 space-y-2.5 text-[14px]">
          @for (ventaja of ventajas(); track ventaja.texto) {
            <li class="flex items-start gap-2.5">
              <span class="inline-flex w-6 h-6 items-center justify-center rounded bg-base-100/20">
                <fa-icon [icon]="ventaja.icono" class="text-[12px]" />
              </span>
              <span class="text-primary-content/95">{{ ventaja.texto }}</span>
            </li>
          }
        </ul>
      </div>

      <!-- Hueco: la rejilla reparte el contenido de arriba abajo y sin él el bloque central se descuelga. -->
      <div></div>
    </aside>
  `,
})
export class PanelDeAlta {
  private readonly traduccion = inject(TraduccionService);
  protected readonly t = this.traduccion.t;

  /** A cuántos países se envía de verdad. Es la misma cifra que llena el desplegable de país. */
  readonly cuantosPaises = input(0);
  /** Cuántas divisas hay activas ahora mismo. Cambia al encenderlas y apagarlas en el panel. */
  readonly cuantasDivisas = input(0);
  /** Cuántos idiomas sabe pintar la interfaz. */
  readonly cuantosIdiomas = input(0);

  protected readonly iconoMarca = faCircleNodes;

  protected readonly ventajas = () => [
    { icono: faShield, texto: this.t('register.hero.perk1') },
    {
      icono: faBolt,
      texto: this.traduccion.tCon('register.hero.perk2', {
        countries: this.cuantosPaises() || '',
      }),
    },
    {
      icono: faGlobe,
      texto: this.traduccion.tCon('register.hero.perk3', {
        langs: this.cuantosIdiomas(),
        currencies: this.cuantasDivisas(),
      }),
    },
  ];
}
