import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  Cartera,
  ClaseDeMovimiento,
  MovimientoDeCartera,
  PaginaDeMovimientos,
} from '../domain/model/cartera';
import { CarteraPort } from '../domain/port/cartera.port';

interface CarteraDto {
  id: string;
  holdUsdCents: number;
  balanceDisplay: number;
  displayCurrency: string;
  displaySymbol: string;
  balanceFormatted?: string;
  balanceUsdFormatted?: string;
  holdUsdFormatted?: string;
}

interface MovimientoDto {
  id: string;
  kind: ClaseDeMovimiento;
  amountUsdCents: number;
  balanceAfterCents: number;
  description?: string;
  createdAt: string;
  amountFormatted?: string;
  balanceAfterFormatted?: string;
}

interface PaginaDto {
  items: MovimientoDto[];
  totalElements: number;
}

/**
 * Compone el respaldo de un importe SIN convertir nada.
 *
 * <p>Cuando el backend no manda la cadena formateada se arma con el símbolo y la cifra que él mismo
 * envía, en su misma moneda. Eso es dar forma, no calcular: aquí no se aplica ningún tipo de cambio, que
 * es lo que la norma del proyecto prohíbe.
 */
function conRespaldo(formateado: string | undefined, simbolo: string, cifra: number): string {
  return formateado ?? `${simbolo}${cifra.toFixed(2)}`;
}

function aMovimiento(dto: MovimientoDto): MovimientoDeCartera {
  const signo = dto.amountUsdCents >= 0 ? '+' : '';
  return {
    id: dto.id,
    clase: dto.kind,
    // El respaldo se escribe en dólares porque los céntimos que llegan SON dólares: la unidad canónica.
    importeFormateado: dto.amountFormatted ?? `${signo}$${(dto.amountUsdCents / 100).toFixed(2)}`,
    saldoPosteriorFormateado:
      dto.balanceAfterFormatted ?? `$${(dto.balanceAfterCents / 100).toFixed(2)}`,
    esEntrada: dto.amountUsdCents >= 0,
    descripcion: dto.description,
    creadoEl: dto.createdAt,
  };
}

/** La cartera contra nuestro backend. Se registra en `wallet.providers.ts`. */
@Injectable()
export class CarteraHttpAdapter implements CarteraPort {
  private readonly api = inject(ApiService);

  async consulta(): Promise<Result<Cartera, AppError>> {
    const respuesta = await this.api.get<CarteraDto>('/me/wallet');
    return mapea(respuesta, (dto) => ({
      id: dto.id,
      saldoFormateado: conRespaldo(dto.balanceFormatted, dto.displaySymbol, dto.balanceDisplay),
      divisaMostrada: dto.displayCurrency,
      saldoCanonicoFormateado: dto.balanceUsdFormatted ?? '',
      // Solo se enseña lo retenido si de verdad hay algo retenido: un «Retenido: 0,00 $» inquieta sin
      // motivo, y además hay carteras con una retención huérfana de los primeros días.
      retenidoFormateado: dto.holdUsdCents > 0 ? (dto.holdUsdFormatted ?? '') : '',
    }));
  }

  async movimientos(pagina: number, tamano: number): Promise<Result<PaginaDeMovimientos, AppError>> {
    const respuesta = await this.api.get<PaginaDto>('/me/wallet/transactions', {
      page: pagina,
      size: tamano,
    });
    return mapea(respuesta, (dto) => ({
      movimientos: (dto.items ?? []).map(aMovimiento),
      total: dto.totalElements ?? 0,
    }));
  }
}
