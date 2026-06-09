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
  async registrar(
    despues: Liquidacion,
    antes: Liquidacion | undefined,
    cambios: string[],
    accion = 'Guardó la planilla',
    timestamp = Date.now(),
  ): Promise<void> {
    try {
      const id = `${despues.id}_${timestamp}`;
      const reg: RegistroHistorial = {
        id,
        fecha: new Date(timestamp).toISOString(),
        usuario: this.auth.usuario()?.email ?? '—',
        liquidacionId: despues.id,
        profesional: despues.profesional,
        periodo: despues.periodo,
        accion,
        totalBruto: despues.totalBruto,
        totalProfesional: despues.totalProfesional,
        totalClinica: despues.totalClinica,
        nPrestaciones: new Set(despues.items.map((i) => `${i.servicio}|${i.prevision}`)).size,
        totalBrutoAntes: antes?.totalBruto ?? 0,
        totalProfesionalAntes: antes?.totalProfesional ?? 0,
        totalClinicaAntes: antes?.totalClinica ?? 0,
        cambios,
      };
      await setDoc(doc(firestore(), this.col, id), reg);
    } catch {
      /* el historial no debe bloquear el guardado */
    }
  }

  /** Registra una acción simple (eliminar/restaurar) en la auditoría. */
  async registrarAccion(liq: Liquidacion, accion: string, timestamp = Date.now()): Promise<void> {
    await this.registrar(liq, liq, [accion], accion, timestamp);
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
