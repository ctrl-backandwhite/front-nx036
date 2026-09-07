# ══════════════════════════════════════════════════════════════════════════════
# Etapa 1 · Construcción
# ══════════════════════════════════════════════════════════════════════════════
# Debian/glibc (node:22), NUNCA alpine/musl. La misma trampa que documenta el
# Dockerfile del frontend de React, y aquí aplica por el mismo motivo: este
# proyecto también compila el CSS con Tailwind 4 (`@tailwindcss/postcss`), que
# arrastra `@tailwindcss/oxide`, un binario nativo. El candado trae la variante
# `@tailwindcss/oxide-linux-x64-gnu`, compilada contra glibc; sobre musl la
# construcción se cae al resolver el complemento de Tailwind. Comprobado en el
# `package-lock.json` antes de escribir esto, no heredado a ciegas del React.
FROM node:22 AS construccion

# A qué entorno apunta la imagen: `des`, `pre` o `pro`.
#
# Es un argumento y no un valor fijo porque la MISMA receta tiene que servir para los tres: si cada
# entorno tuviera su Dockerfile, acabarían divergiendo en cosas que no son el entorno —la versión de
# Node, el orden de las capas— y preproducción dejaría de ensayar lo que va a pasar en producción.
#
# El valor por defecto es `pro` porque es el que no admite atajos: si alguien construye sin decir nada,
# lo que sale es lo más restrictivo, no lo más permisivo. Equivocarse hacia el lado seguro.
ARG ENTORNO=pro
WORKDIR /app

# El manifiesto y el candado ANTES que el código: mientras esos dos ficheros no
# cambien, Docker reutiliza la capa de dependencias y la construcción se salta
# el minuto largo que tarda npm.
COPY package.json package-lock.json ./
# `npm ci` y no `npm install`: instala EXACTAMENTE lo que dice el candado y falla
# si el candado y el manifiesto no cuadran, en lugar de arreglarlo por su cuenta
# y dejar en la imagen versiones que nadie ha revisado.
RUN npm ci --no-audit --no-fund

COPY . .

# La CLI de Angular pregunta por la telemetría la primera vez que se ejecuta. En
# una construcción no interactiva esa pregunta no la contesta nadie: se apaga por
# variable de entorno para que no cuelgue ni mande nada hacia fuera.
ENV NG_CLI_ANALYTICS=false

# `npm run build:<entorno>` = `ng build --configuration <entorno>`, que sustituye el fichero de
# entorno por el que toca (ver `fileReplacements` en `angular.json`). Lo que cambia entre los tres es
# a qué dominio apunta y si lleva las ayudas de desarrollo; CÓMO se compila es idéntico, para que lo
# que se certifica en preproducción sea exactamente lo que se sirve en producción.
# (configuración `pro` por defecto, según
# `angular.json`). Con `outputMode: static` esto NO deja un servidor Node: el
# paquete de servidor se usa DURANTE la construcción para prerenderizar y luego
# se tira. Lo que queda es:
#   dist/front-nx036/browser/index.html       la portada ya pintada
#   dist/front-nx036/browser/index.csr.html   el esqueleto para el resto de rutas
#   dist/front-nx036/browser/*-HASH.js|css    los estáticos, con hash en el nombre
# La dirección del backend MIENTRAS SE CONSTRUYE.
#
# Es lo que decide si el prerenderizado sirve de algo. En el navegador la API vive en el mismo origen y
# basta con `/api/...`; al generar el HTML no hay navegador, el código corre en Node y una ruta relativa
# no apunta a ninguna parte. Sin esto, las peticiones fallan EN SILENCIO y las páginas se escriben con
# sus marcadores de carga: medido, la portada pasaba de 3.995 caracteres de texto y 24 precios a 1.035
# y ninguno.
#
# El backend tiene que estar accesible desde donde se construye. Si no lo está, la imagen sale igual
# —no falla— pero con las páginas vacías, así que conviene comprobarlo tras cada despliegue.
ARG NEXADROP_API_INTERNA=http://backend:18082
ENV NEXADROP_API_INTERNA=${NEXADROP_API_INTERNA}

# CUÁNTAS fichas de producto se escriben al construir.
#
# Prerenderizar las 7.729 no cabe: un HTML de ficha pesa entre 105 y 466 kB —lleva dentro la respuesta
# del backend para que el navegador no la vuelva a pedir— y serían del orden de 1,5 GB. Así que se
# escribe un CUPO con las que más se comparten: las de la portada primero y las más vendidas después
# (el criterio, en `src/app/features/catalog/presentation/fichas-a-prerenderizar.ts`). El resto —y todo
# lo que se cargue DESPUÉS de construir— se sigue sirviendo como hasta ahora, montado por el navegador,
# con sus etiquetas para compartir resueltas por `seo-ficha.js`. Ninguna ficha deja de verse.
#
# Es un argumento para poder subirlo o bajarlo por despliegue sin tocar código. Medido en esta imagen,
# con optimización y `.gz` incluidos:
#
#   cupo   fichas   tiempo de compilación   peso de `browser/`
#      0        0             ~54 s               6,5 MiB      (comportamiento anterior)
#    100      100             ~74 s              19,5 MiB
#    300      300             ~99 s              45,6 MiB
#    500      500            ~127 s              72,0 MiB
#
# 300 es el valor por defecto: cubre las 78 de la portada más las 222 más vendidas, cuesta unos 45
# segundos de compilación y 39 MiB de imagen. Subirlo sale lineal —unos 0,15 s y 130 kiB por ficha—,
# así que el techo lo pone la paciencia de quien despliega, no ningún salto. Con 0 no se prerenderiza
# ninguna: es la marcha atrás si algún día estorba.
ARG NEXADROP_FICHAS_PRERENDERIZADAS=300
ENV NEXADROP_FICHAS_PRERENDERIZADAS=${NEXADROP_FICHAS_PRERENDERIZADAS}

