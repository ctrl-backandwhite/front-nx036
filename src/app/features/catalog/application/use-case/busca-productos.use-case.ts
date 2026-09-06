import { Injectable, inject } from '@angular/core';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { CATALOGO_PORT, PeticionDeListado } from '../../domain/port/catalogo.port';
import { CESTA_PORT } from '../../domain/port/cesta.port';
import { PaginaDeProductos } from '../../domain/model/producto';
import { categoriaValida } from '../../domain/model/criterio-de-busqueda';
import { ReferenciaDeCestaStore } from '../state/referencia-de-cesta.store';

/** Cuántos productos trae cada tirón del desplazamiento infinito. */
export const TAMANO_DE_PAGINA = 36;

/**
 * Pide una página del listado.
 *
 * <p>Hace dos cosas que ninguna pantalla debería tener que recordar: comprobar que la categoría es
 * utilizable ANTES de llamar —un enlace antiguo con un `slug` donde va un identificador dejaba la
 * pantalla con el esqueleto puesto para siempre— y adjuntar lo que ya lleva el comprador, que es lo que
 * permite al backend decir cuánto arancel suma cada producto.
 */
@Injectable()
export class BuscaProductos {
  private readonly catalogo = inject(CATALOGO_PORT);
  private readonly cesta = inject(CESTA_PORT);
  private readonly referencia = inject(ReferenciaDeCestaStore);

  async ejecuta(
    peticion: Omit<PeticionDeListado, 'productosEnLaCesta'>,
  ): Promise<Result<PaginaDeProductos, AppError>> {
    if (!categoriaValida(peticion.criterio.categoria)) {
      return fallo(creaError('peticion-invalida', '', { codigo: 'CATEGORIA_INVALIDA' }));
    }
    return this.catalogo.busca({
      ...peticion,
      productosEnLaCesta: this.referencia.productos(),
    });
  }

  /**
   * Refresca la referencia del arancel. Se llama SOLO con el listado en su primera página: más abajo,
   * cambiarla tiraría todo lo cargado.
   */
  async refrescaLaReferencia(): Promise<Result<void, AppError>> {
    const resultado = await this.cesta.productosQueLleva();
    if (resultado.ok) {
      this.referencia.fija(resultado.valor);
      return exito(undefined);
    }
    return fallo(resultado.error);
  }
}
