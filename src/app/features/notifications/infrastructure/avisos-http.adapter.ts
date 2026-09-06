import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Aviso, Carpeta, EstadoDeGestion } from '../domain/model/aviso';
import { BuzonPort, Difusion, DifusionDeAvisosPort, GestionDeAvisosPort, RespuestaDeContacto } from '../domain/port/avisos.port';

/** La forma en que habla el BACKEND. Vive aquí y no sale de este fichero. */
interface AvisoDto {
  id: string;
  eventType: string;
  title: string;
  body?: string;
  channel: string;
  payload?: Record<string, unknown>;
  readAt?: string | null;
  status?: string;
  createdAt: string;
}

function aAviso(dto: AvisoDto): Aviso {
  return {
    id: dto.id,
    tipoDeSuceso: dto.eventType,
    titulo: dto.title,
    cuerpo: dto.body,
    canal: dto.channel,
    datos: dto.payload,
    leidoEl: dto.readAt,
    estado: dto.status,
    creadoEl: dto.createdAt,
  };
}

/**
 * El buzón contra nuestro backend.
 *
 * <p>Todo cuelga de `/me/notifications`, incluido lo que ve el personal de la casa. NO se usa
 * `/admin/notifications`: cuando la campana leía de una ruta y la página de la otra, el resultado era un
 * contador con dos avisos sobre una pantalla que decía «sin notificaciones». Un solo origen para los
 * dos, y el backend decide qué se ve según quién pregunta.
 *
 * <p>Implementa DOS puertos —leer y gestionar— porque los dos se resuelven contra el mismo servicio.
 * Quien los consume sigue viendo dos contratos pequeños y puede sustituir el que necesite.
 */
@Injectable()
export class AvisosHttpAdapter implements BuzonPort, GestionDeAvisosPort {
  private readonly api = inject(ApiService);

  async lista(carpeta: Carpeta): Promise<Result<readonly Aviso[], AppError>> {
    const respuesta = await this.api.get<AvisoDto[]>('/me/notifications', { folder: carpeta });
    return mapea(respuesta, (avisos) => (avisos ?? []).map(aAviso));
  }

  async sinLeer(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.get<{ count: number }>('/me/notifications/unread-count');
    return mapea(respuesta, (r) => r?.count ?? 0);
  }

  async marcaLeido(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.post<void>(`/me/notifications/${id}/read`));
  }

  async marcaTodosLeidos(): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.post<void>('/me/notifications/read-all'));
  }

  async archiva(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.post<void>(`/me/notifications/${id}/archive`));
  }

  async desarchiva(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.post<void>(`/me/notifications/${id}/unarchive`));
  }

  async aLaPapelera(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.delete<void>(`/me/notifications/${id}`));
  }

  async restaura(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.post<void>(`/me/notifications/${id}/restore`));
  }

  async borraParaSiempre(id: string): Promise<Result<void, AppError>> {
    return this.sinValor(this.api.delete<void>(`/me/notifications/${id}/permanent`));
  }

  async cambiaEstado(id: string, estado: EstadoDeGestion): Promise<Result<void, AppError>> {
    // El estado viaja como parámetro de consulta, que es como lo espera el backend. Se codifica
    // aunque hoy sea un valor de una lista cerrada: la frontera no da nada por supuesto.
    const valor = encodeURIComponent(estado);
    return this.sinValor(this.api.post<void>(`/me/notifications/${id}/status?value=${valor}`));
  }

  private async sinValor(promesa: Promise<Result<unknown, AppError>>): Promise<Result<void, AppError>> {
    return mapea(await promesa, () => undefined);
  }
}

/**
 * Mandar avisos y contestar por correo. Son rutas del PANEL, y por eso van en su propio adaptador: el
 * escaparate no lo registra siquiera.
 */
@Injectable()
export class DifusionHttpAdapter implements DifusionDeAvisosPort {
  private readonly api = inject(ApiService);

  async envia(difusion: Difusion): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ sent: number }>('/admin/notifications/send', {
      target: difusion.destino,
      title: difusion.titulo,
      body: difusion.cuerpo,
    });
    return mapea(respuesta, (r) => r?.sent ?? 0);
  }

  async responde(respuesta: RespuestaDeContacto): Promise<Result<void, AppError>> {
    const enviado = await this.api.post<{ sent: boolean }>('/admin/contact/reply', {
      email: respuesta.email,
      subject: respuesta.asunto,
      message: respuesta.mensaje,
    });
    return mapea(enviado, () => undefined);
  }
}
