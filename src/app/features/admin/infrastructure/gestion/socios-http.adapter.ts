import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AltaDeClienteOauth, AplicacionDeSocio, ClienteOauth, EntregaDeWebhook, SecretoEmitido,
} from '../../domain/gestion/model/socios';
import { SociosPort } from '../../domain/gestion/port/socios.port';
import { sinCuerpo } from './sin-cuerpo';

/** Los nombres del backend vienen en serpiente porque salen de la tabla de clientes de OAuth. */
interface ClienteDto {
  id: string;
  client_id: string;
  client_name?: string;
  grant_types?: string;
  scopes?: string;
}

interface AplicacionDto {
  id: string;
  name: string;
  client_id: string;
  scopes?: string;
  webhook_url?: string;
  active?: boolean;
}

interface EntregaDto {
  id: string;
  event_type?: string;
  status?: string;
  attempt_count?: number;
  response_code?: number | null;
  created_at?: string;
}

interface SecretoDto {
  clientId: string;
  clientSecret: string;
  message?: string;
}

@Injectable()
export class SociosHttpAdapter implements SociosPort {
  private readonly api = inject(ApiService);

  async clientes(): Promise<Result<readonly ClienteOauth[], AppError>> {
    const respuesta = await this.api.get<ClienteDto[]>('/admin/partners/oauth-clients');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        identificador: dto.client_id,
        nombre: dto.client_name ?? dto.client_id,
        concesiones: dto.grant_types ?? '',
        permisos: dto.scopes ?? '',
      })),
    );
  }

  async aplicaciones(): Promise<Result<readonly AplicacionDeSocio[], AppError>> {
    const respuesta = await this.api.get<AplicacionDto[]>('/admin/partners/apps');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        nombre: dto.name,
        identificador: dto.client_id,
        permisos: dto.scopes ?? '',
        activa: dto.active ?? false,
        ...(dto.webhook_url ? { webhook: dto.webhook_url } : {}),
      })),
    );
  }

  async entregas(): Promise<Result<readonly EntregaDeWebhook[], AppError>> {
    const respuesta = await this.api.get<EntregaDto[]>('/admin/partners/webhooks');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        evento: dto.event_type ?? '',
        estado: dto.status ?? '',
        intentos: dto.attempt_count ?? 0,
        codigoDeRespuesta: dto.response_code ?? null,
        ...(dto.created_at ? { creadaEl: dto.created_at } : {}),
      })),
    );
  }

  async crea(alta: AltaDeClienteOauth): Promise<Result<SecretoEmitido, AppError>> {
    const respuesta = await this.api.post<SecretoDto>('/admin/partners/oauth-clients', {
      name: alta.nombre,
      scopes: alta.permisos,
    });
    return mapea(respuesta, (dto) => this.aSecreto(dto));
  }

  async rotaSecreto(identificador: string): Promise<Result<SecretoEmitido, AppError>> {
    const respuesta = await this.api.post<SecretoDto>(
      `/admin/partners/oauth-clients/${identificador}/rotate-secret`,
    );
    return mapea(respuesta, (dto) => this.aSecreto(dto));
  }

  borra(identificador: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/partners/oauth-clients/${identificador}`));
  }

  async pruebaWebhooks(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ queued?: number }>('/admin/partners/webhooks/test');
    return mapea(respuesta, (dto) => dto?.queued ?? 0);
  }

  private aSecreto(dto: SecretoDto): SecretoEmitido {
    return {
      identificador: dto.clientId,
      secreto: dto.clientSecret,
      ...(dto.message ? { mensaje: dto.message } : {}),
    };
  }
}
