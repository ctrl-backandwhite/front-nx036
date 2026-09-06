import { DeferBlockBehavior } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { Result, exito, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { COMPONENTES_DEL_SERVICIO } from '../../domain/model/estado-del-servicio';
import {
  ESTADO_DEL_SERVICIO_PORT,
  EstadoDelServicioPort,
} from '../../domain/port/estado-del-servicio.port';
import { CompruebaEstadoDelServicio } from '../../application/use-case/comprueba-estado-del-servicio.use-case';
import { EstadoDelServicioPage } from './estado-del-servicio.page';
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

class ServicioFalso implements EstadoDelServicioPort {
  respuesta: Result<void, AppError> = exito(undefined);

  async comprueba(): Promise<Result<void, AppError>> {
    return this.respuesta;
  }
}

async function monta(puerto: ServicioFalso) {
  return render(EstadoDelServicioPage, {
    ...SIN_DIFERIR,
    providers: [
      CompruebaEstadoDelServicio,
      { provide: ESTADO_DEL_SERVICIO_PORT, useValue: puerto },
    ],
  });
}


/**
 * El idioma activo se fija a español ANTES de montar nada.
 *
 * <p>El servicio de preferencias lo deduce de la cookie y, si no la hay, del idioma del navegador. En
 * el entorno de pruebas ese idioma es el inglés, así que sin fijarlo las comprobaciones dependerían de
 * la máquina donde se ejecutan: la misma prueba pasaría aquí y fallaría en otro equipo.
 */
/**
 * Los bloques diferidos se pintan enteros en las pruebas.
 *
 * <p>`@defer (hydrate on viewport)` espera a que alguien baje hasta el bloque, y en el entorno de
 * pruebas no hay ventana que se desplace: sin esto, la mitad de la página no llega a existir y las
 * comprobaciones fallarían por el escenario y no por el código. Lo que se comprueba aquí es el
 * contenido; que la hidratación se difiera es cosa del navegador de verdad.
 */
const SIN_DIFERIR = { deferBlockBehavior: DeferBlockBehavior.Playthrough };

beforeEach(() => {
  document.cookie = 'nx036-locale=es; Path=/';
});

describe('EstadoDelServicioPage', () => {
  it('enseña los seis componentes del servicio', async () => {
    await monta(new ServicioFalso());

    for (const componente of COMPONENTES_DEL_SERVICIO) {
      expect(screen.getByText(t(`status.comp.${componente}`))).toBeInTheDocument();
    }
  });

  it('con el backend respondiendo, todo operativo', async () => {
    await monta(new ServicioFalso());

    expect(await screen.findByText(t('status.all_ok'))).toBeInTheDocument();
    expect(screen.getAllByText(t('status.operational'))).toHaveLength(
      COMPONENTES_DEL_SERVICIO.length,
    );
  });

  it('con el backend caído, degradado', async () => {
    const puerto = new ServicioFalso();
    puerto.respuesta = fallo(creaError('sin-conexion'));

    await monta(puerto);

    expect(await screen.findByText(t('status.degraded'))).toBeInTheDocument();
    expect(screen.getAllByText(t('status.issues'))).toHaveLength(COMPONENTES_DEL_SERVICIO.length);
  });

  it('el resumen se anuncia como estado para quien no ve la pantalla', async () => {
    await monta(new ServicioFalso());

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('la hora de la comprobación se calcula en el navegador', async () => {
    // Al prerenderizar hay otro instante y otro formato local: si el texto escrito al construir no
    // coincidiera con el hidratado, Angular tiraría el HTML de la página entera.
    await monta(new ServicioFalso());

    await screen.findByText(t('status.all_ok'));
    expect(screen.getByText(rx('status.updated')).textContent?.trim().length).toBeGreaterThan(
      'status.updated'.length,
    );
  });
});
