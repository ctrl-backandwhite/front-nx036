/**
 * Los textos legales que el panel edita.
 *
 * <p>GUARDAR y PUBLICAR son cosas distintas y no se pueden mezclar: guardar deja el trabajo a medias sin
 * que nadie lo vea; publicar hace visible el texto Y manda un correo a todas las cuentas activas. Un
 * botón que hiciera las dos convertiría cada corrección de una errata en un envío masivo.
 */
export type ClaseDeDocumento = 'privacy' | 'terms' | 'cookies' | 'notice' | 'withdrawal';

export const CLASES_DE_DOCUMENTO: readonly ClaseDeDocumento[] = [
  'privacy', 'terms', 'cookies', 'notice', 'withdrawal',
];

/** Los idiomas en los que se mantiene cada documento. */
export const IDIOMAS_LEGALES: readonly string[] = ['es', 'en', 'pt', 'zh', 'fr', 'de', 'it', 'nl'];

/** Una sección: su encabezado y sus párrafos. */
export interface SeccionLegal {
  readonly h: string;
  readonly p: readonly string[];
}

export interface CuerpoLegal {
  readonly intro: string;
  readonly secciones: readonly SeccionLegal[];
}

export interface DocumentoLegal {
  readonly clase: ClaseDeDocumento;
  readonly idioma: string;
  readonly titulo: string;
  /** El cuerpo publicado, en texto JSON. */
  readonly cuerpo: string;
  readonly version: string;
  readonly publicado: boolean;
  /** Hay cambios guardados sin publicar. */
  readonly tieneBorrador: boolean;
  readonly tituloBorrador: string | null;
  readonly cuerpoBorrador: string | null;
}

/**
 * Interpreta el cuerpo con tolerancia.
 *
 * <p>Un JSON roto —una comilla de más al pegar un texto— no puede dejar la página legal en blanco ni
 * tumbar el editor: se devuelve un documento vacío y quien edita ve que hay que rehacerlo.
 */
export function analizaCuerpo(cuerpo: string | null | undefined): CuerpoLegal {
  if (!cuerpo) {
    return { intro: '', secciones: [] };
  }
  try {
    const leido: unknown = JSON.parse(cuerpo);
    const objeto = (leido ?? {}) as { intro?: unknown; sections?: unknown };
    return {
      intro: typeof objeto.intro === 'string' ? objeto.intro : '',
      secciones: Array.isArray(objeto.sections) ? (objeto.sections as SeccionLegal[]) : [],
    };
  } catch {
    return { intro: '', secciones: [] };
  }
}

/** Y de vuelta, con los nombres que espera el backend. */
export function serializaCuerpo(cuerpo: CuerpoLegal): string {
  return JSON.stringify({ intro: cuerpo.intro, sections: cuerpo.secciones });
}

/**
 * Sobre qué se edita: el borrador si lo hay, y si no lo publicado.
 *
 * <p>Al revés —editar siempre lo publicado— el segundo guardado perdería el primero y quien redacta no
 * entendería por qué su trabajo desaparece.
 */
export function fuenteDeEdicion(documento: DocumentoLegal): { titulo: string; cuerpo: CuerpoLegal } {
  const enBorrador = documento.tieneBorrador;
  return {
    titulo: (enBorrador ? documento.tituloBorrador : documento.titulo) ?? documento.titulo ?? '',
    cuerpo: analizaCuerpo(enBorrador ? documento.cuerpoBorrador : documento.cuerpo),
  };
}

/** La versión es una FECHA: es la constancia de qué texto aceptó cada usuario y cuándo. */
export function versionDeHoy(hoy: Date = new Date()): string {
  return hoy.toISOString().slice(0, 10);
}

/** Los documentos con cambios sin publicar, para avisar de que hay trabajo a medias. */
export function conBorradorPendiente(
  documentos: readonly DocumentoLegal[],
): readonly DocumentoLegal[] {
  return documentos.filter((d) => d.tieneBorrador);
}
