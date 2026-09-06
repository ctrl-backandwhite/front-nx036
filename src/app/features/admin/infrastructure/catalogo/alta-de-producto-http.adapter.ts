import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { AppError } from '@shared/error/app-error';
import { Result } from '@shared/result/result';
import {
  MedidasDelBulto,
  ProductoNuevo,
  VarianteNueva,
} from '../../domain/catalogo/model/producto-nuevo';
import { AltaDeProductoPort } from '../../domain/catalogo/port/alta-de-producto.port';

/** Las medidas del bulto, con los nombres del backend. Se repiten en el producto y en cada variante. */
function medidasDto(medidas: MedidasDelBulto): Record<string, unknown> {
  return {
    weightGrams: medidas.pesoGramos,
    packageWeightGrams: medidas.pesoDelPaqueteGramos,
    lengthMm: medidas.largoMm,
    widthMm: medidas.anchoMm,
    heightMm: medidas.altoMm,
  };
}

function varianteDto(variante: VarianteNueva): Record<string, unknown> {
  return {
    sku: variante.sku,
    optionValues: variante.opciones,
    price: variante.precio,
    stock: variante.existencias,
    imageUrl: variante.urlImagen,
    ...medidasDto(variante),
  };
}

/** Quita las claves sin valor: el backend distingue «no lo mando» de «lo mando vacío». */
function sinVacios(cuerpo: Record<string, unknown>): Record<string, unknown> {
  for (const clave of Object.keys(cuerpo)) {
    const valor = cuerpo[clave];
    if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) {
      delete cuerpo[clave];
    }
  }
  return cuerpo;
}

/**
 * Traduce el producto del dominio al cuerpo del alta, que es el MISMO formato de la carga masiva.
 *
 * <p>Que sean el mismo formato no es casualidad: lo que se da de alta a mano tiene que poder exportarse
 * y volver a entrar en otro entorno sin tocar nada.
 */
function aCuerpo(producto: ProductoNuevo): Record<string, unknown> {
  return sinVacios({
    categorySlug: producto.categoriaSlug,
    category1688Id: producto.categoriaDeOrigenId,
    category1688Name: producto.categoriaDeOrigenNombre,
    manufacturer: producto.fabricante,
    supplierName: producto.proveedorNombre,
    supplierExternalId: producto.proveedorIdExterno,
    price: producto.precio,
    moq: producto.moq,
    monthlySales: producto.ventasMensuales,
    rating: producto.valoracion,
    status: producto.estado,
    imageUrls: producto.imagenes,
    videoUrl: producto.urlVideo,
    videoUrls: producto.videosExtra,
    ...medidasDto(producto),
    countryOfOrigin: producto.paisDeOrigen,
    hsCode: producto.hs6,
    certifications: producto.certificaciones,
    shipFrom: producto.envioDesde,
    leadTimeDays: producto.plazoDeEntregaDias,
    salesRegions: producto.regionesDeVenta,
    ratingBreakdown: producto.desgloseDeEstrellas,
    dropshipShipped30d: producto.enviosDropship30d,
    dropshipPickupRate48h: producto.tasaDeRecogida48h,
    translations: Object.keys(producto.contenido).length
      ? Object.fromEntries(
          Object.entries(producto.contenido).map(([codigo, texto]) => [
            codigo,
            { title: texto.titulo, description: texto.descripcion },
          ]),
        )
      : undefined,
    tieredPricing: producto.tramos.map((tramo) => ({
      minQty: tramo.cantidadMinima,
      maxQty: tramo.cantidadMaxima,
      unitPrice: tramo.precioUnitario,
      currency: tramo.divisa,
    })),
    variantAxes: producto.ejes.map((eje) => ({
      name: eje.nombre,
      values: eje.valores,
      valueImages: eje.imagenesPorValor,
      valueTranslations: eje.traduccionesPorValor,
    })),
    variants: producto.variantes.map(varianteDto),
    attributes: producto.atributos.map((atributo) => ({
      key: atributo.clave,
      value: atributo.valor,
      locale: atributo.idioma,
    })),
    specifications: producto.especificaciones.map((fila) => ({
      locale: fila.idioma,
      key: fila.clave,
      value: fila.valor,
      position: fila.posicion,
    })),
    reviews: producto.resenas.map((resena) => ({
      authorName: resena.autor,
      authorCountry: resena.pais,
      rating: resena.estrellas,
      title: resena.titulo,
      body: resena.cuerpo,
      language: resena.idioma,
    })),
  });
}

/** El alta manual de producto contra nuestro backend. Se registra en `catalogo.providers.ts`. */
@Injectable()
export class AltaDeProductoHttpAdapter implements AltaDeProductoPort {
  private readonly api = inject(ApiService);

  crea(producto: ProductoNuevo): Promise<Result<string, AppError>> {
    return this.api.post<string>('/admin/catalog/products/create', aCuerpo(producto));
  }
}
