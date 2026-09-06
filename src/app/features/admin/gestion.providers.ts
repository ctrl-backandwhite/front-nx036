import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { PANEL_PORT } from './domain/gestion/port/panel.port';
import { TIPOS_DE_CAMBIO_PORT } from './domain/gestion/port/tipos-de-cambio.port';
import { USUARIOS_EN_LOTE_PORT, USUARIOS_PORT } from './domain/gestion/port/usuarios.port';
import { CARTERAS_PORT } from './domain/gestion/port/carteras.port';
import { FACTURACION_PORT } from './domain/gestion/port/facturacion.port';
import { AMBITOS_DE_REGLA_PORT, PRECIOS_PORT } from './domain/gestion/port/precios.port';
import { PROMOCIONES_PORT } from './domain/gestion/port/promociones.port';
import { AFILIADOS_PORT, PAGOS_DE_AFILIADOS_PORT } from './domain/gestion/port/afiliados.port';
import { SOCIOS_PORT } from './domain/gestion/port/socios.port';
import { BOLETIN_PORT, CURSOS_PORT, MENTORES_PORT } from './domain/gestion/port/contenido.port';
import { SOPORTE_PORT } from './domain/gestion/port/soporte.port';
import { IDIOMAS_PORT, MONEDAS_PORT } from './domain/gestion/port/sistema.port';
import { LEGAL_PORT } from './domain/gestion/port/legal.port';
import { PERFIL_PORT, SEGUNDO_FACTOR_PORT, SESIONES_PORT } from './domain/gestion/port/perfil.port';

import { PanelHttpAdapter } from './infrastructure/gestion/panel-http.adapter';
import { TiposDeCambioHttpAdapter } from './infrastructure/gestion/tipos-de-cambio-http.adapter';
import {
  UsuariosEnLoteHttpAdapter, UsuariosHttpAdapter,
} from './infrastructure/gestion/usuarios-http.adapter';
import { CarterasHttpAdapter } from './infrastructure/gestion/carteras-http.adapter';
import { FacturacionHttpAdapter } from './infrastructure/gestion/facturacion-http.adapter';
import {
  AmbitosDeReglaHttpAdapter, PreciosHttpAdapter,
} from './infrastructure/gestion/precios-http.adapter';
import { PromocionesHttpAdapter } from './infrastructure/gestion/promociones-http.adapter';
import {
  AfiliadosHttpAdapter, PagosDeAfiliadosHttpAdapter,
} from './infrastructure/gestion/afiliados-http.adapter';
import { SociosHttpAdapter } from './infrastructure/gestion/socios-http.adapter';
import {
  BoletinHttpAdapter, CursosHttpAdapter, MentoresHttpAdapter,
} from './infrastructure/gestion/contenido-http.adapter';
import { SoporteHttpAdapter } from './infrastructure/gestion/soporte-http.adapter';
import { IdiomasHttpAdapter, MonedasHttpAdapter } from './infrastructure/gestion/sistema-http.adapter';
import { LegalHttpAdapter } from './infrastructure/gestion/legal-http.adapter';
import {
  PerfilHttpAdapter, SegundoFactorHttpAdapter, SesionesHttpAdapter,
} from './infrastructure/gestion/perfil-http.adapter';

import { ImportesStore } from './application/gestion/state/importes.store';
import * as panel from './application/gestion/use-case/panel.use-case';
import * as usuarios from './application/gestion/use-case/usuarios.use-case';
import * as carteras from './application/gestion/use-case/carteras.use-case';
import * as facturacion from './application/gestion/use-case/facturacion.use-case';
import * as precios from './application/gestion/use-case/precios.use-case';
import * as promociones from './application/gestion/use-case/promociones.use-case';
import * as afiliados from './application/gestion/use-case/afiliados.use-case';
import * as socios from './application/gestion/use-case/socios.use-case';
import * as contenido from './application/gestion/use-case/contenido.use-case';
import * as soporte from './application/gestion/use-case/soporte.use-case';
import * as sistema from './application/gestion/use-case/sistema.use-case';
import * as legal from './application/gestion/use-case/legal.use-case';
import * as perfil from './application/gestion/use-case/perfil.use-case';

