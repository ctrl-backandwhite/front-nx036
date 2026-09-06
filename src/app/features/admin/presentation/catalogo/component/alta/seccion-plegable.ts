import { Component, input } from '@angular/core';

/**
 * Una sección plegable del formulario de alta.
 *
 * <p>El alta admite CUARENTA campos repartidos en trece bloques: sin plegar, la ventana es una pared de
 * campos y no se encuentra nada. Las primeras vienen abiertas porque son las que casi siempre se
 * rellenan.
 *
 * <p>Usa `<details>` nativo y no un estado propio: así se abre y se cierra sin JavaScript, funciona con
 * el teclado y el navegador ya sabe anunciarlo al lector de pantalla.
 */
@Component({
  selector: 'nx-seccion-plegable',
  template: `
    <details [open]="abierta()" class="rounded-box border border-base-200 group">
      <summary
        class="cursor-pointer select-none px-3 py-2 text-[13px] font-semibold text-ink-700 marker:content-none flex items-center justify-between"
      >
        <span>{{ titulo() }}</span>
        <span class="text-ink-400 text-[11px] group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div class="p-3 pt-1 space-y-3 border-t border-base-200">
        <ng-content />
      </div>
    </details>
  `,
})
export class SeccionPlegable {
  readonly titulo = input.required<string>();
  readonly abierta = input(false);
}
