import { inject, Injectable } from '@angular/core';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Liquidacion } from '../models/liquidacion.model';
import { RegistroHistorial } from '../models/historial.model';
import { AuthService } from './auth.service';

/** Historial/auditoría de cambios de liquidaciones (Firestore: `historial`). */
@Injectable({ providedIn: 'root' })
export class HistorialService {
  private auth = inject(AuthService);
  private readonly col = 'historial';

  /** Registra que un usuario guardó una liquidación. No lanza si falla. */
  async registrar(liq: Liquidacion, accion = 'Guardó la planilla', timestamp = Date.now()): Promise<void> {
    try {
      const id = `${liq.id}_${timestamp}`;
      const reg: RegistroHistorial = {
        id,
        fecha: new Date(timestamp).toISOString(),
        usuario: this.auth.usuario()?.email ?? '—',
        liquidacionId: liq.id,
        profesional: liq.profesional,
        periodo: liq.periodo,
        accion,
        totalBruto: liq.totalBruto,
        totalProfesional: liq.totalProfesional,
        totalClinica: liq.totalClinica,
        nPrestaciones: new Set(liq.items.map((i) => `${i.servicio}|${i.prevision}`)).size,
      };
      await setDoc(doc(firestore(), this.col, id), reg);
    } catch {
      /* el historial no debe bloquear el guardado */
    }
  }

  /** Lista el historial de una liquidación, más reciente primero. */
  async listar(liquidacionId: string): Promise<RegistroHistorial[]> {
    const q = query(collection(firestore(), this.col), where('liquidacionId', '==', liquidacionId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as RegistroHistorial)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
