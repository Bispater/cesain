import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { PRESTACION_REPOSITORY } from './core/repositories/prestacion.repository';
import { LocalPrestacionRepository } from './core/repositories/local-prestacion.repository';
import { FirestorePrestacionRepository } from './core/repositories/firestore-prestacion.repository';
import { LIQUIDACION_REPOSITORY } from './core/repositories/liquidacion.repository';
import { LocalLiquidacionRepository } from './core/repositories/local-liquidacion.repository';
import { FirestoreLiquidacionRepository } from './core/repositories/firestore-liquidacion.repository';
import { PROFESIONAL_REPOSITORY } from './core/repositories/profesional.repository';
import { LocalProfesionalRepository } from './core/repositories/local-profesional.repository';
import { FirestoreProfesionalRepository } from './core/repositories/firestore-profesional.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),

    // Catálogo de precios: Firestore (cesain-web) si usarFirebase=true,
    // si no localStorage. Se cambia en src/environments/environment.ts.
    {
      provide: PRESTACION_REPOSITORY,
      useClass: environment.usarFirebase
        ? FirestorePrestacionRepository
        : LocalPrestacionRepository,
    },
    {
      provide: LIQUIDACION_REPOSITORY,
      useClass: environment.usarFirebase
        ? FirestoreLiquidacionRepository
        : LocalLiquidacionRepository,
    },
    {
      provide: PROFESIONAL_REPOSITORY,
      useClass: environment.usarFirebase
        ? FirestoreProfesionalRepository
        : LocalProfesionalRepository,
    },
  ],
};
