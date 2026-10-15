# Boletaire – versión web

Previsión de setas en Catalunya. Página estática: no necesita servidor ni base de datos.

## Configurar
Edita `config.js`:
- `contact`: correo donde recibir los avisos de errores (vacío = sin botón).
- `kofi`: enlace de donaciones, por ejemplo de Ko-fi (vacío = sin botón).
- `amazonTag`: tu ID de Afiliados de Amazon, por ejemplo `boletaire-21` (vacío = enlaces sin comisión).

Rellena tus datos en `legal.html` (donde pone [TU NOMBRE…]).

## Publicar en GitHub Pages
La web se publica desde este repositorio, `boletscat/boletscat.github.io`, y está en https://boletscat.github.io.
- Settings → Pages → Source: «Deploy from a branch», rama `main`, carpeta `/ (root)`. El archivo `.nojekyll` hace que GitHub sirva los archivos tal cual, sin procesarlos con Jekyll.
- No hay paso de compilación: cada cambio que llega a `main` se publica solo en uno o dos minutos.

## Dominio propio
1. En GitHub: Settings → Pages → Custom domain → escribe tu dominio (por ejemplo `boletaire.es`) y activa «Enforce HTTPS».
2. En tu registrador, en la zona DNS del dominio:
   - Cuatro registros **A** para `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - Un registro **CNAME** para `www` → `boletscat.github.io`

## Datos diarios (automático)
La acción `.github/workflows/forecast.yml` («Previsión diaria») se ejecuta cada mañana a las 4:40 UTC (6:40 en verano, 5:40 en invierno, hora de Madrid). Descarga los datos de Meteocat y MET Norway, calcula la previsión con `model.js` (script `scripts/update-forecast.mjs`) y hace un commit en `main` con `data/forecast.json` y `data/history.json` («Previsión AAAA-MM-DD»). Ese commit vuelve a publicar la web.
1. Para lanzarla a mano: pestaña **Actions** → «Previsión diaria» → **Run workflow**.
2. Si un día falla (por ejemplo, Meteocat caído), la web sigue con los datos del día anterior y GitHub te avisa por correo.
3. GitHub desactiva las acciones programadas de un repositorio tras 60 días sin actividad; como la acción hace un commit cada día, no debería pasar, pero si se para, actívala de nuevo en **Actions**.

## Avisos entre usuarios (opcional, gratis)
Para que la gente pueda avisar de «he encontrado setas aquí», usar la **Comunidad** (foro de dudas) y marcar «Estoy aquí buscando» en la web hace falta una pequeña base de datos. Supabase la da gratis:
1. Entra en https://supabase.com, crea una cuenta y un proyecto nuevo (región: Europa).
2. En el proyecto: **SQL Editor** → pega todo el contenido de `supabase.sql` → **Run**.
3. En **Project Settings → API** copia la **Project URL** y la clave pública **anon** (o «publishable»).
4. Pégalas en `config.js` en `supabaseUrl` y `supabaseKey` y vuelve a subir la web.
Sin estos datos, la web funciona igual pero sin avisos, foro ni «Estoy aquí». Solo se publica la zona, nunca el punto exacto.

### Cuentas de usuario
Para publicar en la comunidad hay que entrar con el correo (sin contraseña: llega un enlace). Ver el mapa sigue siendo libre.
1. **SQL Editor** → pega `supabase_cuentas.sql` → **Run** (después de `supabase.sql`). El correo del creador queda como administrador: puede borrar mensajes y bloquear cuentas desde el foro.
2. **Authentication → URL Configuration**: *Site URL* = la dirección de la web (https://boletscat.github.io) y añade `https://boletscat.github.io/**` en *Redirect URLs*.
3. Con el correo gratuito de Supabase solo salen **2 correos por hora** y en inglés. Para más (y en castellano), configura un SMTP propio en **Authentication → Emails → SMTP Settings** (p. ej. Brevo, 300 correos al día gratis) y edita las plantillas «Magic link» y «Confirm signup».
4. Las salidas de cada usuario se guardan en la tabla `user_data`; solo las puede leer su dueño.

## Contador de visitas (opcional, sin cookies)
Para saber cuánta gente entra y qué zonas miran, sin pedir permiso de cookies:
- **GoatCounter** (gratis para proyectos pequeños): crea una cuenta en https://www.goatcounter.com con el código que quieras (p. ej. `boletaire`) y ponlo en `config.js` → `goatcounter: "boletaire"`. Verás las visitas en `https://boletaire.goatcounter.com`, incluidas las zonas que se abren (`zona/montseny`…).
- **o Cloudflare Web Analytics** (gratis): crea un sitio en Cloudflare → Web Analytics y copia el token en `cloudflareToken`.

## Vista previa al compartir
La web ya trae imagen y título para cuando se comparte el enlace (`og.jpg`). Algunas apps (WhatsApp, Facebook) necesitan la dirección completa: cuando tengas la definitiva, en `index.html` cambia `content="og.jpg"` por `content="https://TU-DIRECCION/og.jpg"` y añade `<meta property="og:url" content="https://TU-DIRECCION/">`.

## Versiones
Cada cambio queda guardado en el historial de Git: para volver atrás, `git revert` o «Revert» en GitHub.
