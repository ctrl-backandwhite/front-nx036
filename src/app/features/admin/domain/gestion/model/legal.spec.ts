import {
  DocumentoLegal, analizaCuerpo, conBorradorPendiente, fuenteDeEdicion, serializaCuerpo, versionDeHoy,
} from './legal';

function documento(cambios: Partial<DocumentoLegal> = {}): DocumentoLegal {
  return {
    clase: 'privacy', idioma: 'es', titulo: 'Privacidad', cuerpo: '', version: '2026-01-01',
    publicado: true, tieneBorrador: false, tituloBorrador: null, cuerpoBorrador: null, ...cambios,
  };
}

describe('analizaCuerpo', () => {
  it('lee la introducción y las secciones', () => {
    const cuerpo = analizaCuerpo('{"intro":"Hola","sections":[{"h":"Uno","p":["a","b"]}]}');

    expect(cuerpo.intro).toBe('Hola');
    expect(cuerpo.secciones).toHaveLength(1);
    expect(cuerpo.secciones[0].p).toEqual(['a', 'b']);
  });

  /** Una comilla de más al pegar un texto no puede dejar la página legal en blanco ni tumbar el editor. */
  it('un JSON roto devuelve un documento vacío en vez de lanzar', () => {
    expect(analizaCuerpo('{esto no es json')).toEqual({ intro: '', secciones: [] });
  });

  it('sin cuerpo devuelve un documento vacío', () => {
    expect(analizaCuerpo(null)).toEqual({ intro: '', secciones: [] });
  });

  it('tolera un cuerpo con la forma cambiada', () => {
    expect(analizaCuerpo('{"sections":"no es una lista"}')).toEqual({ intro: '', secciones: [] });
  });
});

describe('serializaCuerpo', () => {
  it('escribe con los nombres que espera el backend y se puede volver a leer', () => {
    const cuerpo = { intro: 'Hola', secciones: [{ h: 'Uno', p: ['a'] }] };

    const texto = serializaCuerpo(cuerpo);

    expect(texto).toContain('"sections"');
    expect(analizaCuerpo(texto)).toEqual(cuerpo);
  });
});

describe('fuenteDeEdicion', () => {
  /** Editar siempre lo publicado haría que el segundo guardado perdiera el primero. */
  it('se edita sobre el borrador cuando lo hay', () => {
    const fuente = fuenteDeEdicion(
      documento({
        tieneBorrador: true,
        tituloBorrador: 'Privacidad (revisión)',
        cuerpoBorrador: '{"intro":"nuevo","sections":[]}',
        cuerpo: '{"intro":"viejo","sections":[]}',
      }),
    );

    expect(fuente.titulo).toBe('Privacidad (revisión)');
    expect(fuente.cuerpo.intro).toBe('nuevo');
  });

  it('sin borrador se edita lo publicado', () => {
    const fuente = fuenteDeEdicion(documento({ cuerpo: '{"intro":"viejo","sections":[]}' }));

    expect(fuente.titulo).toBe('Privacidad');
    expect(fuente.cuerpo.intro).toBe('viejo');
  });

  it('un borrador sin título hereda el del documento publicado', () => {
    const fuente = fuenteDeEdicion(documento({ tieneBorrador: true, cuerpoBorrador: '{}' }));

    expect(fuente.titulo).toBe('Privacidad');
  });
});

describe('versionDeHoy', () => {
  /** La versión es la constancia de qué texto aceptó cada usuario: por eso es una fecha. */
  it('es la fecha del día, sin hora', () => {
    expect(versionDeHoy(new Date('2026-03-05T22:15:00Z'))).toBe('2026-03-05');
  });
});

describe('conBorradorPendiente', () => {
  it('devuelve los documentos con cambios sin publicar', () => {
    const lista = [documento(), documento({ idioma: 'en', tieneBorrador: true })];

    expect(conBorradorPendiente(lista).map((d) => d.idioma)).toEqual(['en']);
  });
});
