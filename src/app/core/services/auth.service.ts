import { computed, Injectable, signal } from '@angular/core';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseAuth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = firebaseAuth();
  private readonly _usuario = signal<User | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  /** Se resuelve cuando Firebase entrega el primer estado de sesión. */
  private readonly _listo: Promise<void>;

  constructor() {
    this._listo = new Promise<void>((resolve) => {
      onAuthStateChanged(this.auth, (u) => {
        this._usuario.set(u);
        resolve();
      });
    });
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
