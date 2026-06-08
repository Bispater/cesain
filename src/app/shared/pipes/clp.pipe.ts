import { Pipe, PipeTransform } from '@angular/core';

/** Formatea un número como pesos chilenos: 1234567 -> "$ 1.234.567". */
@Pipe({ name: 'clp' })
export class ClpPipe implements PipeTransform {
  private static fmt = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '$ 0';
    return ClpPipe.fmt.format(value).replace(/ /g, ' ');
  }
}
