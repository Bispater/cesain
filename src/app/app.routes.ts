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
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        canActivate: [soloAdminGuard],
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
        loadComponent: () =>
          import('./features/apsorad/apsorad-planilla').then((m) => m.ApsoradPlanilla),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
