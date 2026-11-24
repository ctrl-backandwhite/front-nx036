import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import {
  GUIAS_DE_ENVIO_PORT,
  INCIDENCIAS_DE_ENVIO_PORT,
} from '../../../domain/logistica/port/incidencias-de-envio.port';
import { DESCARGA_DE_FICHEROS_PORT } from '../../../domain/logistica/port/navegador.port';
import {
  AnulaGuia,
  BuscaIncidencias,
  DescargaEtiqueta,
  ResuelveIncidencia,
} from './gestiona-incidencias.use-case';

describe('casos de uso de incidencias y guías', () => {
  const incidencias = { busca: vi.fn(), resuelve: vi.fn() };
  const guias = { etiqueta: vi.fn(), anula: vi.fn() };
  const navegador = { guarda: vi.fn(), abre: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        BuscaIncidencias,
        ResuelveIncidencia,
        DescargaEtiqueta,
        AnulaGuia,
        { provide: INCIDENCIAS_DE_ENVIO_PORT, useValue: incidencias },
        { provide: GUIAS_DE_ENVIO_PORT, useValue: guias },
        { provide: DESCARGA_DE_FICHEROS_PORT, useValue: navegador },
      ],
    });
  });

  it('buscar pasa el criterio tal cual al puerto', async () => {
    const pagina = { incidencias: [], total: 0, paginas: 1, pagina: 0 };
    incidencias.busca.mockResolvedValue(exito(pagina));
    const criterio = { transportista: 'FOURPX', pagina: 0, tamano: 25 };

    const resultado = await TestBed.inject(BuscaIncidencias).ejecuta(criterio);

    expect(incidencias.busca).toHaveBeenCalledWith(criterio);
    expect(resultado.ok && resultado.valor).toBe(pagina);
  });

  it('resolver recorta la nota antes de mandarla', async () => {
    incidencias.resuelve.mockResolvedValue(exito(undefined));

    await TestBed.inject(ResuelveIncidencia).ejecuta('7', '  Reenviado  ');

    expect(incidencias.resuelve).toHaveBeenCalledWith('7', 'Reenviado');
  });

  it('resolver sin nota NO llama al backend: una incidencia cerrada sin decir qué se hizo no sirve', async () => {
    const resultado = await TestBed.inject(ResuelveIncidencia).ejecuta('7', '   ');

    expect(resultado.ok).toBe(false);
    expect(incidencias.resuelve).not.toHaveBeenCalled();
  });

  it('la etiqueta se abre en pestaña nueva', async () => {
    guias.etiqueta.mockResolvedValue(exito('https://e.example/1.pdf'));

    const resultado = await TestBed.inject(DescargaEtiqueta).ejecuta('o1', 2);

    expect(resultado.ok).toBe(true);
    expect(navegador.abre).toHaveBeenCalledWith('https://e.example/1.pdf');
  });

  it('una dirección que no es web no se abre nunca', async () => {
    guias.etiqueta.mockResolvedValue(exito('javascript:alert(1)'));

    const resultado = await TestBed.inject(DescargaEtiqueta).ejecuta('o1', 2);

    expect(resultado.ok).toBe(false);
    expect(navegador.abre).not.toHaveBeenCalled();
  });

  it('si el backend falla al dar la etiqueta, el error llega y no se abre nada', async () => {
    guias.etiqueta.mockResolvedValue(fallo(creaError('error-del-servidor', 'Caído')));

    const resultado = await TestBed.inject(DescargaEtiqueta).ejecuta('o1', 2);

    expect(!resultado.ok && resultado.error.mensaje).toBe('Caído');
    expect(navegador.abre).not.toHaveBeenCalled();
  });

  it('anular delega en el puerto con pedido y bulto', async () => {
    guias.anula.mockResolvedValue(exito(undefined));

    await TestBed.inject(AnulaGuia).ejecuta('o1', 3);

    expect(guias.anula).toHaveBeenCalledWith('o1', 3);
  });
});
