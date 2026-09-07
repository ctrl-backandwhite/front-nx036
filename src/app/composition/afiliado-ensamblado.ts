import { Component } from '@angular/core';
import { InterruptorCorreoComercial } from '@features/notifications/presentation/component/interruptor-correo-comercial';
import { AfiliadoPage } from '@features/affiliate/presentation/page/afiliado.page';

/**
 * El panel del afiliado, ya ensamblado con lo que no es suyo.
 *
 * <p>La pantalla de afiliados enseña un interruptor de correo comercial entre los datos de cobro y las
 * comisiones. Ese interruptor NO es del contexto de afiliados —decidir qué correos recibe una cuenta es
 * del buzón— y la página no puede importarlo: el lint lo impide, y esa prohibición es justo lo que
 * mantiene los dos contextos capaces de evolucionar por separado.
 *
 * <p>Así que la página declara un hueco y aquí se rellena. Este fichero es la RAÍZ DE COMPOSICIÓN, el
 * único sitio del proyecto que ve el mapa entero, y ensamblar es exactamente su trabajo. Es el mismo
 * motivo por el que las rutas que mezclan áreas se declaran arriba y no dentro de un contexto.
 *
 * <p>Existe además porque el panel se monta en DOS sitios —`/affiliate` en la tienda y
 * `/admin/affiliate` en el panel—, y así los dos reciben el mismo montaje sin repetirlo.
 */
@Component({
  selector: 'nx-afiliado-ensamblado',
  imports: [AfiliadoPage, InterruptorCorreoComercial],
  // `display: contents` para que este envoltorio no cuente en la maquetación: la rejilla y los
  // espaciados de la página tienen que comportarse igual que si no existiera.
  host: { style: 'display: contents' },
  template: `
    <nx-afiliado>
      <nx-interruptor-correo-comercial correo-comercial />
    </nx-afiliado>
  `,
})
/*
 * Se llama «ensamblado» y no «panel» a propósito: `PanelDeAfiliado` ya existe y es el MODELO de dominio
 * —los datos del panel—. Dos cosas distintas con el mismo nombre en el mismo proyecto se confunden en
 * cuanto alguien las importa juntas.
 */
export class AfiliadoEnsamblado {}
