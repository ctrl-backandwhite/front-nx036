import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { FichaDeProducto } from '../../../domain/catalogo/model/ficha-de-producto';
import { BORRADOR_DE_VARIANTE_VACIO } from '../../../domain/catalogo/model/variante-de-producto';
import {
  FICHA_DE_PRODUCTO_PORT,
  IMAGENES_DE_PRODUCTO_PORT,
  VALORES_DE_VARIACION_PORT,
  VARIANTES_PORT,
} from '../../../domain/catalogo/port/ficha-de-producto.port';
import { ActualizaPrecioDeVariante } from './actualiza-precio-de-variante.use-case';
import { AnadeImagenes } from './anade-imagenes.use-case';
import { ConsultaFicha } from './consulta-ficha.use-case';
import { EliminaValoresDeVariacion } from './edita-valores-de-variacion.use-case';
import { EliminaImagenes } from './elimina-imagenes.use-case';
import { GuardaVariante } from './guarda-variante.use-case';
import { GuardaVariantesEnLote } from './guarda-variantes-en-lote.use-case';

const ficha = { id: 'p1', variantes: [] } as unknown as FichaDeProducto;

const puertoFicha = { consulta: vi.fn(), actualiza: vi.fn(), eliminaTramo: vi.fn() };
const imagenes = { anade: vi.fn(), elimina: vi.fn(), reordena: vi.fn() };
const variantes = {
  lista: vi.fn(),
  crea: vi.fn(),
  actualiza: vi.fn(),
  actualizaPrecio: vi.fn(),
  elimina: vi.fn(),
};
const valores = { renombra: vi.fn(), fijaImagen: vi.fn(), elimina: vi.fn() };

