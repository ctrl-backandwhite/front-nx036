import { Component } from '@angular/core';
import { Esqueleto } from './esqueleto';

/** La silueta de una tarjeta de producto, para las cuadrículas del catálogo mientras cargan. */
@Component({
  selector: 'nx-esqueleto-tarjeta-producto',
  imports: [Esqueleto],
  template: `
    <div class="card overflow-hidden">
      <nx-esqueleto clase="aspect-square w-full" />
      <div class="p-3 space-y-2">
        <nx-esqueleto clase="h-3 w-full" />
        <nx-esqueleto clase="h-3 w-2/3" />
        <div class="flex items-center justify-between pt-1">
          <nx-esqueleto clase="h-4 w-14" />
          <nx-esqueleto clase="h-3 w-10" />
        </div>
      </div>
    </div>
  `,
})
export class EsqueletoTarjetaProducto {}
