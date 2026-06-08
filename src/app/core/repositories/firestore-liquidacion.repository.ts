import { Injectable } from '@angular/core';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Liquidacion } from '../models/liquidacion.model';
import { LiquidacionRepository } from './liquidacion.repository';

/** Persistencia de liquidaciones en Cloud Firestore. Colección: `liquidaciones`. */
@Injectable()
export class FirestoreLiquidacionRepository implements LiquidacionRepository {
  private readonly db = firestore();
  private readonly col = 'liquidaciones';

  async listar(): Promise<Liquidacion[]> {
    const snap = await getDocs(collection(this.db, this.col));
    return snap.docs.map((d) => d.data() as Liquidacion);
  }

  async guardar(l: Liquidacion): Promise<void> {
    await setDoc(doc(this.db, this.col, l.id), l);
  }

  async guardarTodo(ls: Liquidacion[]): Promise<void> {
    await Promise.all(ls.map((l) => setDoc(doc(this.db, this.col, l.id), l)));
  }
}
