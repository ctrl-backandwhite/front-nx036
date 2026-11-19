import {
  BultoDePedido,
  DireccionDeEnvio,
  FichaDePedido,
  LineaDePedido,
  MotivoDelCanal,
  OrigenDePedido,
  TipoDeLineaDeCanal,
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
  shippingCarrier?: string;
  shippingChannelCode?: string;
  canalAdmisible?: boolean;
  canalMotivo?: string;
}

interface BultoDto {
  sequenceNo?: number;
  carrier?: string;
  productCode?: string;
  trackingNumber?: string;
  waybillNumber?: string;
  status?: string;
  weightGrams?: number;
  declaredValueCents?: number;
  coincideConElCanal?: boolean;
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
  shippingCarrierName?: string;
  shippingChannelName?: string;
  shippingLineType?: string;
  canalDetalle?: string;
  shipments?: BultoDto[];
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
    transportista: dto.shippingCarrier,
    canalDeEnvio: dto.shippingChannelCode,
    canalAdmisible: dto.canalAdmisible,
    motivoDelCanal: aMotivo(dto.canalMotivo),
  };
}

const MOTIVOS: Readonly<Record<string, MotivoDelCanal>> = {
  SIN_TRANSPORTISTA: 'sin-transportista',
  SIN_CANAL: 'sin-canal',
  TRANSPORTISTA_DISTINTO: 'transportista-distinto',
  PRODUCTO_NO_LOCALIZABLE: 'producto-no-localizable',
  MERCANCIA_NO_ADMITIDA: 'mercancia-no-admitida',
  VALOR_FUERA_DEL_TOPE: 'valor-fuera-del-tope',
};

/** Un motivo nuevo del servidor no se pierde: llega como `desconocido` y se avisa igual. */
function aMotivo(valor: string | undefined): MotivoDelCanal | undefined {
  return valor ? (MOTIVOS[valor] ?? 'desconocido') : undefined;
}

const TIPOS_DE_LINEA: Readonly<Record<string, TipoDeLineaDeCanal>> = {
  ROPA: 'ropa',
  GENERAL: 'general',
  CON_BATERIA: 'con-bateria',
  DESCONOCIDA: 'desconocida',
};

function aBulto(dto: BultoDto): BultoDePedido {
  return {
    numero: dto.sequenceNo ?? 0,
    transportista: dto.carrier,
    canalEmitido: dto.productCode,
    numeroDeSeguimiento: dto.trackingNumber,
    numeroDeGuia: dto.waybillNumber,
    estado: dto.status,
    pesoEnGramos: dto.weightGrams,
    coincideConElCanal: dto.coincideConElCanal,
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
    // El nombre visible si el servidor lo manda; si no, el identificador, que al menos se reconoce.
    nombreDelTransportista: dto.shippingCarrierName ?? dto.shippingCarrier,
    nombreDelCanal: dto.shippingChannelName,
    tipoDeLinea: dto.shippingLineType ? (TIPOS_DE_LINEA[dto.shippingLineType] ?? 'desconocida') : undefined,
    detalleDelCanal: dto.canalDetalle,
    bultos: (dto.shipments ?? []).map(aBulto),
    direccionDeEnvio: dto.shippingAddress ? aDireccion(dto.shippingAddress) : undefined,
    subtotalFormateado: importeLegible(dto.subtotalFormatted, dto.subtotalCents, moneda),
    // Envío e impuestos quedan SIN VALOR mientras no se hayan cotizado: un «0,00 €» de envío se lee
    // como envío gratis, que es una promesa distinta de «por calcular».
    envioFormateado: dto.shippingFormatted ?? (dto.shippingCents ? importeLegible(undefined, dto.shippingCents, moneda) : undefined),
    impuestosFormateado: dto.taxFormatted ?? (dto.taxCents ? importeLegible(undefined, dto.taxCents, moneda) : undefined),
    lineas: (dto.items ?? []).map((linea) => aLinea(linea, moneda)),
  };
}
