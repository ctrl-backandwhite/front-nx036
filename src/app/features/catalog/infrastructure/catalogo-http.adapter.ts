import { Injectable, inject } from '@angular/core';
import { ApiService, Parametros } from '@core/http/api.service';
import { PreferenciasService } from '@core/preferences/preferencias';
import { Result, exito, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  CatalogoPort,
  PeticionDeListado,
  PortadaPort,
  TaxonomiaPort,
} from '../domain/port/catalogo.port';
import {
  Especificacion,
  FichaDeProducto,
  PaginaDeProductos,
  ResumenDeProducto,
} from '../domain/model/producto';
import { Categoria, Portada, Proveedor } from '../domain/model/catalogo-auxiliar';
import { CriterioDeBusqueda, GRUPO_DEL_CARRITO } from '../domain/model/criterio-de-busqueda';
import {
  CategoriaDto,
  FichaDto,
  PaginaDto,
  ResumenDto,
  aCategoria,
  aEspecificaciones,
  aFicha,
  aPagina,
  aPortada,
  aProveedor,
  aResumen,
} from './producto.dto';

/**
 * El catálogo contra nuestro backend.
 *
 * <p>Implementa tres puertos porque los tres se resuelven contra el mismo servicio; separarlos en tres
 * clases idénticas solo añadiría ficheros. Lo que importa es que quien los consume vea tres contratos
 * pequeños y no uno grande.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `catalog.providers.ts`.
 */
@Injectable()
export class CatalogoHttpAdapter implements CatalogoPort, TaxonomiaPort, PortadaPort {
  private readonly api = inject(ApiService);
  private readonly preferencias = inject(PreferenciasService);

  /** El idioma viaja como parámetro, además de en la cabecera: es lo que espera este backend. */
  private get idioma(): string {
    return this.preferencias.idioma();
  }

  async busca(peticion: PeticionDeListado): Promise<Result<PaginaDeProductos, AppError>> {
    const respuesta = await this.api.get<PaginaDto<ResumenDto>>('/catalog/products', {
      page: peticion.pagina,
      size: peticion.tamano,
      lang: this.idioma,
      seed: peticion.baraja,
      ...this.filtros(peticion.criterio),
      // La lista va SEPARADA POR COMAS: es lo que el backend convierte a `List<UUID>` sin ayuda.
      // Serializada como repetición del parámetro, la lista llegaba vacía y el distintivo de arancel
      // no aparecía sin que nada fallara de forma visible.
      cartProductIds: peticion.productosEnLaCesta?.join(',') || undefined,
    });
    return mapea(respuesta, aPagina);
  }

  async ficha(
    slug: string,
    productosEnLaCesta?: readonly string[],
  ): Promise<Result<FichaDeProducto, AppError>> {
    const respuesta = await this.api.get<FichaDto>(`/catalog/products/${slug}`, {
      lang: this.idioma,
      cartProductIds: productosEnLaCesta?.join(',') || undefined,
    });
    return mapea(respuesta, aFicha);
  }

  async relacionados(
    idDelProducto: string,
    limite = 8,
  ): Promise<Result<readonly ResumenDeProducto[], AppError>> {
    const respuesta = await this.api.get<ResumenDto[]>(
      `/catalog/products/${idDelProducto}/related`,
      { lang: this.idioma, limit: limite },
    );
    return mapea(respuesta, (lista) => lista.map(aResumen));
  }

  /**
   * Las especificaciones del idioma activo, con respaldo en español.
   *
   * <p>Hay idiomas todavía sin poblar (fr/de/it/nl): sin este respaldo la ficha técnica salía vacía en
   * ellos, que es peor que salir en otro idioma.
   */
  async especificaciones(
    idDelProducto: string,
    idioma?: string,
  ): Promise<Result<readonly Especificacion[], AppError>> {
    const camino = `/catalog/products/${idDelProducto}/specifications`;
    const pedido = idioma ?? this.idioma;
    const primera = await this.api.get<{ key: string; value: string; position?: number }[]>(camino, {
      lang: pedido,
    });
    if (primera.ok && primera.valor.length === 0 && pedido !== 'es') {
      const respaldo = await this.api.get<{ key: string; value: string; position?: number }[]>(
        camino,
        { lang: 'es' },
      );
      return mapea(respaldo, aEspecificaciones);
    }
    return mapea(primera, aEspecificaciones);
  }

  async categoriasRaiz(): Promise<Result<readonly Categoria[], AppError>> {
    const respuesta = await this.api.get<CategoriaDto[]>('/catalog/categories', {
      lang: this.idioma,
    });
    return mapea(respuesta, (lista) => lista.map(aCategoria));
  }

  async arbolDeCategorias(): Promise<Result<readonly Categoria[], AppError>> {
    const respuesta = await this.api.get<CategoriaDto[]>('/catalog/categories/tree', {
      lang: this.idioma,
    });
    return mapea(respuesta, (lista) => lista.map(aCategoria));
  }

  async proveedores(): Promise<Result<readonly Proveedor[], AppError>> {
    const respuesta =
      await this.api.get<{ id: string; slug: string; name: string; country?: string }[]>(
        '/catalog/suppliers',
      );
    return mapea(respuesta, (lista) => lista.map(aProveedor));
  }

  async secciones(porSeccion: number): Promise<Result<Portada, AppError>> {
    const respuesta = await this.api.get<Parameters<typeof aPortada>[0]>('/catalog/home/sections', {
      lang: this.idioma,
      perSection: porSeccion,
    });
    return respuesta.ok ? exito(aPortada(respuesta.valor)) : respuesta;
  }

  /** Del vocabulario del dominio al del backend. Solo viaja lo que de verdad está puesto. */
  private filtros(criterio: CriterioDeBusqueda): Parametros {
    return {
      q: criterio.texto,
      categoryId: criterio.categoria,
      supplierId: criterio.proveedor,
      minPrice: criterio.precioMinimo,
      maxPrice: criterio.precioMaximo,
      shipFrom: criterio.enviaDesde,
      freeShipping: criterio.envioGratis || undefined,
      hasVideo: criterio.conVideo || undefined,
      minRating: criterio.valoracionMinima,
      certification: criterio.certificacion,
      verified: criterio.verificado || undefined,
      sort: criterio.orden,
      promotionId: criterio.promocion,
      // El centinela «carrito» no es un identificador de grupo: se traduce al interruptor que el
      // servidor resuelve contra las líneas de la cesta que van en `cartProductIds`.
      dutyGroupId:
        criterio.grupoDeArancel && criterio.grupoDeArancel !== GRUPO_DEL_CARRITO
          ? criterio.grupoDeArancel
          : undefined,
      dutyGroupsFromCart: criterio.grupoDeArancel === GRUPO_DEL_CARRITO ? true : undefined,
    };
  }
}
