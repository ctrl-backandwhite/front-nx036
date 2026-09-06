import { Injectable, inject } from '@angular/core';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { VALORES_DE_VARIACION_PORT } from '../../../domain/catalogo/port/ficha-de-producto.port';

/**
 * Renombra la etiqueta visible de un valor de variación.
 *
 * <p>Cambia SOLO la etiqueta: el valor canónico en chino no se toca nunca, porque es el que casa con el
 * catálogo de origen. Se usa cuando el origen trae nombres ambiguos —«Blanco 2», «Blanco 3»— que en
 * realidad son estampados distintos.
 */
@Injectable()
export class RenombraValorDeVariacion {
  private readonly valores = inject(VALORES_DE_VARIACION_PORT);

  ejecuta(id: string, etiqueta: string): Promise<Result<void, AppError>> {
    return this.valores.renombra(id, etiqueta.trim());
  }
}

/**
 * Fija la foto real de un color.
 *
 * <p>REGLA DURA del catálogo: un color sin imagen real no se publica. Este es el sitio donde se corrige
 * cuando la carga no la trajo.
 */
@Injectable()
export class FijaImagenDeValor {
  private readonly valores = inject(VALORES_DE_VARIACION_PORT);

  ejecuta(id: string, url: string): Promise<Result<void, AppError>> {
    return this.valores.fijaImagen(id, url.trim());
  }
}

/**
 * Borra valores de variación.
 *
 * <p>Se lleva por delante TODAS las combinaciones que los usan, así que un borrado a medias dejaría el
 * producto con variantes huérfanas: en cuanto uno falla se para y se dice cuántos habían entrado.
 */
@Injectable()
export class EliminaValoresDeVariacion {
  private readonly valores = inject(VALORES_DE_VARIACION_PORT);

  async ejecuta(ids: readonly string[]): Promise<Result<number, AppError>> {
    let borrados = 0;
    for (const id of ids) {
      const resultado = await this.valores.elimina(id);
      if (!resultado.ok) {
        return resultado;
      }
      borrados++;
    }
    return exito(borrados);
  }
}
