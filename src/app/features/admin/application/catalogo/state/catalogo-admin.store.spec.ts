import { TestBed } from '@angular/core/testing';
import { PreferenciasService } from '@core/preferences/preferencias';
import { CatalogoAdminStore, PRODUCTOS_POR_PAGINA } from './catalogo-admin.store';

describe('CatalogoAdminStore', () => {
  let almacen: CatalogoAdminStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CatalogoAdminStore] });
    almacen = TestBed.inject(CatalogoAdminStore);
    // La moneda de quien administra decide en qué se pinta el coste y contra qué se filtra.
    TestBed.inject(PreferenciasService).cambiaMoneda('EUR');
    almacen.divisas.set([
      { codigo: 'USD', porDolar: 1 },
      { codigo: 'EUR', porDolar: 0.92 },
      { codigo: 'CNY', porDolar: 7.2 },
    ]);
  });

  it('sin filtros, el criterio lleva solo la página, el tamaño y el idioma', () => {
    const criterio = almacen.criterio();

    expect(criterio.pagina).toBe(0);
    expect(criterio.tamano).toBe(PRODUCTOS_POR_PAGINA);
    expect(criterio.estado).toBeUndefined();
    expect(criterio.costeMinimo).toBeUndefined();
    expect(almacen.hayFiltros()).toBe(false);
  });

  /**
   * La columna enseña el coste en yuanes convertido a la moneda de quien administra: el filtro tiene
   * que deshacer esa conversión con la MISMA tasa, o se filtra por una cosa y se ve otra.
   */
  it('el precio tecleado se devuelve a yuanes con la misma tasa que pinta la columna', () => {
    almacen.precioMinimo.set('12,88');

    // 12,88 € ÷ (1 CNY en euros) = 10 CNY, con USD como unidad intermedia.
    expect(almacen.criterio().costeMinimo).toBeCloseTo(10, 2);
  });

  it('la tendencia se teclea sobre cien y viaja de cero a uno', () => {
    almacen.tendenciaMinima.set('70');
    expect(almacen.criterio().tendenciaMinima).toBeCloseTo(0.7);
  });

  it('la certificación vacía significa «todos», no «pendientes»', () => {
    expect(almacen.criterio().verificado).toBeUndefined();
    almacen.verificado.set('false');
    expect(almacen.criterio().verificado).toBe(false);
  });

  it('el coste se pinta convertido y formateado en la moneda activa', () => {
    expect(almacen.formatea(72, 'CNY')).toContain('9,20');
  });

  /** Seguir en la página siete de una lista nueva no sirve de nada. */
  it('cambiar un filtro devuelve a la primera página', () => {
    almacen.pagina.set(4);
    almacen.fijaFiltro(() => almacen.texto.set('gorro'));

    expect(almacen.pagina()).toBe(0);
    expect(almacen.hayFiltros()).toBe(true);
  });

  it('limpiar los filtros los deja todos vacíos y vuelve a la primera página', () => {
    almacen.texto.set('gorro');
    almacen.estado.set('ACTIVE');
    almacen.pagina.set(3);

    almacen.limpiaFiltros();

    expect(almacen.hayFiltros()).toBe(false);
    expect(almacen.pagina()).toBe(0);
  });

  it('el orden de precio cicla y vuelve a la primera página', () => {
    almacen.pagina.set(2);

    almacen.alternaOrdenDePrecio();
    expect(almacen.orden()).toBe('price_asc');
    expect(almacen.pagina()).toBe(0);

    almacen.alternaOrdenDePrecio();
    almacen.alternaOrdenDePrecio();
    expect(almacen.orden()).toBeUndefined();
  });

  describe('selección', () => {
    it('marca y desmarca de una en una', () => {
      almacen.alternaSeleccion('p1');
      expect(almacen.seleccionados()).toBe(1);

      almacen.alternaSeleccion('p1');
      expect(almacen.seleccionados()).toBe(0);
    });

    /** Marcar «todos» marca los de la PÁGINA, nunca el catálogo entero. */
    it('marca y desmarca de golpe los de la página', () => {
      almacen.alternaTodos(['p1', 'p2'], false);
      expect(almacen.seleccionados()).toBe(2);

      almacen.alternaTodos(['p1', 'p2'], true);
      expect(almacen.seleccionados()).toBe(0);
    });

    it('se puede limpiar la selección de una vez', () => {
      almacen.alternaTodos(['p1', 'p2'], false);
      almacen.limpiaSeleccion();
      expect(almacen.seleccionados()).toBe(0);
    });
  });
});
