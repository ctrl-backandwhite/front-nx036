import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result, mapea } from '@shared/result/result';
import {
  CambiosDeFicha,
  FichaDeProducto,
  ImporteEnYuanes,
} from '../../domain/catalogo/model/ficha-de-producto';
import {
  FichaDeProductoPort,
  ImagenesDeProductoPort,
} from '../../domain/catalogo/port/ficha-de-producto.port';
import { EjeDto, FichaDto, TramoDto, VarianteDto } from './ficha-de-producto.dto';
import { aVariante } from './variantes-http.adapter';

/** Los tres importes en yuanes, con su nombre de negocio a un lado y el del backend al otro. */
const NOMBRE_EN_BACKEND: Readonly<Record<ImporteEnYuanes, string>> = {
  recargo: 'surchargeCny',
  subvencionDeEnvio: 'shippingUserCny',
  subvencionDeArancel: 'dutyUserCny',
};

function aEje(dto: EjeDto) {
  return {
    id: dto.id,
    nombreZh: dto.nameZh,
    nombre: dto.name,
    posicion: dto.position,
    valores: (dto.values ?? []).map((valor) => ({
      id: valor.id,
      valorZh: valor.valueZh,
      valor: valor.value,
      urlImagen: valor.imageUrl,
      urlImagenOrigen: valor.imageSourceUrl,
      posicion: valor.position,
    })),
  };
}

function aTramo(dto: TramoDto) {
  return {
    cantidadMinima: dto.minQty,
    cantidadMaxima: dto.maxQty,
    precioUnitario: Number(dto.unitPrice),
    divisa: dto.currency ?? 'CNY',
  };
}

/** El título por idioma sale del mapa de traducciones; las entradas sin título no cuentan. */
function titulosPorIdioma(dto: FichaDto): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [codigo, contenido] of Object.entries(dto.translations ?? {})) {
    if (contenido?.title) {
      salida[codigo] = contenido.title;
    }
  }
  return salida;
}

/** Qué es el producto y cuánto cuesta. El COSTE va aparte del precio de venta a propósito. */
function identidadDe(dto: FichaDto) {
  return {
    id: dto.id,
    slug: dto.slug,
    titulo: dto.title ?? '',
    tituloZh: dto.titleZh ?? '',
    origen: dto.source ?? '',
    idExterno: dto.externalId ?? '',
    estado: dto.status,
    moq: dto.moq ?? 1,
    marca: dto.brand,
    categoriaId: dto.categoryId,
    coste: dto.basePrice,
    divisa: dto.currency ?? 'CNY',
    precioDeVenta: dto.displayPrice,
    divisaDeVenta: dto.displayCurrency,
    ventasMensuales: Number(dto.monthlySales ?? 0),
    tendencia: dto.trendScore,
  };
}

/** Los textos, que son por idioma. */
function textosDe(dto: FichaDto) {
  return {
    descripcion: dto.description,
    descripcionHtml: dto.descriptionHtml,
    metaTitulo: dto.metaTitle,
    metaDescripcion: dto.metaDescription,
    urlVideo: dto.videoUrl,
    titulosPorIdioma: titulosPorIdioma(dto),
  };
}

/** Los tres importes en yuanes: los crudos, que se editan, y los formateados, que se enseñan. */
function yuanesDe(dto: FichaDto) {
  return {
    yuanes: {
      recargo: dto.surchargeCny,
      subvencionDeEnvio: dto.shippingUserCny,
      subvencionDeArancel: dto.dutyUserCny,
    },
    yuanesFormateados: {
      recargo: dto.surchargeFormatted,
      subvencionDeEnvio: dto.shippingUserFormatted,
      subvencionDeArancel: dto.dutyUserFormatted,
    },
  };
}

