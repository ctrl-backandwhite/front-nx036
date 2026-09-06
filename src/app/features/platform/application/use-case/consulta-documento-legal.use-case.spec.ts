import { TestBed } from '@angular/core/testing';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import {
  DocumentoLegalPublicado,
  respaldoCompilado,
} from '../../domain/model/documento-legal';
import {
  DOCUMENTOS_LEGALES_PORT,
  DocumentosLegalesPort,
} from '../../domain/port/documentos-legales.port';
import { ConsultaDocumentoLegal } from './consulta-documento-legal.use-case';

class DocumentosFalsos implements DocumentosLegalesPort {
  respuesta: Result<DocumentoLegalPublicado, AppError> = fallo(creaError('sin-conexion'));

  async consulta(): Promise<Result<DocumentoLegalPublicado, AppError>> {
    return this.respuesta;
  }
}

describe('ConsultaDocumentoLegal', () => {
  let puerto: DocumentosFalsos;
  let caso: ConsultaDocumentoLegal;

  beforeEach(() => {
    puerto = new DocumentosFalsos();
    TestBed.configureTestingModule({
      providers: [ConsultaDocumentoLegal, { provide: DOCUMENTOS_LEGALES_PORT, useValue: puerto }],
    });
    caso = TestBed.inject(ConsultaDocumentoLegal);
  });

  it('sirve lo publicado cuando el backend responde', async () => {
    puerto.respuesta = exito({
      tipo: 'privacy',
      idioma: 'es',
      titulo: 'Privacidad al día',
      cuerpo: JSON.stringify({ intro: 'Entradilla', sections: [{ h: 'Uno', p: ['Texto'] }] }),
      version: '2026-09-01',
    });

    const documento = await caso.ejecuta('privacy', 'es');

    expect(documento.title).toBe('Privacidad al día');
    expect(documento.updated).toBe('2026-09-01');
  });

  it('SIN RED sirve el texto compilado: una página legal no puede quedarse en blanco', async () => {
    puerto.respuesta = fallo(creaError('sin-conexion'));

    const documento = await caso.ejecuta('terms', 'es');

    expect(documento).toEqual(respaldoCompilado('terms', 'es'));
    expect(documento.sections.length).toBeGreaterThan(0);
  });

  it('un documento publicado con el cuerpo vacío también cae al respaldo', async () => {
    puerto.respuesta = exito({
      tipo: 'cookies',
      idioma: 'es',
      titulo: 'Borrador a medias',
      cuerpo: '{}',
      version: '2026-09-01',
    });

    const documento = await caso.ejecuta('cookies', 'es');

    expect(documento).toEqual(respaldoCompilado('cookies', 'es'));
  });
});
