import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { ResultadoMasivo } from '../../domain/gestion/model/pagina';
import {
  AjusteDeMoq, AmbitoDeRegla, BorradorDeRegla, ReglaDePrecio, TipoDeMargen,
} from '../../domain/gestion/model/precios';
import {
  AmbitosDeReglaPort, OpcionDeAmbito, PreciosPort,
} from '../../domain/gestion/port/precios.port';
import { ResultadoMasivoDto, aResultadoMasivo } from './pagina.dto';
import { sinCuerpo } from './sin-cuerpo';

interface ReglaDto {
  id: string;
  scope: string;
  scopeId?: string;
  scopeName?: string;
  marginType: string;
  marginValue: number;
  minCostUsd?: number;
  maxCostUsd?: number;
  active: boolean;
  position?: number;
  description?: string;
  countryCode?: string;
  channel?: string;
}

const AMBITOS_CONOCIDOS = new Set<string>([
  'GLOBAL', 'CATEGORY', 'SUPPLIER', 'PRODUCT', 'PRODUCT_GROUP', 'VARIANT',
]);

/**
 * Traduce la fila del backend.
 *
 * <p>Los campos que pueden faltar se copian TAL CUAL, sin condicionales: el proyecto no exige
 * propiedades opcionales exactas, así que un `undefined` es lo mismo que no ponerla, y encadenar diez
 * ternarios solo hacía la función ilegible.
 */
function aRegla(dto: ReglaDto): ReglaDePrecio {
  return {
    id: dto.id,
    // Un ámbito desconocido se trata como global, que es el más restrictivo de interpretar: nunca se
    // pinta una regla como si afectara a un producto concreto cuando no se sabe a cuál.
    ambito: (AMBITOS_CONOCIDOS.has(dto.scope) ? dto.scope : 'GLOBAL') as AmbitoDeRegla,
    tipo: (dto.marginType === 'FIXED' ? 'FIXED' : 'PERCENTAGE') as TipoDeMargen,
    valor: Number(dto.marginValue ?? 0) || 0,
    activa: dto.active,
    posicion: dto.position ?? 0,
    idAmbito: dto.scopeId,
    nombreDelAmbito: dto.scopeName,
    costeMinimoUsd: dto.minCostUsd,
    costeMaximoUsd: dto.maxCostUsd,
    descripcion: dto.description,
    pais: dto.countryCode,
    canal: dto.channel,
  };
}

/** El cuerpo que espera el backend. Los campos vacíos se omiten para no borrar lo que ya había. */
function aCuerpo(regla: BorradorDeRegla): Record<string, unknown> {
  return {
    scope: regla.ambito,
    scopeId: regla.idAmbito,
    marginType: regla.tipo,
    marginValue: regla.valor,
    minCostUsd: regla.costeMinimoUsd,
    maxCostUsd: regla.costeMaximoUsd,
    active: regla.activa,
    position: regla.posicion ?? 0,
    description: regla.descripcion ?? '',
    countryCode: regla.pais,
    channel: regla.canal,
  };
}

@Injectable()
export class PreciosHttpAdapter implements PreciosPort {
  private readonly api = inject(ApiService);

  async reglas(): Promise<Result<readonly ReglaDePrecio[], AppError>> {
    const respuesta = await this.api.get<ReglaDto[]>('/admin/pricing/rules');
    return mapea(respuesta, (lista) => (lista ?? []).map(aRegla));
  }

  crea(regla: BorradorDeRegla): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/admin/pricing/rules', aCuerpo(regla)));
  }

  actualiza(id: string, regla: BorradorDeRegla): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/pricing/rules/${id}`, aCuerpo(regla)));
  }

  alterna(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/pricing/rules/${id}/toggle`));
  }

  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/pricing/rules/${id}`));
  }

  async alternaEnLote(
    ids: readonly string[],
    activa: boolean,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.put<ResultadoMasivoDto>('/admin/pricing/rules/bulk-toggle', {
      ids,
      active: activa,
    });
    return mapea(respuesta, aResultadoMasivo);
  }

  async borraEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.post<ResultadoMasivoDto>('/admin/pricing/rules/bulk-delete', ids);
    return mapea(respuesta, aResultadoMasivo);
  }

  async ajusteDeMoq(): Promise<Result<AjusteDeMoq, AppError>> {
    const respuesta = await this.api.get<{ enabled?: boolean; factorPercent?: number }>(
      '/admin/pricing/moq-rule',
    );
    return mapea(respuesta, (dto) => ({
      activo: dto?.enabled ?? false,
      factorPorcentaje: dto?.factorPercent ?? 100,
    }));
  }

  async guardaAjusteDeMoq(ajuste: AjusteDeMoq): Promise<Result<AjusteDeMoq, AppError>> {
    const respuesta = await this.api.put<{ enabled?: boolean; factorPercent?: number }>(
      '/admin/pricing/moq-rule',
      { enabled: ajuste.activo, factorPercent: ajuste.factorPorcentaje },
    );
    return mapea(respuesta, (dto) => ({
      activo: dto?.enabled ?? ajuste.activo,
      factorPorcentaje: dto?.factorPercent ?? ajuste.factorPorcentaje,
    }));
  }
}

interface OpcionDto {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  memberCount?: number;
}

/**
 * Los nombres con los que se elige el ámbito de una regla.
 *
 * <p>Se leen del escaparate y del propio panel, y se reducen aquí mismo a pares identificador-nombre:
 * lo que la pantalla necesita es llenar un desplegable, no conocer el modelo de producto ni el de
 * categoría. Así este panel no se rompe cuando el catálogo cambia lo que devuelve.
 */
@Injectable()
export class AmbitosDeReglaHttpAdapter implements AmbitosDeReglaPort {
  private readonly api = inject(ApiService);

  async categorias(): Promise<Result<readonly OpcionDeAmbito[], AppError>> {
    const respuesta = await this.api.get<OpcionDto[]>('/catalog/categories', { lang: 'es' });
    return mapea(respuesta, (lista) => (lista ?? []).map((d) => this.aOpcion(d)));
  }

  async proveedores(): Promise<Result<readonly OpcionDeAmbito[], AppError>> {
    const respuesta = await this.api.get<OpcionDto[]>('/catalog/suppliers');
    return mapea(respuesta, (lista) => (lista ?? []).map((d) => this.aOpcion(d)));
  }

  async productos(): Promise<Result<readonly OpcionDeAmbito[], AppError>> {
    const respuesta = await this.api.get<{ items?: OpcionDto[] }>('/catalog/products', {
      page: 0,
      size: 200,
      lang: 'es',
    });
    return mapea(respuesta, (dto) => (dto?.items ?? []).map((d) => this.aOpcion(d)));
  }

  async grupos(): Promise<Result<readonly OpcionDeAmbito[], AppError>> {
    const respuesta = await this.api.get<OpcionDto[]>('/admin/product-groups');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((d) => ({
        id: d.id,
        // El recuento de miembros va en el propio rótulo: un grupo vacío no debería elegirse por error,
        // y verlo en el desplegable evita tener que abrir otra pantalla para comprobarlo.
        nombre: `${d.name ?? d.id} (${d.memberCount ?? 0})`,
      })),
    );
  }

  private aOpcion(dto: OpcionDto): OpcionDeAmbito {
    return { id: dto.id, nombre: dto.name ?? dto.title ?? dto.slug ?? dto.id };
  }
}
