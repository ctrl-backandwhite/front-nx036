/**
 * Contenido que se administra desde el panel: boletín, cursos de la academia y mentores.
 *
 * <p>Van juntos porque comparten forma —listar, crear, editar, borrar— y ninguno tiene reglas de
 * negocio propias más allá de lo obvio. Partirlos en tres ficheros de veinte líneas no aclararía nada.
 */

export interface ResumenDelBoletin {
  readonly suscriptores: number;
  readonly campanas: readonly CampanaDelBoletin[];
}

export interface CampanaDelBoletin {
  readonly id: string;
  readonly asunto: string;
  readonly destinatarios: number;
  readonly estado: string;
  readonly creadaEl?: string;
}

/** Un envío solo sale si tiene asunto, cuerpo y alguien a quien mandárselo. */
export function envioValido(asunto: string, cuerpo: string, suscriptores: number): boolean {
  return asunto.trim().length > 0 && cuerpo.trim().length > 0 && suscriptores > 0;
}

export type NivelDeCurso = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const NIVELES: readonly NivelDeCurso[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export interface Curso {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly instructor: string;
  readonly duracionMinutos?: number;
  readonly portadaUrl: string;
  readonly videoUrl: string;
  readonly idioma: string;
  readonly nivel: string;
  readonly publicado: boolean;
}

/** El borrador de un curso: sin identificador mientras no se haya guardado. */
export type BorradorDeCurso = Omit<Curso, 'id'> & { id?: string };

export function cursoEnBlanco(): BorradorDeCurso {
  return {
    titulo: '', descripcion: '', instructor: '', portadaUrl: '', videoUrl: '',
    idioma: 'es', nivel: 'BEGINNER', publicado: true,
  };
}

export interface Mentor {
  readonly id: string;
  readonly emailUsuario: string;
  readonly nombre: string;
  readonly avatarUrl?: string;
  readonly titular: string;
  readonly biografia: string;
  readonly zonaHoraria: string;
  readonly tarifaUsdHora: number;
  readonly especialidades: readonly string[];
  readonly idiomas: readonly string[];
  readonly activo: boolean;
}

/**
 * El borrador de un mentor.
 *
 * <p>Especialidades e idiomas se teclean como texto separado por comas —es lo natural en un formulario—
 * y se parten al guardar. El correo solo se pide al crear: un mentor va atado a una cuenta y cambiarla
 * después sería crear otro mentor.
 */
export interface BorradorDeMentor {
  id?: string;
  emailUsuario: string;
  titular: string;
  biografia: string;
  zonaHoraria: string;
  tarifaUsdHora: string;
  especialidades: string;
  idiomas: string;
  activo: boolean;
}

export function mentorEnBlanco(): BorradorDeMentor {
  return {
    emailUsuario: '', titular: '', biografia: '', zonaHoraria: '',
    tarifaUsdHora: '', especialidades: '', idiomas: '', activo: true,
  };
}

export function mentorAFormulario(mentor: Mentor): BorradorDeMentor {
  return {
    id: mentor.id,
    emailUsuario: mentor.emailUsuario,
    titular: mentor.titular,
    biografia: mentor.biografia,
    zonaHoraria: mentor.zonaHoraria,
    tarifaUsdHora: String(mentor.tarifaUsdHora ?? ''),
    especialidades: (mentor.especialidades ?? []).join(', '),
    idiomas: (mentor.idiomas ?? []).join(', '),
    activo: mentor.activo,
  };
}

/** Parte una lista escrita a mano, tolerando espacios de más y comas sueltas al final. */
export function separaPorComas(texto: string): readonly string[] {
  return texto.split(',').map((pieza) => pieza.trim()).filter(Boolean);
}

/** Un mentor nuevo necesita titular y cuenta; uno ya creado, solo titular. */
export function mentorValido(borrador: BorradorDeMentor): boolean {
  if (!borrador.titular.trim()) {
    return false;
  }
  return !!borrador.id || borrador.emailUsuario.trim().length > 0;
}
