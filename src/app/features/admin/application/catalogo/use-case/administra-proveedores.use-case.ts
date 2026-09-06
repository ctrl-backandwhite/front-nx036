import { Injectable, inject } from '@angular/core';
import { AppError, creaError } from '@shared/error/app-error';
import { Result, exito, fallo } from '@shared/result/result';
import {
  BorradorDeProveedor,
  CriterioDeProveedores,
  PaginaDeProveedores,
  desdeBorradorDeProveedor,
  proveedorGuardable,
} from '../../../domain/catalogo/model/proveedor-admin';
import { ResultadoMasivo } from '../../../domain/catalogo/model/resultado-masivo';
import {
  PROVEEDORES_ADMIN_PORT,
  PROVEEDORES_MASIVOS_PORT,
} from '../../../domain/catalogo/port/proveedores-admin.port';

/**
 * Una página de proveedores.
 *
 * <p>Paginado en SERVIDOR y ordenado del más reciente al más antiguo: la lista viene del buscador, con
 * respaldo en la base de datos, y son decenas de miles.
 */
@Injectable()
export class ListaProveedores {
  private readonly proveedores = inject(PROVEEDORES_ADMIN_PORT);

  ejecuta(criterio: CriterioDeProveedores): Promise<Result<PaginaDeProveedores, AppError>> {
    return this.proveedores.lista(criterio);
  }
}

/** Crea o actualiza un proveedor. Sin nombre no se guarda: es lo único que lo identifica en la tabla. */
@Injectable()
export class GuardaProveedor {
  private readonly proveedores = inject(PROVEEDORES_ADMIN_PORT);

  ejecuta(borrador: BorradorDeProveedor, id?: string | null): Promise<Result<void, AppError>> {
    if (!proveedorGuardable(borrador)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    const cambios = desdeBorradorDeProveedor(borrador);
    return id ? this.proveedores.actualiza(id, cambios) : this.proveedores.crea(cambios);
  }
}

/** Borra proveedores. El backend se niega con los que aún tienen productos, y ese motivo llega entero. */
@Injectable()
export class EliminaProveedores {
  private readonly proveedores = inject(PROVEEDORES_ADMIN_PORT);
  private readonly masivos = inject(PROVEEDORES_MASIVOS_PORT);

  async ejecuta(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    if (ids.length === 0) {
      return exito({ correctos: 0, fallidos: 0, errores: [] });
    }
    if (ids.length === 1) {
      const resultado = await this.proveedores.elimina(ids[0]);
      return resultado.ok ? exito({ correctos: 1, fallidos: 0, errores: [] }) : resultado;
    }
    return this.masivos.eliminaEnLote(ids);
  }
}

/**
 * Cambia la verificación de proveedores.
 *
 * <p>Con uno se ALTERNA —es lo que espera quien pulsa el icono de su fila— y con varios se FIJA a un
 * valor: en lote hace falta saber en qué queda cada uno, y alternar dejaría la mitad verificados y la
 * otra mitad no.
 */
@Injectable()
export class CambiaVerificacionDeProveedores {
  private readonly proveedores = inject(PROVEEDORES_ADMIN_PORT);
  private readonly masivos = inject(PROVEEDORES_MASIVOS_PORT);

  async ejecuta(
    ids: readonly string[],
    verificado?: boolean,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    if (ids.length === 0) {
      return exito({ correctos: 0, fallidos: 0, errores: [] });
    }
    if (verificado === undefined) {
      const resultado = await this.proveedores.alternaVerificado(ids[0]);
      return resultado.ok ? exito({ correctos: 1, fallidos: 0, errores: [] }) : resultado;
    }
    return this.masivos.verifica(ids, verificado);
  }
}

/** Vuelve a indexar los proveedores en el buscador. Devuelve cuántos entraron. */
@Injectable()
export class ReindexaProveedores {
  private readonly proveedores = inject(PROVEEDORES_ADMIN_PORT);

  ejecuta(): Promise<Result<number, AppError>> {
    return this.proveedores.reindexa();
  }
}
