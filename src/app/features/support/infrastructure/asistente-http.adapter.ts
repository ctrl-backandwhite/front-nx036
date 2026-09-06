import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { MotivoSinRespuesta, RespuestaDelAsistente } from '../domain/model/conversacion';
import { LineaDeCesta, MotivoDeSugerencia, SugerenciasDeLaCesta } from '../domain/model/cesta';
import { AsistentePort, SugerenciasDeCestaPort } from '../domain/port/asistente.port';

/** La forma en que habla el BACKEND. Vive aquí y no sale de este fichero. */
interface RespuestaDto {
  conversationId: string;
  reply: string | null;
  products: { slug: string; title?: string; image?: string }[];
  degraded: boolean;
  reason?: MotivoSinRespuesta;
  searchQuery?: string | null;
  searchTotal?: number;
}

interface SugerenciaDto {
  id: string;
  slug: string;
  title: string;
  image?: string;
  dutyExtraFormatted?: string | null;
  shippingExtraFormatted?: string | null;
  shippingAloneFormatted?: string | null;
  motivo?: MotivoDeSugerencia;
}

interface SugerenciasDto {
  items: SugerenciaDto[];
  gramosLibres?: number | null;
  otroBultoFormatted?: string | null;
}

/**
 * El asistente contra nuestro backend: la conversación y las sugerencias para la cesta.
 *
 * <p>Los dos puertos se resuelven contra el mismo servicio, así que comparten adaptador. Los importes
 * llegan ya FORMATEADOS por el servidor y se copian tal cual: recomponerlos aquí es exactamente cómo se
 * acaba enseñando una cifra que no coincide con la del carrito.
 */
@Injectable()
export class AsistenteHttpAdapter implements AsistentePort, SugerenciasDeCestaPort {
  private readonly api = inject(ApiService);

  async pregunta(
    mensaje: string,
    idConversacion: string | null,
    idioma: string,
  ): Promise<Result<RespuestaDelAsistente, AppError>> {
    const respuesta = await this.api.post<RespuestaDto>('/chat', {
      message: mensaje,
      conversationId: idConversacion,
      lang: idioma,
    });
    return mapea(respuesta, (r) => ({
      idConversacion: r.conversationId,
      texto: r.reply,
      productos: (r.products ?? []).map((p) => ({
        slug: p.slug,
        titulo: p.title,
        imagen: p.image,
      })),
      degradada: !!r.degraded,
      motivo: r.reason,
      ...(r.searchQuery
        ? { busqueda: { consulta: r.searchQuery, total: r.searchTotal ?? 0 } }
        : {}),
    }));
  }

  async consulta(
    lineas: readonly LineaDeCesta[],
    idioma: string,
  ): Promise<Result<SugerenciasDeLaCesta, AppError>> {
    const respuesta = await this.api.post<SugerenciasDto>('/catalog/cart-suggestions', {
      items: lineas.map((l) => ({
        productId: l.idProducto,
        variantId: l.idVariante,
        quantity: l.cantidad,
      })),
      lang: idioma,
    });
    return mapea(respuesta, (r) => ({
      items: (r.items ?? []).map((s) => ({
        id: s.id,
        slug: s.slug,
        titulo: s.title,
        imagen: s.image,
        motivo: s.motivo,
        arancelExtra: s.dutyExtraFormatted,
        envioExtra: s.shippingExtraFormatted,
        envioSuelto: s.shippingAloneFormatted,
      })),
      hueco:
        r.gramosLibres && r.gramosLibres > 0
          ? { gramos: r.gramosLibres, otroBulto: r.otroBultoFormatted }
          : null,
    }));
  }
}