export function aFicha(dto: FichaDto, variantes: readonly VarianteDto[] = []): FichaDeProducto {
  const listaDeVariantes = variantes.length ? variantes : (dto.variants ?? []);
  return {
    ...identidadDe(dto),
    ...textosDe(dto),
    ...yuanesDe(dto),
    imagenes: (dto.images ?? []).map((imagen) => ({
      id: imagen.id,
      urlOrigen: imagen.sourceUrl,
      urlCdn: imagen.cdnUrl,
      posicion: imagen.position,
      papel: imagen.role,
    })),
    variantes: listaDeVariantes.map(aVariante),
    ejes: (dto.variantOptions ?? []).map(aEje),
    tramos: (dto.priceTiers ?? []).map(aTramo),
    fabricante: dto.compliance
      ? {
          nombre: dto.compliance.manufacturerName,
          direccion: dto.compliance.manufacturerAddress,
          correo: dto.compliance.manufacturerEmail,
          completo: !!dto.compliance.manufacturerComplete,
        }
      : undefined,
  };
}

/** Traduce los cambios del dominio al cuerpo que espera el backend, campo a campo. */
function aCuerpo(cambios: CambiosDeFicha): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    title: cambios.titulo,
    brand: cambios.marca,
    basePrice: cambios.coste,
    currency: cambios.divisa,
    moq: cambios.moq,
    videoUrl: cambios.urlVideo,
    categoryId: cambios.categoriaId,
    description: cambios.descripcion,
    metaTitle: cambios.metaTitulo,
    metaDescription: cambios.metaDescripcion,
    verified: cambios.verificado,
  };
  for (const [nombre, importe] of Object.entries(cambios.yuanes ?? {})) {
    cuerpo[NOMBRE_EN_BACKEND[nombre as ImporteEnYuanes]] = importe;
  }
  if (cambios.fabricante) {
    // Van SIEMPRE, aunque estén vacíos: el backend trata la cadena vacía como borrado y el nulo como
    // «no lo edito». Sin esto no habría forma de quitar un dato de fabricante mal metido.
    cuerpo['manufacturerName'] = cambios.fabricante.nombre;
    cuerpo['manufacturerAddress'] = cambios.fabricante.direccion;
    cuerpo['manufacturerEmail'] = cambios.fabricante.correo;
  }
  for (const clave of Object.keys(cuerpo)) {
    if (cuerpo[clave] === undefined) {
      delete cuerpo[clave];
    }
  }
  return cuerpo;
}

/**
 * La ficha de producto y su galería, contra nuestro backend.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `catalogo.providers.ts`.
 */
@Injectable()
export class FichaDeProductoHttpAdapter implements FichaDeProductoPort, ImagenesDeProductoPort {
  private readonly api = inject(ApiService);

  async consulta(id: string, idioma: string): Promise<Result<FichaDeProducto, AppError>> {
    const respuesta = await this.api.get<FichaDto>(
      `/admin/catalog/products/${encodeURIComponent(id)}`,
      { lang: idioma },
    );
    return mapea(respuesta, (dto) => aFicha(dto));
  }

  async actualiza(
    id: string,
    cambios: CambiosDeFicha,
    idioma: string,
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}?lang=${encodeURIComponent(idioma)}`,
      aCuerpo(cambios),
    );
    return mapea(respuesta, () => undefined);
  }

  async eliminaTramo(id: string, cantidadMinima: number): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/products/${encodeURIComponent(id)}/price-tiers/${cantidadMinima}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async anade(productoId: string, url: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.post<unknown>(
      `/admin/catalog/products/${encodeURIComponent(productoId)}/images`,
      { url },
    );
    return mapea(respuesta, () => undefined);
  }

  async elimina(imagenId: string): Promise<Result<void, AppError>> {
    const respuesta = await this.api.delete<unknown>(
      `/admin/catalog/products/images/${encodeURIComponent(imagenId)}`,
    );
    return mapea(respuesta, () => undefined);
  }

  async reordena(
    productoId: string,
    imagenIds: readonly string[],
  ): Promise<Result<void, AppError>> {
    const respuesta = await this.api.put<unknown>(
      `/admin/catalog/products/${encodeURIComponent(productoId)}/images/order`,
      { imageIds: imagenIds },
    );
    return mapea(respuesta, () => undefined);
  }
}
