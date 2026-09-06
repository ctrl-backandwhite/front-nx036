import { Injectable, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Result, mapea } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { BorradorDeCurso, Curso, Mentor, ResumenDelBoletin } from '../../domain/gestion/model/contenido';
import {
  BoletinPort, CursosPort, MentorParaGuardar, MentoresPort,
} from '../../domain/gestion/port/contenido.port';
import { sinCuerpo } from './sin-cuerpo';

interface BoletinDto {
  subscribers?: number;
  campaigns?: { id: string; subject: string; recipients?: number; status?: string; createdAt?: string }[];
}

@Injectable()
export class BoletinHttpAdapter implements BoletinPort {
  private readonly api = inject(ApiService);

  async resumen(): Promise<Result<ResumenDelBoletin, AppError>> {
    const respuesta = await this.api.get<BoletinDto>('/admin/newsletter');
    return mapea(respuesta, (dto) => ({
      suscriptores: dto?.subscribers ?? 0,
      campanas: (dto?.campaigns ?? []).map((c) => ({
        id: c.id,
        asunto: c.subject,
        destinatarios: c.recipients ?? 0,
        estado: c.status ?? '',
        ...(c.createdAt ? { creadaEl: c.createdAt } : {}),
      })),
    }));
  }

  async envia(asunto: string, cuerpoHtml: string): Promise<Result<number, AppError>> {
    const respuesta = await this.api.post<{ recipients?: number }>('/admin/newsletter/send', {
      subject: asunto,
      bodyHtml: cuerpoHtml,
    });
    return mapea(respuesta, (dto) => dto?.recipients ?? 0);
  }
}

interface CursoDto {
  id: string;
  title?: string;
  description?: string;
  instructor?: string;
  durationMinutes?: number;
  coverUrl?: string;
  videoUrl?: string;
  locale?: string;
  level?: string;
  published?: boolean;
}

function aCuerpoDeCurso(curso: BorradorDeCurso): Record<string, unknown> {
  return {
    title: curso.titulo,
    description: curso.descripcion,
    instructor: curso.instructor,
    // Una duración vacía se manda como ausente, no como cero: cero minutos es un dato, «no lo sé» no.
    durationMinutes: curso.duracionMinutos ? Number(curso.duracionMinutos) : undefined,
    coverUrl: curso.portadaUrl,
    videoUrl: curso.videoUrl,
    locale: curso.idioma,
    level: curso.nivel,
    published: curso.publicado,
  };
}

@Injectable()
export class CursosHttpAdapter implements CursosPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Curso[], AppError>> {
    const respuesta = await this.api.get<CursoDto[]>('/admin/academy/courses');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        titulo: dto.title ?? '',
        descripcion: dto.description ?? '',
        instructor: dto.instructor ?? '',
        portadaUrl: dto.coverUrl ?? '',
        videoUrl: dto.videoUrl ?? '',
        idioma: dto.locale ?? 'es',
        nivel: dto.level ?? 'BEGINNER',
        publicado: dto.published ?? false,
        ...(dto.durationMinutes != null ? { duracionMinutos: dto.durationMinutes } : {}),
      })),
    );
  }

  crea(curso: BorradorDeCurso): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/admin/academy/courses', aCuerpoDeCurso(curso)));
  }

  actualiza(id: string, curso: BorradorDeCurso): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/academy/courses/${id}`, aCuerpoDeCurso(curso)));
  }

  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/academy/courses/${id}`));
  }
}

interface MentorDto {
  id: string;
  userEmail?: string;
  name?: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  timezone?: string;
  hourlyRateUsd?: number;
  expertise?: string[];
  languages?: string[];
  active?: boolean;
}

function aCuerpoDeMentor(mentor: MentorParaGuardar): Record<string, unknown> {
  return {
    userEmail: mentor.emailUsuario,
    headline: mentor.titular,
    bio: mentor.biografia,
    timezone: mentor.zonaHoraria,
    hourlyRateUsd: mentor.tarifaUsdHora,
    expertise: mentor.especialidades,
    languages: mentor.idiomas,
    active: mentor.activo,
  };
}

@Injectable()
export class MentoresHttpAdapter implements MentoresPort {
  private readonly api = inject(ApiService);

  async lista(): Promise<Result<readonly Mentor[], AppError>> {
    const respuesta = await this.api.get<MentorDto[]>('/admin/mentors');
    return mapea(respuesta, (lista) =>
      (lista ?? []).map((dto) => ({
        id: dto.id,
        emailUsuario: dto.userEmail ?? '',
        nombre: dto.name ?? '',
        titular: dto.headline ?? '',
        biografia: dto.bio ?? '',
        zonaHoraria: dto.timezone ?? '',
        tarifaUsdHora: dto.hourlyRateUsd ?? 0,
        especialidades: dto.expertise ?? [],
        idiomas: dto.languages ?? [],
        activo: dto.active ?? false,
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      })),
    );
  }

  crea(mentor: MentorParaGuardar): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.post('/admin/mentors', aCuerpoDeMentor(mentor)));
  }

  actualiza(id: string, mentor: MentorParaGuardar): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.put(`/admin/mentors/${id}`, aCuerpoDeMentor(mentor)));
  }

  borra(id: string): Promise<Result<void, AppError>> {
    return sinCuerpo(this.api.delete(`/admin/mentors/${id}`));
  }
}
