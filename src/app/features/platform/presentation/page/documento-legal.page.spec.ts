import { DeferBlockBehavior } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { DocumentoLegalPublicado } from '../../domain/model/documento-legal';
import {
  DOCUMENTOS_LEGALES_PORT,
  DocumentosLegalesPort,
} from '../../domain/port/documentos-legales.port';
import { ConsultaDocumentoLegal } from '../../application/use-case/consulta-documento-legal.use-case';
import { DocumentoLegalPage } from './documento-legal.page';



@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

class DocumentosFalsos implements DocumentosLegalesPort {
  respuesta: Result<DocumentoLegalPublicado, AppError> = fallo(creaError('sin-conexion'));

  async consulta(): Promise<Result<DocumentoLegalPublicado, AppError>> {
    return this.respuesta;
  }
}

async function monta(doc: string, puerto: DocumentosFalsos) {
  return render(DocumentoLegalPage, {
    ...SIN_DIFERIR,
    inputs: { doc },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      ConsultaDocumentoLegal,
      { provide: DOCUMENTOS_LEGALES_PORT, useValue: puerto },
    ],
  });
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Los bloques diferidos se pintan enteros en las pruebas.
 *
 * <p>`@defer (hydrate on viewport)` espera a que alguien baje hasta el bloque, y en el entorno de
 * pruebas no hay ventana que se desplace: sin esto, la mitad de la página no llega a existir y las
 * comprobaciones fallarían por el escenario y no por el código. Lo que se comprueba aquí es el
 * contenido; que la hidratación se difiera es cosa del navegador de verdad.
 */
const SIN_DIFERIR = { deferBlockBehavior: DeferBlockBehavior.Playthrough };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('DocumentoLegalPage', () => {
  it('pinta el texto compilado sin esperar al servidor', async () => {
    // No hay estado de «cargando»: en una página legal vale más enseñar el texto íntegro que un hueco.
    await monta('privacy', new DocumentosFalsos());

    expect(screen.getByRole('heading', { level: 1 }).textContent?.length).toBeGreaterThan(0);
  });

  it('sustituye el texto por el publicado cuando el servidor responde', async () => {
    const puerto = new DocumentosFalsos();
    puerto.respuesta = exito({
      tipo: 'terms',
      idioma: 'es',
      titulo: 'Condiciones recién publicadas',
      cuerpo: JSON.stringify({
        intro: 'Estas condiciones te vinculan.',
        sections: [{ h: 'Objeto', p: ['Lo que se contrata.'] }],
      }),
      version: '2026-09-06',
    });

    await monta('terms', puerto);

    expect(await screen.findByText('Condiciones recién publicadas')).toBeInTheDocument();
    expect(screen.getByText('Estas condiciones te vinculan.')).toBeInTheDocument();
    // El cuerpo del documento —los apartados— va en un `@defer (on idle; hydrate on viewport)` dentro
    // de `nx-vista-de-documento`: llega después de la cabecera, así que hay que esperarlo.
    expect(await screen.findByText('Objeto')).toBeInTheDocument();
  });

  it('la página de cookies añade la tabla con cada cookie concreta', async () => {
    // Describir categorías en abstracto no cumple la norma: hay que decir qué cookie es, quién la
    // pone, para qué sirve y cuánto dura.
    const { container } = await monta('cookies', new DocumentosFalsos());

    // La tabla cierra la página en un `@defer (on idle; hydrate on viewport)`: aparece un instante
    // después del montaje, así que se espera en vez de mirar el DOM recién montado.
    await waitFor(() => expect(container.querySelector('nx-tabla-cookies')).not.toBeNull());
  });

  it('el resto de documentos NO la añaden', async () => {
    const { container } = await monta('privacy', new DocumentosFalsos());

    expect(container.querySelector('nx-tabla-cookies')).toBeNull();
  });

  it('un documento que no existe es un 404, no una página legal en blanco', async () => {
    const { container } = await monta('loquesea', new DocumentosFalsos());

    expect(container.querySelector('nx-no-encontrada')).not.toBeNull();
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
