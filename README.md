# CESAIN — Liquidaciones Médicas (Prototipo)

Software web que reemplaza el cálculo manual de liquidaciones médicas (hoy en un
Excel de ~30 pestañas). Prototipo **solo front-end** con datos mock.

## Stack
- **Angular 20** — Standalone Components, **Signals**, Control Flow (`@if`/`@for`), rutas lazy.
- **TypeScript estricto**.
- **TailwindCSS v4** — layout **Bento UI** y tema morado de marca.

## Cómo correr
```bash
npm install
npm start          # ng serve -> http://localhost:4200
```
Login: cualquier correo + cualquier contraseña (auth simulada).

## Qué resuelve
- **Liquidación por profesional**: pago, copago y el **% que retiene la clínica**
  (arriendo de espacio: 25% / 22%) → total profesional vs. total clínica.
- **Laboratorio / Tecnólogo médico**: cobros por tipos de examen (FONASA/Particular)
  con bono total y copago.
- **Archivo mal nombrado**: el filtro usa el **período REAL** de los datos, no el
  nombre del archivo ("Junio.xlsx" con datos de Mayo). Se marca con una alerta.
- **Ingesta**: el servicio limpia celdas `"NaN"`, parsea fechas en texto
  ("06-may", "27-05-2026") y unifica todo a una estructura plana.

## Estructura
```
src/app/
├── core/
│   ├── models/liquidacion.model.ts        # contrato normalizado
│   ├── data/raw-excel.mock.ts             # "Excel sucio" de prueba
│   ├── services/liquidacion.service.ts    # ingesta + Signals + filtros
│   ├── services/auth.service.ts
│   └── guards/auth.guard.ts
├── layout/shell.ts                        # sidebar + router-outlet
├── features/
│   ├── auth/login.ts
│   ├── dashboard/dashboard.ts             # Bento + gráfico + widgets
│   ├── liquidaciones/liquidaciones.ts     # tabla + filtros + detalle
│   └── importar/importar.ts               # flujo "subir y procesar"
├── shared/pipes/clp.pipe.ts               # formato $ CLP
└── app.routes.ts
```
