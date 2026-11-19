import { TestBed } from '@angular/core/testing';
import { exito, fallo } from '@shared/result/result';
import { creaError } from '@shared/error/app-error';
import { PaginaDeSuscripciones, Plan } from '../../../domain/gestion/model/facturacion';
import { FACTURACION_PORT, FacturacionPort } from '../../../domain/gestion/port/facturacion.port';
import { ActualizaElPlan, ConsultaSuscripciones } from './facturacion.use-case';

const PLAN: Plan = {
  id: '1', codigo: 'PRO', nombre: 'Pro', mensualCentimos: 1900, anualCentimos: 19000,
  divisa: 'USD', activo: true, posicion: 1,
};

const PAGINA_VACIA: PaginaDeSuscripciones = {
  items: [], pagina: 0, tamano: 25, total: 0, totalPaginas: 0,
};

function doble(sobrescribe: Partial<FacturacionPort> = {}): FacturacionPort & { codigos: string[] } {
  const codigos: string[] = [];
  return {
    codigos,
    planes: async () => exito([PLAN]),
    actualizaPlan: async (codigo) => (codigos.push(codigo), exito(undefined)),
    suscripciones: async () => exito(PAGINA_VACIA),
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
  it('pide la página con el filtro que le llega y devuelve lo paginado', async () => {
    const filtros: unknown[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FACTURACION_PORT,
          useValue: doble({
            suscripciones: async (filtro) => (filtros.push(filtro), exito(PAGINA_VACIA)),
          }),
        },
        ConsultaSuscripciones,
      ],
    });

    const resultado = await TestBed.inject(ConsultaSuscripciones).ejecuta({ estado: 'ACTIVE', pagina: 2 });

    expect(resultado.ok).toBe(true);
    // El caso de uso no reinterpreta el filtro: lo pasa tal cual al puerto (el servidor es quien filtra).
    expect(filtros).toEqual([{ estado: 'ACTIVE', pagina: 2 }]);
  });
});
