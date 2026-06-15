import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VersionService } from './core/services/version.service';
import { UpdateBanner } from './shared/update-banner/update-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateBanner],
  template: `
    <app-update-banner />
    <router-outlet />
  `,
})
export class App {
  constructor() {
    inject(VersionService).iniciar();
  }
}
