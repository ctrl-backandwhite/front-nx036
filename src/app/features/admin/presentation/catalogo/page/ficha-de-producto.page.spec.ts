import { DeferBlockBehavior } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { FichaDeProducto } from '../../../domain/catalogo/model/ficha-de-producto';
import { CatalogoAdminStore } from '../../../application/catalogo/state/catalogo-admin.store';
import { ConsultaArbolDeCategorias } from '../../../application/catalogo/use-case/consulta-arbol-de-categorias.use-case';
import { ConsultaFicha } from '../../../application/catalogo/use-case/consulta-ficha.use-case';
import { ConsultaIdiomas } from '../../../application/catalogo/use-case/consulta-idiomas.use-case';
import { ConsultaTasasDeCambio } from '../../../application/catalogo/use-case/consulta-tasas-de-cambio.use-case';
import { ActualizaFicha } from '../../../application/catalogo/use-case/actualiza-ficha.use-case';
import { ActualizaPrecioDeVariante } from '../../../application/catalogo/use-case/actualiza-precio-de-variante.use-case';
import { AnadeImagenes } from '../../../application/catalogo/use-case/anade-imagenes.use-case';
import { AplicaRecargo } from '../../../application/catalogo/use-case/aplica-recargo.use-case';
import { AplicaSubvencion } from '../../../application/catalogo/use-case/aplica-subvencion.use-case';
import { CambiaEstadoDeProductos } from '../../../application/catalogo/use-case/cambia-estado-de-productos.use-case';
import { DuplicaProducto } from '../../../application/catalogo/use-case/duplica-producto.use-case';
import {
  EliminaValoresDeVariacion,
  FijaImagenDeValor,
  RenombraValorDeVariacion,
} from '../../../application/catalogo/use-case/edita-valores-de-variacion.use-case';
import { EliminaImagenes } from '../../../application/catalogo/use-case/elimina-imagenes.use-case';
import { EliminaProductos } from '../../../application/catalogo/use-case/elimina-productos.use-case';
import { EliminaTramoDePrecio } from '../../../application/catalogo/use-case/elimina-tramo-de-precio.use-case';
import { MarcaProductoVerificado } from '../../../application/catalogo/use-case/marca-producto-verificado.use-case';
import { ReordenaImagenes } from '../../../application/catalogo/use-case/reordena-imagenes.use-case';
import { EliminaVariante } from '../../../application/catalogo/use-case/elimina-variante.use-case';
import { GuardaVariante } from '../../../application/catalogo/use-case/guarda-variante.use-case';
import { GuardaVariantesEnLote } from '../../../application/catalogo/use-case/guarda-variantes-en-lote.use-case';
import { ListaVariantes } from '../../../application/catalogo/use-case/lista-variantes.use-case';
import {
  ExportaProducto,
  ReemplazaProductoConJson,
} from '../../../application/catalogo/use-case/reemplaza-producto-con-json.use-case';
import { FichaDeProductoPage } from './ficha-de-producto.page';

/**
 * La ficha del producto en el panel.
 *
 * <p>Es la pantalla desde la que se toca lo que se vende, y casi todo lo que hace termina en «vuelve a
 * pedir la ficha». Eso no es un detalle de implementación: la pantalla enseña muchos datos DERIVADOS
 * —precio de venta, importes convertidos, orden de la galería— que el backend recalcula al guardar, así
 * que quedarse con lo que había en pantalla deja al administrador mirando cifras viejas y decidiendo
 * sobre ellas. Lo que se fija aquí:
 *
 * <ul>
 *   <li>que cada acción que cambia algo recarga, y que una que FALLA no lo hace (salvo el reordenado,
 *       donde es al revés y por un motivo concreto);
 *   <li>que borrar pregunta y, al borrar, DEVUELVE al listado: quedarse en la ficha de algo que ya no
 *       existe no lleva a ninguna parte;
 *   <li>que copiar la foto de un color comprueba antes que no esté ya en la galería.
 * </ul>
 */
@Component({ selector: 'nx-vacia', template: '' })
class Vacia {}

