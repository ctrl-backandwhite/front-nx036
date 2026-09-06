import {
  DireccionDeEnvio,
  FichaDePedido,
  LineaDePedido,
  OrigenDePedido,
  Pedido,
  importeLegible,
} from '../../domain/logistica/model/pedido';

/**
 * La forma en que el BACKEND habla de un pedido.
 *
 * <p>Vive en la infraestructura y no sale de aquí: en cuanto un tipo con nombres del servidor cruza
 * hacia el dominio, la dependencia queda invertida y renombrar un campo obliga a tocar las pantallas.
 */
export interface PedidoDto {
  id: string;
  orderNumber: string;
  status: string;
  totalCents?: number;
  currency?: string;
  totalFormatted?: string;
  itemCount?: number;
  placedAt?: string;
  customerEmail?: string;
  shopName?: string;
  shopHandle?: string;
  supplierName?: string;
}

interface DireccionDto {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface LineaDto {
  id: string;
  title?: string;
  sku?: string;
  variantName?: string;
  imageUrl?: string;
  productSourceUrl?: string;
  qty?: number;
  unitPriceCents?: number;
  unitPriceFormatted?: string;
  lineTotalCents?: number;
  lineTotalFormatted?: string;
}

export interface FichaDePedidoDto extends PedidoDto {
  source?: string;
  notes?: string;
  trackingNumber?: string;
  shippingAddress?: DireccionDto;
  subtotalCents?: number;
  subtotalFormatted?: string;
  shippingCents?: number;
  shippingFormatted?: string;
  taxCents?: number;
  taxFormatted?: string;
  items?: LineaDto[];
}

export function aPedido(dto: PedidoDto): Pedido {
  return {
    id: dto.id,
    numero: dto.orderNumber,
    estado: dto.status,
    emailCliente: dto.customerEmail,
    // El nombre comercial si lo hay; si no, el identificador de la tienda, que al menos se reconoce.
    tienda: dto.shopName ?? dto.shopHandle,
    proveedor: dto.supplierName,
    articulos: dto.itemCount ?? 0,
    totalFormateado: dto.totalFormatted,
    totalCentimos: dto.totalCents,
    moneda: dto.currency,
    realizadoEl: dto.placedAt,
  };
}

function aDireccion(dto: DireccionDto): DireccionDeEnvio {
  return {
    nombreCompleto: dto.fullName ?? '',
    linea1: dto.line1 ?? '',
    linea2: dto.line2,
    ciudad: dto.city ?? '',
    provincia: dto.region,
    codigoPostal: dto.postalCode,
    pais: dto.country ?? '',
    telefono: dto.phone,
    email: dto.email,
  };
}

function aLinea(dto: LineaDto, moneda: string | undefined): LineaDePedido {
  return {
    id: dto.id,
    titulo: dto.title,
    sku: dto.sku,
    variante: dto.variantName,
    imagenUrl: dto.imageUrl,
    origenUrl: dto.productSourceUrl,
    cantidad: dto.qty ?? 0,
    precioUnitarioFormateado: importeLegible(dto.unitPriceFormatted, dto.unitPriceCents, moneda),
    totalLineaFormateado: importeLegible(dto.lineTotalFormatted, dto.lineTotalCents, moneda),
  };
}

/** El origen solo distingue dos casos; cualquier otro valor se trata como plataforma propia. */
function aOrigen(valor: string | undefined): OrigenDePedido | undefined {
  if (!valor) {
    return undefined;
  }
  return valor === 'INTEGRATION' ? 'INTEGRATION' : 'PLATFORM';
}

export function aFicha(dto: FichaDePedidoDto): FichaDePedido {
  const moneda = dto.currency;
  return {
    ...aPedido(dto),
    origen: aOrigen(dto.source),
    notas: dto.notes,
    numeroDeSeguimiento: dto.trackingNumber,
    direccionDeEnvio: dto.shippingAddress ? aDireccion(dto.shippingAddress) : undefined,
    subtotalFormateado: importeLegible(dto.subtotalFormatted, dto.subtotalCents, moneda),
    // Envío e impuestos quedan SIN VALOR mientras no se hayan cotizado: un «0,00 €» de envío se lee
    // como envío gratis, que es una promesa distinta de «por calcular».
    envioFormateado: dto.shippingFormatted ?? (dto.shippingCents ? importeLegible(undefined, dto.shippingCents, moneda) : undefined),
    impuestosFormateado: dto.taxFormatted ?? (dto.taxCents ? importeLegible(undefined, dto.taxCents, moneda) : undefined),
    lineas: (dto.items ?? []).map((linea) => aLinea(linea, moneda)),
  };
}
