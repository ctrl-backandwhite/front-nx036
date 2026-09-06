import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  AGENTES_DE_APROVISIONAMIENTO_PORT,
  COTIZACIONES_PORT,
  SOLICITUDES_DE_APROVISIONAMIENTO_PORT,
} from './domain/port/aprovisionamiento.port';
import { DOCUMENTOS_LEGALES_PORT } from './domain/port/documentos-legales.port';
import { ESTADO_DEL_SERVICIO_PORT } from './domain/port/estado-del-servicio.port';
import { ALERTAS_DE_TENDENCIA_PORT, TENDENCIAS_PORT } from './domain/port/inteligencia.port';
import { ESTADO_DE_PROYECTO_ODM_PORT, PROYECTOS_ODM_PORT } from './domain/port/odm.port';
import { PAIS_DEL_DISPOSITIVO_PORT } from './domain/port/pais-del-dispositivo.port';
import {
  DISENOS_PORT,
  GENERACION_DE_DISENO_PORT,
  PRODUCTOS_EN_BLANCO_PORT,
} from './domain/port/pod.port';
import { TASAS_DE_CAMBIO_PORT } from './domain/port/tasas-de-cambio.port';
import { PLATAFORMAS_DE_TIENDA_PORT, TIENDAS_CONECTADAS_PORT } from './domain/port/tiendas.port';
import { AprovisionamientoHttpAdapter } from './infrastructure/aprovisionamiento-http.adapter';
import { DocumentosLegalesHttpAdapter } from './infrastructure/documentos-legales-http.adapter';
import { EstadoDelServicioHttpAdapter } from './infrastructure/estado-del-servicio-http.adapter';
import { InteligenciaHttpAdapter } from './infrastructure/inteligencia-http.adapter';
import {
  EstadoDeProyectoOdmHttpAdapter,
  ProyectosOdmHttpAdapter,
} from './infrastructure/odm-http.adapter';
import { PaisDelDispositivoAdapter } from './infrastructure/pais-del-dispositivo.adapter';
import {
  DisenosHttpAdapter,
  GeneracionDeDisenoHttpAdapter,
  ProductosEnBlancoHttpAdapter,
} from './infrastructure/pod-http.adapter';
import { TasasDeCambioHttpAdapter } from './infrastructure/tasas-de-cambio-http.adapter';
import {
  PlataformasDeTiendaHttpAdapter,
  TiendasHttpAdapter,
} from './infrastructure/tiendas-http.adapter';
import { ConsentimientoDeCookiesStore } from './application/state/consentimiento-de-cookies.store';
import { CompruebaEstadoDelServicio } from './application/use-case/comprueba-estado-del-servicio.use-case';
import { ConectaTienda } from './application/use-case/conecta-tienda.use-case';
import { ConsultaDocumentoLegal } from './application/use-case/consulta-documento-legal.use-case';
import { CreaAlertaDeTendencia } from './application/use-case/crea-alerta-de-tendencia.use-case';
import { CreaProyectoOdm } from './application/use-case/crea-proyecto-odm.use-case';
import { CreaSolicitudDeAprovisionamiento } from './application/use-case/crea-solicitud-de-aprovisionamiento.use-case';
import { DecideSobreCookies } from './application/use-case/decide-sobre-cookies.use-case';

/**
 * Ata los puertos de «platform» con sus adaptadores.
 *
 * <p>Es el único sitio del contexto donde aparece una clase de infraestructura, y de un vistazo se ve
 * el reparto: DOCE puertos pequeños, no uno grande. El módulo del que salen —`api/platform.ts` del
 * front de React— era un cajón de sastre con sesenta y nueve endpoints de diez áreas distintas;
 * convertirlo en una sola interfaz habría dado el `ApiPort` de cuarenta métodos que prohíben las
 * normas, y cada doble de prueba habría tenido que fingir los cuarenta para probar dos.
 *
 * <p>Nótese que varios puertos comparten adaptador —tiendas, aprovisionamiento— cuando se resuelven
 * contra el mismo servicio: partir el CONTRATO no obliga a partir la implementación. Lo que se gana es
 * que quien consume vea contratos pequeños y pueda sustituir el que necesite.
 */