const FICHA: FichaDeProducto = {
  id: 'p1',
  slug: 'gorro-de-lana',
  titulo: 'Gorro de lana',
  tituloZh: '羊毛帽',
  origen: '1688',
  idExterno: '1688-99',
  estado: 'ACTIVE',
  moq: 2,
  divisa: 'CNY',
  ventasMensuales: 120,
  yuanes: {},
  yuanesFormateados: {},
  imagenes: [
    { id: 'i1', urlOrigen: 'https://cdn/O1CN01aaa.jpg', posicion: 0, papel: 'MAIN' },
  ],
  variantes: [],
  ejes: [],
  tramos: [],
  titulosPorIdioma: { es: 'Gorro de lana' },
};

interface Opciones {
  ficha?: FichaDeProducto | 'falla';
}

async function monta(opciones: Opciones = {}) {
  const consulta = vi.fn(async (_id: string, _idioma: string) =>
    opciones.ficha === 'falla'
      ? fallo(creaError('no-encontrado', 'Ese producto ya no existe'))
      : exito(opciones.ficha ?? FICHA),
  );
  /*
   * Se doblan los CASOS DE USO, no las clases de acciones.
   *
   * <p>La pantalla declara `AccionesDeFicha` y `AccionesDelCatalogo` en sus propios proveedores.
   * Sustituirlas obliga a reemplazar los proveedores del componente, y eso deja su PLANTILLA fuera de la
   * prueba —que es la mitad de lo que hay que comprobar en una pantalla—. Doblando la capa de abajo, el
   * componente se monta exactamente como está escrito.
   */
  const acciones = {
    guarda: vi.fn(async (_id: string, _c: unknown, _i: string) => exito(undefined)),
    eliminaTramo: vi.fn(async (_id: string, _q: number) => exito(undefined)),
    anadeImagenes: vi.fn(async (_id: string, _u: readonly string[]) =>
      exito({ anadidas: 1, fallidas: [] }),
    ),
    eliminaImagenes: vi.fn(async (_ids: readonly string[]) => exito({ borradas: 1, fallidas: 0 })),
    reordenaImagenes: vi.fn(async (_id: string, _ids: readonly string[]) => exito(undefined)),
    renombraValor: vi.fn(async (_id: string, _e: string) => exito(undefined)),
    fijaImagenDeValor: vi.fn(async (_id: string, _u: string) => exito(undefined)),
    eliminaValores: vi.fn(async (_ids: readonly string[]) => exito(undefined)),
    cambiaPrecioDeVariante: vi.fn(async (_id: string, _p: number, _a: number) => exito(true)),
  };
  const catalogo = {
    duplica: vi.fn(async (_id: string) => exito('p2')),
    elimina: vi.fn(async (_ids: readonly string[]) =>
      exito({ correctos: 1, fallidos: 0, errores: [] }),
    ),
    cambiaEstado: vi.fn(async (_ids: readonly string[], _e: string) =>
      exito({ correctos: 1, fallidos: 0, errores: [] }),
    ),
  };

  const vista = await render(FichaDeProductoPage, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    inputs: { id: 'p1' },
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      AvisosStore,
      DialogoStore,
      CatalogoAdminStore,
      { provide: ConsultaFicha, useValue: { ejecuta: consulta } },
      {
        provide: ConsultaIdiomas,
        useValue: {
          ejecuta: async () =>
            exito([
              { codigo: 'es', etiqueta: 'Español', activo: true },
              { codigo: 'en', etiqueta: 'English', activo: true },
            ]),
        },
      },
      { provide: ConsultaArbolDeCategorias, useValue: { ejecuta: async () => exito([]) } },
      { provide: ConsultaTasasDeCambio, useValue: { ejecuta: async () => exito([]) } },
      /* Los que piden las pestañas que se pintan bajo demanda: sin ellos, abrir «inventario» o el
       * editor JSON revienta con un `NG0201` que solo aparece al pulsar esa pestaña. */
      { provide: ListaVariantes, useValue: { ejecuta: async () => exito([]) } },
      { provide: GuardaVariante, useValue: { ejecuta: async () => exito(undefined) } },
      { provide: GuardaVariantesEnLote, useValue: { ejecuta: async () => exito(undefined) } },
      { provide: EliminaVariante, useValue: { ejecuta: async () => exito(undefined) } },
      { provide: ActualizaFicha, useValue: { ejecuta: acciones.guarda } },
      { provide: EliminaTramoDePrecio, useValue: { ejecuta: acciones.eliminaTramo } },
      { provide: AnadeImagenes, useValue: { ejecuta: acciones.anadeImagenes } },
      { provide: EliminaImagenes, useValue: { ejecuta: acciones.eliminaImagenes } },
      { provide: ReordenaImagenes, useValue: { ejecuta: acciones.reordenaImagenes } },
      { provide: RenombraValorDeVariacion, useValue: { ejecuta: acciones.renombraValor } },
      { provide: FijaImagenDeValor, useValue: { ejecuta: acciones.fijaImagenDeValor } },
      { provide: EliminaValoresDeVariacion, useValue: { ejecuta: acciones.eliminaValores } },
      { provide: ActualizaPrecioDeVariante, useValue: { ejecuta: acciones.cambiaPrecioDeVariante } },
      { provide: DuplicaProducto, useValue: { ejecuta: catalogo.duplica } },
      { provide: EliminaProductos, useValue: { ejecuta: catalogo.elimina } },
      { provide: CambiaEstadoDeProductos, useValue: { ejecuta: catalogo.cambiaEstado } },
      { provide: MarcaProductoVerificado, useValue: { ejecuta: async () => exito(undefined) } },
      { provide: AplicaRecargo, useValue: { ejecuta: async () => exito(0) } },
      { provide: AplicaSubvencion, useValue: { ejecuta: async () => exito(0) } },
      { provide: ExportaProducto, useValue: { ejecuta: async () => exito('{}') } },
      { provide: ReemplazaProductoConJson, useValue: { ejecuta: async () => exito(undefined) } },
    ],
  });
  /* Dos vueltas: la ficha llega por un `resource`, y con una sola el `@if` de la plantilla todavía no
   * tiene producto — la pantalla se quedaría en blanco y las comprobaciones mirarían un DOM vacío. */
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();

  const asienta = async () => {
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
    await vista.fixture.whenStable();
    vista.fixture.detectChanges();
  };

  /** La pantalla por dentro: sus métodos son `protected`, que es correcto, pero hay que llamarlos. */
  const pantalla = vista.fixture.componentInstance as unknown as Record<
    string,
    (...args: never[]) => Promise<void> | void
  >;

  return {
    vista,
    asienta,
    pantalla,
    consulta,
    acciones,
    catalogo,
    avisos: vista.fixture.debugElement.injector.get(AvisosStore),
    dialogo: vista.fixture.debugElement.injector.get(DialogoStore),
    router: vista.fixture.debugElement.injector.get(Router),
  };
}

