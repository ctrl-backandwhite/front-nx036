import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import { BorradorDeAlta, FalloDeAlta, validaAlta } from '../../../domain/catalogo/model/alta-de-producto';
import { aProductoNuevo } from '../../../domain/catalogo/model/producto-nuevo';
import { ALTA_DE_PRODUCTO_PORT } from '../../../domain/catalogo/port/alta-de-producto.port';

/**
 * Da de alta un producto a mano, con todos los datos que admite el catálogo.
 *
 * <p>Valida ANTES de mandar y devuelve el motivo concreto, no un «faltan datos»: con cuarenta campos
 * repartidos en trece secciones plegadas, un mensaje genérico deja a quien lo rellena buscando a
 * ciegas. El código del fallo viaja en el error para que la pantalla elija el texto.
 */
@Injectable()
export class CreaProducto {
  private readonly alta = inject(ALTA_DE_PRODUCTO_PORT);

  ejecuta(borrador: BorradorDeAlta): Promise<Result<string, AppError>> {
    const problema: FalloDeAlta | undefined = validaAlta(borrador);
    if (problema) {
      return Promise.resolve(fallo(creaError('peticion-invalida', '', { codigo: problema })));
    }
    return this.alta.crea(aProductoNuevo(borrador));
  }
}
