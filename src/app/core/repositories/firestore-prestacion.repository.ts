import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Prestacion } from '../models/prestacion.model';
import { PRESTACIONES_SEED } from '../data/prestaciones.seed';
import { PrestacionRepository } from './prestacion.repository';

/**
 * Persistencia en Cloud Firestore (proyecto "cesain-web").
 * Colección: `prestaciones` (un documento por prestación, id = doc id).
 * Si la colección está vacía la primera vez, la siembra con el catálogo inicial.
 */
@Injectable()
export class FirestorePrestacionRepository implements PrestacionRepository {
  private readonly db = firestore();
  private readonly col = 'prestaciones';

  async listar(): Promise<Prestacion[]> {
    const snap = await getDocs(collection(this.db, this.col));
    if (snap.empty) {
      await this.sembrar();
      return [...PRESTACIONES_SEED];
    }
    return snap.docs.map((d) => d.data() as Prestacion);
  }

  async crear(p: Prestacion): Promise<void> {
    await setDoc(doc(this.db, this.col, p.id), p);
  }

  async actualizar(p: Prestacion): Promise<void> {
    await setDoc(doc(this.db, this.col, p.id), p);
  }

  async eliminar(id: string): Promise<void> {
    await deleteDoc(doc(this.db, this.col, id));
  }

  private async sembrar(): Promise<void> {
    await Promise.all(
      PRESTACIONES_SEED.map((p) => setDoc(doc(this.db, this.col, p.id), p)),
    );
  }
}
