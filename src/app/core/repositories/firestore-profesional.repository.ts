import { Injectable } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Profesional } from '../models/profesional.model';
import { PROFESIONALES_SEED } from '../data/profesionales.seed';
import { ProfesionalRepository } from './profesional.repository';

/** Persistencia de profesionales en Firestore. Colección: `profesionales`. */
@Injectable()
export class FirestoreProfesionalRepository implements ProfesionalRepository {
  private readonly db = firestore();
  private readonly col = 'profesionales';

  async listar(): Promise<Profesional[]> {
    const snap = await getDocs(collection(this.db, this.col));
    if (snap.empty) {
      await Promise.all(PROFESIONALES_SEED.map((p) => this.crear(p)));
      return [...PROFESIONALES_SEED];
    }
    return snap.docs.map((d) => d.data() as Profesional);
  }

  async crear(p: Profesional): Promise<void> {
    await setDoc(doc(this.db, this.col, p.id), p);
  }
  async actualizar(p: Profesional): Promise<void> {
    await setDoc(doc(this.db, this.col, p.id), p);
  }
  async eliminar(id: string): Promise<void> {
    await deleteDoc(doc(this.db, this.col, id));
  }
}
