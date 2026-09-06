import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AlertaDeTendencia,
  NuevaAlerta,
  ProductoGanador,
  TendenciaDeAnuncio,
} from '../domain/model/inteligencia';
import { AlertasDeTendenciaPort, TendenciasPort } from '../domain/port/inteligencia.port';

interface TendenciaDto {
  id: string;
  source: string;
  headline: string;
  productSlug?: string;
  impressions?: number;
  engagement?: number;
  score?: number;
  region?: string;
  capturedAt: string;
}

interface GanadorDto {
  slug: string;
  title: string;
  monthlySales: number;
  trendScore?: number;
  mainImage?: string;
  price?: number;
}

interface AlertaDto {
  id: string;
  keyword?: string;
  categoryId?: string;
  categoryName?: string;
  channel: string;
  thresholdScore?: number;
  active: boolean;
  createdAt: string;
}

function aTendencia(dto: TendenciaDto): TendenciaDeAnuncio {
  return {
    id: dto.id,
    fuente: dto.source,
    titular: dto.headline,
    slugDeProducto: dto.productSlug,
    impresiones: dto.impressions,
    interacciones: dto.engagement,
    puntuacion: dto.score,
    region: dto.region,
    capturadaEl: dto.capturedAt,
  };
}

function aGanador(dto: GanadorDto): ProductoGanador {
  return {
    slug: dto.slug,
    titulo: dto.title,
    ventasMensuales: Number(dto.monthlySales ?? 0),
    puntuacionDeTendencia: dto.trendScore,
    imagenPrincipal: dto.mainImage,
    precio: dto.price,
  };
}

function aAlerta(dto: AlertaDto): AlertaDeTendencia {
  return {
    id: dto.id,
    palabraClave: dto.keyword,
    idCategoria: dto.categoryId,
    nombreCategoria: dto.categoryName,
    canal: dto.channel,
    umbral: dto.thresholdScore,
    activa: dto.active,
    creadaEl: dto.createdAt,
  };
}

/** Tendencias y alertas, contra nuestro backend. */
@Injectable()
export class InteligenciaHttpAdapter implements TendenciasPort, AlertasDeTendenciaPort {
  private readonly api = inject(ApiService);

  async anuncios(
    fuente?: string,
    limite = 30,
  ): Promise<Result<readonly TendenciaDeAnuncio[], AppError>> {
    const respuesta = await this.api.get<TendenciaDto[]>('/me/intelligence/ad-trends', {
      source: fuente,
      limit: limite,
    });
    return mapea(respuesta, (filas) => filas.map(aTendencia));
  }

  /**
   * El idioma viaja como parámetro y no solo en la cabecera: estos endpoints devuelven títulos y
   * titulares ya traducidos, y sin el parámetro llegaban en español con la interfaz en cualquier otro.
   */
  async ventas(
    idioma: string,
    limite = 20,
  ): Promise<Result<readonly ProductoGanador[], AppError>> {
    const respuesta = await this.api.get<GanadorDto[]>('/me/intelligence/sales-trends', {
      limit: limite,
      lang: idioma,
    });
    return mapea(respuesta, (filas) => filas.map(aGanador));
  }

  async ganadores(
    idioma: string,
    limite = 20,
  ): Promise<Result<readonly ProductoGanador[], AppError>> {
    const respuesta = await this.api.get<GanadorDto[]>('/me/intelligence/winning-products', {
      limit: limite,
      lang: idioma,
    });
    return mapea(respuesta, (filas) => filas.map(aGanador));
  }

  async lista(): Promise<Result<readonly AlertaDeTendencia[], AppError>> {
    return mapea(await this.api.get<AlertaDto[]>('/me/intelligence/alerts'), (filas) =>
      filas.map(aAlerta),
    );
  }

  async crea(alerta: NuevaAlerta): Promise<Result<AlertaDeTendencia, AppError>> {
    const respuesta = await this.api.post<AlertaDto>('/me/intelligence/alerts', {
      keyword: alerta.palabraClave,
      categoryId: alerta.idCategoria,
      channel: alerta.canal,
      thresholdScore: alerta.umbral,
    });
    return mapea(respuesta, aAlerta);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/intelligence/alerts/${id}`), () => undefined);
  }
}