# TESTIGO con el que esta compilación se identifica ante el backend.
#
# Es lo que hace que las 300 de arriba quepan. El backend limita el escaparate público a 100 peticiones
# por minuto y por IP —su defensa contra el volcado masivo del catálogo— y prerenderizar fichas es,
# visto desde ahí, exactamente un volcado: con ese cupo no caben más de unas quince y las demás se
# escriben con una página de error dentro. Con el testigo, el limitador aplica la regla `build.prerender`
# (1.200/min) en vez de la del escaparate.
#
# Lo que concede es un CUPO MÁS ALTO, no la ausencia de límite, y solo para los GET del catálogo
# público: ni escribe, ni toca la autenticación, ni la API de socios. Está en el `RateLimitFilter` del
# backend con sus pruebas.
#
# Tiene que valer lo mismo que `RATELIMIT_BUILD_TOKEN` en el backend del entorno contra el que se
# compila. VACÍO por defecto: sin él todo se comporta como antes y el cupo real vuelve a ser el del
# escaparate, así que conviene bajar `NEXADROP_FICHAS_PRERENDERIZADAS` si no se configura.
#
# No queda en la imagen final: esta etapa es la de compilación y no se copia al servidor de estáticos.
ARG NEXADROP_PRERENDER_TOKEN=
ENV NEXADROP_PRERENDER_TOKEN=${NEXADROP_PRERENDER_TOKEN}

RUN npm run build:${ENTORNO}

# PUERTA. `ng build` no mira lo que queda DENTRO de las páginas que escribe: si el backend contesta un
# 429 —su límite anti-volcado son 100 peticiones por minuto y por IP, y una ficha son unas cuatro— la
# aplicación pinta su pantalla de «no se ha podido cargar este producto», el compilador la da por
# prerenderizada y termina en verde. Medido: en la primera prueba con 300 fichas, 278 quedaron con el
# mensaje de error dentro y nada falló. Esto lo convierte en un fallo ruidoso, que es donde tiene que
# fallar: al construir la imagen, no en producción.
RUN npm run verifica:prerender

# ══════════════════════════════════════════════════════════════════════════════
# Etapa 2 · Imagen final
# ══════════════════════════════════════════════════════════════════════════════
# Aquí SÍ vale alpine, y es la diferencia grande con el Dockerfile del React.
# Aquel necesita `node:22-slim` en la imagen final porque su escaparate se pinta
# en servidor y el proceso Node sigue vivo en producción; por eso también arrastra
# `node_modules` y tiene una etapa entera dedicada a instalar las dependencias de
# producción a solas. Aquí no corre nada de Node: solo nginx entregando ficheros,
# así que la restricción glibc-frente-a-musl de arriba no alcanza a esta etapa
# —el binario de Tailwind solo hace falta al CONSTRUIR el CSS—. La imagen final
# baja de cientos de megas a unas decenas.
FROM nginx:alpine AS final

# La configuración va a `conf.d/default.conf`, PISANDO la de ejemplo que trae la
# imagen. No es por comodidad: esa configuración de ejemplo publica esta misma
# carpeta en el puerto 80 sin ninguna de nuestras reglas —sin el 403 a los
# rastreadores, sin el reenvío al backend y sin las reglas de caché—. Dejarla
# viva sería abrir una segunda puerta al mismo contenido, y sin protección.
# El módulo de JavaScript de nginx (njs). Es lo que permite resolver las etiquetas para compartir de
# la ficha en el momento de la petición, en vez de prerenderizar 7.729 páginas que además quedarían
# obsoletas en cuanto se cargara un producto nuevo. El porqué, medido, en `seo-ficha.js`.
#
# `load_module` solo vale en el contexto principal, así que se añade a la PRIMERA línea del
# `nginx.conf` de la imagen; nuestro fichero se incluye más adentro, dentro de `http`, y allí ya no
# se admite.
RUN apk add --no-cache nginx-module-njs \
 && sed -i '1i load_module modules/ngx_http_js_module.so;' /etc/nginx/nginx.conf

COPY seo-ficha.js /etc/nginx/njs/seo-ficha.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo la carpeta `browser`. La salida de `ng build` tiene también
# `prerendered-routes.json` y `3rdpartylicenses.txt`, que son artefactos de la
# construcción y no tienen por qué acabar publicados en la web.
COPY --from=construccion /app/dist/front-nx036/browser /usr/share/nginx/html

# Precompresión. Cada fichero de texto se deja además en `.gz` con el nivel máximo, y nginx lo sirve
# tal cual gracias a `gzip_static`. Comprimir al construir en vez de en cada petición aprieta más
# —nivel 9 frente al 6 que se puede permitir en caliente— y no gasta procesador por visita.
# Se conserva el original al lado (`-k`) porque hace falta para quien no acepte gzip.
RUN find /usr/share/nginx/html -type f \
      \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \
         -o -name '*.json' -o -name '*.txt' -o -name '*.xml' \) \
      -size +1k -exec gzip -9 -k {} \;

# El mismo puerto que el escaparate de React, que es el que espera la pasarela
# de delante. Está declarado en el `listen` del nginx.conf.
EXPOSE 3003
