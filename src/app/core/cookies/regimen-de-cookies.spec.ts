import {
  VERSION_DEL_CONSENTIMIENTO,
  claveDelAviso,
  esConsentimientoPrevio,
  escribeDecision,
  leeDecision,
  regimenPara,
} from './regimen-de-cookies';

describe('regimenPara', () => {
  it('reconoce el Espacio Económico Europeo y Suiza como RGPD', () => {
    expect(regimenPara('ES')).toBe('gdpr');
    expect(regimenPara('de')).toBe('gdpr');
    expect(regimenPara('CH')).toBe('gdpr');
    expect(regimenPara('NO')).toBe('gdpr');
  });

  it('reconoce Reino Unido, Brasil y Estados Unidos', () => {
    expect(regimenPara('GB')).toBe('uk');
    expect(regimenPara('UK')).toBe('uk');
    expect(regimenPara('BR')).toBe('lgpd');
    expect(regimenPara('US')).toBe('ccpa');
  });

  it('lo desconocido o ausente cae en el régimen por defecto', () => {
    expect(regimenPara('JP')).toBe('default');
    expect(regimenPara('')).toBe('default');
    expect(regimenPara(null)).toBe('default');
    expect(regimenPara(undefined)).toBe('default');
  });
});

describe('esConsentimientoPrevio', () => {
  it('exige aceptar antes en Europa, Reino Unido y Brasil', () => {
    expect(esConsentimientoPrevio('gdpr')).toBe(true);
    expect(esConsentimientoPrevio('uk')).toBe(true);
    expect(esConsentimientoPrevio('lgpd')).toBe(true);
  });

  it('California y el resto siguen el modelo de oposición', () => {
    expect(esConsentimientoPrevio('ccpa')).toBe(false);
    expect(esConsentimientoPrevio('default')).toBe(false);
  });
});

describe('claveDelAviso', () => {
  it('el régimen decide el TEXTO que se enseña', () => {
    expect(claveDelAviso('ccpa')).toBe('cookies.banner.ccpa');
    expect(claveDelAviso('gdpr')).toBe('cookies.banner.optin');
    expect(claveDelAviso('uk')).toBe('cookies.banner.optin');
    expect(claveDelAviso('default')).toBe('cookies.banner.default');
  });
});

describe('leeDecision', () => {
  it('lee una decisión guardada con el formato vigente', () => {
    const guardada = escribeDecision(
      { analitica: true, publicidad: false },
      new Date('2026-09-06T12:00:00Z'),
    );

    expect(leeDecision(guardada)).toEqual({ analitica: true, publicidad: false });
  });

  it('guarda la versión y la fecha, que es lo que permite acreditar cuándo se dio', () => {
    const escrita = JSON.parse(
      escribeDecision({ analitica: false, publicidad: true }, new Date('2026-09-06T12:00:00Z')),
    );

    expect(escrita.v).toBe(VERSION_DEL_CONSENTIMIENTO);
    expect(escrita.ts).toBe('2026-09-06T12:00:00.000Z');
    expect(escrita.consent).toEqual({ analytics: false, marketing: true });
  });

  it('ante cualquier duda devuelve nulo y se vuelve a preguntar', () => {
    // Dar por buena una decisión que no se entiende es exactamente lo que se sanciona.
    expect(leeDecision(null)).toBeNull();
    expect(leeDecision('')).toBeNull();
    expect(leeDecision('{esto no es json')).toBeNull();
    expect(leeDecision('"una cadena suelta"')).toBeNull();
    expect(leeDecision(JSON.stringify({ v: 99, consent: { analytics: true } }))).toBeNull();
    expect(leeDecision(JSON.stringify({ v: VERSION_DEL_CONSENTIMIENTO }))).toBeNull();
  });

  it('lo que no sea verdadero se lee como no aceptado', () => {
    const raro = JSON.stringify({
      v: VERSION_DEL_CONSENTIMIENTO,
      ts: '',
      consent: { analytics: 'sí', marketing: 0 },
    });

    expect(leeDecision(raro)).toEqual({ analitica: true, publicidad: false });
  });
});
