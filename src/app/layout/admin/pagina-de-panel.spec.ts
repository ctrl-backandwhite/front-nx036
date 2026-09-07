import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { exito } from '@shared/result/result';
import { ALMACEN_LOCAL } from '@core/storage/almacen.port';
import { AlmacenMemoriaAdapter } from '@core/storage/almacen-memoria.adapter';
import { AUTENTICACION_PORT } from '@features/auth/domain/port/autenticacion.port';
import { BUZON_PORT } from '@features/notifications/domain/port/avisos.port';
import { Aviso } from '@features/notifications/domain/model/aviso';
import { PaginaDePanel } from './pagina-de-panel';

@Component({ selector: 'nx-vacia', template: '<p>Pantalla del panel</p>' })
class Vacia {}

/** Un buzón que no tiene nada que contar: aquí se comprueba el montaje, no los avisos. */
const BUZON_VACIO = {
  lista: async () => exito<readonly Aviso[]>([]),
  sinLeer: async () => exito(0),
  marcaLeido: async () => exito(undefined),
  marcaTodosLeidos: async () => exito(undefined),
};

async function monta() {
  return render(PaginaDePanel, {
    providers: [
      provideRouter([{ path: '**', component: Vacia }]),
      { provide: ALMACEN_LOCAL, useClass: AlmacenMemoriaAdapter },
      { provide: BUZON_PORT, useValue: BUZON_VACIO },
      // Cerrar sesión cuelga del botón de la cabecera; aquí no se pulsa, pero el caso de uso se
      // construye con el marco y sin su puerto no llega a montarse nada.
      { provide: AUTENTICACION_PORT, useValue: { entra: async () => exito(null), sal: async () => exito(undefined) } },
    ],
  });
}

/**
 * El anfitrión del marco del panel LLENA los huecos del marco.
 *
 * <p>Estas dos pruebas son las que faltaban. El marco declara dos `ng-content` —el buscador global y el
 * buzón de avisos— y se montaba con la etiqueta autocerrada, así que los dos huecos quedaban vacíos.
 * Los componentes existían y pasaban sus propias pruebas montándose solos; nadie comprobaba que el
 * panel los pintara. Un hueco sin contenido no es un error: no se queja, simplemente no está.
 */
describe('PaginaDePanel', () => {
  it('pinta el buscador global en la cabecera del panel', async () => {
    const { container } = await monta();

    expect(container.querySelector('nx-busqueda-global')).not.toBeNull();
  });

  it('pinta el buzón de avisos en la cabecera del panel', async () => {
    const { container } = await monta();

    expect(container.querySelector('nx-desplegable-de-avisos')).not.toBeNull();
  });
});
