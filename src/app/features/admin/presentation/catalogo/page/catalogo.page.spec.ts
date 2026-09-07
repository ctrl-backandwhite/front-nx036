import { Component } from '@angular/core';
import { DeferBlockBehavior } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { ProductoDeListado } from '../../../domain/catalogo/model/producto-admin';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ComprimeImagenesHistoricas } from '../../../application/catalogo/use-case/comprime-imagenes-historicas.use-case';
import { ConsultaArbolDeCategorias } from '../../../application/catalogo/use-case/consulta-arbol-de-categorias.use-case';
import { ConsultaTasasDeCambio } from '../../../application/catalogo/use-case/consulta-tasas-de-cambio.use-case';
import { ListaProductos } from '../../../application/catalogo/use-case/lista-productos.use-case';
import { ReindexaCatalogo } from '../../../application/catalogo/use-case/reindexa-catalogo.use-case';
import { ConsultaIdiomas } from '../../../application/catalogo/use-case/consulta-idiomas.use-case';
import { CreaProducto } from '../../../application/catalogo/use-case/crea-producto.use-case';
import { ListaTodasLasCategorias } from '../../../application/catalogo/use-case/administra-categorias.use-case';
import {
  CuentaExportables,
  ExportaCatalogoCompleto,
  ExportaSegmento,
} from '../../../application/catalogo/use-case/exporta-productos.use-case';
import { AplicaRecargo } from '../../../application/catalogo/use-case/aplica-recargo.use-case';
import { AplicaSubvencion } from '../../../application/catalogo/use-case/aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from '../../../application/catalogo/use-case/cambia-estado-de-productos.use-case';
import { DuplicaProducto } from '../../../application/catalogo/use-case/duplica-producto.use-case';
import { EliminaProductos } from '../../../application/catalogo/use-case/elimina-productos.use-case';
import { MarcaProductoVerificado } from '../../../application/catalogo/use-case/marca-producto-verificado.use-case';
import { ReintentaAnunciosAlBus } from '../../../application/catalogo/use-case/reintenta-anuncios-al-bus.use-case';
import { ConsultaAnunciosFallidos } from '../../../application/catalogo/use-case/revisa-anuncios-al-bus.use-case';
import { CatalogoPage } from './catalogo.page';

/**
 * El listado del catálogo del panel.
 *
 * <p>Dos comportamientos que no se ven mirando la pantalla y que son la razón de que esta clase tenga la
 * lógica que tiene:
 *
 * <ul>
 *   <li>Los filtros VIAJAN EN LA DIRECCIÓN, y se leen de ella al entrar. Es lo que permite compartir un
 *       enlace a «los pausados sin verificar» —el menú lateral lo usa— y volver atrás sin perderlos. Y
 *       se REEMPLAZAN en el historial: apilarlos dejaría una entrada por cada tecla del buscador.
 *   <li>Cambiar el estado de una fila solo RECARGA si esa fila deja de cumplir el filtro activo.
 *       Repintar treinta productos por el cambio de uno hace parpadear la tabla y pierde el sitio donde
 *       se estaba mirando.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

function producto(parcial: Partial<ProductoDeListado> = {}): ProductoDeListado {
  return {
    id: 'p1',
    slug: 'gorro-de-lana',
    titulo: 'Gorro de lana',
    coste: 6.5,
    divisa: 'CNY',
    ventasMensuales: 120,
    estado: 'ACTIVE',
    verificado: false,
    ...parcial,
  };
}

interface Opciones {
  productos?: readonly ProductoDeListado[];
  direccion?: string;
  listar?: 'falla';
  /** Anuncios al bus que el backend dio por perdidos. */
  anunciosFallidos?: readonly unknown[];
}

