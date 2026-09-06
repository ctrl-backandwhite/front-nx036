import {
  DocumentoLegalPublicado,
  analizaCuerpo,
  documentoAEnsenar,
  esTipoDeDocumentoLegal,
  respaldoCompilado,
} from './documento-legal';

function publicado(cuerpo: string): DocumentoLegalPublicado {
  return {
    tipo: 'privacy',
    idioma: 'es',
    titulo: 'Privacidad publicada',
    cuerpo,
    version: '2026-09-01',
  };
}

describe('esTipoDeDocumentoLegal', () => {
  it('reconoce los cinco documentos', () => {
    expect(esTipoDeDocumentoLegal('privacy')).toBe(true);
    expect(esTipoDeDocumentoLegal('terms')).toBe(true);
    expect(esTipoDeDocumentoLegal('cookies')).toBe(true);
    expect(esTipoDeDocumentoLegal('notice')).toBe(true);
    expect(esTipoDeDocumentoLegal('withdrawal')).toBe(true);
  });

  it('rechaza cualquier otra cosa: /legal/loquesea es un 404, no una página vacía', () => {
    expect(esTipoDeDocumentoLegal('loquesea')).toBe(false);
    expect(esTipoDeDocumentoLegal('')).toBe(false);
    expect(esTipoDeDocumentoLegal(null)).toBe(false);
  });
});

describe('analizaCuerpo', () => {
  it('lee la entradilla y las secciones', () => {
    const cuerpo = JSON.stringify({
      intro: 'Cómo tratamos tus datos.',
      sections: [{ h: 'Responsable', p: ['NX036 LLC'] }],
    });

    expect(analizaCuerpo(cuerpo)).toEqual({
      intro: 'Cómo tratamos tus datos.',
      sections: [{ h: 'Responsable', p: ['NX036 LLC'] }],
    });
  });

  it('un JSON roto NO deja la página legal en blanco: devuelve un documento vacío', () => {
    expect(analizaCuerpo('{roto')).toEqual({ intro: '', sections: [] });
    expect(analizaCuerpo(null)).toEqual({ intro: '', sections: [] });
    expect(analizaCuerpo('')).toEqual({ intro: '', sections: [] });
    expect(analizaCuerpo('"solo una cadena"')).toEqual({ intro: '', sections: [] });
  });

  it('tolera que falten campos o que vengan con otro tipo', () => {
    expect(analizaCuerpo(JSON.stringify({ intro: 7, sections: 'no es una lista' }))).toEqual({
      intro: '',
      sections: [],
    });
  });
});

describe('respaldoCompilado', () => {
  it('devuelve el texto compilado del idioma pedido', () => {
    const documento = respaldoCompilado('privacy', 'en');
    expect(documento.title.length).toBeGreaterThan(0);
    expect(documento.sections.length).toBeGreaterThan(0);
  });

  it('un idioma sin traducir cae al español', () => {
    const enEspanol = respaldoCompilado('terms', 'es');
    expect(respaldoCompilado('terms', 'qq')).toEqual(enEspanol);
  });

  it('ignora la región del código de idioma', () => {
    expect(respaldoCompilado('cookies', 'es-AR')).toEqual(respaldoCompilado('cookies', 'es'));
  });
});

describe('documentoAEnsenar', () => {
  it('manda lo publicado cuando trae contenido', () => {
    const cuerpo = JSON.stringify({ intro: 'Al día', sections: [{ h: 'Uno', p: ['Texto'] }] });

    expect(documentoAEnsenar(publicado(cuerpo), 'privacy', 'es')).toEqual({
      title: 'Privacidad publicada',
      updated: '2026-09-01',
      intro: 'Al día',
      sections: [{ h: 'Uno', p: ['Texto'] }],
    });
  });

  it('sin respuesta del servidor se sirve el texto compilado', () => {
    expect(documentoAEnsenar(null, 'privacy', 'es')).toEqual(respaldoCompilado('privacy', 'es'));
  });

  it('un documento publicado CON EL CUERPO VACÍO también cae al respaldo', () => {
    // Es lo que deja un borrador a medias: título y nada debajo. Vale más un texto legal completo,
    // aunque sea más antiguo, que una página con un encabezado suelto.
    expect(documentoAEnsenar(publicado('{}'), 'privacy', 'es')).toEqual(
      respaldoCompilado('privacy', 'es'),
    );
    expect(documentoAEnsenar(publicado('{roto'), 'privacy', 'es')).toEqual(
      respaldoCompilado('privacy', 'es'),
    );
  });

  it('con entradilla pero sin secciones se considera contenido válido', () => {
    const soloIntro = JSON.stringify({ intro: 'Documento de una línea.', sections: [] });
    expect(documentoAEnsenar(publicado(soloIntro), 'privacy', 'es').intro).toBe(
      'Documento de una línea.',
    );
  });
});
