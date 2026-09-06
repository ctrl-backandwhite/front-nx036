import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { DialogoStore } from '@ds/component/dialogo/dialogo.store';
import { NuevoProyecto, ProyectoOdm } from '../../domain/model/proyecto-odm';
import { TasaDeCambio } from '../../domain/model/tasa-de-cambio';
import {
  ESTADO_DE_PROYECTO_ODM_PORT,
  EstadoDeProyectoOdmPort,
  PROYECTOS_ODM_PORT,
  ProyectosOdmPort,
} from '../../domain/port/odm.port';
import { TASAS_DE_CAMBIO_PORT, TasasDeCambioPort } from '../../domain/port/tasas-de-cambio.port';
import { CreaProyectoOdm } from '../../application/use-case/crea-proyecto-odm.use-case';
import { OdmPage } from './odm.page';
import es from '@shared/i18n/dictionary/es';
import en from '@shared/i18n/dictionary/en';

/**
 * El mismo texto que ve quien usa la aplicación.
 *
 * <p>Las pruebas consultan por el TEXTO, no por la clave técnica: es lo que ve quien abre la pantalla,
 * y es lo que se rompe si alguien cambia una clave por otra que no existe —el servicio devolvería la
 * clave escrita en crudo y la prueba lo delata—. Se resuelve con la misma cadena de respaldo que el
 * servicio: idioma activo, inglés, y si no, la clave.
 */
const t = (clave: string): string => es[clave] ?? en[clave] ?? clave;

/**
 * El texto de una clave como expresión, para cuando el elemento lleva algo más alrededor.
 *
 * <p>Se ESCAPA antes: hay textos con paréntesis, puntos suspensivos o interrogaciones, y esos
 * caracteres significan otra cosa dentro de una expresión regular. Sin escaparlos, la prueba pasaría
 * o fallaría por motivos que no tienen nada que ver con lo que se está comprobando.
 */
