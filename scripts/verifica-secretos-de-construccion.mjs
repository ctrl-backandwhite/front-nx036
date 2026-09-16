/**
 * PUERTA. Un secreto no puede viajar ni como `ENV` del Dockerfile ni como argumento de construcción.
 *
 * El `ENV` de una etapa queda en la METADATA de todas las capas que vienen después DENTRO de esa
 * etapa. Que la etapa sea la de compilación y no se copie a la imagen final no lo borra: sigue
 * existiendo como capa, y el flujo de trabajo publica esas capas con `cache-to: type=gha,mode=max`,
 * que exporta justamente las intermedias. Cualquiera que pueda leer la caché de Actions del
 * repositorio —cualquier ejecución, no solo las de quien tiene acceso al panel de secretos— se lleva
 * el valor en claro con un `docker buildx` apuntando a esa caché.
 *
 * Lo mismo con `build-args`: BuildKit los guarda en la configuración de la imagen de la etapa y
 * `docker history` los enseña. Los argumentos de construcción son para lo que se puede contar.
 *
 * La vía buena es `RUN --mount=type=secret`: el valor se monta como fichero durante ESE comando y
 * nunca entra en ninguna capa, ni en la caché exportada, ni en `docker history`.
 *
 * Se comprueba por el NOMBRE y no por el valor a propósito: aquí no hay ningún secreto que mirar, y
 * una puerta que necesite el secreto para comprobar que no se filtra el secreto no se puede correr.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lo que delata a un secreto en un nombre de variable. */
const DELATORES = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|_KEY|APIKEY|LLAVE)/i;

/** Nombres que suenan a secreto y no lo son. Cada excepción se justifica al añadirla. */
const NO_SON_SECRETOS = new Set([]);

const esSecreto = (nombre) => DELATORES.test(nombre) && !NO_SON_SECRETOS.has(nombre);

const fallos = [];

// ── 1. Ningún `ENV` del Dockerfile puede llamarse como un secreto ────────────────────────────────
const dockerfile = readFileSync(join(RAIZ, 'Dockerfile'), 'utf8');
dockerfile.split('\n').forEach((linea, i) => {
  const env = /^\s*ENV\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(linea);
  if (env && esSecreto(env[1])) {
    fallos.push(
      `Dockerfile:${i + 1}  ENV ${env[1]} deja el valor en la metadata de la etapa.\n` +
        `    Móntalo solo durante el comando que lo necesita:\n` +
        `    RUN --mount=type=secret,id=${env[1].toLowerCase()} \\\n` +
        `        ${env[1]}="$(cat /run/secrets/${env[1].toLowerCase()} 2>/dev/null || true)" \\\n` +
        `        <el comando>`,
    );
  }
});

// ── 2. Ningún secreto puede entrar por `build-args` en los flujos de trabajo ─────────────────────
const flujos = join(RAIZ, '.github', 'workflows');
if (existsSync(flujos)) {
  for (const fichero of readdirSync(flujos).filter((f) => /\.ya?ml$/.test(f))) {
    const lineas = readFileSync(join(flujos, fichero), 'utf8').split('\n');
    let dentro = false;
    let sangria = 0;
    lineas.forEach((linea, i) => {
      const abre = /^(\s*)build-args:\s*\|/.exec(linea);
      if (abre) {
        dentro = true;
        sangria = abre[1].length;
        return;
      }
      if (!dentro) return;
      if (linea.trim() !== '' && linea.search(/\S/) <= sangria) {
        dentro = false;
        return;
      }
      const arg = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(linea);
      if (arg && esSecreto(arg[1])) {
        fallos.push(
          `.github/workflows/${fichero}:${i + 1}  build-args lleva ${arg[1]}, que queda en ` +
            `\`docker history\` y en la caché exportada.\n` +
            `    Pásalo por \`secrets:\` en vez de por \`build-args:\`:\n` +
            `      secrets: |\n` +
            `        ${arg[1].toLowerCase()}=\${{ secrets.${arg[1]} }}`,
        );
      }
    });
  }
}

if (fallos.length > 0) {
  console.error(`\n✗ ${fallos.length} secreto(s) de construcción expuesto(s):\n`);
  fallos.forEach((f) => console.error(`  ${f}\n`));
  process.exit(1);
}

console.log('✓ Ningún secreto viaja por ENV ni por build-args.');
