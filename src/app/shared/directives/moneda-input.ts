import { Directive, ElementRef, HostListener, Renderer2, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Formatea un <input> de dinero como pesos chilenos mientras se escribe:
 * el usuario ve "1.234.567" pero el modelo (ngModel) recibe el número 1234567.
 *
 * Uso: <input appMoneda type="text" inputmode="numeric" [(ngModel)]="valor" />
 *  o:  <input appMoneda type="text" inputmode="numeric" [ngModel]="valor" (ngModelChange)="set($event)" />
 */
@Directive({
  selector: 'input[appMoneda]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MonedaInput), multi: true },
  ],
})
export class MonedaInput implements ControlValueAccessor {
  private el = inject(ElementRef<HTMLInputElement>).nativeElement;
  private renderer = inject(Renderer2);
  private onChange: (v: number) => void = () => {};
  private onTouched: () => void = () => {};

  private static fmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

  @HostListener('input')
  onInput(): void {
    const input = this.el;
    const raw = input.value;
    // Contamos los dígitos a la izquierda del caret para reposicionarlo tras reformatear.
    const caret = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;

    const digits = raw.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) : 0;
    const formatted = digits ? MonedaInput.fmt.format(num) : '';
    input.value = formatted;

    // Reposicionamos el caret justo después de la misma cantidad de dígitos.
    let pos = 0;
    let vistos = 0;
    while (pos < formatted.length && vistos < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos])) vistos++;
      pos++;
    }
    input.setSelectionRange(pos, pos);

    this.onChange(num);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: number | null): void {
    const num = value == null || Number.isNaN(value) ? 0 : value;
    this.el.value = num ? MonedaInput.fmt.format(num) : '';
  }

  registerOnChange(fn: (v: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el, 'disabled', isDisabled);
  }
}
