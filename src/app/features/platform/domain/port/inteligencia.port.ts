import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import {
  AlertaDeTendencia,
  NuevaAlerta,
  ProductoGanador,
  TendenciaDeAnuncio,
} from '../model/inteligencia';

/**
 * Lo que se está anunciando y lo que se está vendiendo. Solo LECTURA.
 *
 * <p>Separado de las alertas porque son dos cosas distintas: esto se mira, y aquello se configura. Una
 * pantalla que solo enseña tendencias no tiene por qué poder crear ni borrar nada.
 */
export interface TendenciasPort {
  anuncios(fuente?: string, limite?: number): Promise<Result<readonly TendenciaDeAnuncio[], AppError>>;
  /** Lo más vendido, en el idioma pedido: los títulos vienen ya traducidos del backend. */
  ventas(idioma: string, limite?: number): Promise<Result<readonly ProductoGanador[], AppError>>;
  ganadores(idioma: string, limite?: number): Promise<Result<readonly ProductoGanador[], AppError>>;
}

export const TENDENCIAS_PORT = new InjectionToken<TendenciasPort>('TendenciasPort');

/** Las alertas propias: avisar cuando algo supere un umbral. Es ESCRITURA, y por eso va aparte. */
export interface AlertasDeTendenciaPort {
  lista(): Promise<Result<readonly AlertaDeTendencia[], AppError>>;
  crea(alerta: NuevaAlerta): Promise<Result<AlertaDeTendencia, AppError>>;
  elimina(id: string): Promise<Result<void, AppError>>;
}

export const ALERTAS_DE_TENDENCIA_PORT = new InjectionToken<AlertasDeTendenciaPort>(
  'AlertasDeTendenciaPort',
);
