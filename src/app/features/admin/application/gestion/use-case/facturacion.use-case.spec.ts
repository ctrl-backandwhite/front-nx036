import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { Plan } from '../../../domain/gestion/model/facturacion';
import { FACTURACION_PORT, FacturacionPort } from '../../../domain/gestion/port/facturacion.port';
import { ActualizaElPlan, ConsultaSuscripciones } from './facturacion.use-case';

const PLAN: Plan = {
  id: '1', codigo: 'PRO', nombre: 'Pro', mensualCentimos: 1900, anualCentimos: 19000,
  divisa: 'USD', activo: true, posicion: 1,
};

function doble(sobrescribe: Partial<FacturacionPort> = {}): FacturacionPort & { codigos: string[] } {
  const codigos: string[] = [];
  return {
    codigos,
    planes: async () => exito([PLAN]),
    actualizaPlan: async (codigo) => (codigos.push(codigo), exito(undefined)),
    suscripciones: async () => exito([]),
    ...sobrescribe,
  };
}

describe('ActualizaElPlan', () => {
  it('identifica el plan por su código, que es lo que espera el backend', async () => {
    const puerto = doble();
    TestBed.configureTestingModule({
      providers: [{ provide: FACTURACION_PORT, useValue: puerto }, ActualizaElPlan],
    });

    await TestBed.inject(ActualizaElPlan).ejecuta(PLAN);

    expect(puerto.codigos).toEqual(['PRO']);
  });

  /**
   * Toca el precio de TODOS los suscriptores del plan: un rechazo de validación tiene que llegar a la
   * pantalla, no quedarse en silencio dejando creer que el precio cambió.
   */
  it('devuelve el rechazo del backend con su mensaje', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FACTURACION_PORT,
          useValue: doble({ actualizaPlan: async () => fallo(creaError('peticion-invalida', 'Precio inválido')) }),
        },
        ActualizaElPlan,
      ],
    });

    const resultado = await TestBed.inject(ActualizaElPlan).ejecuta(PLAN);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.mensaje).toBe('Precio inválido');
    }
  });
});

describe('ConsultaSuscripciones', () => {
  it('admite pedirlas sin filtro de estado', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: FACTURACION_PORT, useValue: doble() }, ConsultaSuscripciones],
    });

    expect((await TestBed.inject(ConsultaSuscripciones).ejecuta()).ok).toBe(true);
  });
});