async function monta(opciones: Opciones = {}) {
  const filas = opciones.productos ?? [producto()];
  const lista = vi.fn(async (_criterio: unknown) =>
    opciones.listar === 'falla'
      ? fallo(creaError('sin-conexion', 'No hay red'))
      : exito({ productos: filas, total: filas.length, paginas: 1, pagina: 0 }),
  );
  /*
   * Se doblan los CASOS DE USO, no la clase de acciones.
   *
   * <p>La pantalla declara `AccionesDelCatalogo` en sus propios proveedores, así que sustituirla obliga
   * a reemplazar los proveedores del componente — y eso deja fuera su plantilla, que es la mitad de lo
   * que hay que probar. Doblando la capa de abajo, el componente se monta tal cual está escrito.
   */
  const acciones = {
    cambiaEstado: vi.fn(async (_ids: readonly string[], _e: string) =>
      exito({ correctos: 1, fallidos: 0, errores: [] }),
    ),
    elimina: vi.fn(async (_ids: readonly string[]) =>
      exito({ correctos: 1, fallidos: 0, errores: [] }),
    ),
    marcaVerificado: vi.fn(async (_id: string, _v: boolean, _i: string) => exito(undefined)),
    duplica: vi.fn(async (_id: string) => exito('p2')),
    recargo: vi.fn(async (_p: unknown) => exito(1)),
    subvencion: vi.fn(async (_p: unknown) => exito(1)),
  };

  const vista = await render(CatalogoPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      AvisosStore,
      DialogoStore,
      { provide: ListaProductos, useValue: { ejecuta: lista } },
      { provide: ConsultaArbolDeCategorias, useValue: { ejecuta: async () => exito([]) } },
      { provide: ConsultaTasasDeCambio, useValue: { ejecuta: async () => exito([]) } },
      { provide: ComprimeImagenesHistoricas, useValue: { ejecuta: async () => exito(0) } },
      {
        provide: ConsultaAnunciosFallidos,
        useValue: { ejecuta: async () => exito(opciones.anunciosFallidos ?? []) },
      },
      { provide: ReintentaAnunciosAlBus, useValue: { ejecuta: async () => exito(0) } },
      /* Lo piden las herramientas de carga que cuelgan de la cabecera. */
      { provide: ReindexaCatalogo, useValue: { ejecuta: async () => exito(0) } },
      /* Lo que piden los cuatro diálogos que cuelgan de la cabecera. Se difieren hasta que se abre uno,
       * así que sin ellos la pantalla arranca bien y revienta al pulsar. */
      { provide: CuentaExportables, useValue: { ejecuta: async () => exito(0) } },
      { provide: ExportaSegmento, useValue: { ejecuta: async () => exito(0) } },
      { provide: ExportaCatalogoCompleto, useValue: { ejecuta: async () => exito(true) } },
      { provide: CreaProducto, useValue: { ejecuta: async () => exito('p9') } },
      { provide: ConsultaIdiomas, useValue: { ejecuta: async () => exito([]) } },
      { provide: ListaTodasLasCategorias, useValue: { ejecuta: async () => exito([]) } },
      { provide: CambiaEstadoDeProductos, useValue: { ejecuta: acciones.cambiaEstado } },
      { provide: EliminaProductos, useValue: { ejecuta: acciones.elimina } },
      { provide: MarcaProductoVerificado, useValue: { ejecuta: acciones.marcaVerificado } },
      { provide: DuplicaProducto, useValue: { ejecuta: acciones.duplica } },
      { provide: AplicaRecargo, useValue: { ejecuta: acciones.recargo } },
      { provide: AplicaSubvencion, useValue: { ejecuta: acciones.subvencion } },
    ],
  });
  const router = vista.fixture.debugElement.injector.get(Router);
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;
  const almacen = vista.fixture.debugElement.injector.get(CatalogoAdminStore);

  return {
    vista,
    asienta,
    pantalla,
    almacen,
    lista,
    acciones,
    router,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
  };
}

