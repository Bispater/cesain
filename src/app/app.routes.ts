import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { unsavedGuard } from './core/guards/unsaved.guard';
import { apsoradGuard, soloAdminGuard } from './core/guards/rol.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    // Comprobante imprimible: fuera del Shell para una impresión limpia.
    path: 'comprobante/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/comprobante/comprobante').then((m) => m.Comprobante),
  },
  {
    // Comprobante APSORAD imprimible: también fuera del Shell.
    path: 'apsorad/comprobante/:id',
    canActivate: [apsoradGuard],
    loadComponent: () =>
      import('./features/apsorad/apsorad-comprobante').then((m) => m.ApsoradComprobante),
  },
  {
    // Comprobante dentista imprimible: también fuera del Shell.
    path: 'dentistas/comprobante/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dentistas/dentistas-comprobante').then((m) => m.DentistasComprobante),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        // Dashboard público: visible para todos los roles (incluye resumen APSORAD).
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'liquidaciones',
        canActivate: [soloAdminGuard],
        loadComponent: () =>
          import('./features/liquidaciones/liquidaciones').then((m) => m.Liquidaciones),
      },
      {
        path: 'planilla/:id',
        canActivate: [soloAdminGuard],
        loadComponent: () =>
          import('./features/planilla/planilla').then((m) => m.Planilla),
        canDeactivate: [unsavedGuard],
      },
      {
        path: 'profesionales',
        canActivate: [soloAdminGuard],
        loadComponent: () =>
          import('./features/profesionales/profesionales').then((m) => m.Profesionales),
      },
      {
        path: 'prestaciones',
        canActivate: [soloAdminGuard],
        loadComponent: () =>
          import('./features/prestaciones/prestaciones').then((m) => m.Prestaciones),
      },
      {
        path: 'configuracion',
        canActivate: [soloAdminGuard],
        loadComponent: () =>
          import('./features/configuracion/configuracion').then((m) => m.Configuracion),
      },
      // ── Dentistas (visible para todos los roles con sesión) ──
      {
        path: 'dentistas',
        loadComponent: () =>
          import('./features/dentistas/dentistas-liquidaciones').then((m) => m.DentistasLiquidaciones),
      },
      {
        path: 'dentistas/prestaciones',
        loadComponent: () =>
          import('./features/dentistas/dentistas-prestaciones').then((m) => m.DentistasPrestaciones),
      },
      {
        path: 'dentistas/convenios',
        loadComponent: () =>
          import('./features/dentistas/dentistas-convenios').then((m) => m.DentistasConvenios),
      },
      {
        path: 'dentistas/profesionales',
        loadComponent: () =>
          import('./features/dentistas/dentistas-profesionales').then((m) => m.DentistasProfesionales),
      },
      {
        path: 'dentistas/planilla/:id',
        canDeactivate: [unsavedGuard],
        loadComponent: () =>
          import('./features/dentistas/dentistas-planilla').then((m) => m.DentistasPlanilla),
      },
      // ── APSORAD (superadmin + rol apsorad) ──
      {
        path: 'apsorad',
        canActivate: [apsoradGuard],
        loadComponent: () =>
          import('./features/apsorad/apsorad-liquidaciones').then((m) => m.ApsoradLiquidaciones),
      },
      {
        path: 'apsorad/catalogo',
        canActivate: [apsoradGuard],
        loadComponent: () =>
          import('./features/apsorad/apsorad-catalogo').then((m) => m.ApsoradCatalogo),
      },
      {
        path: 'apsorad/:id',
        canActivate: [apsoradGuard],
        canDeactivate: [unsavedGuard],
        loadComponent: () =>
          import('./features/apsorad/apsorad-planilla').then((m) => m.ApsoradPlanilla),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
