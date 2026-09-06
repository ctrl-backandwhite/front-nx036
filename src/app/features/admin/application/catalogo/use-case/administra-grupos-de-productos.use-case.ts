import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, fallo } from '@shared/result/result';
import {
  BorradorDeGrupo,
  GrupoDeProductos,
  MiembroDeGrupo,
  grupoGuardable,
} from '../../../domain/catalogo/model/grupo-de-productos';
import {
  GRUPOS_DE_PRODUCTOS_PORT,
  MIEMBROS_DE_GRUPO_PORT,
} from '../../../domain/catalogo/port/grupos-de-productos.port';

/** Los grupos de productos, que son el ámbito `PRODUCT_GROUP` de las reglas de margen. */
@Injectable()
export class ListaGruposDeProductos {
  private readonly grupos = inject(GRUPOS_DE_PRODUCTOS_PORT);

  ejecuta(): Promise<Result<readonly GrupoDeProductos[], AppError>> {
    return this.grupos.lista();
  }
}

/** Crea o actualiza un grupo. Sin nombre no hay grupo: es lo que se elige en la regla de margen. */
@Injectable()
export class GuardaGrupoDeProductos {
  private readonly grupos = inject(GRUPOS_DE_PRODUCTOS_PORT);

  ejecuta(borrador: BorradorDeGrupo): Promise<Result<void, AppError>> {
    if (!grupoGuardable(borrador)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return borrador.id
      ? this.grupos.actualiza(borrador.id, borrador)
      : this.grupos.crea(borrador);
  }
}

/**
 * Borra un grupo.
 *
 * <p>El backend se niega si una regla de margen sigue usándolo, y ese motivo tiene que llegar: sin él
 * la fila seguía en su sitio y se volvía a pulsar creyendo que el clic no había entrado.
 */
@Injectable()
export class EliminaGrupoDeProductos {
  private readonly grupos = inject(GRUPOS_DE_PRODUCTOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.grupos.elimina(id);
  }
}

/** Quién está dentro del grupo. */
@Injectable()
export class ListaMiembrosDelGrupo {
  private readonly miembros = inject(MIEMBROS_DE_GRUPO_PORT);

  ejecuta(grupoId: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> {
    return this.miembros.lista(grupoId);
  }
}

/**
 * Mete o saca un producto del grupo.
 *
 * <p>Un alta o una baja que el backend rechaza y nadie avisa deja el producto con el margen genérico, y
 * la diferencia solo aparece al cuadrar el mes. Por eso el fallo se devuelve, nunca se traga.
 */
@Injectable()
export class CambiaMiembrosDelGrupo {
  private readonly miembros = inject(MIEMBROS_DE_GRUPO_PORT);

  ejecuta(grupoId: string, productoId: string, dentro: boolean): Promise<Result<unknown, AppError>> {
    return dentro
      ? this.miembros.anade(grupoId, [productoId])
      : this.miembros.quita(grupoId, productoId);
  }
}

/** Busca productos para poder elegir a quién meter en el grupo. */
@Injectable()
export class BuscaProductosParaGrupo {
  private readonly miembros = inject(MIEMBROS_DE_GRUPO_PORT);

  ejecuta(texto: string): Promise<Result<readonly MiembroDeGrupo[], AppError>> {
    return this.miembros.busca(texto);
  }
}
