import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'bienvenida',
    pathMatch: 'full'
  },
  {
    path: 'bienvenida',
    loadComponent: () =>
      import('./pages/pagina-bienvenida/pagina-bienvenida/pagina-bienvenida').then(
        (m) => m.PaginaBienvenida
      )
  },
  {
    path: 'simulacion',
    loadComponent: () =>
      import('./pages/pagina-simulacion/lista/pagina-simulacion/pagina-simulacion').then(
        (m) => m.PaginaSimulacion
      )
  },
  {
    path: '**',
    redirectTo: 'bienvenida'
  }
];