export function proveePlatform(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // ── Tiendas conectadas ──────────────────────────────────────────────────────────────────
    TiendasHttpAdapter,
    { provide: TIENDAS_CONECTADAS_PORT, useFactory: () => inject(TiendasHttpAdapter) },
    PlataformasDeTiendaHttpAdapter,
    {
      provide: PLATAFORMAS_DE_TIENDA_PORT,
      useFactory: () => inject(PlataformasDeTiendaHttpAdapter),
    },
    ConectaTienda,

    // ── Aprovisionamiento ───────────────────────────────────────────────────────────────────
    AprovisionamientoHttpAdapter,
    {
      provide: SOLICITUDES_DE_APROVISIONAMIENTO_PORT,
      useFactory: () => inject(AprovisionamientoHttpAdapter),
    },
    { provide: COTIZACIONES_PORT, useFactory: () => inject(AprovisionamientoHttpAdapter) },
    {
      provide: AGENTES_DE_APROVISIONAMIENTO_PORT,
      useFactory: () => inject(AprovisionamientoHttpAdapter),
    },
    CreaSolicitudDeAprovisionamiento,

    // ── Inteligencia de mercado ─────────────────────────────────────────────────────────────
    InteligenciaHttpAdapter,
    { provide: TENDENCIAS_PORT, useFactory: () => inject(InteligenciaHttpAdapter) },
    { provide: ALERTAS_DE_TENDENCIA_PORT, useFactory: () => inject(InteligenciaHttpAdapter) },
    CreaAlertaDeTendencia,

    // ── Proyectos a medida (ODM/OEM) ────────────────────────────────────────────────────────
    ProyectosOdmHttpAdapter,
    { provide: PROYECTOS_ODM_PORT, useFactory: () => inject(ProyectosOdmHttpAdapter) },
    EstadoDeProyectoOdmHttpAdapter,
    {
      provide: ESTADO_DE_PROYECTO_ODM_PORT,
      useFactory: () => inject(EstadoDeProyectoOdmHttpAdapter),
    },
    CreaProyectoOdm,

    // ── Impresión bajo demanda ──────────────────────────────────────────────────────────────
    ProductosEnBlancoHttpAdapter,
    { provide: PRODUCTOS_EN_BLANCO_PORT, useFactory: () => inject(ProductosEnBlancoHttpAdapter) },
    DisenosHttpAdapter,
    { provide: DISENOS_PORT, useFactory: () => inject(DisenosHttpAdapter) },
    GeneracionDeDisenoHttpAdapter,
    {
      provide: GENERACION_DE_DISENO_PORT,
      useFactory: () => inject(GeneracionDeDisenoHttpAdapter),
    },

    // ── Documentos legales ──────────────────────────────────────────────────────────────────
    DocumentosLegalesHttpAdapter,
    { provide: DOCUMENTOS_LEGALES_PORT, useFactory: () => inject(DocumentosLegalesHttpAdapter) },
    ConsultaDocumentoLegal,

    // ── Estado del servicio ─────────────────────────────────────────────────────────────────
    EstadoDelServicioHttpAdapter,
    { provide: ESTADO_DEL_SERVICIO_PORT, useFactory: () => inject(EstadoDelServicioHttpAdapter) },
    CompruebaEstadoDelServicio,

    // ── Divisas (provisional, hasta que `core` publique el suyo) ────────────────────────────
    TasasDeCambioHttpAdapter,
    { provide: TASAS_DE_CAMBIO_PORT, useFactory: () => inject(TasasDeCambioHttpAdapter) },

    // ── Consentimiento de cookies ───────────────────────────────────────────────────────────
    PaisDelDispositivoAdapter,
    { provide: PAIS_DEL_DISPOSITIVO_PORT, useFactory: () => inject(PaisDelDispositivoAdapter) },
    ConsentimientoDeCookiesStore,
    DecideSobreCookies,
  ]);
}
