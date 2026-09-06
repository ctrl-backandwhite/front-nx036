import { DocContent } from '@shared/content/site-pages';
import { COOKIES, LEGAL_NOTICE, PRIVACY, TERMS, WITHDRAWAL } from '@shared/content/legal-pages';

/**
 * Los cinco documentos que vinculan a quien compra: privacidad, condiciones, cookies, aviso legal y
 * desistimiento.
 *
 * <p>Viven en la base de datos y el administrador los edita. Antes eran constantes compiladas, así que
 * cambiar una coma exigía tocar código, compilar y desplegar — y quien revisa un texto legal no es
 * quien despliega.
 */
export type TipoDeDocumentoLegal = 'privacy' | 'terms' | 'cookies' | 'notice' | 'withdrawal';

export const TIPOS_DE_DOCUMENTO_LEGAL: readonly TipoDeDocumentoLegal[] = [
  'privacy',
  'terms',
  'cookies',
  'notice',
  'withdrawal',
];

/** ¿Es este trozo de la dirección uno de los cinco documentos? Sirve para el 404 de `/legal/:doc`. */
export function esTipoDeDocumentoLegal(valor: string | null): valor is TipoDeDocumentoLegal {
  return valor !== null && (TIPOS_DE_DOCUMENTO_LEGAL as readonly string[]).includes(valor);
}

/**
 * El documento tal y como lo publica el backend. El cuerpo llega como TEXTO con un JSON dentro, que es
 * como lo guarda el editor del panel.
 */
export interface DocumentoLegalPublicado {
  readonly tipo: TipoDeDocumentoLegal;
  readonly idioma: string;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly version: string;
}

/**
 * Lee el cuerpo con tolerancia.
 *
 * <p>Un JSON roto NO puede dejar la página legal en blanco. Es la única pantalla donde eso importa de
 * verdad: quien compra tiene derecho a leer las condiciones que le vinculan, y «vuelve a intentarlo»
 * no es una respuesta aceptable para eso. Si no se entiende, se devuelve un documento vacío y quien
 * llama cae al texto compilado.
 */
export function analizaCuerpo(cuerpo: string | null | undefined): Pick<DocContent, 'intro' | 'sections'> {
  if (!cuerpo) {
    return { intro: '', sections: [] };
  }
  try {
    const leido: unknown = JSON.parse(cuerpo);
    if (typeof leido !== 'object' || leido === null) {
      return { intro: '', sections: [] };
    }
    const objeto = leido as { intro?: unknown; sections?: unknown };
    return {
      intro: typeof objeto.intro === 'string' ? objeto.intro : '',
      sections: Array.isArray(objeto.sections) ? (objeto.sections as DocContent['sections']) : [],
    };
  } catch {
    return { intro: '', sections: [] };
  }
}

/**
 * El texto compilado de cada documento, en los ocho idiomas.
 *
 * <p>No es la fuente: desde que los documentos viven en la base, la fuente es la API. Esto es la red de
 * seguridad para cuando el backend no responde.
 */
const RESPALDO: Readonly<Record<TipoDeDocumentoLegal, Record<string, DocContent>>> = {
  privacy: PRIVACY,
  terms: TERMS,
  cookies: COOKIES,
  notice: LEGAL_NOTICE,
  withdrawal: WITHDRAWAL,
};

/** Elige el idioma activo, con respaldo a español y luego a inglés. */
export function respaldoCompilado(
  tipo: TipoDeDocumentoLegal,
  idioma: string,
): DocContent {
  const porIdioma = RESPALDO[tipo];
  const codigo = (idioma || 'es').split('-')[0];
  return porIdioma[codigo] ?? porIdioma['es'] ?? porIdioma['en'];
}

/**
 * Junta lo que llegó del servidor con el respaldo compilado.
 *
 * <p>Manda la API cuando responde, PERO solo si trae contenido: un documento publicado con el cuerpo
 * vacío —que es lo que deja un borrador a medias— pintaba un título y nada debajo. En ese caso vale
 * más el texto compilado, que puede ser más antiguo pero está completo.
 */
export function documentoAEnsenar(
  publicado: DocumentoLegalPublicado | null,
  tipo: TipoDeDocumentoLegal,
  idioma: string,
): DocContent {
  if (!publicado) {
    return respaldoCompilado(tipo, idioma);
  }
  const cuerpo = analizaCuerpo(publicado.cuerpo);
  if (!cuerpo.intro && cuerpo.sections.length === 0) {
    return respaldoCompilado(tipo, idioma);
  }
  return { title: publicado.titulo, updated: publicado.version, ...cuerpo };
}
