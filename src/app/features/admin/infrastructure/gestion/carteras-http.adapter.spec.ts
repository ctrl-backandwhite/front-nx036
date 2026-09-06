import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CarterasHttpAdapter } from './carteras-http.adapter';

describe('CarterasHttpAdapter', () => {
  let adaptador: CarterasHttpAdapter;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CarterasHttpAdapter],
    });
    adaptador = TestBed.inject(CarterasHttpAdapter);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * Los saldos pueden llegar como TEXTO: el backend serializa un decimal para no perder precisión. Lo
   * que no puede pasar es que llegue `NaN` a la pantalla, que se pinta literalmente.
   */
  it('acepta saldos en texto y los convierte en número', async () => {
    const promesa = adaptador.busca({ pagina: 0, tamano: 25 });

    http.expectOne((p) => p.url === '/api/admin/wallets').flush({
      items: [{ id: 'w1', userId: 'u1', email: 'a@b.c', balanceUsd: '120.50', holdUsd: '0' }],
      totalElements: 1, totalPages: 1, page: 0,
    });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.elementos[0].saldoUsd).toBe(120.5);
      expect(resultado.valor.elementos[0].retenidoUsd).toBe(0);
    }
  });

  it('un saldo ausente se lee como cero, nunca como NaN', async () => {
    const promesa = adaptador.detalle('u1');

    http.expectOne('/api/admin/wallets/u1').flush({ id: 'w1', userId: 'u1', email: 'a@b.c' });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.saldoUsd).toBe(0);
      expect(resultado.valor.disponibleUsd).toBe(0);
      // Sin divisa explícita, la cartera es en dólares canónicos.
      expect(resultado.valor.divisa).toBe('USD');
    }
  });

  it('el ingreso viaja con importe en céntimos y nota opcional', async () => {
    const promesa = adaptador.deposita({ idUsuario: 'u1', importeCentimos: 2500, descripcion: 'ajuste' });

    const peticion = http.expectOne('/api/admin/wallets/u1/topup');
    expect(peticion.request.body).toEqual({ amountCents: 2500, description: 'ajuste' });
    peticion.flush({});

    expect((await promesa).ok).toBe(true);
  });

  it('el ajuste conserva el signo negativo', async () => {
    const promesa = adaptador.ajusta({ idUsuario: 'u1', importeCentimos: -1000, descripcion: 'cobro duplicado' });

    const peticion = http.expectOne('/api/admin/wallets/u1/adjust');
    expect(peticion.request.body).toEqual({ amountCents: -1000, description: 'cobro duplicado' });
    peticion.flush({});

    await promesa;
  });

  /** El saldo resultante viene PERSISTIDO: no se recalcula sumando, o un apunte perdido lo cambiaría todo. */
  it('conserva el saldo resultante de cada apunte tal y como llega', async () => {
    const promesa = adaptador.movimientos('w1', 0, 30);

    http.expectOne((p) => p.url === '/api/admin/wallets/w1/transactions').flush({
      items: [{ id: 'm1', kind: 'TOPUP', amountCents: 2500, balanceAfterCents: 12550, createdAt: 'x' }],
    });

    const resultado = await promesa;
    if (resultado.ok) {
      expect(resultado.valor.elementos[0].saldoResultanteCentimos).toBe(12550);
    }
  });

  it('un error del servidor llega como AppError, no como excepción', async () => {
    const promesa = adaptador.reindexa();

    http.expectOne('/api/admin/wallets/reindex').flush({}, { status: 500, statusText: 'Server Error' });

    const resultado = await promesa;
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('error-del-servidor');
    }
  });
});
