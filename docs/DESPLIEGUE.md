# Despliegue del escaparate

GitOps sobre k3s con Argo CD: **nadie ejecuta `docker build` ni `kubectl apply` a mano**. Se empuja
a una rama y el resto lo hace el CI (`.github/workflows/imagen.yml`).

## La rama decide el entorno

| Rama | Entorno | Overlay en `nexadrop-deploy` | API que consume |
|---|---|---|---|
| `features` | desarrollo | `overlays/des/` | `https://api-dev.nx036.com` |
| `develop` | preproducción | `overlays/pre/` | `https://api-pre.nx036.com` |
| `main` | producción | `overlays/pro/` | `https://api.nx036.com` |

Una rama sin entorno asignado **falla a propósito** en vez de desplegar a un sitio cualquiera.

## Qué hace el CI

1. **Puertas de calidad**: `npm ci`, `npm run lint` —que verifica las fronteras del hexágono, no
   solo el estilo—, `npm test` y `npm audit --omit=dev --audit-level=critical`. En rojo, no se
   publica imagen. La puerta de `audit` mira solo las dependencias de PRODUCCIÓN (lo que viaja al
   navegador) y bloquea por CRÍTICA —el umbral está en `critical` y no en `high` a propósito: hay dos
   avisos ALTOS de Angular SSR que no se cierran sin un `ng update` con migraciones, y su riesgo real
   aquí es bajo porque no hay servidor Node vivo; el detalle y cuándo subir a `high` está en el
   comentario del propio `imagen.yml`—. Es la puerta que habría parado el XSS crítico de DOMPurify.
2. **Construye y publica** `registry.nx036.com/nexadrop/frontend:<entorno>-sha-<commit>`. El tag
   lleva **el entorno y el SHA**, nunca `latest`: el mismo commit produce imágenes distintas para
   PRE y PRO porque la API se cocina DENTRO al construir.
3. **Escribe el tag** en `nexadrop-deploy` y **Argo CD** sincroniza en unos minutos.

Se construye con **Node 22**.

### Las dos variables que, si faltan, NO fallan

Y eso es lo peligroso: sale una web que **parece** prerenderizada y no lo está.

- `NEXADROP_API_INTERNA` — un backend accesible desde el runner.
- `NEXADROP_PRERENDER_TOKEN` — tiene que valer lo mismo que `RATELIMIT_BUILD_TOKEN` en ese backend.
  Si no coincide, el límite de peticiones corta el prerenderizado a unas quince fichas y el resto
  salen con una página de error dentro.

## Empujar NO es desplegar

Una imagen se publicó **sin que se escribiera el tag** y el entorno siguió sirviendo lo anterior sin
que nada lo dijera. Después de cada push:

```bash
gh run list --limit 3
```

Inspeccionar el clúster necesita acceso SSH al VPS, que **no forma parte de este repositorio**: se
configura aparte. Con un clon suelto se construye, se prueba y se despliega.

Al pedir una página para comprobar, añade un parámetro aleatorio (`?x=$RANDOM`): **Cloudflare
cachea**, y si no, comprobarás la copia vieja.

## Un despliegue rompe las pestañas abiertas

El navegador de quien ya estaba dentro pide trozos de la versión anterior, que ya no existen. Es
esperado: se recarga y ya. Conviene saberlo para no diagnosticar un fallo que no lo es.
