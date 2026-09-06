import { Pagina, ResultadoMasivo } from '../../domain/gestion/model/pagina';

/** La forma paginada del backend. Se declara UNA vez porque la comparten todos los listados del panel. */
export interface PaginaDto<T> {
  items?: T[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
}

export function aPagina<D, T>(dto: PaginaDto<D>, traduce: (d: D) => T): Pagina<T> {
  return {
    elementos: (dto?.items ?? []).map(traduce),
    total: dto?.totalElements ?? 0,
    paginas: dto?.totalPages ?? 1,
    pagina: dto?.page ?? 0,
  };
}

export interface ResultadoMasivoDto {
  succeeded?: number;
  failed?: number;
  errors?: string[];
}

export function aResultadoMasivo(dto: ResultadoMasivoDto): ResultadoMasivo {
  return {
    correctos: dto?.succeeded ?? 0,
    fallidos: dto?.failed ?? 0,
    errores: dto?.errors ?? [],
  };
}
