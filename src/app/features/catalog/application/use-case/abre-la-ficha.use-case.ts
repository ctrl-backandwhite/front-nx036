import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { CATALOGO_PORT } from '../../domain/port/catalogo.port';
import { HISTORIAL_PORT } from '../../domain/port/historial.port';
import { FichaDeProducto } from '../../domain/model/producto';
import { SesionActual } from '@core/auth/sesion-actual';
import { ReferenciaDeCestaStore } from '../state/referencia-de-cesta.store';

/**
 * Abrir la ficha de un producto.
 *
 * <p>Son dos cosas seguidas y ninguna pantalla debería tener que acordarse de las dos: pedir la ficha
 * con la referencia del carrito puesta —o el distintivo de arancel no viene— y anotar la visita en el
 * historial.
 *
 * <p>La anotación solo se hace CON SESIÓN: sin usuario no hay a quién asociarla y no se rastrea a
 * nadie anónimo. Y si falla se traga en silencio: es accesorio a la ficha, y enseñar un error por no
 * haber podido guardar el historial molestaría a quien está mirando un producto.
 */
@Injectable()
export class AbreLaFicha {
  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly historial = inject(HISTORIAL_PORT);
  private readonly referencia = inject(ReferenciaDeCestaStore);
  private readonly sesion = inject(SesionActual);

  /** Fichas cuya visita ya se anotó en esta sesión: el backend la consolidaría igual, pero sobra. */
  private readonly anotadas = new Set<string>();

  async ejecuta(slug: string): Promise<Result<FichaDeProducto, AppError>> {
    const resultado = await this.catalogo.ficha(slug, this.referencia.productos());
    if (resultado.ok) {
      void this.anota(resultado.valor.id);
    }
    return resultado;
  }

  private async anota(idDelProducto: string): Promise<void> {
    if (!this.sesion.haySesion() || this.anotadas.has(idDelProducto)) {
      return;
    }
    this.anotadas.add(idDelProducto);
    await this.historial.anota(idDelProducto);
  }
}
