import { Injectable, inject, signal } from '@angular/core';
import { TAXONOMIA_PORT } from '../../domain/port/catalogo.port';
import { Categoria, Proveedor } from '../../domain/model/catalogo-auxiliar';

/**
 * Las categorías y los proveedores, pedidos UNA vez por visita.
 *
 * <p>Son la taxonomía del catálogo: lo que llena los desplegables de los filtros. Cambian cuando se
 * publica una categoría nueva o entra un proveedor, o sea casi nunca, y sin embargo se volvían a pedir
 * cada vez que se montaba el listado — es decir, cada vez que alguien entraba en una ficha y volvía.
 *
 * <p>Medido: al volver de una ficha salían TRES peticiones al servidor. Dos eran estas, y son las que
 * de verdad sobraban: los productos ya estaban guardados y la tercera es el desplazamiento infinito
 * pidiendo la página siguiente, que es lo que tiene que hacer. Volver tardaba 1.449 ms frente a los
 * 942 del front anterior.
 *
 * <p>Vive en los proveedores del CONTEXTO, no en el componente, que es lo que hace que sobreviva a la
 * navegación. Es el mismo motivo por el que el almacén del listado guarda los productos.
 */
@Injectable()
export class TaxonomiaStore {
  private readonly puerto = inject(TAXONOMIA_PORT);

  private readonly _categorias = signal<readonly Categoria[] | null>(null);
  private readonly _proveedores = signal<readonly Proveedor[] | null>(null);

  readonly categorias = this._categorias.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();

  /**
   * Trae lo que falte, y solo lo que falte.
   *
   * <p>Un fallo NO se guarda: si el servidor no responde, se deja a nulo para que el siguiente intento
   * vuelva a pedirlo. Guardar la lista vacía dejaría los filtros mudos el resto de la visita, y quien
   * no supiera que hubo un fallo pensaría que el catálogo no tiene categorías.
   */
  async asegura(): Promise<void> {
    await Promise.all([this.aseguraCategorias(), this.aseguraProveedores()]);
  }

  private async aseguraCategorias(): Promise<void> {
    if (this._categorias() !== null) {
      return;
    }
    const resultado = await this.puerto.arbolDeCategorias();
    if (resultado.ok) {
      this._categorias.set(resultado.valor);
    }
  }

  private async aseguraProveedores(): Promise<void> {
    if (this._proveedores() !== null) {
      return;
    }
    const resultado = await this.puerto.proveedores();
    if (resultado.ok) {
      this._proveedores.set(resultado.valor);
    }
  }
}
