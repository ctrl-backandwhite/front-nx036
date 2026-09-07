import { render, screen } from '@testing-library/angular';
import { AvisosStore } from '@ds/component/avisos/avisos.store';
import { AppError } from '@shared/error/app-error';
import { Result, exito } from '@shared/result/result';
import { PerfilDeCobro } from '@features/affiliate/domain/model/afiliado';
import { ConsultaPanelDeAfiliado } from '@features/affiliate/application/use-case/consulta-panel-de-afiliado.use-case';
import { GestionaCobro } from '@features/affiliate/application/use-case/gestiona-cobro.use-case';
import { PREFERENCIAS_DE_CORREO_PORT } from '@features/notifications/domain/port/boletin.port';
import { AfiliadoEnsamblado } from './afiliado-ensamblado';

/**
 * El ensamblaje del panel del afiliado.
 *
 * <p>La pantalla de afiliados enseña un interruptor de correo comercial que NO es suyo: decidir qué
 * correos recibe una cuenta es del buzón. La página declara un hueco y este envoltorio lo rellena,
 * porque juntar dos contextos es componer y componer se hace en la raíz.
 *
 * <p>Lo que se prueba aquí es justo eso —que el ensamblaje ocurre—, no cómo funciona ninguna de las dos
 * piezas: cada una tiene su propia batería. Sin esta prueba, quitar el envoltorio de las rutas dejaría
 * el interruptor fuera de la aplicación otra vez, y eso no se nota hasta que alguien lo busca.
 */
const PERFIL: PerfilDeCobro = {
  metodoPreferido: 'WALLET',
  tieneBanco: false,
  tienePaypal: false,
};

async function monta() {
  const vista = await render(AfiliadoEnsamblado, {
    providers: [
      AvisosStore,
      {
        provide: ConsultaPanelDeAfiliado,
        useValue: {
          ejecuta: vi.fn(async () =>
            exito({
              estado: 'ACTIVE',
              /* Inscrito: sin esto la pantalla enseña la INVITACIÓN, que no lleva ni datos de cobro ni
               * interruptor. Lo que se comprueba aquí es el panel de quien ya está dentro. */
              inscrito: true,
              porcentajeDeComision: 10,
              puedePedirCobro: false,
              minimoDeCobroFormateado: '50,00 €',
              cobroSolicitado: false,
              codigos: [],
              estadisticas: {
                clics: 0,
                conversiones: 0,
                pendienteFormateado: '0,00 €',
                aprobadoFormateado: '0,00 €',
                pagadoFormateado: '0,00 €',
              },
              comisiones: [],
            }),
          ),
          inscribe: vi.fn(),
          creaCodigo: vi.fn(),
        },
      },
      {
        provide: GestionaCobro,
        useValue: {
          consultaPerfil: vi.fn(async () => exito(PERFIL)),
          guardaPerfil: vi.fn(),
          solicita: vi.fn(),
        },
      },
      /* El interruptor se provee A SÍ MISMO, así que este ensamblaje no registra nada suyo: lo único
       * que hace falta aquí es el puerto contra el backend. */
      {
        provide: PREFERENCIAS_DE_CORREO_PORT,
        useValue: {
          consulta: async (): Promise<Result<{ sinPublicidad: boolean }, AppError>> =>
            exito({ sinPublicidad: false }),
          actualiza: async (
            sinPublicidad: boolean,
          ): Promise<Result<{ sinPublicidad: boolean }, AppError>> => exito({ sinPublicidad }),
        },
      },
    ],
  });
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  await vista.fixture.whenStable();
  vista.fixture.detectChanges();
  return { vista };
}

describe('AfiliadoEnsamblado', () => {
  beforeEach(() => {
    document.cookie = 'nx036-locale=es';
  });

  it('coloca el interruptor de correo comercial DENTRO del panel del afiliado', async () => {
    const { vista } = await monta();

    const panel = vista.fixture.nativeElement.querySelector('nx-afiliado');
    expect(panel, 'no se ha montado la pantalla de afiliados').not.toBeNull();
    /* Dentro, no al lado: proyectado en el hueco que declara la página, que es lo que lo coloca entre
     * los datos de cobro y la tabla de comisiones, igual que en el front anterior. */
    expect(panel.querySelector('nx-interruptor-correo-comercial')).not.toBeNull();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});
