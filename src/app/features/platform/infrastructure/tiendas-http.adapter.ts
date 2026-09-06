import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { PlataformaDeTienda, SolicitudDeConexion, TiendaConectada } from '../domain/model/tienda';
import { PlataformasDeTiendaPort, TiendasConectadasPort } from '../domain/port/tiendas.port';

/** La forma en que el BACKEND habla. Vive aquí y no sale de este fichero. */
interface TiendaDto {
  id: string;
  platform: string;
  shopHandle: string;
  status: string;
  lastSyncAt?: string;
  lastSyncMessage?: string;
  lastSyncError?: string;
  createdAt: string;
  listings: number;
}

interface PlataformaDto {
  code: string;
  label: string;
  available: boolean;
}

function aTienda(dto: TiendaDto): TiendaConectada {
  return {
    id: dto.id,
    plataforma: dto.platform,
    identificador: dto.shopHandle,
    estado: dto.status,
    ultimaSincronizacion: dto.lastSyncAt,
    mensajeDeSincronizacion: dto.lastSyncMessage,
    errorDeSincronizacion: dto.lastSyncError,
    creadaEl: dto.createdAt,
    // Sin el respaldo, una tienda recién conectada —que el backend devuelve sin la cuenta— pintaba
    // «undefined publicaciones» en la tarjeta.
    publicaciones: dto.listings ?? 0,
  };
}

/**
 * Las tiendas conectadas, contra nuestro backend.
 *
 * <p>Solo el puerto de tiendas conectadas. El catálogo de plataformas es OTRA clase, unas líneas más
 * abajo: los dos puertos declaran un método `lista()` y, si los cumpliera la misma clase, uno de los
 * dos tendría que cambiar de nombre para no chocar. Que el contrato mande sobre la implementación —y
 * no al revés— es justamente lo que se busca.
 *
 * <p>No lleva `providedIn: 'root'`: se registra en `platform.providers.ts`.
 */
@Injectable()
export class TiendasHttpAdapter implements TiendasConectadasPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly TiendaConectada[], AppError>> {
    return mapea(await this.api.get<TiendaDto[]>('/me/shops'), (filas) => filas.map(aTienda));
  }

  async conecta(solicitud: SolicitudDeConexion): Promise<Result<TiendaConectada, AppError>> {
    const respuesta = await this.api.post<TiendaDto>('/me/shops', {
      platform: solicitud.plataforma,
      shopHandle: solicitud.identificador,
      // Vacío se manda como ausente: hay plataformas que no piden token y un `""` las hacía fallar.
      accessToken: solicitud.token || undefined,
    });
    return mapea(respuesta, aTienda);
  }

  async sincroniza(id: string): Promise<Result<TiendaConectada, AppError>> {
    return mapea(await this.api.post<TiendaDto>(`/me/shops/${id}/sync`), aTienda);
  }

  async desconecta(id: string): Promise<Result<void, AppError>> {
    return mapea(await this.api.delete<void>(`/me/shops/${id}`), () => undefined);
  }
}

/**
 * El catálogo de plataformas conectables.
 *
 * <p>Clase aparte porque su puerto también lo es: quien solo pinta el mosaico no debe poder desconectar
 * una tienda ni por accidente al inyectar el token equivocado.
 */
@Injectable()
export class PlataformasDeTiendaHttpAdapter implements PlataformasDeTiendaPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly PlataformaDeTienda[], AppError>> {
    return mapea(await this.api.get<PlataformaDto[]>('/me/shops/platforms'), (filas) =>
      filas.map((dto) => ({
        codigo: dto.code,
        etiqueta: dto.label,
        // Si el backend no lo dice, se asume NO disponible. Al revés, la pantalla ofrecería conectar
        // integraciones que todavía no existen y el fallo aparecería al pegar el token.
        disponible: dto.available === true,
      })),
    );
  }
}
