import { Injectable, inject } from '@angular/core';
import { Result, fallo } from '@shared/result/result';
import { AppError, creaError } from '@shared/error/app-error';
import { SesionActual } from '@core/auth/sesion-actual';
import { Usuario, nombreParaSaludar } from '@features/auth/domain/model/usuario';
import {
  AltaDeSegundoFactor, CambiosDePerfil, SesionAbierta, cambioDeContrasenaValido,
} from '../../../domain/gestion/model/perfil';
import {
  PERFIL_PORT, SEGUNDO_FACTOR_PORT, SESIONES_PORT,
} from '../../../domain/gestion/port/perfil.port';

/**
 * La cuenta completa de quien mira.
 *
 * <p>Se pide al backend y NO se saca de la sesión: la sesión publica lo mínimo —quién es, su papel, su
 * país—, y la ficha de perfil enseña además el correo, la empresa, el idioma y la fecha de alta.
 * Ampliar lo que publica la sesión para que quepan cuatro campos de una sola pantalla convertiría el
 * núcleo en un almacén de perfiles.
 */
@Injectable()
export class ConsultaElPerfil {
  private readonly perfil = inject(PERFIL_PORT);

  ejecuta(): Promise<Result<Usuario, AppError>> {
    return this.perfil.lee();
  }
}

/**
 * Guarda los datos de la propia cuenta.
 *
 * <p>Tras guardar se REPUBLICA quién mira en el núcleo: la cabecera, el saludo y el avatar leen de ahí,
 * y sin esto seguirían enseñando el nombre viejo hasta recargar la página. Fue una incidencia real: el
 * botón guardaba y la ficha seguía enseñando el valor anterior.
 *
 * <p>Se escribe en `SesionActual` —que vive en el núcleo y es transversal— y NO en el almacén de
 * «auth»: el aislamiento entre contextos impide entrar en su capa de aplicación, y de hecho eso es lo
 * que hizo que este dato subiera al núcleo. Lo que se publica es exactamente lo que publicaría «auth»:
 * el mismo usuario que acaba de devolver el backend.
 */
@Injectable()
export class GuardaElPerfil {
  private readonly perfil = inject(PERFIL_PORT);
  private readonly sesion = inject(SesionActual);

  async ejecuta(cambios: CambiosDePerfil): Promise<Result<void, AppError>> {
    const resultado = await this.perfil.actualiza(cambios);
    if (!resultado.ok) {
      return resultado;
    }
    const usuario = resultado.valor;
    this.sesion.publica({
      id: usuario.id,
      rol: usuario.rol,
      nombreVisible: nombreParaSaludar(usuario),
      // País de REGISTRO: es el que decide el margen, y por eso viaja con la sesión.
      pais: usuario.pais ?? '',
      ...(usuario.avatarUrl ? { avatarUrl: usuario.avatarUrl } : {}),
    });
    return { ok: true, valor: undefined };
  }
}

/**
 * Cambia la contraseña.
 *
 * <p>Que las dos nuevas coincidan se comprueba AQUÍ: es una regla, no una ayuda al teclear, y el
 * backend no puede verificarla porque solo recibe una.
 */
@Injectable()
export class CambiaLaContrasena {
  private readonly perfil = inject(PERFIL_PORT);

  ejecuta(actual: string, nueva: string, repetida: string): Promise<Result<void, AppError>> {
    if (!cambioDeContrasenaValido(nueva, repetida)) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.perfil.cambiaContrasena(actual, nueva);
  }
}

@Injectable()
export class ConsultaElSegundoFactor {
  private readonly factor = inject(SEGUNDO_FACTOR_PORT);

  async ejecuta(): Promise<boolean> {
    // Un fallo aquí no es un problema que enseñar: la cuenta que no tenga el endpoint sencillamente no
    // tiene segundo factor, y el interruptor se pinta apagado.
    const resultado = await this.factor.estado();
    return resultado.ok && resultado.valor;
  }
}

/** El secreto sale del backend UNA vez. El código QR se dibuja en el navegador, nunca fuera. */
@Injectable()
export class IniciaElSegundoFactor {
  private readonly factor = inject(SEGUNDO_FACTOR_PORT);

  ejecuta(): Promise<Result<AltaDeSegundoFactor, AppError>> {
    return this.factor.inicia();
  }
}

/** Devuelve los códigos de respaldo: son la única vía de entrada si se pierde el teléfono. */
@Injectable()
export class VerificaElSegundoFactor {
  private readonly factor = inject(SEGUNDO_FACTOR_PORT);

  ejecuta(codigo: string): Promise<Result<readonly string[], AppError>> {
    return this.factor.verifica(codigo);
  }
}

/** Quitar el segundo factor exige la contraseña: si no, bastaría una sesión robada para desarmarlo. */
@Injectable()
export class DesactivaElSegundoFactor {
  private readonly factor = inject(SEGUNDO_FACTOR_PORT);

  ejecuta(contrasena: string): Promise<Result<void, AppError>> {
    if (!contrasena) {
      return Promise.resolve(fallo(creaError('peticion-invalida')));
    }
    return this.factor.desactiva(contrasena);
  }
}

@Injectable()
export class ConsultaLasSesiones {
  private readonly sesiones = inject(SESIONES_PORT);

  async ejecuta(): Promise<readonly SesionAbierta[]> {
    const resultado = await this.sesiones.lista();
    return resultado.ok ? resultado.valor : [];
  }
}

@Injectable()
export class RevocaLaSesion {
  private readonly sesiones = inject(SESIONES_PORT);

  ejecuta(id: string): Promise<Result<void, AppError>> {
    return this.sesiones.revoca(id);
  }
}
