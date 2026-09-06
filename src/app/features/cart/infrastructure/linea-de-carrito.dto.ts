import { LineaDeCarrito } from '../domain/model/linea-de-carrito';

/**
 * La forma en que el BACKEND habla de una línea de la cesta. Vive aquí y no sale de la infraestructura:
 * en cuanto un modelo de dominio tiene la forma del JSON, el negocio queda atado al transporte.
 */
export interface LineaDeCarritoDto {
  productId: string;
  variantId?: string;
  sku?: string;
  slug: string;
  title: string;
  image?: string;
  variantLabel?: string;
  unitPriceSource: number;
  sourceCurrency: string;
  quantity: number;
  moq?: number;
  unitPriceDisplay?: number;
  displayCurrency?: string;
}

export function aLinea(dto: LineaDeCarritoDto): LineaDeCarrito {
  return {
    productId: dto.productId,
    variantId: dto.variantId,
    sku: dto.sku,
    slug: dto.slug,
    titulo: dto.title,
    imagen: dto.image,
    etiquetaDeVariante: dto.variantLabel,
    precioUnitarioOrigen: dto.unitPriceSource,
    divisaDeOrigen: dto.sourceCurrency,
    cantidad: dto.quantity,
    pedidoMinimo: dto.moq,
    precioUnitarioMostrado: dto.unitPriceDisplay,
    divisaMostrada: dto.displayCurrency,
  };
}

/**
 * De vuelta al backend.
 *
 * <p>El identificador de variante viaja como UUID: la cadena vacía que llegaron a guardar cestas antiguas
 * no se puede interpretar y el servidor la rechaza. Se normaliza AQUÍ, en la frontera, para que ninguna
 * ruta de llamada pueda saltárselo — «sin variante» viaja siempre como ausencia del campo.
 */
export function aDto(linea: LineaDeCarrito): LineaDeCarritoDto {
  return {
    productId: linea.productId,
    variantId: linea.variantId || undefined,
    sku: linea.sku,
    slug: linea.slug,
    title: linea.titulo,
    image: linea.imagen,
    variantLabel: linea.etiquetaDeVariante,
    unitPriceSource: linea.precioUnitarioOrigen,
    sourceCurrency: linea.divisaDeOrigen,
    quantity: linea.cantidad,
    moq: linea.pedidoMinimo,
    unitPriceDisplay: linea.precioUnitarioMostrado,
    displayCurrency: linea.divisaMostrada,
  };
}