const rx = (clave: string): RegExp => new RegExp(t(clave).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const PROYECTO: ProyectoOdm = {
  id: 'p1',
  clase: 'OEM',
  titulo: 'Botella térmica',
  resumen: 'De acero, con la marca grabada',
  presupuestoEnCentimosUsd: 10870,
  diasDeCompromiso: 30,
  estado: 'INTAKE',
  creadoEl: '2026-09-01T00:00:00Z',
};

class ProyectosFalsos implements ProyectosOdmPort {
  filas: readonly ProyectoOdm[] = [PROYECTO];
  creado: NuevoProyecto | null = null;
  eliminado: string | null = null;
  respuestaDeCrear: Result<ProyectoOdm, AppError> = exito(PROYECTO);

  async mios(): Promise<Result<readonly ProyectoOdm[], AppError>> {
    return exito(this.filas);
  }

  async crea(proyecto: NuevoProyecto): Promise<Result<ProyectoOdm, AppError>> {
    this.creado = proyecto;
    return this.respuestaDeCrear;
  }

  async actualiza(): Promise<Result<ProyectoOdm, AppError>> {
    return exito(PROYECTO);
  }

  async elimina(id: string): Promise<Result<void, AppError>> {
    this.eliminado = id;
    return exito(undefined);
  }
}

class EstadoFalso implements EstadoDeProyectoOdmPort {
  pedido: string | null = null;

  async cambia(_id: string, estado: string): Promise<Result<ProyectoOdm, AppError>> {
    this.pedido = estado;
    return exito({ ...PROYECTO, estado });
  }
}

class TasasFalsas implements TasasDeCambioPort {
  async consulta(): Promise<Result<readonly TasaDeCambio[], AppError>> {
    return exito([
      { codigo: 'USD', porDolar: 1 },
      { codigo: 'EUR', porDolar: 0.92 },
    ]);
  }
}

async function monta(proyectos = new ProyectosFalsos(), estado = new EstadoFalso()) {
  await render(OdmPage, {
    providers: [
      CreaProyectoOdm,
      { provide: PROYECTOS_ODM_PORT, useValue: proyectos },
      { provide: ESTADO_DE_PROYECTO_ODM_PORT, useValue: estado },
      { provide: TASAS_DE_CAMBIO_PORT, useValue: new TasasFalsas() },
    ],
  });
  return { proyectos, estado };
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Escribir SIN retardo entre teclas.
 *
 * <p>El valor por defecto simula a alguien tecleando, y un formulario de tres campos se come el plazo
 * de la prueba. Aquí no se está midiendo la mecanografía de nadie.
 */
const SIN_RETARDO = { delay: null };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('OdmPage', () => {
  it('lista los proyectos con su clase, su estado y su compromiso', async () => {
    await monta();

    expect(await screen.findByText('Botella térmica')).toBeInTheDocument();
    expect(screen.getByText(t('odm.kind.OEM'))).toBeInTheDocument();
    expect(screen.getByText('INTAKE')).toBeInTheDocument();
  }, 20000);

  it('un proyecto sin presupuesto no pinta un cero suelto', async () => {
    const puerto = new ProyectosFalsos();
    puerto.filas = [{ ...PROYECTO, presupuestoEnCentimosUsd: 0 }];

    await monta(puerto);

    await screen.findByText('Botella térmica');
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
  }, 20000);

  it('sin proyectos, el vacío ofrece crear el primero y NO está en castellano fijo', async () => {
    const puerto = new ProyectosFalsos();
    puerto.filas = [];

    await monta(puerto);

    // El texto sale del diccionario: antes estaba escrito dentro del componente y salía en español
    // con la interfaz en inglés o en chino.
    // Aparece DOS veces: bajo el título de la pantalla y dentro de la tarjeta del vacío. Se cuentan
    // las dos a propósito, en vez de pedir «una»: así la prueba dice lo que de verdad se ve.
    expect(await screen.findAllByText(t('odm.subtitle'))).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: rx('odm.new') }).length).toBeGreaterThanOrEqual(2);
  }, 20000);

  it('el presupuesto tecleado en euros se guarda convertido a dólares', async () => {
    const { proyectos } = await monta();

    await userEvent.click((await screen.findAllByRole('button', { name: rx('odm.new') }))[0]);
    const formulario = await screen.findByRole('dialog');
    await userEvent.type(within(formulario).getByLabelText(t('odm.field.title')), 'Botella', SIN_RETARDO);
    await userEvent.selectOptions(within(formulario).getByLabelText(t('common.currency')), 'EUR');
    await userEvent.type(within(formulario).getByLabelText(t('odm.field.budget')), '100', SIN_RETARDO);
    // El botón se busca DENTRO del formulario: «Nuevo proyecto» también es el de la cabecera.
    await userEvent.click(within(formulario).getByRole('button', { name: t('odm.new') }));

    // 100 € / 0,92 = 108,70 $. Multiplicando salían 92 $.
    expect(proyectos.creado?.presupuestoEnCentimosUsd).toBe(10870);
  }, 20000);

  it('enseña el equivalente en dólares antes de enviar', async () => {
    await monta();

    await userEvent.click((await screen.findAllByRole('button', { name: rx('odm.new') }))[0]);
    const panel = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(panel).getByLabelText(t('common.currency')), 'EUR');
    await userEvent.type(within(panel).getByLabelText(t('odm.field.budget')), '100', SIN_RETARDO);

    expect(await screen.findByText(rx('odm.budget_stored_usd'))).toBeInTheDocument();
  }, 20000);

  it('un rechazo del backend se AVISA: sin eso el formulario se quedaba mudo', async () => {
    const proyectos = new ProyectosFalsos();
    proyectos.respuestaDeCrear = fallo(creaError('peticion-invalida', 'Falta el resumen'));

    await monta(proyectos);
    const dialogo = TestBed.inject(DialogoStore);

    await userEvent.click((await screen.findAllByRole('button', { name: rx('odm.new') }))[0]);
    const alta = await screen.findByRole('dialog');
    await userEvent.type(within(alta).getByLabelText(t('odm.field.title')), 'Botella', SIN_RETARDO);
    await userEvent.click(within(alta).getByRole('button', { name: t('odm.new') }));

    expect(dialogo.actual()?.mensaje).toBe('Falta el resumen');
  }, 20000);

  it('el detalle deja avanzar el estado y borrar con confirmación', async () => {
    const { proyectos, estado } = await monta();

    await userEvent.click(await screen.findByRole('button', { name: /Botella térmica/ }));
    const detalle = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(detalle).getByLabelText(t('odm.status')), 'IN_PRODUCTION');
    expect(estado.pedido).toBe('IN_PRODUCTION');

    await userEvent.click(within(detalle).getByRole('button', { name: rx('odm.action.delete') }));
    expect(TestBed.inject(DialogoStore).actual()?.clase).toBe('confirm');
    expect(proyectos.eliminado).toBeNull();
  }, 20000);
});