/**
 * Ata los puertos del área de USUARIOS, FINANZAS Y SISTEMA con sus adaptadores.
 *
 * <p>Es el único sitio de esta área donde aparece una clase de infraestructura: casos de uso, estado y
 * pantallas solo conocen las interfaces. Cambiar de proveedor —o poner un doble en una prueba— es
 * cambiar estas líneas y nada más.
 *
 * <p>Se cuelga de las RUTAS del área (`providers: [proveeAdminGestion()]`) y no de la raíz, para que
 * quien entra a mirar el escaparate no se descargue ni instancie nada de esto.
 *
 * <p>Los casos de uso van declarados uno a uno a propósito: llevan `@Injectable()` sin `providedIn` para
 * que NO puedan resolverse desde la raíz, donde sus puertos no existen. Si alguno se olvida aquí, falla
 * al abrir la pantalla; si estuviera en la raíz, fallaría con un error de inyección mucho más difícil
 * de leer.
 */
export function proveeAdminGestion(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // ── Adaptadores y sus puertos ────────────────────────────────────────────────────────────
    PanelHttpAdapter,
    { provide: PANEL_PORT, useFactory: () => inject(PanelHttpAdapter) },
    TiposDeCambioHttpAdapter,
    { provide: TIPOS_DE_CAMBIO_PORT, useFactory: () => inject(TiposDeCambioHttpAdapter) },
    UsuariosHttpAdapter,
    { provide: USUARIOS_PORT, useFactory: () => inject(UsuariosHttpAdapter) },
    UsuariosEnLoteHttpAdapter,
    { provide: USUARIOS_EN_LOTE_PORT, useFactory: () => inject(UsuariosEnLoteHttpAdapter) },
    CarterasHttpAdapter,
    { provide: CARTERAS_PORT, useFactory: () => inject(CarterasHttpAdapter) },
    FacturacionHttpAdapter,
    { provide: FACTURACION_PORT, useFactory: () => inject(FacturacionHttpAdapter) },
    PreciosHttpAdapter,
    { provide: PRECIOS_PORT, useFactory: () => inject(PreciosHttpAdapter) },
    AmbitosDeReglaHttpAdapter,
    { provide: AMBITOS_DE_REGLA_PORT, useFactory: () => inject(AmbitosDeReglaHttpAdapter) },
    PromocionesHttpAdapter,
    { provide: PROMOCIONES_PORT, useFactory: () => inject(PromocionesHttpAdapter) },
    AfiliadosHttpAdapter,
    { provide: AFILIADOS_PORT, useFactory: () => inject(AfiliadosHttpAdapter) },
    PagosDeAfiliadosHttpAdapter,
    { provide: PAGOS_DE_AFILIADOS_PORT, useFactory: () => inject(PagosDeAfiliadosHttpAdapter) },
    SociosHttpAdapter,
    { provide: SOCIOS_PORT, useFactory: () => inject(SociosHttpAdapter) },
    BoletinHttpAdapter,
    { provide: BOLETIN_PORT, useFactory: () => inject(BoletinHttpAdapter) },
    CursosHttpAdapter,
    { provide: CURSOS_PORT, useFactory: () => inject(CursosHttpAdapter) },
    MentoresHttpAdapter,
    { provide: MENTORES_PORT, useFactory: () => inject(MentoresHttpAdapter) },
    SoporteHttpAdapter,
    { provide: SOPORTE_PORT, useFactory: () => inject(SoporteHttpAdapter) },
    IdiomasHttpAdapter,
    { provide: IDIOMAS_PORT, useFactory: () => inject(IdiomasHttpAdapter) },
    MonedasHttpAdapter,
    { provide: MONEDAS_PORT, useFactory: () => inject(MonedasHttpAdapter) },
    LegalHttpAdapter,
    { provide: LEGAL_PORT, useFactory: () => inject(LegalHttpAdapter) },
    PerfilHttpAdapter,
    { provide: PERFIL_PORT, useFactory: () => inject(PerfilHttpAdapter) },
    SegundoFactorHttpAdapter,
    { provide: SEGUNDO_FACTOR_PORT, useFactory: () => inject(SegundoFactorHttpAdapter) },
    SesionesHttpAdapter,
    { provide: SESIONES_PORT, useFactory: () => inject(SesionesHttpAdapter) },

    // ── Estado del área ──────────────────────────────────────────────────────────────────────
    ImportesStore,

    // ── Casos de uso ─────────────────────────────────────────────────────────────────────────
    panel.ConsultaMetricas, panel.ConsultaPedidosRecientes, panel.ConsultaSeries,

    usuarios.BuscaUsuarios, usuarios.CambiaElRol, usuarios.BloqueaUsuario,
    usuarios.DesbloqueaUsuario, usuarios.ActivaUsuario, usuarios.EditaUsuario,
    usuarios.ReiniciaLaContrasena, usuarios.DaDeBajaUsuario, usuarios.InvitaUsuario,
    usuarios.ActuaSobreUsuarios, usuarios.CambiaElRolEnLote,

    carteras.BuscaCarteras, carteras.ConsultaLaCartera, carteras.ConsultaMovimientos,
    carteras.IngresaEnLaCartera, carteras.AjustaLaCartera, carteras.ReindexaCarteras,

    facturacion.ConsultaPlanes, facturacion.ActualizaElPlan, facturacion.ConsultaSuscripciones,

    precios.ConsultaReglas, precios.GuardaLaRegla, precios.AlternaLaRegla, precios.BorraLaRegla,
    precios.AlternaReglasEnLote, precios.BorraReglasEnLote, precios.ConsultaElAjusteDeMoq,
    precios.GuardaElAjusteDeMoq, precios.CargaLosAmbitos,

    promociones.ConsultaPromociones, promociones.GuardaLaPromocion, promociones.AlternaLaPromocion,
    promociones.AnunciaLaPromocion, promociones.BorraLaPromocion,
    promociones.ConsultaCategoriasDePromocion,

    afiliados.BuscaAfiliados, afiliados.ConsultaElAfiliado, afiliados.CambiaElEstadoDelAfiliado,
    afiliados.ReindexaAfiliados, afiliados.ConsultaLaConfiguracionDeAfiliados,
    afiliados.GuardaLaConfiguracionDeAfiliados, afiliados.ConsultaPagosPendientes,
    afiliados.ApruebaElPago, afiliados.RechazaElPago, afiliados.PagaAlAfiliado,
    afiliados.ApruebaComisionesVencidas, afiliados.ResuelveLaRevision,

    socios.ConsultaSocios, socios.CreaElCliente, socios.RotaElSecreto, socios.BorraElCliente,
    socios.PruebaLosWebhooks,

    contenido.ConsultaElBoletin, contenido.EnviaElBoletin, contenido.ConsultaCursos,
    contenido.GuardaElCurso, contenido.BorraElCurso, contenido.ConsultaMentores,
    contenido.GuardaElMentor, contenido.BorraElMentor,

    soporte.ConsultaTickets, soporte.ConsultaElHilo, soporte.RespondeAlTicket,
    soporte.ResuelveElTicket,

    sistema.ConsultaIdiomas, sistema.GuardaElIdioma, sistema.BorraElIdioma,
    sistema.ActivaIdiomasEnLote, sistema.ConsultaDivisas, sistema.SincronizaLasTasas,
    sistema.PublicaDivisas,

    legal.ConsultaDocumentosLegales, legal.ConsultaElDocumento, legal.GuardaElBorradorLegal,
    legal.PublicaLosTextosLegales,

    perfil.ConsultaElPerfil, perfil.GuardaElPerfil, perfil.CambiaLaContrasena,
    perfil.ConsultaElSegundoFactor,
    perfil.IniciaElSegundoFactor, perfil.VerificaElSegundoFactor,
    perfil.DesactivaElSegundoFactor, perfil.ConsultaLasSesiones, perfil.RevocaLaSesion,
  ]);
}
