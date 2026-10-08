# Boletaire – versión web

Previsión de setas en Catalunya. Página estática: no necesita servidor ni base de datos.

## Configurar
Edita `config.js`:
- `contact`: correo donde recibir los avisos de errores (vacío = sin botón).
- `kofi`: enlace de donaciones, por ejemplo de Ko-fi (vacío = sin botón).
- `amazonTag`: tu ID de Afiliados de Amazon, por ejemplo `boletaire-21` (vacío = enlaces sin comisión).

Rellena tus datos en `legal.html` (donde pone [TU NOMBRE…]).

## Publicar en GitHub Pages
1. Crea un repositorio público llamado `boletaire` y sube todo el contenido de esta carpeta.
2. Settings → Pages → Source: «Deploy from a branch», rama `main`, carpeta `/ (root)`.
3. En un par de minutos estará en `https://TU-USUARIO.github.io/boletaire/`.

## Dominio propio
1. En GitHub: Settings → Pages → Custom domain → escribe tu dominio (por ejemplo `boletaire.es`) y activa «Enforce HTTPS».
2. En tu registrador, en la zona DNS del dominio:
   - Cuatro registros **A** para `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - Un registro **CNAME** para `www` → `TU-USUARIO.github.io`

## Datos diarios
`data/forecast.json` y `data/history.json` los actualiza la tarea de las 7:00. Si no se actualizan, la app sigue funcionando con los últimos datos.

## Versiones
Cada cambio queda guardado en el historial de Git: para volver atrás, `git revert` o «Revert» en GitHub.
