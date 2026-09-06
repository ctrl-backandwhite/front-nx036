import { Injectable, inject } from '@angular/core';
import { ApiService, Parametros } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  CriterioDeCatalogo,
  EstadoDeProducto,
  PaginaDeProductos,
  ProductoDeListado,
} from '../../domain/catalogo/model/producto-admin';
import { ResultadoMasivo } from '../../domain/catalogo/model/resultado-masivo';
import {
  AnuncioFallido,
  AnunciosAlBusPort,
  CompresionDeImagenesPort,
  EstadoDeCompresion,
  PeticionDeRecargo,
  PeticionDeSubvencion,
  ProductosAdminPort,
  ProductosMasivosPort,
} from '../../domain/catalogo/port/productos-admin.port';

/** La forma en que el BACKEND habla. Vive aquí y no sale de este fichero. */
interface ProductoDto {
  id: string;
  slug: string;
  title: string;
  mainImage?: string;
  basePrice?: number;
  currency?: string;
  monthlySales?: number;
  trendScore?: number;
  status: string;
  verified?: boolean;
}

interface PaginaDto<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ResultadoMasivoDto {
  succeeded?: number;
  deleted?: number;
  failed: number;
  errors?: string[];
}

interface AnuncioFallidoDto {
  id: string;
  externalId: string;
  slug: string;
  title: string | null;
  intentos: number;
  error: string | null;
  actualizadoEn: string | null;
}

interface CompresionDto {
  pendientes: number;
  enCola: number;
}

function aProducto(dto: ProductoDto): ProductoDeListado {
  return {
    id: dto.id,
    slug: dto.slug,
    titulo: dto.title,
    imagenPrincipal: dto.mainImage,
    coste: dto.basePrice,
    divisa: dto.currency ?? 'CNY',
    ventasMensuales: Number(dto.monthlySales ?? 0),
    tendencia: dto.trendScore,
    estado: dto.status,
    verificado: !!dto.verified,
  };
}

/**
 * El lote masivo llega con DOS nombres para lo mismo: `succeeded` en los cambios de estado y `deleted`
 * en los borrados. Traducirlo aquí es justo el trabajo del adaptador; que ese detalle llegara al
 * dominio obligaría a cada pantalla a saber qué endpoint la sirvió.
 */
function aResultadoMasivo(dto: ResultadoMasivoDto): ResultadoMasivo {
  return {
    correctos: dto.succeeded ?? dto.deleted ?? 0,
    fallidos: dto.failed ?? 0,
    errores: dto.errors ?? [],
  };
}

/** Los filtros vacíos NO viajan: un filtro sin valor no puede llegar al servidor como filtro puesto. */
function aParametros(criterio: CriterioDeCatalogo): Parametros {
  return {
    page: criterio.pagina,
    size: criterio.tamano,
    lang: criterio.idioma,
    status: criterio.estado,
    categoryId: criterio.categoriaId,
    sort: criterio.orden,
    q: criterio.texto?.trim() || undefined,
    verified: criterio.verificado,
    minCost: criterio.costeMinimo,
    maxCost: criterio.costeMaximo,
    minSales: criterio.ventasMinimas,
    minTrend: criterio.tendenciaMinima,
  };
}

/**
 * El catálogo del panel contra nuestro backend.
 *
 * <p>Implementa cuatro puertos porque los cuatro se resuelven contra el mismo servicio; separarlos en
 * cuatro clases idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea contratos
 * pequeños y pueda sustituir el que necesite sin cargar con el resto.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `catalogo.providers.ts`.
 */
