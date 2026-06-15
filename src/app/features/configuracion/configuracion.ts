import { Component, inject, signal } from '@angular/core';
import { CatalogosService, ItemCatalogo } from '../../core/services/catalogos.service';
import { ProfesionalService } from '../../core/services/profesional.service';
import { UsuariosService, UsuarioRol } from '../../core/services/usuarios.service';
import { Rol } from '../../core/services/auth.service';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-configuracion',
  imports: [Spinner],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Configuración</h1>
      <p class="text-sm text-gray-500">
        Administra los tipos de profesional, las sedes y las especialidades que aparecen en los formularios.
      </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl">
      <!-- Tipos -->
      <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <h2 class="font-bold text-gray-800 mb-1">Tipos de profesional</h2>
        <p class="text-xs text-gray-400 mb-4">Ej: Médico, Kinesiólogo, Nutricionista…</p>

        <div class="flex gap-2 mb-4">
          <input [value]="nuevoTipo()" (input)="nuevoTipo.set($any($event.target).value)"
                 (keyup.enter)="agregarTipo()" placeholder="Nuevo tipo…"
                 class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          <button (click)="agregarTipo()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">
            Agregar
          </button>
        </div>

        <ul class="divide-y divide-gray-100">
          @for (t of cat.tipos(); track t.id) {
            <li class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-700">{{ t.nombre }}</span>
              <button (click)="eliminar('tipo', t)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          } @empty {
            <li class="py-3">@if (cat.cargando()) { <app-spinner /> } @else { <span class="text-sm text-gray-400">Sin tipos.</span> }</li>
          }
        </ul>
      </section>

      <!-- Sedes -->
      <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <h2 class="font-bold text-gray-800 mb-1">Sedes</h2>
        <p class="text-xs text-gray-400 mb-4">Ej: Valparaíso, Quintero, Viña del Mar…</p>

        <div class="flex gap-2 mb-4">
          <input [value]="nuevaSede()" (input)="nuevaSede.set($any($event.target).value)"
                 (keyup.enter)="agregarSede()" placeholder="Nueva sede…"
                 class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          <button (click)="agregarSede()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">
            Agregar
          </button>
        </div>

        <ul class="divide-y divide-gray-100">
          @for (s of cat.sedes(); track s.id) {
            <li class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-700">{{ s.nombre }}</span>
              <button (click)="eliminar('sede', s)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          } @empty {
            <li class="py-3">@if (cat.cargando()) { <app-spinner /> } @else { <span class="text-sm text-gray-400">Sin sedes.</span> }</li>
          }
        </ul>
      </section>

      <!-- Especialidades -->
      <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <h2 class="font-bold text-gray-800 mb-1">Especialidades</h2>
        <p class="text-xs text-gray-400 mb-4">Ej: Medicina General, Fonoaudiología, Pediatría…</p>

        <div class="flex gap-2 mb-4">
          <input [value]="nuevaEspecialidad()" (input)="nuevaEspecialidad.set($any($event.target).value)"
                 (keyup.enter)="agregarEspecialidad()" placeholder="Nueva especialidad…"
                 class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          <button (click)="agregarEspecialidad()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">
            Agregar
          </button>
        </div>

        <ul class="divide-y divide-gray-100">
          @for (e of cat.especialidades(); track e.id) {
            <li class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-700">{{ e.nombre }}</span>
              <button (click)="eliminar('especialidad', e)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          } @empty {
            <li class="py-3">@if (cat.cargando()) { <app-spinner /> } @else { <span class="text-sm text-gray-400">Sin especialidades.</span> }</li>
          }
        </ul>
      </section>
    </div>

    <!-- Usuarios y roles -->
    <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 mt-6 max-w-3xl">
      <h2 class="font-bold text-gray-800 mb-1">Usuarios y roles</h2>
      <p class="text-xs text-gray-400 mb-4">
        Asigna el rol por correo. El rol <b>APSORAD</b> solo ve el módulo APSORAD; <b>Admin</b> ve todo.
        Crea el usuario en Firebase Authentication con ese mismo correo.
      </p>
      <div class="flex flex-wrap gap-2 mb-4">
        <input [value]="nuevoEmail()" (input)="nuevoEmail.set($any($event.target).value)" type="email"
               placeholder="correo@cesain.cl"
               class="flex-1 min-w-[12rem] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none" />
        <select [value]="nuevoRol()" (change)="nuevoRol.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none">
          <option value="apsorad">APSORAD (solo su módulo)</option>
          <option value="admin">Admin (gestión, sin APSORAD)</option>
          <option value="superadmin">Superadmin (todo + APSORAD)</option>
        </select>
        <button (click)="asignarUsuario()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">Guardar</button>
      </div>
      <ul class="divide-y divide-gray-100">
        @for (u of usuarios.items(); track u.id) {
          <li class="flex items-center justify-between py-2.5">
            <span class="text-sm text-gray-700">{{ u.email }}
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 ml-1">{{ u.rol === 'apsorad' ? 'APSORAD' : u.rol === 'superadmin' ? 'Superadmin' : 'Admin' }}</span>
            </span>
            <button (click)="eliminarUsuario(u)" class="text-xs text-red-500 hover:underline">Quitar</button>
          </li>
        } @empty {
          <li class="py-3"><span class="text-sm text-gray-400">{{ usuarios.cargando() ? 'Cargando…' : 'Sin roles asignados (todos entran como admin por defecto).' }}</span></li>
        }
      </ul>
    </section>
  `,
})
export class Configuracion {
  readonly cat = inject(CatalogosService);
  readonly usuarios = inject(UsuariosService);
  private profSvc = inject(ProfesionalService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly nuevoTipo = signal('');
  readonly nuevaSede = signal('');
  readonly nuevaEspecialidad = signal('');
  readonly nuevoEmail = signal('');
  readonly nuevoRol = signal<Rol>('apsorad');

  async asignarUsuario() {
    const e = this.nuevoEmail().trim();
    if (!e) return;
    await this.usuarios.asignar(e, this.nuevoRol());
    this.nuevoEmail.set('');
    this.toast.exito('Rol asignado');
  }
  async eliminarUsuario(u: UsuarioRol) {
    await this.usuarios.eliminar(u.id);
    this.toast.exito('Quitado');
  }

  async agregarTipo() {
    const n = this.nuevoTipo().trim();
    if (!n) return;
    await this.cat.agregarTipo(n);
    this.nuevoTipo.set('');
    this.toast.exito('Tipo agregado');
  }

  async agregarSede() {
    const n = this.nuevaSede().trim();
    if (!n) return;
    await this.cat.agregarSede(n);
    this.nuevaSede.set('');
    this.toast.exito('Sede agregada');
  }

  async agregarEspecialidad() {
    const n = this.nuevaEspecialidad().trim();
    if (!n) return;
    await this.cat.agregarEspecialidad(n);
    this.nuevaEspecialidad.set('');
    this.toast.exito('Especialidad agregada');
  }

  async eliminar(que: 'tipo' | 'sede' | 'especialidad', item: ItemCatalogo) {
    // No permitir eliminar si está ligado a profesionales existentes.
    const enUso = this.profSvc.items().filter((p) =>
      que === 'tipo'
        ? p.tipoProfesional === item.id
        : que === 'sede'
          ? p.sedes.includes(item.nombre)
          : p.especialidad === item.nombre,
    ).length;
    if (enUso > 0) {
      this.toast.error(
        `No se puede eliminar "${item.nombre}": está asignado a ${enUso} profesional(es).`,
      );
      return;
    }

    const titulo =
      que === 'tipo' ? 'Eliminar tipo' : que === 'sede' ? 'Eliminar sede' : 'Eliminar especialidad';
    const ok = await this.confirm.ask({ titulo, mensaje: `¿Eliminar "${item.nombre}"?`, confirmar: 'Eliminar', tono: 'peligro' });
    if (!ok) return;
    if (que === 'tipo') await this.cat.eliminarTipo(item.id);
    else if (que === 'sede') await this.cat.eliminarSede(item.id);
    else await this.cat.eliminarEspecialidad(item.id);
    this.toast.exito('Eliminado');
  }
}