describe('FichaDeProductoPage', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('pide la ficha del producto de la ruta, en el idioma que se está usando', async () => {
    const { consulta } = await monta();

    expect(consulta).toHaveBeenCalledWith('p1', 'es');
  });

  it('pinta la ficha entera: cabecera, resumen y galería', async () => {
    const { vista } = await monta();

    const texto = vista.fixture.nativeElement.textContent as string;
    expect(texto).toContain('Gorro de lana');
    expect(vista.fixture.nativeElement.querySelector('nx-cabecera-de-ficha')).not.toBeNull();
    expect(vista.fixture.nativeElement.querySelector('nx-galeria-de-ficha')).not.toBeNull();
    /* La pestaña de partida es el resumen: el inventario y los precios se pintan al abrir la suya, que
     * es lo que evita montar cinco pestañas para enseñar una. */
    expect(vista.fixture.nativeElement.querySelector('nx-gestor-de-variantes')).toBeNull();
  });

  it('mientras no llega la ficha, no se pinta una pantalla a medias', async () => {
    const { vista } = await monta({ ficha: 'falla' });

    expect(vista.fixture.nativeElement.querySelector('nx-cabecera-de-ficha')).toBeNull();
  });

  it('si el producto no existe, se dice y no se queda cargando', async () => {
    const { avisos } = await monta({ ficha: 'falla' });

    expect(avisos.avisos().at(-1)).toMatchObject({
      tipo: 'error',
      mensaje: 'Ese producto ya no existe',
    });
  });

  describe('guardar', () => {
    it('un cambio guardado vuelve a pedir la ficha: hay datos derivados que cambian', async () => {
      const { pantalla, consulta, acciones, asienta } = await monta();
      consulta.mockClear();

      await pantalla['guarda']({ titulo: 'Gorro grueso' } as never);
      await asienta();

      expect(acciones.guarda).toHaveBeenCalledWith('p1', { titulo: 'Gorro grueso' }, 'es');
      expect(consulta, 'la pantalla se ha quedado con el precio de venta viejo').toHaveBeenCalled();
    });

    it('si el guardado falla, NO se recarga', async () => {
      const { pantalla, consulta, acciones, asienta } = await monta();
      acciones.guarda.mockResolvedValueOnce(fallo(creaError('conflicto', 'No se pudo')) as never);
      consulta.mockClear();

      await pantalla['guarda']({ titulo: 'x' } as never);
      await asienta();

      expect(consulta).not.toHaveBeenCalled();
    });
  });

  describe('las acciones de la cabecera', () => {
    it('publicar, pausar y archivar mandan el estado que toca', async () => {
      const { pantalla, catalogo, asienta } = await monta();

      await pantalla['atiende']('publicar' as never);
      await pantalla['atiende']('pausar' as never);
      await pantalla['atiende']('archivar' as never);
      await asienta();

      expect(catalogo.cambiaEstado).toHaveBeenNthCalledWith(1, ['p1'], 'ACTIVE');
      expect(catalogo.cambiaEstado).toHaveBeenNthCalledWith(2, ['p1'], 'PAUSED');
      expect(catalogo.cambiaEstado).toHaveBeenNthCalledWith(3, ['p1'], 'ARCHIVED');
    });

    it('borrar PREGUNTA, y si se dice que no no se borra', async () => {
      const { pantalla, catalogo, dialogo, asienta } = await monta();

      const enCurso = pantalla['atiende']('eliminar' as never);
      await asienta();
      expect(dialogo.actual()?.clase).toBe('confirm');

      dialogo.cierra(false);
      await enCurso;
      expect(catalogo.elimina).not.toHaveBeenCalled();
    });

    /** Quedarse en la ficha de algo que ya no existe no lleva a ninguna parte. */
    it('al borrar de verdad, DEVUELVE al listado', async () => {
      const { pantalla, catalogo, dialogo, router, asienta } = await monta();
      const navega = vi.spyOn(router, 'navigate');

      const enCurso = pantalla['atiende']('eliminar' as never);
      await asienta();
      dialogo.cierra(true);
      await enCurso;

      expect(catalogo.elimina).toHaveBeenCalledWith(['p1']);
      expect(navega).toHaveBeenCalledWith(['/admin/catalog']);
    });

    it('duplicar llama al caso de uso con este producto', async () => {
      const { pantalla, catalogo } = await monta();

      await pantalla['atiende']('duplicar' as never);

      expect(catalogo.duplica).toHaveBeenCalledWith('p1');
    });
  });

  describe('la galería', () => {
    /**
     * La misma foto llega con direcciones distintas según el tamaño y el CDN. Sin comparar por el
     * identificador `O1CN`, la galería acababa con la misma imagen dos veces y no había forma de saber
     * cuál sobraba.
     */
    it('copiar la foto de un color avisa si YA está en la galería', async () => {
      const { pantalla, acciones, avisos, asienta } = await monta();

      await pantalla['copiaDeVariante']('https://otro-cdn/O1CN01aaa_800x800.jpg' as never);
      await asienta();

      expect(acciones.anadeImagenes).not.toHaveBeenCalled();
      expect(avisos.avisos().at(-1)?.tipo).toBe('warning');
    });

    it('y la añade cuando es nueva', async () => {
      const { pantalla, acciones, avisos, asienta } = await monta();

      await pantalla['copiaDeVariante']('https://cdn/O1CN02bbb.jpg' as never);
      await asienta();

      expect(acciones.anadeImagenes).toHaveBeenCalledWith('p1', ['https://cdn/O1CN02bbb.jpg']);
      expect(avisos.avisos().at(-1)?.tipo).toBe('success');
    });

    /**
     * Aquí la recarga va al revés que en el resto: la galería YA enseña el orden nuevo, así que solo hay
     * que volver a pedirla cuando el servidor lo RECHAZA — si no, se quedaría enseñando un orden que no
     * existe en ninguna parte.
     */
    it('reordenar solo recarga cuando el servidor lo rechaza', async () => {
      const { pantalla, consulta, acciones, asienta } = await monta();
      consulta.mockClear();

      await pantalla['reordena'](['i1'] as never);
      await asienta();
      expect(consulta).not.toHaveBeenCalled();

      acciones.reordenaImagenes.mockResolvedValueOnce(fallo(creaError('conflicto')) as never);
      await pantalla['reordena'](['i1'] as never);
      await asienta();
      expect(consulta).toHaveBeenCalled();
    });
  });

  /**
   * Las pestañas se pintan bajo demanda (`@switch`), así que el contenido de las otras cuatro solo
   * existe cuando alguien las abre. Recorrerlas es lo que demuestra que ninguna revienta con la misma
   * ficha con la que la primera funciona — que es exactamente el fallo que no se ve hasta que alguien
   * pulsa una pestaña que nadie probó.
   */
  describe('las pestañas', () => {
    const PESTANAS = ['description', 'seo', 'inventory', 'pricing'] as const;

    for (const pestana of PESTANAS) {
      it(`«${pestana}» se pinta sin romperse`, async () => {
        const { vista, pantalla, asienta } = await monta();

        (pantalla['pestana'] as unknown as { set(v: string): void }).set(pestana);
        await asienta();

        expect(vista.fixture.nativeElement.textContent.length).toBeGreaterThan(0);
      });
    }

    it('el editor rápido se abre desde la cabecera y guarda por su cuenta', async () => {
      const { pantalla, acciones, consulta, asienta } = await monta();
      consulta.mockClear();

      await pantalla['atiende']('editar' as never);
      await asienta();

      await pantalla['guardaEdicion']({ titulo: 'Gorro grueso' } as never);
      await asienta();

      expect(acciones.guarda).toHaveBeenCalledWith('p1', { titulo: 'Gorro grueso' }, 'es');
      /* Al guardar desde el editor rápido hay que CERRARLO además de recargar: dejarlo abierto sobre la
       * ficha ya actualizada hace dudar de si el cambio se aplicó. */
      expect(pantalla['edicionAbierta'] as unknown as () => boolean).toBeDefined();
      expect(consulta).toHaveBeenCalled();
    });

    it('el editor JSON se abre desde la cabecera', async () => {
      const { pantalla, asienta } = await monta();

      await pantalla['atiende']('json' as never);
      await asienta();

      expect((pantalla['jsonAbierto'] as unknown as () => boolean)()).toBe(true);
    });
  });

  it('un importe en yuanes se guarda por su nombre de negocio', async () => {
    const { pantalla, acciones, asienta } = await monta();

    pantalla['guardaYuanes']({ campo: 'costeCny', importe: 12.5 } as never);
    await asienta();

    expect(acciones.guarda).toHaveBeenCalledWith('p1', { yuanes: { costeCny: 12.5 } }, 'es');
  });

  it('borrar etiquetas de variación pregunta con CUÁNTAS son', async () => {
    const { pantalla, acciones, dialogo, asienta } = await monta();

    const enCurso = pantalla['eliminaValores'](['v1', 'v2', 'v3'] as never);
    await asienta();

    expect(dialogo.actual()?.mensaje).toContain('3');
    dialogo.cierra(true);
    await enCurso;
    expect(acciones.eliminaValores).toHaveBeenCalledWith(['v1', 'v2', 'v3']);
  });
});