@Injectable()
export class ProductosAdminHttpAdapter
  implements ProductosAdminPort, ProductosMasivosPort, AnunciosAlBusPort, CompresionDeImagenesPort
{
  private readonly api = inject(ApiService);

  async lista(criterio: CriterioDeCatalogo): Promise<Result<PaginaDeProductos, AppError>> {
    const respuesta = await this.api.get<PaginaDto<ProductoDto>>(
      '/admin/catalog/products',
      aParametros(criterio),
    );
    return mapea(respuesta, (pagina) => ({
      productos: (pagina.items ?? []).map(aProducto),
      total: pagina.totalElements ?? 0,
      paginas: pagina.totalPages ?? 1,
      pagina: pagina.page ?? 0,
    }));
  }

  async cambiaEstado(id: string, estado: EstadoDeProducto): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}/status`,
      { status: estado },
    );
    return mapea(respuesta, () => undefined);
  }

  async marcaVerificado(
    id: string,
    verificado: boolean,
    idioma: string,
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}?lang=${encodeURIComponent(idioma)}`,
      { verified: verificado },
    );
    return mapea(respuesta, () => undefined);
  }

  async duplica(id: string, idioma?: string): Promise<Result<void, AppError>> {
    const consulta = idioma ? `?lang=${encodeURIComponent(idioma)}` : '';
    const respuesta = await this.api.post<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}/duplicate${consulta}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async cambiaEstados(
    ids: readonly string[],
    estado: EstadoDeProducto,
  ): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.put<ResultadoMasivoDto>('/admin/catalog/products/bulk-status', {
      ids,
      status: estado,
    });
    return mapea(respuesta, aResultadoMasivo);
  }

  async eliminaEnLote(ids: readonly string[]): Promise<Result<ResultadoMasivo, AppError>> {
    const respuesta = await this.api.post<ResultadoMasivoDto>(
      '/admin/catalog/products/bulk-delete',
      ids,
    );
    return mapea(respuesta, aResultadoMasivo);
  }

  async fijaRecargo(peticion: PeticionDeRecargo): Promise<Result<number, AppError>> {
    const respuesta = await this.api.put<{ updated: number }>('/admin/catalog/products/surcharge', {
      surchargeCny: peticion.recargoCny,
      productIds: peticion.productoIds,
      categoryId: peticion.categoriaId,
    });
    return mapea(respuesta, (cuerpo) => cuerpo.updated ?? 0);
  }

  async fijaSubvencion(peticion: PeticionDeSubvencion): Promise<Result<number, AppError>> {
    // Un importe ausente NO se manda: el backend deja esa bolsa como estaba, que es lo que permite
    // tocar el envío sin pisar el arancel.
    const cuerpo: Record<string, unknown> = {};
    if (peticion.envioCny !== undefined) {
      cuerpo['shippingUserCny'] = peticion.envioCny;
    }
    if (peticion.arancelCny !== undefined) {
      cuerpo['dutyUserCny'] = peticion.arancelCny;
    }
    if (peticion.productoIds) {
      cuerpo['productIds'] = peticion.productoIds;
    }
    if (peticion.categoriaId) {
      cuerpo['categoryId'] = peticion.categoriaId;
    }
    const respuesta = await this.api.put<{ updated: number }>(
      '/admin/catalog/products/subsidy',
      cuerpo,
    );
    return mapea(respuesta, (datos) => datos.updated ?? 0);
  }

  async fallidos(): Promise<Result<readonly AnuncioFallido[], AppError>> {
    const respuesta = await this.api.get<AnuncioFallidoDto[]>(
      '/admin/catalog/bus/anuncios-fallidos',
    );
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        idExterno: dto.externalId,
        slug: dto.slug,
        titulo: dto.title,
        intentos: dto.intentos,
        error: dto.error,
        actualizadoEn: dto.actualizadoEn,
      })),
    );
  }

  async reintenta(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ reencolados: number }>(
      '/admin/catalog/bus/anuncios-fallidos/reintentar',
    );
    return mapea(respuesta, (cuerpo) => cuerpo.reencolados ?? 0);
  }

  async estado(): Promise<Result<EstadoDeCompresion, AppError>> {
    const respuesta = await this.api.get<CompresionDto>(
      '/admin/catalog/imagenes/comprimir-historico/estado',
    );
    return mapea(respuesta, (dto) => ({ pendientes: dto.pendientes, enCola: dto.enCola }));
  }

  async encolaLote(limite: number): Promise<Result<EstadoDeCompresion, AppError>> {
    const respuesta = await this.api.post<CompresionDto>(
      `/admin/catalog/imagenes/comprimir-historico?limite=${limite}`,
    );
    return mapea(respuesta, (dto) => ({ pendientes: dto.pendientes, enCola: dto.enCola ?? 0 }));
  }
}
