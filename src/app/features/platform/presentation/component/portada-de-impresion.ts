import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faCircleCheck,
  faPalette,
  faRocket,
  faShoppingBag,
  faTshirt,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { TraduccionService } from '@core/i18n/traduccion.service';
import { PASOS_DE_IMPRESION } from '../../domain/model/diseno-pod';

/**
 * La portada de impresión bajo demanda: el reclamo y los cuatro pasos del proceso.
 *
 * <p>Va aparte de la pantalla porque es contenido fijo: no depende de ningún dato y no cambia nunca.
 * Mezclado con la rejilla de diseños, obligaba a leer setenta líneas de decoración para llegar a la
 * lógica.
 *
 * <p>MOBILE FIRST: el reclamo con márgenes pequeños que crecen en `lg`, y los cuatro pasos apilados
 * que pasan a dos y a cuatro columnas.
 */
@Component({
  selector: 'nx-portada-de-impresion',
  imports: [FaIconComponent],
  template: `
    <section
      class="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-amber-50 border border-ink-100 px-6 py-10 lg:px-12 lg:py-14 relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        class="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl"
      ></div>
      <div class="relative max-w-3xl">
        <span class="chip chip-active inline-flex items-center gap-1.5">
          <fa-icon [icon]="iconos.paleta" class="text-[11px]" /> {{ t('pod.hero.tag') }}
        </span>
        <h1 class="mt-3 text-3xl md:text-4xl font-medium tracking-tight">
          {{ t('pod.hero.title') }}
          <span class="bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-transparent">
            {{ t('pod.hero.title_accent') }}
          </span>
        </h1>
        <p class="mt-3 text-ink-600 max-w-xl">{{ t('pod.hero.body') }}</p>

        <div class="mt-6 flex flex-wrap gap-3">
          <a href="#blancos" class="btn btn-primary">
            {{ t('pod.hero.cta_pick') }} <fa-icon [icon]="iconos.flecha" />
          </a>
          <a href="#disenos" class="btn btn-outline">{{ t('pod.hero.cta_designs') }}</a>
        </div>

        <div class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink-600">
          @for (ventaja of ventajas; track ventaja.clave) {
            <span class="inline-flex items-center gap-1.5">
              <fa-icon [icon]="iconos[ventaja.icono]" class="text-emerald-500" />
              {{ t(ventaja.clave) }}
            </span>
          }
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-xl mb-4">{{ t('pod.how.title') }}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        @for (paso of pasos; track paso; let i = $index) {
          <div class="card p-5">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex w-7 h-7 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-[12px] font-medium"
              >
                {{ i + 1 }}
              </span>
              <fa-icon [icon]="iconosDePaso[i]" class="text-brand-500" />
            </div>
            <h3 class="mt-3 font-medium">{{ t(paso + '.title') }}</h3>
            <p class="text-[12px] text-ink-500 mt-1 leading-relaxed">{{ t(paso + '.body') }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class PortadaDeImpresion {
  protected readonly t = inject(TraduccionService).t;
  protected readonly pasos = PASOS_DE_IMPRESION;

  protected readonly iconos = {
    paleta: faPalette,
    flecha: faArrowRight,
    hecho: faCircleCheck,
    bolsa: faShoppingBag,
    cohete: faRocket,
  };

  protected readonly iconosDePaso = [faTshirt, faWandMagicSparkles, faPalette, faRocket];

  protected readonly ventajas: readonly { icono: 'hecho' | 'bolsa' | 'cohete'; clave: string }[] = [
    { icono: 'hecho', clave: 'pod.hero.perk1' },
    { icono: 'bolsa', clave: 'pod.hero.perk2' },
    { icono: 'cohete', clave: 'pod.hero.perk3' },
  ];
}
