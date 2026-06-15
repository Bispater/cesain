import { ErrorHandler, Injectable, inject } from '@angular/core';
import { VersionService } from './services/version.service';

/**
 * Si falla la carga de un "chunk" (típico cuando el cliente tiene una versión
 * vieja en caché y el archivo ya no existe tras un deploy), en vez de quedar
 * congelado, mostramos el aviso para recargar.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private version = inject(VersionService);

  handleError(error: unknown): void {
    const msg = String((error as { message?: string })?.message ?? error);
    if (/ChunkLoadError|dynamically imported module|module script failed|Failed to fetch/i.test(msg)) {
      this.version.marcarActualizacion();
    }
    console.error(error);
  }
}
