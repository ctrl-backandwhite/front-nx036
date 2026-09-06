import { TestBed } from '@angular/core/testing';
import { creaError } from '@shared/error/app-error';
import { exito, fallo } from '@shared/result/result';
import { CampoDeTarjeta, METODOS_DE_PAGO_PORT } from '../../domain/port/cobros.port';
import { CobrosStore } from '../state/cobros.store';
import {
  AnadePaypal,
  AnadeTarjeta,
  CargaCobros,
  EliminaMetodoDePago,
  FALTA_EL_TITULAR,
  MarcaMetodoPorDefecto,
  PideCodigoDeBajaDeMetodo,
} from './cobros.use-case';
import { APLICACION_DE_ACCOUNT } from '../../account.providers';

const ACTIVA = { clavePublicable: 'pk_test', activo: true, pruebaGratisGastada: false };
const TARJETA = { referencia: 'pm_1', tipo: 'TARJETA' as const, porDefecto: true };

describe('casos de uso de cobro', () => {
  const configuracion = vi.fn();
  const lista = vi.fn();
  const marcaPorDefecto = vi.fn();
  const guardaPaypal = vi.fn();
  const pideCodigoDeBaja = vi.fn();
  const elimina = vi.fn();
  const abreAltaDeTarjeta = vi.fn();

  let almacen: CobrosStore;

  function campoDoble(): CampoDeTarjeta & { confirmaAlta: ReturnType<typeof vi.fn> } {
    return {
      confirmaAlta: vi.fn().mockResolvedValue(exito(undefined)),
      limpia: vi.fn(),
      destruye: vi.fn(),
    };
  }

  beforeEach(() => {
    configuracion.mockReset().mockResolvedValue(exito(ACTIVA));
    lista.mockReset().mockResolvedValue(exito([TARJETA]));
    marcaPorDefecto.mockReset().mockResolvedValue(exito(undefined));
    guardaPaypal.mockReset().mockResolvedValue(exito(undefined));
    pideCodigoDeBaja.mockReset().mockResolvedValue(exito(undefined));
    elimina.mockReset().mockResolvedValue(exito(undefined));
    abreAltaDeTarjeta.mockReset().mockResolvedValue(exito('seti_secreto'));
    TestBed.configureTestingModule({
      providers: [
        ...APLICACION_DE_ACCOUNT,
        {
          provide: METODOS_DE_PAGO_PORT,
          useValue: {
            configuracion,
            lista,
            marcaPorDefecto,
            guardaPaypal,
            pideCodigoDeBaja,
            elimina,
            abreAltaDeTarjeta,
          },
        },
      ],
    });
    almacen = TestBed.inject(CobrosStore);
  });

  it('con pasarela activa carga la configuración y los métodos', async () => {
    await TestBed.inject(CargaCobros).ejecuta();

    expect(almacen.conTarjeta()).toBe(true);
    expect(almacen.metodos()).toEqual([TARJETA]);
  });

  /** Pedir la lista sin pasarela era una llamada condenada al error en toda instalación sin cobros. */
  it('sin pasarela activa NO pide la lista de métodos', async () => {
    configuracion.mockResolvedValue(exito({ ...ACTIVA, activo: false }));

    await TestBed.inject(CargaCobros).ejecuta();

    expect(lista).not.toHaveBeenCalled();
  });

  it('si no se puede leer la configuración, la sección se queda sin pintar', async () => {
    configuracion.mockResolvedValue(fallo(creaError('no-encontrado')));

    const resultado = await TestBed.inject(CargaCobros).ejecuta();

    expect(resultado.ok).toBe(false);
    expect(almacen.conTarjeta()).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });

  it('añadir tarjeta abre la intención, confirma con la pasarela y refresca', async () => {
    const campo = campoDoble();

    const resultado = await TestBed.inject(AnadeTarjeta).ejecuta(campo, 'Ana Pérez');

    expect(resultado.ok).toBe(true);
    expect(abreAltaDeTarjeta).toHaveBeenCalled();
    expect(campo.confirmaAlta).toHaveBeenCalledWith('seti_secreto', 'Ana Pérez');
    expect(campo.limpia).toHaveBeenCalled();
    expect(lista).toHaveBeenCalled();
  });

  /** Sin titular la pasarela acabaría rechazando el cobro, cuando ya no hay nadie delante. */
  it('sin titular no se abre siquiera la intención', async () => {
    const campo = campoDoble();

    const resultado = await TestBed.inject(AnadeTarjeta).ejecuta(campo, '   ');

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? null : resultado.error.codigo).toBe(FALTA_EL_TITULAR);
    expect(abreAltaDeTarjeta).not.toHaveBeenCalled();
  });

  it('si el servidor no abre la intención, no se toca la pasarela', async () => {
    abreAltaDeTarjeta.mockResolvedValue(fallo(creaError('error-del-servidor')));
    const campo = campoDoble();

    expect((await TestBed.inject(AnadeTarjeta).ejecuta(campo, 'Ana')).ok).toBe(false);
    expect(campo.confirmaAlta).not.toHaveBeenCalled();
  });

  it('si la pasarela rechaza la tarjeta, no se limpia el campo ni se refresca', async () => {
    const campo = campoDoble();
    campo.confirmaAlta.mockResolvedValue(
      fallo(creaError('peticion-invalida', 'Tarjeta rechazada')),
    );

    const resultado = await TestBed.inject(AnadeTarjeta).ejecuta(campo, 'Ana');

    expect(resultado.ok).toBe(false);
    expect(campo.limpia).not.toHaveBeenCalled();
    expect(lista).not.toHaveBeenCalled();
  });

  it('guardar PayPal recorta el correo y refresca', async () => {
    const resultado = await TestBed.inject(AnadePaypal).ejecuta('  ana@nx036.test  ');

    expect(resultado.ok).toBe(true);
    expect(guardaPaypal).toHaveBeenCalledWith('ana@nx036.test');
    expect(lista).toHaveBeenCalled();
  });

  it('si PayPal falla no se refresca', async () => {
    guardaPaypal.mockResolvedValue(fallo(creaError('peticion-invalida')));

    expect((await TestBed.inject(AnadePaypal).ejecuta('ana@nx036.test')).ok).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });

  it('marcar por defecto refresca la lista', async () => {
    expect((await TestBed.inject(MarcaMetodoPorDefecto).ejecuta('pm_1')).ok).toBe(true);
    expect(marcaPorDefecto).toHaveBeenCalledWith('pm_1');
    expect(lista).toHaveBeenCalled();
  });

  it('marcar por defecto que falla no refresca', async () => {
    marcaPorDefecto.mockResolvedValue(fallo(creaError('conflicto')));

    expect((await TestBed.inject(MarcaMetodoPorDefecto).ejecuta('pm_1')).ok).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });

  it('el primer paso de la baja solo pide el código', async () => {
    expect((await TestBed.inject(PideCodigoDeBajaDeMetodo).ejecuta('pm_1')).ok).toBe(true);
    expect(pideCodigoDeBaja).toHaveBeenCalledWith('pm_1');
    expect(elimina).not.toHaveBeenCalled();
  });

  it('el segundo paso elimina con el código recortado y refresca', async () => {
    expect((await TestBed.inject(EliminaMetodoDePago).ejecuta('pm_1', ' 123456 ')).ok).toBe(true);
    expect(elimina).toHaveBeenCalledWith('pm_1', '123456');
    expect(lista).toHaveBeenCalled();
  });

  it('un código rechazado deja la lista como estaba', async () => {
    elimina.mockResolvedValue(fallo(creaError('peticion-invalida', 'Código no válido')));

    expect((await TestBed.inject(EliminaMetodoDePago).ejecuta('pm_1', '000000')).ok).toBe(false);
    expect(lista).not.toHaveBeenCalled();
  });
});
