import { Injectable, inject, signal } from '@angular/core';
import { SUGERENCIAS_DE_CESTA_PORT } from '../../domain/port/asistente.port';
import {
  HuecoDelPaquete,
  LineaDeCesta,
  SugerenciaParaLaCesta,
  lineasConsultables,
} from '../../domain/model/cesta';

/**
 * Qué conviene añadir a lo que ya se lleva.
 *
 * <p>Si no hay sugerencia, el asistente se CALLA y limpia lo que tuviera. Nunca se inventa un ahorro:
 * quien está a punto de pagar comprueba la cifra, y una promesa falsa cuesta la venta entera. Y dejar
 * en pantalla lo de antes sería prometer sobre productos que ya no encajan con lo que se lleva ahora.
 */
@Injectable({ providedIn: 'root' })
export class SugiereParaLaCesta {
  private readonly puerto = inject(SUGERENCIAS_DE_CESTA_PORT);

  private readonly _items = signal<readonly SugerenciaParaLaCesta[]>([]);
  private readonly _hueco = signal<HuecoDelPaquete | null>(null);
  private readonly _consultando = signal(false);

  readonly items = this._items.asReadonly();
  /** El sitio que queda en el paquete: hasta ese peso, añadir no cuesta aduana nueva. */
  readonly hueco = this._hueco.asReadonly();
  readonly consultando = this._consultando.asReadonly();

  /** @returns si hay algo nuevo que enseñar, que es lo que decide si se abre el globo. */
  async ejecuta(lineas: readonly LineaDeCesta[], idioma: string): Promise<boolean> {
    const consultables = lineasConsultables(lineas);
    if (consultables.length === 0) {
      this.olvida();
      return false;
    }
    this._consultando.set(true);
    try {
      const resultado = await this.puerto.consulta(consultables, idioma);
      if (!resultado.ok) {
        // Sin sugerencia, silencio. Un fallo aquí no se cuenta: no había nada prometido que romper.
        return false;
      }
      this._hueco.set(resultado.valor.hueco);
      this._items.set(resultado.valor.items);
      return resultado.valor.items.length > 0;
    } finally {
      this._consultando.set(false);
    }
  }

  olvida(): void {
    this._items.set([]);
    this._hueco.set(null);
  }
}
