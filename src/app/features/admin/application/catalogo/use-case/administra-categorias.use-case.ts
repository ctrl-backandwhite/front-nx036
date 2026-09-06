import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import {
  BorradorDeCategoria,
  CategoriaAdmin,
  CriterioDeCategorias,
  PaginaDeCategorias,
  validaCategoria,
} from '../../../domain/catalogo/model/categoria-admin';
import { CATEGORIAS_ADMIN_PORT } from '../../../domain/catalogo/port/categorias-admin.port';

/**
 * Una página de categorías.
 *
 * <p>Paginado en SERVIDOR: son casi dos mil y traerlas todas para pintar cincuenta filas costaba varios
 * segundos en cada visita.
 */
@Injectable()
export class ListaCategorias {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(criterio: CriterioDeCategorias): Promise<Result<PaginaDeCategorias, AppError>> {
    return this.categorias.listaPaginada(criterio);
  }
}

/**
 * El árbol COMPLETO de categorías.
 *
 * <p>Se pide solo cuando de verdad hace falta —el selector de padre y la exportación—, nunca para
 * pintar la tabla.
 */
@Injectable()
export class ListaTodasLasCategorias {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(): Promise<Result<readonly CategoriaAdmin[], AppError>> {
    return this.categorias.listaTodas();
  }
}

/** Crea o actualiza una categoría, validando antes lo que el backend también valida. */
@Injectable()
export class GuardaCategoria {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(borrador: BorradorDeCategoria, id?: string | null): Promise<Result<void, AppError>> {
    if (Object.keys(validaCategoria(borrador)).length > 0) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return id ? this.categorias.actualiza(id, borrador) : this.categorias.crea(borrador);
  }
}

/**
 * Borra una o varias categorías.
 *
 * <p>No hay ruta de lote en el backend, así que se van una a una y se cuenta: el fallo de cada una
 * viaja con su identificador para que se pueda ver cuál se quedó y por qué.
 */
@Injectable()
export class EliminaCategorias {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  async ejecuta(
    ids: readonly string[],
  ): Promise<Result<{ borradas: number; fallos: readonly string[] }, AppError>> {
    let borradas = 0;
    const fallos: string[] = [];
    for (const id of ids) {
      const resultado = await this.categorias.elimina(id);
      if (resultado.ok) {
        borradas++;
      } else {
        fallos.push(`${id}: ${resultado.error.mensaje}`);
      }
    }
    return exito({ borradas, fallos });
  }
}

/** Enciende o apaga una categoría. Apagada deja de aparecer en el menú, pero no borra sus productos. */
@Injectable()
export class AlternaCategoria {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.categorias.alterna(id);
  }
}

/** Enciende o apaga varias a la vez, fijando el valor: en lote hay que saber en qué queda cada una. */
@Injectable()
export class ActivaCategoriasEnLote {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(ids: readonly string[], activa: boolean): Promise<Result<number, AppError>> {
    return this.categorias.activaEnLote(ids, activa);
  }
}

/** Vuelve a indexar las categorías en el buscador. Devuelve cuántas entraron. */
@Injectable()
export class ReindexaCategorias {
  private readonly categorias = inject(CATEGORIAS_ADMIN_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.categorias.reindexa();
  }
}
