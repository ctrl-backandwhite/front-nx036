import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { DocContent } from '@shared/content/site-pages';
import { TraduccionService } from '@core/i18n/traduccion.service';

/**
 * El cuerpo común de las páginas institucionales y legales: «sobre nosotros», privacidad, condiciones.
 *
 * <p>Una sola pieza para las seis porque son el mismo documento con otro texto: un título, una fecha,
 * una entradilla y secciones con párrafos. Cuando cada una tenía su marcado, la fecha de actualización
 * salía en un sitio distinto en cada página.
 *
 * <p>El enlace de vuelta aparece arriba y abajo: estas páginas se abren desde el pie y desde correos, a
 * menudo sin cabecera de tienda a la vista, y son largas. Sin el de abajo hay que subir hasta arriba.
 */
@Component({
  selector: 'nx-vista-de-documento',
  imports: [RouterLink, FaIconComponent],
  template: `
    <div class="max-w-3xl mx-auto py-4">
      <a
        routerLink="/"
        class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
      >
        <fa-icon [icon]="iconoAtras" class="text-[12px]" />
        {{ t('legal.back_home') }}
      </a>

      <header class="mb-6">
        <h1 class="text-3xl font-semibold text-slate-900">{{ documento().title }}</h1>
        @if (documento().updated; as actualizado) {
          <p class="text-xs text-ink-400 mt-1">{{ t('legal.updated') }}: {{ actualizado }}</p>
        }
        <p class="text-ink-600 mt-3 leading-relaxed">{{ documento().intro }}</p>
      </header>

      <!--
        El cuerpo del documento se HIDRATA al llegar a él, no al abrir la página.
        Un texto legal son veinte secciones y varios miles de palabras: el HTML llega ya pintado del
        prerenderizado —se lee y se indexa sin esperar a nada— y el código que lo gobierna solo se
        descarga cuando alguien baja de verdad. Lo que se ve sin desplazarse, arriba, queda fuera.
      -->
      @defer (on idle; hydrate on viewport) {
        <div class="space-y-6">
          @for (seccion of documento().sections; track seccion.h) {
            <section>
              <h2 class="text-lg font-semibold text-slate-900 mb-1.5">{{ seccion.h }}</h2>
              @for (parrafo of seccion.p; track parrafo) {
                <p class="text-[14px] text-ink-600 leading-relaxed mb-2">{{ parrafo }}</p>
              }
            </section>
          }
        </div>
      }

      <div class="mt-10 pt-5 border-t border-ink-100">
        <a routerLink="/" class="btn btn-outline btn-sm">
          <fa-icon [icon]="iconoAtras" />
          {{ t('legal.back_home') }}
        </a>
      </div>
    </div>
  `,
})
export class VistaDeDocumento {
  readonly documento = input.required<DocContent>();

  protected readonly iconoAtras = faArrowLeft;
  protected readonly t = inject(TraduccionService).t;
}
