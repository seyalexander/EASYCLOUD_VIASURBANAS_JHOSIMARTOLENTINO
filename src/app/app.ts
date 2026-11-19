import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutPrincipal } from './layouts/layout-principal/layout-principal/layout-principal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutPrincipal],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('preyecto-vias-urbanas');
}
