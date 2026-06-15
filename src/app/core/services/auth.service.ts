import { computed, Injectable, signal } from '@angular/core';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { firebaseApp, firebaseAuth } from '../firebase';

export type Rol = 'admin' | 'superadmin' | 'apsorad';
const ROLES: Rol[] = ['admin', 'superadmin', 'apsorad'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = firebaseAuth();
  private readonly _usuario = signal<User | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  /** Rol del usuario (de la colección `usuarios`). Sin documento => 'admin'. */
  readonly rol = signal<Rol>('admin');
  /** admin y superadmin ven el área de gestión (todo menos lo exclusivo de APSORAD). */
  readonly puedeAdmin = computed(() => this.rol() === 'admin' || this.rol() === 'superadmin');
  /** superadmin y apsorad ven el módulo APSORAD. */
  readonly puedeApsorad = computed(() => this.rol() === 'superadmin' || this.rol() === 'apsorad');

  /** Se resuelve cuando Firebase entrega el primer estado de sesión (y el rol). */
  private readonly _listo: Promise<void>;

  constructor() {
    this._listo = new Promise<void>((resolve) => {
      onAuthStateChanged(this.auth, async (u) => {
        this._usuario.set(u);
        this.rol.set(await this.cargarRol(u));
        resolve();
      });
    });
  }

  private async cargarRol(u: User | null): Promise<Rol> {
    if (!u?.email) return 'admin';
    try {
      const snap = await getDoc(doc(getFirestore(firebaseApp()), 'usuarios', u.email.toLowerCase()));
      const rol = snap.data()?.['rol'] as Rol | undefined;
      return rol && ROLES.includes(rol) ? rol : 'admin';
    } catch {
      return 'admin';
    }
  }

  /** El guard espera esto para no rebotar a /login durante la carga inicial. */
  listo(): Promise<void> {
    return this._listo;
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
