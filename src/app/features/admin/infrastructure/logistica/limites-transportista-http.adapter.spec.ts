import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '@core/http/api.service';
import { APP_CONFIG } from '@core/config/app-config';
import { LimiteDeTransportista } from '../../domain/logistica/model/limite-transportista';
import { LimitesTransportistaHttpAdapter } from './limites-transportista-http.adapter';

/**
 * Los topes del transportista: peso máximo, medidas y divisor volumétrico por canal y país.
 *
 * <p>Es configuración que decide si un pedido se puede despachar, así que los respaldos importan: una
 * fila que llega sin la marca de actividad sigue siendo un límite que APLICA. Darla por apagada haría
 * creer que el canal no tiene tope de peso, y el tope existe — lo aplica el transportista, no nosotros.
 */
describe('LimitesTransportistaHttpAdapter', () => {
  const LIMITE: LimiteDeTransportista = {
    canal: 'bpa',
    pais: 'ES',
    pesoMaximoGramos: 2000,
    divisorVolumetrico: 6000,
    minimoFacturableGramos: 100,
    largoMaximoMm: 600,
    anchoMaximoMm: 400,
    altoMaximoMm: 300,
    bultoUnico: true,
    notas: 'canal postal',
    activo: true,
  };

  function monta() {
    TestBed.configureTestingModule({
      providers: [
        LimitesTransportistaHttpAdapter,
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
      adaptador: TestBed.inject(LimitesTransportistaHttpAdapter),
      red: TestBed.inject(HttpTestingController),
    };
  }

  it('traduce el límite al vocabulario del dominio', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/carrier-limits').flush([
      {
        channelCode: 'BPA',
        countryCode: 'ES',
        maxWeightGrams: 2000,
        volumetricDivisor: 6000,
        singleParcelOnly: true,
      },
    ]);

    const resultado = await enCurso;
    expect(resultado.ok && resultado.valor[0]).toMatchObject({
      canal: 'BPA',
      pais: 'ES',
      pesoMaximoGramos: 2000,
      divisorVolumetrico: 6000,
      bultoUnico: true,
      activo: true,
    });
  });

  it('los topes que no manda el servidor quedan en cero, no en «indefinido»', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/carrier-limits').flush([{ channelCode: 'BPA', countryCode: 'FR' }]);

    const resultado = await enCurso;
    /* Cero se lee como «sin tope declarado» y se puede comparar; «undefined» rompe cualquier cálculo
     * que lo use, y aquí se usa para decidir si un bulto cabe. */
    expect(resultado.ok && resultado.valor[0].pesoMaximoGramos).toBe(0);
  });

  it('guardar es un PUT sobre canal y país, con el canal en mayúsculas', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.guarda(LIMITE);
    /* El canal se normaliza porque la ruta ES la clave del registro: «bpa» y «BPA» crearían dos filas
     * distintas para el mismo canal, y solo una de las dos se aplicaría. */
    const peticion = red.expectOne('/api/admin/carrier-limits/BPA/ES');

    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toMatchObject({ channelCode: 'BPA', maxWeightGrams: 2000 });
    peticion.flush({});
    await enCurso;
  });

  /** El comodín es un carácter válido en una ruta y tiene que llegar tal cual para valer de comodín. */
  it('el país comodín se transmite entero', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.guarda({ ...LIMITE, pais: '*' });
    red.expectOne('/api/admin/carrier-limits/BPA/*').flush({});

    await enCurso;
  });

  it('borrar es un DELETE sobre esa misma clave', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.borra('BPA', 'ES');
    const peticion = red.expectOne('/api/admin/carrier-limits/BPA/ES');

    expect(peticion.request.method).toBe('DELETE');
    peticion.flush({});
    await enCurso;
  });

  it('un fallo del servidor vuelve como error, no como excepción', async () => {
    const { adaptador, red } = monta();

    const enCurso = adaptador.lista();
    red.expectOne('/api/admin/carrier-limits').error(new ProgressEvent('error'));

    expect((await enCurso).ok).toBe(false);
  });
});