describe('CatalogoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pide la primera página y pinta las filas', async () => {
    const { lista } = await monta();

    expect(lista).toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Gorro de lana')).toBeInTheDocument();
  });

  /**
   * Los anuncios al bus que se dieron por perdidos se avisan EN LA PANTALLA del catálogo.
   *
   * <p>Es donde tiene sentido: un producto que no llegó al bus está publicado aquí y ausente en los
   * canales que consumen de él. Sin este aviso, la discrepancia solo se ve comparando dos sistemas.
   */
  it('avisa de los anuncios al bus que se dieron por perdidos', async () => {
    await monta({
      anunciosFallidos: [
        {
          id: 'p9',
          idExterno: '979',
          slug: 'gorro',
          titulo: 'Gorro de lana',
          intentos: 3,
          error: 'timeout',
          actualizadoEn: null,
        },
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Gorro de lana');
  });

  /** Sin nada marcado, ofrecer acciones de lote invita a pulsarlas y no hacer nada. */
  it('las acciones en lote solo aparecen con algo marcado', async () => {
    const { vista, almacen, asienta } = await monta();

    const antes = vista.fixture.nativeElement.textContent as string;

    almacen.alternaTodos(['p1'], false);
    await asienta();

    const despues = vista.fixture.nativeElement.textContent as string;
    expect(despues.length).toBeGreaterThan(antes.length);
  });

  it('un fallo se cuenta y deja la tabla vacía, no colgada', async () => {
    const { avisos } = await monta({ listar: 'falla' });

    expect(avisos.avisos().at(-1)).toMatchObject({ tipo: 'error', mensaje: 'No hay red' });
  });

  /** Es lo que permite que el menú lateral enlace directamente a «los pausados». */
  it('los filtros se escriben en la dirección, reemplazando en el historial', async () => {
    const { router, almacen, asienta } = await monta();
    const navega = vi.spyOn(router, 'navigate');

    almacen.texto.set('gorro');
    await asienta();

    const [, opciones] = navega.mock.calls.at(-1)!;
    expect((opciones as { queryParams: Record<string, unknown> }).queryParams['q']).toBe('gorro');
    /* Apilar dejaría una entrada de historial por cada tecla del buscador: el botón «atrás» tardaría
     * veinte pulsaciones en salir de la pantalla. */
    expect((opciones as { replaceUrl: boolean }).replaceUrl).toBe(true);
  });

  describe('cambiar el estado de una fila', () => {
    it('sin filtro de estado NO se recarga: repintar la tabla pierde el sitio', async () => {
      const { pantalla, lista, asienta } = await monta();
      lista.mockClear();

      await pantalla['atiende']({
        producto: producto(),
        clase: 'estado',
        estado: 'PAUSED',
      } as never);
      await asienta();

      expect(lista).not.toHaveBeenCalled();
    });

    it('pero si la fila deja de cumplir el filtro activo, SÍ', async () => {
      const { pantalla, almacen, lista, asienta } = await monta();
      almacen.estado.set('ACTIVE');
      await asienta();
      lista.mockClear();

      await pantalla['atiende']({
        producto: producto(),
        clase: 'estado',
        estado: 'PAUSED',
      } as never);
      await asienta();

      /* La fila acaba de dejar de ser «activa»: si no se recargara, seguiría en una lista de activos. */
      expect(lista).toHaveBeenCalled();
    });
  });

  it('borrar un producto PREGUNTA con su título delante', async () => {
    const { pantalla, acciones, dialogo, asienta } = await monta();

    const enCurso = pantalla['atiende']({ producto: producto(), clase: 'eliminar' } as never);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('Gorro de lana');
    dialogo.cierra(false);
    await enCurso;
    expect(acciones.elimina).not.toHaveBeenCalled();
  });

  describe('acciones sobre la selección', () => {
    it('cambiar el estado en lote limpia la selección y recarga', async () => {
      const { pantalla, almacen, acciones, lista, asienta } = await monta();
      almacen.alternaTodos(['p1'], false);
      await asienta();
      lista.mockClear();

      await pantalla['cambiaEstadoDeSeleccion']('PAUSED' as never);
      await asienta();

      expect(acciones.cambiaEstado).toHaveBeenCalledWith(['p1'], 'PAUSED');
      /* Dejar marcado lo que ya se ha cambiado invita a repetir la acción sobre lo mismo. */
      expect(almacen.seleccion().size).toBe(0);
      expect(lista).toHaveBeenCalled();
    });

    it('borrar en lote pregunta con CUÁNTOS son', async () => {
      const { pantalla, almacen, acciones, dialogo, asienta } = await monta();
      almacen.alternaTodos(['p1', 'p2'], false);
      await asienta();

      const enCurso = pantalla['eliminaSeleccion']();
      await asienta();

      expect(dialogo.actual()?.mensaje).toContain('2');
      dialogo.cierra(true);
      await enCurso;
      expect(acciones.elimina).toHaveBeenCalledWith(['p1', 'p2']);
    });

    it('sin nada marcado, borrar en lote no pregunta nada', async () => {
      const { pantalla, dialogo, asienta } = await monta();

      await pantalla['eliminaSeleccion']();
      await asienta();

      expect(dialogo.actual()).toBeNull();
    });

    it('aplicar un recargo cierra el diálogo, limpia la selección y recarga', async () => {
      const { pantalla, almacen, acciones, lista, asienta } = await monta();
      almacen.alternaTodos(['p1'], false);
      lista.mockClear();

      await pantalla['aplicaRecargo']({ ids: ['p1'], cny: 2 } as never);
      await asienta();

      expect(acciones.recargo).toHaveBeenCalled();
      expect(almacen.seleccion().size).toBe(0);
      expect(lista).toHaveBeenCalled();
    });
  });

  /**
   * Los cuatro diálogos de la cabecera van en `@defer (when …)`: su código no se descarga hasta que se
   * abre uno. Eso es lo correcto —son ventanas que casi nunca se usan— y a la vez es lo que hace que un
   * fallo suyo no aparezca al cargar la pantalla, sino al pulsar el botón, cuando ya se venía a hacer
   * algo concreto. Abrirlos aquí es lo que convierte eso en un fallo de la suite.
   */
  describe('los diálogos de la cabecera', () => {
    const abre = async (
      cual: 'recargo' | 'subvencion' | 'exportacion' | 'alta',
      pantalla: Record<string, unknown>,
    ) => {
      (pantalla['dialogoAbierto'] as unknown as { set(v: string): void }).set(cual);
    };

    for (const cual of ['recargo', 'subvencion', 'exportacion', 'alta'] as const) {
      it(`«${cual}» se abre sin romperse`, async () => {
        const { vista, pantalla, asienta } = await monta();

        await abre(cual, pantalla);
        await asienta();

        expect(vista.fixture.nativeElement.querySelector('dialog, [role="dialog"]')).not.toBeNull();
      });
    }

    it('aplicar una subvención cierra el diálogo y recarga', async () => {
      const { pantalla, almacen, acciones, lista, asienta } = await monta();
      almacen.alternaTodos(['p1'], false);
      lista.mockClear();

      await pantalla['aplicaSubvencion']({ ids: ['p1'], cny: 1 } as never);
      await asienta();

      expect(acciones.subvencion).toHaveBeenCalled();
      expect(almacen.seleccion().size).toBe(0);
      expect(lista).toHaveBeenCalled();
    });
  });
});
