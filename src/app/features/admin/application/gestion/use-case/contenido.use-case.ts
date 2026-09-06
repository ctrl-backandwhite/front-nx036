import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  BorradorDeCurso, BorradorDeMentor, Curso, Mentor, ResumenDelBoletin,
  mentorValido, separaPorComas,
} from '../../../domain/gestion/model/contenido';
import {
  BOLETIN_PORT, CURSOS_PORT, MENTORES_PORT,
} from '../../../domain/gestion/port/contenido.port';

@Injectable()
export class ConsultaElBoletin {
  private readonly boletin = inject(BOLETIN_PORT);

  ejecuta(): Promise<Result<ResumenDelBoletin, AppError>> {
    return this.boletin.resumen();
  }
}

/**
 * Manda el boletín.
 *
 * <p>Sale UN correo por cada suscriptor y no hay vuelta atrás, así que la pantalla pide confirmación
 * antes de llegar aquí. Este caso de uso comprueba lo mínimo —que hay asunto y cuerpo— para que el
 * envío nunca salga en blanco por un fallo de la interfaz.
 */
@Injectable()
export class EnviaElBoletin {
  private readonly boletin = inject(BOLETIN_PORT);

  ejecuta(asunto: string, cuerpo: string): Promise<Result<number, AppError>> {
    if (!asunto.trim() || !cuerpo.trim()) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.boletin.envia(asunto.trim(), cuerpo.trim());
  }
}

@Injectable()
export class ConsultaCursos {
  private readonly cursos = inject(CURSOS_PORT);

  ejecuta(): Promise<Result<readonly Curso[], AppError>> {
    return this.cursos.lista();
  }
}

@Injectable()
export class GuardaElCurso {
  private readonly cursos = inject(CURSOS_PORT);

  ejecuta(curso: BorradorDeCurso): Promise<Result<void, AppError>> {
    if (!curso.titulo.trim()) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return curso.id ? this.cursos.actualiza(curso.id, curso) : this.cursos.crea(curso);
  }
}

/** El backend se NIEGA si el curso tiene alumnos matriculados: ese fallo hay que enseñarlo. */
@Injectable()
export class BorraElCurso {
  private readonly cursos = inject(CURSOS_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.cursos.borra(id);
  }
}

@Injectable()
export class ConsultaMentores {
  private readonly mentores = inject(MENTORES_PORT);

  ejecuta(): Promise<Result<readonly Mentor[], AppError>> {
    return this.mentores.lista();
  }
}

/**
 * Guarda un mentor.
 *
 * <p>Aquí se traduce el formulario al modelo: especialidades e idiomas se teclean separados por comas
 * —es lo natural— y se parten antes de salir. Que lo hiciera la pantalla dejaría esa conversión
 * repetida en el alta y en la edición.
 */
@Injectable()
export class GuardaElMentor {
  private readonly mentores = inject(MENTORES_PORT);

  ejecuta(borrador: BorradorDeMentor): Promise<Result<void, AppError>> {
    if (!mentorValido(borrador)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    const mentor = {
      emailUsuario: borrador.emailUsuario.trim(),
      titular: borrador.titular.trim(),
      biografia: borrador.biografia,
      zonaHoraria: borrador.zonaHoraria,
      tarifaUsdHora: borrador.tarifaUsdHora ? Number(borrador.tarifaUsdHora) : 0,
      especialidades: separaPorComas(borrador.especialidades),
      idiomas: separaPorComas(borrador.idiomas),
      activo: borrador.activo,
    };
    return borrador.id ? this.mentores.actualiza(borrador.id, mentor) : this.mentores.crea(mentor);
  }
}

/** El backend se NIEGA si el mentor tiene sesiones reservadas. */
@Injectable()
export class BorraElMentor {
  private readonly mentores = inject(MENTORES_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.mentores.borra(id);
  }
}
