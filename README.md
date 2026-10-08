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

## Datos diarios (automático)
La carpeta `.github/workflows/` trae una acción que cada mañana (6:40 en verano, 5:40 en invierno) descarga los datos de Meteocat y MET Norway, calcula la previsión con `model.js` (script `scripts/update-forecast.mjs`) y guarda `data/forecast.json` y `data/history.json`.
1. Al subir el repositorio a GitHub, entra en la pestaña **Actions** y pulsa «I understand… enable workflows» si te lo pide.
2. Para probarla al momento: Actions → «Previsión diaria» → **Run workflow**.
3. Si un día falla (por ejemplo, Meteocat caído), la web sigue con los datos del día anterior y GitHub te avisa por correo.

## Versiones
Cada cambio queda guardado en el historial de Git: para volver atrás, `git revert` o «Revert» en GitHub.
