import { Injectable, inject } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { Categoria } from '../../domain/model/catalogo-auxiliar';

/**
 * La cadena de categorías hasta una hoja, para situar un producto en el catálogo.
 *
 * <p>La ficha la usa en su miga de pan. Antes ese último escalón era el TÍTULO del producto, que ya
 * está escrito dos líneas más abajo en grande: repetirlo gastaba la única línea que podía decir de
 * dónde viene el producto, y encima con títulos de proveedor que ocupan tres renglones.
 *
 * <p>Se guarda lo ya pedido en memoria. Quien mira cinco productos de la misma categoría —lo normal al
 * comparar— pediría cinco veces la misma cadena; y como no cambia mientras dura la visita, basta con
 * recordarla. La caché va POR IDIOMA: los nombres vienen traducidos, y sin la clave compuesta cambiar
 * de idioma dejaba la miga en el anterior.
 */
@Injectable()
export class MigaDeCategoria {
  private readonly taxonomia = inject(TAXONOMIA_PORT);
  private readonly recordadas = new Map<string, readonly Categoria[]>();

  async ejecuta(categoriaId: string, idioma: string): Promise<Result<readonly Categoria[], AppError>> {
    const clave = `${idioma}:${categoriaId}`;
    const recordada = this.recordadas.get(clave);
    if (recordada) {
      return { ok: true, valor: recordada };
    }

    const resultado = await this.taxonomia.migaDeCategoria(categoriaId);
    if (resultado.ok) {
      this.recordadas.set(clave, resultado.valor);
    }
    return resultado;
  }
}
