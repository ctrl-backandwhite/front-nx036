import { InjectionToken } from '@angular/core';
import { Result } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BorradorDeCurso, Curso, Mentor, ResumenDelBoletin } from '../model/contenido';

/** El boletín: cuántos lo reciben, qué se ha mandado y mandar uno nuevo. */
export interface BoletinPort {
  resumen(): Promise<Result<ResumenDelBoletin, AppError>>;
  /** Manda el boletín a todos los suscriptores. Devuelve a cuántos llegó. */
  envia(asunto: string, cuerpoHtml: string): Promise<Result<number, AppError>>;
}

export const BOLETIN_PORT = new InjectionToken<BoletinPort>('BoletinPort');

/** Los cursos de la academia. */
export interface CursosPort {
  lista(): Promise<Result<readonly Curso[], AppError>>;
  crea(curso: BorradorDeCurso): Promise<Result<void, AppError>>;
  actualiza(id: string, curso: BorradorDeCurso): Promise<Result<void, AppError>>;
  /** El backend se NIEGA si el curso tiene alumnos matriculados: llega como fallo, no como silencio. */
  borra(id: string): Promise<Result<void, AppError>>;
}

export const CURSOS_PORT = new InjectionToken<CursosPort>('CursosPort');

/** Lo que se manda al crear o editar un mentor, ya con las listas partidas. */
export interface MentorParaGuardar {
  readonly emailUsuario: string;
  readonly titular: string;
  readonly biografia: string;
  readonly zonaHoraria: string;
  readonly tarifaUsdHora: number;
  readonly especialidades: readonly string[];
  readonly idiomas: readonly string[];
  readonly activo: boolean;
}

/** Los mentores. Cada uno va atado a una cuenta por su correo. */
export interface MentoresPort {
  lista(): Promise<Result<readonly Mentor[], AppError>>;
  crea(mentor: MentorParaGuardar): Promise<Result<void, AppError>>;
  actualiza(id: string, mentor: MentorParaGuardar): Promise<Result<void, AppError>>;
  /** El backend se NIEGA si el mentor tiene sesiones reservadas. */
  borra(id: string): Promise<Result<void, AppError>>;
}

export const MENTORES_PORT = new InjectionToken<MentoresPort>('MentoresPort');
