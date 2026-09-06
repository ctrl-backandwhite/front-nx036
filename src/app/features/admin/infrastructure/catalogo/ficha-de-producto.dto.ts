/**
 * La forma en que el BACKEND describe una ficha de producto.
 *
 * <p>Vive en infraestructura y no sale de aquí: es lo que permite que el día que el servidor renombre
 * un campo se cambie un fichero y no treinta plantillas. Va en su propio archivo porque lo comparten
 * dos adaptadores —la ficha y sus variantes— y duplicarlo dejaría dos verdades sobre el mismo JSON.
 */
export interface ImagenDto {
  id: string;
  sourceUrl: string;
  cdnUrl?: string;
  position: number;
  role: string;
}

export interface VarianteDto {
  id: string;
  sku?: string;
  title?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  options?: Record<string, string>;
  active?: boolean;
}

export interface ValorDeVariacionDto {
  id: string;
  valueZh: string;
  value?: string;
  imageUrl?: string;
  imageSourceUrl?: string;
  position: number;
}

export interface EjeDto {
  id: string;
  nameZh: string;
  name?: string;
  position: number;
  values?: ValorDeVariacionDto[];
}

export interface TramoDto {
  minQty: number;
  maxQty?: number | null;
  unitPrice: number;
  currency?: string;
}

export interface CumplimientoDto {
  manufacturerName?: string;
  manufacturerAddress?: string;
  manufacturerEmail?: string;
  manufacturerComplete?: boolean;
}

export interface FichaDto {
  id: string;
  slug: string;
  title?: string;
  titleZh?: string;
  source?: string;
  externalId?: string;
  status: string;
  moq?: number;
  brand?: string;
  categoryId?: string;
  basePrice?: number;
  currency?: string;
  displayPrice?: number;
  displayCurrency?: string;
  monthlySales?: number;
  trendScore?: number;
  description?: string;
  descriptionHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
  videoUrl?: string;
  surchargeCny?: number | null;
  shippingUserCny?: number | null;
  dutyUserCny?: number | null;
  surchargeFormatted?: string;
  shippingUserFormatted?: string;
  dutyUserFormatted?: string;
  images?: ImagenDto[];
  variants?: VarianteDto[];
  variantOptions?: EjeDto[];
  priceTiers?: TramoDto[];
  translations?: Record<string, { title?: string }>;
  compliance?: CumplimientoDto;
}
