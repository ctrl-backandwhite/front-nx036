import { TestBed } from '@angular/core/testing';
import { Result, exito } from '@shared/result/result';
import { AppError } from '@shared/error/app-error';
import { NuevoProyecto, ProyectoOdm } from '../../domain/model/proyecto-odm';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import { PROYECTOS_ODM_PORT, ProyectosOdmPort } from '../../domain/port/odm.port';
import { CreaProyectoOdm } from './crea-proyecto-odm.use-case';

const TASAS: readonly TasaDeCambio[] = [
  { codigo: 'USD', porDolar: 1 },
  { codigo: 'EUR', porDolar: 0.92 },
];

const PROYECTO: ProyectoOdm = {
  id: 'p1',
  clase: 'ODM_FREE',
  titulo: 'Botella',
  estado: 'INTAKE',
  creadoEl: '2026-09-01T00:00:00Z',
};

class ProyectosFalsos implements ProyectosOdmPort {
  recibido: NuevoProyecto | null = null;

  async mios(): Promise<Result<readonly ProyectoOdm[], AppError>> {
    return exito([PROYECTO]);
  }

  async crea(proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>> {
    this.recibido = proyecto;
    return exito(PROYECTO);
  }

  async actualiza(): Promise<Result<ProyectoOdm, AppError>> {
    return exito(PROYECTO);
  }

  async elimina(): Promise<Result<void, AppError>> {
    return exito(undefined);
  }
}

describe('CreaProyectoOdm', () => {
  let puerto: ProyectosFalsos;
  let caso: CreaProyectoOdm;

  beforeEach(() => {
    puerto = new ProyectosFalsos();
    TestBed.configureTestingModule({
      providers: [CreaProyectoOdm, { provide: PROYECTOS_ODM_PORT, useValue: puerto }],
    });
    caso = TestBed.inject(CreaProyectoOdm);
  });

  it('guarda el presupuesto en céntimos de dólar, convertido desde la divisa tecleada', async () => {
    await caso.ejecuta(
      { clase: 'OEM', titulo: 'Botella', resumen: '', presupuesto: '100', divisa: 'EUR' },
      TASAS,
    );

    // 100 € / 0,92 = 108,70 $. Multiplicando salían 92 $ y el proveedor trabajaba con un 15 % menos.
    expect(puerto.recibido?.presupuestoEnCentimosUsd).toBe(10870);
  });

  it('recorta el título y el resumen', async () => {
    await caso.ejecuta(
      { clase: 'OEM', titulo: '  Botella  ', resumen: '  De acero  ', presupuesto: '', divisa: 'USD' },
      TASAS,
    );

    expect(puerto.recibido?.titulo).toBe('Botella');
    expect(puerto.recibido?.resumen).toBe('De acero');
  });

  it('sin presupuesto no manda un cero: manda nada', async () => {
    await caso.ejecuta(
      { clase: 'OEM', titulo: 'Botella', resumen: '', presupuesto: '', divisa: 'EUR' },
      TASAS,
    );

    expect(puerto.recibido?.presupuestoEnCentimosUsd).toBeUndefined();
    expect(puerto.recibido?.resumen).toBeUndefined();
  });
});