describe('casos de uso de la ficha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: FICHA_DE_PRODUCTO_PORT, useValue: puertoFicha },
        { provide: IMAGENES_DE_PRODUCTO_PORT, useValue: imagenes },
        { provide: VARIANTES_PORT, useValue: variantes },
        { provide: VALORES_DE_VARIACION_PORT, useValue: valores },
        ConsultaFicha,
        AnadeImagenes,
        EliminaImagenes,
        GuardaVariante,
        GuardaVariantesEnLote,
        ActualizaPrecioDeVariante,
        EliminaValoresDeVariacion,
      ],
    });
  });

  describe('ConsultaFicha', () => {
    /** La ficha trae los precios YA con margen; la ruta de variantes, los crudos, que son los que se editan. */
    it('sustituye las variantes por las de precio crudo', async () => {
      const crudas = [{ id: 'v1', existencias: 0, opciones: {}, activa: true, precio: 12 }];
      puertoFicha.consulta.mockResolvedValue(exito(ficha));
      variantes.lista.mockResolvedValue(exito(crudas));

      const resultado = await TestBed.inject(ConsultaFicha).ejecuta('p1', 'es');

      expect(resultado.ok && resultado.valor.variantes).toEqual(crudas);
    });

    /** Perder la pantalla entera porque una lectura secundaria falla es peor que el margen de más. */
    it('si las variantes fallan, la ficha se devuelve igual', async () => {
      puertoFicha.consulta.mockResolvedValue(exito(ficha));
      variantes.lista.mockResolvedValue(fallo(creaError('sin-conexion')));

      const resultado = await TestBed.inject(ConsultaFicha).ejecuta('p1', 'es');

      expect(resultado.ok).toBe(true);
    });

    it('si la ficha falla, no se pide nada más', async () => {
      puertoFicha.consulta.mockResolvedValue(fallo(creaError('no-encontrado')));

      const resultado = await TestBed.inject(ConsultaFicha).ejecuta('p1', 'es');

      expect(resultado.ok).toBe(false);
      expect(variantes.lista).not.toHaveBeenCalled();
    });
  });

  describe('AnadeImagenes', () => {
    /** Van en secuencia porque el orden de llegada es el orden de la galería. */
    it('añade en orden y reporta las que no entraron', async () => {
      imagenes.anade
        .mockResolvedValueOnce(exito(undefined))
        .mockResolvedValueOnce(fallo(creaError('peticion-invalida')))
        .mockResolvedValueOnce(exito(undefined));

      const resultado = await TestBed.inject(AnadeImagenes).ejecuta('p1', ['a', 'b', 'c']);

      expect(resultado.ok && resultado.valor).toEqual({ anadidas: 2, fallidas: ['b'] });
      expect(imagenes.anade.mock.calls.map((c) => c[1])).toEqual(['a', 'b', 'c']);
    });
  });

  it('el borrado de imágenes cuenta las que no se pudieron borrar', async () => {
    imagenes.elimina
      .mockResolvedValueOnce(exito(undefined))
      .mockResolvedValueOnce(fallo(creaError('conflicto')));

    const resultado = await TestBed.inject(EliminaImagenes).ejecuta(['i1', 'i2']);

    expect(resultado.ok && resultado.valor).toEqual({ borradas: 1, fallidas: 1 });
  });

  describe('GuardaVariante', () => {
    it('sin SKU no se guarda: es lo que identifica la variante en el pedido', async () => {
      const resultado = await TestBed.inject(GuardaVariante).ejecuta(
        'p1',
        BORRADOR_DE_VARIANTE_VACIO,
      );

      expect(resultado.ok).toBe(false);
      expect(variantes.crea).not.toHaveBeenCalled();
    });

    it('crea sin identificador y actualiza con él', async () => {
      variantes.crea.mockResolvedValue(exito(undefined));
      variantes.actualiza.mockResolvedValue(exito(undefined));
      const borrador = { ...BORRADOR_DE_VARIANTE_VACIO, sku: 'HX-1' };

      await TestBed.inject(GuardaVariante).ejecuta('p1', borrador);
      await TestBed.inject(GuardaVariante).ejecuta('p1', borrador, 'v1');

      expect(variantes.crea).toHaveBeenCalledTimes(1);
      expect(variantes.actualiza).toHaveBeenCalledWith('v1', expect.objectContaining({ sku: 'HX-1' }));
    });
  });

  describe('GuardaVariantesEnLote', () => {
    /** Mandar las treinta cuando se tocó una son treinta peticiones que pueden fallar por su cuenta. */
    it('solo manda las que de verdad cambiaron', async () => {
      variantes.actualiza.mockResolvedValue(exito(undefined));
      const actuales = [
        { id: 'v1', sku: 'A', titulo: 'A', precio: 10, existencias: 1, opciones: {}, activa: true },
        { id: 'v2', sku: 'B', titulo: 'B', precio: 20, existencias: 1, opciones: {}, activa: true },
      ];
      const borradores = {
        v1: { sku: 'A', titulo: 'A', precio: '10', existencias: '1', opciones: '', urlImagen: '' },
        v2: { sku: 'B', titulo: 'B', precio: '25', existencias: '1', opciones: '', urlImagen: '' },
      };

      const resultado = await TestBed.inject(GuardaVariantesEnLote).ejecuta(actuales, borradores);

      expect(variantes.actualiza).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(exito(1));
    });

    it('un fallo corta y se devuelve tal cual', async () => {
      const error = creaError('error-del-servidor');
      variantes.actualiza.mockResolvedValue(fallo(error));
      const actuales = [
        { id: 'v1', sku: 'A', titulo: 'A', precio: 10, existencias: 1, opciones: {}, activa: true },
      ];
      const borradores = {
        v1: { sku: 'A', titulo: 'A', precio: '15', existencias: '1', opciones: '', urlImagen: '' },
      };

      expect(await TestBed.inject(GuardaVariantesEnLote).ejecuta(actuales, borradores)).toEqual(
        fallo(error),
      );
    });
  });

  describe('ActualizaPrecioDeVariante', () => {
    /** La edición en sitio dispara al salir del campo: tocar y salir sin cambiar no gasta escritura. */
    it('un precio igual al que ya tenía no se manda', async () => {
      const resultado = await TestBed.inject(ActualizaPrecioDeVariante).ejecuta('v1', 12, 12);

      expect(resultado).toEqual(exito(false));
      expect(variantes.actualizaPrecio).not.toHaveBeenCalled();
    });

    it('un precio negativo se rechaza antes de salir', async () => {
      const resultado = await TestBed.inject(ActualizaPrecioDeVariante).ejecuta('v1', -1, 12);
      expect(resultado.ok).toBe(false);
    });

    it('un precio nuevo se manda y se confirma', async () => {
      variantes.actualizaPrecio.mockResolvedValue(exito(undefined));
      expect(await TestBed.inject(ActualizaPrecioDeVariante).ejecuta('v1', 15, 12)).toEqual(
        exito(true),
      );
    });
  });

  describe('EliminaValoresDeVariacion', () => {
    /** Borrar un color se lleva sus combinaciones: a medias dejaría variantes huérfanas. */
    it('se para en el primer fallo y dice cuántos habían entrado', async () => {
      valores.elimina
        .mockResolvedValueOnce(exito(undefined))
        .mockResolvedValueOnce(fallo(creaError('conflicto')));

      const resultado = await TestBed.inject(EliminaValoresDeVariacion).ejecuta(['a', 'b', 'c']);

      expect(resultado.ok).toBe(false);
      expect(valores.elimina).toHaveBeenCalledTimes(2);
    });

    it('sin fallos devuelve cuántos se borraron', async () => {
      valores.elimina.mockResolvedValue(exito(undefined));
      expect(await TestBed.inject(EliminaValoresDeVariacion).ejecuta(['a', 'b'])).toEqual(exito(2));
    });
  });
});
