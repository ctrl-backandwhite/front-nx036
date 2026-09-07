import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { BorradorDePromocion } from '../../domain/gestion/model/promociones';
import { PromocionesHttpAdapter } from './promociones-http.adapter';

/**
 * Las promociones y los cupones contra el backend.
 *
 * <p>El detalle que decide si un cupón funciona: **el código viaja SIEMPRE en mayúsculas**. Quien lo
 * teclea en el pago no distingue capitalización, así que guardarlo en minúsculas hace que el cupón
 * exista y no se encuentre nunca — que se lee como «el descuento no funciona» y no como un error.
 *
 * <p>Y un código en blanco viaja como AUSENTE, no como cadena vacía: una promoción sin código se aplica
 * sola, y un código «» sería un cupón que cualquiera activa sin escribir nada.
 */
describe('PromocionesHttpAdapter', () => {
  function monta() {
    TestBed.configureTestingModule({
      providers: [
        PromocionesHttpAdapter,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiBase: '', produccion: false, urlPublica: '', entorno: 'prueba' },
        },
      ],
    });
    return {
      adaptador: TestBed.inject(PromocionesHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  const borrador = (parcial: Partial<BorradorDePromocion> = {}): BorradorDePromocion => ({
    nombre: 'Rebajas',
    clase: 'DISCOUNT',
    ambito: 'ALL',
    porcentaje: 10,
    activa: true,
    ...parcial,
  });

  it('traduce la promoción al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/promotions').flush([
      {
        id: 'pr1',
        name: 'Rebajas',
        code: 'REB10',
        kind: 'DISCOUNT',
        scope: 'ALL',
        percentOff: 10,
        active: true,
        live: true,
        priority: 3,
        usedCount: 42,
        categoryIds: ['c1'],
        productIds: [],
      },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      id: 'pr1',
      nombre: 'Rebajas',
      codigo: 'REB10',
      activa: true,
      vigente: true,
      prioridad: 3,
      usos: 42,
      categorias: ['c1'],
    });
  });

  /** «Activa» y «vigente» son cosas distintas: una promoción encendida puede estar fuera de fechas. */
  it('conserva la diferencia entre estar activa y estar vigente', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/promotions').flush([
      { id: 'pr1', name: 'Futura', kind: 'DISCOUNT', scope: 'ALL', active: true, live: false },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0].activa).toBe(true);
    expect(resultado.ok && resultado.valor[0].vigente).toBe(false);
  });

  it('las listas ausentes llegan vacías y los contadores a cero', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red
      .expectOne('/api/admin/promotions')
      .flush([{ id: 'pr1', name: 'x', kind: 'DISCOUNT', scope: 'ALL', active: true, live: true }]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      prioridad: 0,
      usos: 0,
      categorias: [],
      productos: [],
    });
  });

  it('una respuesta vacía es una lista vacía', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/promotions').flush(null);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toEqual([]);
  });

  describe('el código del cupón', () => {
    /** En minúsculas, el cupón existe y no se encuentra: se lee como «el descuento no funciona». */
    it('viaja SIEMPRE en mayúsculas y sin espacios', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.crea(borrador({ codigo: '  reb10 ' }));
      const peticion = red.expectOne('/api/admin/promotions');

      expect(peticion.request.body.code).toBe('REB10');
      peticion.flush({});
      await enCurso;
    });

    /** Un código «» sería un cupón que cualquiera activa sin escribir nada. */
    it('un código en blanco viaja como AUSENTE, no como cadena vacía', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.crea(borrador({ codigo: '   ' }));
      const peticion = red.expectOne('/api/admin/promotions');

      expect(peticion.request.body.code).toBeUndefined();
      peticion.flush({});
      await enCurso;
    });
  });

  it('crear manda el cuerpo con los nombres del servidor', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.crea(
      borrador({ categorias: ['c1'], usosMaximos: 100, avisaUsuarios: true }),
    );
    const peticion = red.expectOne('/api/admin/promotions');

    expect(peticion.request.body).toMatchObject({
      name: 'Rebajas',
      kind: 'DISCOUNT',
      scope: 'ALL',
      percentOff: 10,
      active: true,
      priority: 0,
      maxUses: 100,
      categoryIds: ['c1'],
      productIds: [],
      notifyUsers: true,
    });
    peticion.flush({});
    await enCurso;
  });

  it('sin avisar a nadie, la marca viaja en falso y no ausente', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.crea(borrador());
    const peticion = red.expectOne('/api/admin/promotions');

    /* Ausente dejaría la decisión al backend; en un aviso masivo a toda la base de usuarios eso no se
     * puede dejar implícito. */
    expect(peticion.request.body.notifyUsers).toBe(false);
    peticion.flush({});
    await enCurso;
  });

  it('editar, alternar y borrar van sobre la promoción concreta', async () => {
    const { adaptador, red } = monta();

    const editando = adaptador.actualiza('pr1', borrador());
    const puesta = red.expectOne('/api/admin/promotions/pr1');
    expect(puesta.request.method).toBe('PUT');
    puesta.flush({});
    await editando;

    const alternando = adaptador.alterna('pr1');
    red.expectOne('/api/admin/promotions/pr1/toggle').flush({});
    await alternando;

    const borrando = adaptador.borra('pr1');
    const borrado = red.expectOne('/api/admin/promotions/pr1');
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush({});
    expect((await borrando).ok).toBe(true);
  });

  it('anunciar devuelve a cuánta gente se avisó', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.anuncia('pr1');
    red.expectOne('/api/admin/promotions/pr1/announce').flush({ notified: 1240 });

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor).toBe(1240);
  });

  describe('las categorías del selector', () => {
    it('usan el nombre, y si no lo hay el slug', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.categorias();
      red.expectOne((p) => p.url === '/api/catalog/categories').flush([
        { id: 'c1', name: 'Moda' },
        { id: 'c2', slug: 'moda-nino' },
        { id: 'c3' },
      ]);

      const resultado = await enCurso;
      /* La cadena de respaldos evita una opción sin rótulo, que en un desplegable es imposible de
       * elegir a propósito. */
      expect(resultado.ok && resultado.valor).toEqual([
        { id: 'c1', nombre: 'Moda' },
        { id: 'c2', nombre: 'moda-nino' },
        { id: 'c3', nombre: 'c3' },
      ]);
    });

    it('un fallo vuelve como error, no como excepción', async () => {
      const { adaptador, red } = monta();

      const enCurso = adaptador.categorias();
      red.expectOne((p) => p.url === '/api/catalog/categories').error(new ProgressEvent('error'));

      expect((await enCurso).ok).toBe(false);
    });
  });
});
