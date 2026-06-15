import { Injectable, signal } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseApp } from '../firebase';
import { environment } from '../../../environments/environment';
import { Rol } from './auth.service';

export interface UsuarioRol {
  id: string; // email en minúsculas
  email: string;
  rol: Rol;
}

/** Administra los roles por correo (colección `usuarios`). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly usarFb = environment.usarFirebase;
  private get db() { return getFirestore(firebaseApp()); }

  readonly items = signal<UsuarioRol[]>([]);
  readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  private async cargar() {
    try {
      if (this.usarFb) {
        const snap = await getDocs(collection(this.db, 'usuarios'));
        this.items.set(snap.docs.map((d) => d.data() as UsuarioRol));
      } else {
        const raw = localStorage.getItem('cesain_usuarios');
        this.items.set(raw ? JSON.parse(raw) : []);
      }
    } catch {
      this.items.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  async asignar(email: string, rol: Rol) {
    const id = email.trim().toLowerCase();
    if (!id) return;
    const u: UsuarioRol = { id, email: id, rol };
    this.items.update((a) => [...a.filter((x) => x.id !== id), u].sort((x, y) => x.email.localeCompare(y.email)));
    if (this.usarFb) await setDoc(doc(this.db, 'usuarios', id), u);
    else localStorage.setItem('cesain_usuarios', JSON.stringify(this.items()));
  }

  async eliminar(id: string) {
    this.items.update((a) => a.filter((x) => x.id !== id));
    if (this.usarFb) await deleteDoc(doc(this.db, 'usuarios', id));
    else localStorage.setItem('cesain_usuarios', JSON.stringify(this.items()));
  }
}
