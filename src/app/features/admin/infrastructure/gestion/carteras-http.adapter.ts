import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { Pagina } from '../../domain/gestion/model/pagina';
import {
  Ajuste, Deposito, DetalleDeCartera, FiltroDeCarteras, MovimientoDeCartera, ResumenDeCartera,
} from '../../domain/gestion/model/carteras';
import { CarterasPort } from '../../domain/gestion/port/carteras.port';
import { PaginaDto, aPagina } from './pagina.dto';
import { sinCuerpo } from './sin-cuerpo';

interface CarteraDto {
  id: string;
  userId: string;
  email: string;
  name?: string;
  balanceUsd?: number | string;
  holdUsd?: number | string;
  availableUsd?: number | string;
  currency?: string;
  status?: string;
}

interface MovimientoDto {
  id: string;
  kind?: string;
  amountCents?: number;
  balanceAfterCents?: number;
  description?: string | null;
  orderId?: string | null;
  createdAt: string;
}

function aResumen(dto: CarteraDto): ResumenDeCartera {
  return {
    id: dto.id,
    idUsuario: dto.userId,
    email: dto.email,
    ...(dto.name ? { nombre: dto.name } : {}),
    // Los saldos pueden llegar como texto (decimal serializado). `Number` de una cadena vacía da cero,
    // que es lo correcto aquí; lo que no puede pasar es que llegue `NaN` a la pantalla.
    saldoUsd: Number(dto.balanceUsd ?? 0) || 0,
    retenidoUsd: Number(dto.holdUsd ?? 0) || 0,
    estado: dto.status ?? 'ACTIVE',
  };
}

function aMovimiento(dto: MovimientoDto): MovimientoDeCartera {
  return {
    id: dto.id,
    clase: dto.kind ?? '',
    importeCentimos: dto.amountCents ?? 0,
    saldoResultanteCentimos: dto.balanceAfterCents ?? 0,
    descripcion: dto.description ?? null,
    idPedido: dto.orderId ?? null,
    creadoEl: dto.createdAt,
  };
}

@Injectable()
export class CarterasHttpAdapter implements CarterasPort {
  private readonly api = inject(ApiService);

  async busca(filtro: FiltroDeCarteras): Promise<Result<Pagina<ResumenDeCartera>, AppError>> {
    const respuesta = await this.api.get<PaginaDto<CarteraDto>>('/admin/wallets', {
      q: filtro.texto ?? '',
      status: filtro.estado ?? '',
      currency: filtro.divisa ?? '',
      page: filtro.pagina,
      size: filtro.tamano,
    });
    return mapea(respuesta, (dto) => aPagina(dto, aResumen));
  }

  async detalle(idUsuario: string): Promise<Result<DetalleDeCartera, AppError>> {
    const respuesta = await this.api.get<CarteraDto>(`/admin/wallets/${idUsuario}`);
    return mapea(respuesta, (dto) => ({
      ...aResumen(dto),
      disponibleUsd: Number(dto.availableUsd ?? 0) || 0,
      divisa: dto.currency ?? 'USD',
    }));
  }

  async movimientos(
    idCartera: string,
    pagina: number,
    tamano: number,
  ): Promise<Result<Pagina<MovimientoDeCartera>, AppError>> {
    const respuesta = await this.api.get<PaginaDto<MovimientoDto>>(
      `/admin/wallets/${idCartera}/transactions`,
      { page: pagina, size: tamano },
    );
    return mapea(respuesta, (dto) => aPagina(dto, aMovimiento));
  }

  deposita(deposito: Deposito): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.post(`/admin/wallets/${deposito.idUsuario}/topup`, {
        amountCents: deposito.importeCentimos,
        description: deposito.descripcion,
      }),
    );
  }

  ajusta(ajuste: Ajuste): Promise<Result<void, AppError>> {
    return sinCuerpo(
      this.api.post(`/admin/wallets/${ajuste.idUsuario}/adjust`, {
        amountCents: ajuste.importeCentimos,
        description: ajuste.descripcion,
      }),
    );
  }

  async reindexa(): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ indexed?: number }>('/admin/wallets/reindex');
    return mapea(respuesta, (dto) => dto?.indexed ?? 0);
  }
}
