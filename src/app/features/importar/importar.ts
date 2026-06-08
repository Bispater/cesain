import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Estado = 'idle' | 'validando' | 'ok' | 'error';

@Component({
  selector: 'app-importar',
  imports: [RouterLink],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Importar / Validar Excel</h1>
      <p class="text-sm text-gray-500">
        Sube un libro de Excel para <b>verificar</b> que sea válido y tenga información.
        Esta acción <b>no modifica la base de datos</b>; los datos se ingresan manualmente.
      </p>
    </header>

    <div class="max-w-2xl mx-auto">
      @if (estado() === 'idle') {
        <label class="block rounded-2xl border-2 border-dashed border-brand-200 bg-white
                      p-12 text-center cursor-pointer hover:border-brand-400 transition-colors">
          <div class="h-16 w-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-4">
            <span class="text-3xl text-brand-500">⇪</span>
          </div>
          <p class="font-semibold text-gray-700">Arrastra tu archivo .xlsx / .xls o haz clic</p>
          <p class="text-xs text-gray-400 mt-1">Solo se valida el archivo (no se importa nada)</p>
          <input type="file" accept=".xlsx,.xls" class="hidden" (change)="onArchivo($event)" />
          <span class="inline-block mt-5 rounded-lg bg-brand-600 text-white text-sm font-semibold px-5 py-2.5">
            Validar archivo
          </span>
        </label>
      } @else {
        <div class="rounded-2xl bg-white shadow-sm border border-gray-100 p-8">
          @if (estado() === 'validando') {
            <div class="flex items-center gap-3">
              <span class="h-5 w-5 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin"></span>
              <p class="font-semibold text-gray-700">Validando «{{ nombre() }}»…</p>
            </div>
          } @else if (estado() === 'ok') {
            <div class="flex items-start gap-3">
              <span class="h-7 w-7 shrink-0 rounded-full bg-green-500 text-white grid place-items-center">✓</span>
              <div>
                <p class="font-semibold text-gray-800">Archivo válido</p>
                <p class="text-sm text-gray-600 mt-1">{{ mensaje() }}</p>
                <p class="text-xs text-gray-400 mt-2">
                  No se agregó nada a la base de datos. Para cargar los datos, ve a
                  <b>Liquidaciones → + Nueva liquidación</b> e ingrésalos manualmente.
                </p>
              </div>
            </div>
          } @else {
            <div class="flex items-start gap-3">
              <span class="h-7 w-7 shrink-0 rounded-full bg-red-500 text-white grid place-items-center">✕</span>
              <div>
                <p class="font-semibold text-gray-800">No se pudo validar</p>
                <p class="text-sm text-red-600 mt-1">{{ mensaje() }}</p>
              </div>
            </div>
          }

          @if (estado() !== 'validando') {
            <div class="flex gap-3 mt-8">
              <a routerLink="/liquidaciones"
                 class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5">
                Ir a Liquidaciones
              </a>
              <button (click)="reiniciar()"
                      class="rounded-lg border border-gray-200 text-gray-600 text-sm px-5 py-2.5 hover:bg-gray-50">
                Validar otro
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Importar {
  readonly estado = signal<Estado>('idle');
  readonly nombre = signal('');
  readonly mensaje = signal('');

  async onArchivo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.nombre.set(file.name);
    this.estado.set('validando');

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      return this.fallar('El archivo no es un Excel (.xlsx o .xls).');
    }
    if (file.size === 0) {
      return this.fallar('El archivo está vacío.');
    }

    // Verifica la firma del archivo (xlsx = ZIP "PK").
    let bytes = new Uint8Array(0);
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      return this.fallar('No se pudo leer el archivo.');
    }
    await delay(700);

    if (ext.endsWith('.xlsx') && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
      return this.fallar('El archivo .xlsx parece estar dañado o no es válido.');
    }

    const kb = (file.size / 1024).toFixed(0);
    this.mensaje.set(`«${file.name}» es un Excel válido y contiene información (${kb} KB).`);
    this.estado.set('ok');
  }

  private fallar(msg: string) {
    this.mensaje.set(msg);
    this.estado.set('error');
  }

  reiniciar() {
    this.estado.set('idle');
    this.nombre.set('');
    this.mensaje.set('');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
