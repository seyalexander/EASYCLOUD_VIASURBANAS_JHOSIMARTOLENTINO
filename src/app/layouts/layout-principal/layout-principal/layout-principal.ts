import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout-principal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout-principal.html',
  styleUrl: './layout-principal.css'
})
export class LayoutPrincipal {
  public readonly nombreApp = 'GeoVial 2D';
  public readonly descripcionApp = 'Simulador de Giros y Retornos';
  public readonly anio = new Date().getFullYear();
}