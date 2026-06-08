import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { unsavedGuard } from './core/guards/unsaved.guard';
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
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'liquidaciones',
        loadComponent: () =>
          import('./features/liquidaciones/liquidaciones').then((m) => m.Liquidaciones),
      },
      {
        path: 'planilla/:id',
        loadComponent: () =>
          import('./features/planilla/planilla').then((m) => m.Planilla),
        canDeactivate: [unsavedGuard],
      },
      {
        path: 'profesionales',
        loadComponent: () =>
          import('./features/profesionales/profesionales').then((m) => m.Profesionales),
      },
      {
        path: 'prestaciones',
        loadComponent: () =>
          import('./features/prestaciones/prestaciones').then((m) => m.Prestaciones),
      },
      {
        path: 'importar',
        loadComponent: () =>
          import('./features/importar/importar').then((m) => m.Importar),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion').then((m) => m.Configuracion),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
