/**
 * Consentimiento de cookies: qué régimen aplica y qué se ha autorizado.
 *
 * <p>Todo lo de este fichero son reglas PURAS. Leer el país del navegador o guardar la decisión toca
 * el entorno, y eso vive en la infraestructura: aquí solo se decide, para poder probar cada caso sin
 * montar nada.
 */
export type RegimenDeCookies = 'gdpr' | 'uk' | 'lgpd' | 'ccpa' | 'default';

/** Espacio Económico Europeo más Suiza: RGPD y ePrivacy, consentimiento previo explícito. */
const EEE_Y_SUIZA: readonly string[] = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH',
];

/** El régimen aplicable a un país (ISO alfa-2). */
export function regimenPara(pais: string | null | undefined): RegimenDeCookies {
  const codigo = (pais ?? '').toUpperCase();
  if (EEE_Y_SUIZA.includes(codigo)) {
    return 'gdpr';
  }
  if (codigo === 'GB' || codigo === 'UK') {
    return 'uk'; // Reino Unido (UK GDPR / PECR): consentimiento previo.
  }
  if (codigo === 'BR') {
    return 'lgpd'; // Brasil (LGPD): consentimiento previo.
  }
  if (codigo === 'US') {
    return 'ccpa'; // California (CCPA/CPRA): modelo de oposición.
  }
  return 'default';
}

/** ¿Exige consentimiento PREVIO? Si sí, no se enciende nada hasta que alguien acepte. */
export function esConsentimientoPrevio(regimen: RegimenDeCookies): boolean {
  return regimen === 'gdpr' || regimen === 'uk' || regimen === 'lgpd';
}

/** Las dos categorías que se pueden autorizar. Las necesarias no se preguntan: sin ellas no hay web. */
export interface CategoriasAceptadas {
  readonly analitica: boolean;
  readonly publicidad: boolean;
}

export const NADA_ACEPTADO: CategoriasAceptadas = { analitica: false, publicidad: false };
export const TODO_ACEPTADO: CategoriasAceptadas = { analitica: true, publicidad: true };

/**
 * El texto del aviso según el régimen.
 *
 * <p>El régimen decide QUÉ se enseña, no qué se enciende. Antes decidía las dos cosas y ahí estaba el
 * fallo: en los regímenes de oposición se activaban analítica y publicidad de entrada, confiando en
 * detectar el país por el idioma del navegador. Esa detección falla del lado malo —un navegador que
 * dice «es» a secas no da región y caía en el régimen por defecto—, así que alguien en España con el
 * navegador en inglés acababa clasificado como California y con las cookies encendidas. Hoy no se
 * enciende nada antes de decidir, viva quien viva donde viva.
 */
export function claveDelAviso(regimen: RegimenDeCookies): string {
  if (regimen === 'ccpa') {
    return 'cookies.banner.ccpa';
  }
  return esConsentimientoPrevio(regimen) ? 'cookies.banner.optin' : 'cookies.banner.default';
}

/** Lo que se guarda en el equipo de quien decide, con su versión y la fecha. */
export interface DecisionGuardada {
  readonly v: number;
  readonly ts: string;
  readonly consent: { readonly analytics: boolean; readonly marketing: boolean };
}

/**
 * La versión del formato guardado.
 *
 * <p>Subirla invalida las decisiones anteriores y vuelve a preguntar. Es lo que hay que hacer cuando
 * cambian las categorías: un consentimiento dado sobre otra pregunta no vale para la nueva.
 */
export const VERSION_DEL_CONSENTIMIENTO = 1;

export const CLAVE_DEL_CONSENTIMIENTO = 'nx-cookie-consent';

/**
 * Interpreta lo guardado.
 *
 * <p>Devuelve `null` ante cualquier duda —otro formato, texto corrupto, categorías que no están—, y
 * entonces se vuelve a preguntar. Dar por buena una decisión que no se entiende es exactamente lo que
 * se sanciona.
 */
export function leeDecision(bruta: string | null): CategoriasAceptadas | null {
  if (!bruta) {
    return null;
  }
  try {
    const leida: unknown = JSON.parse(bruta);
    if (typeof leida !== 'object' || leida === null) {
      return null;
    }
    const objeto = leida as Partial<DecisionGuardada>;
    if (objeto.v !== VERSION_DEL_CONSENTIMIENTO || !objeto.consent) {
      return null;
    }
    return {
      analitica: !!objeto.consent.analytics,
      publicidad: !!objeto.consent.marketing,
    };
  } catch {
    return null;
  }
}

/** Prepara la decisión para guardarla. La fecha se apunta para poder acreditar cuándo se dio. */
export function escribeDecision(categorias: CategoriasAceptadas, ahora: Date): string {
  const guardada: DecisionGuardada = {
    v: VERSION_DEL_CONSENTIMIENTO,
    ts: ahora.toISOString(),
    consent: { analytics: categorias.analitica, marketing: categorias.publicidad },
  };
  return JSON.stringify(guardada);
}
