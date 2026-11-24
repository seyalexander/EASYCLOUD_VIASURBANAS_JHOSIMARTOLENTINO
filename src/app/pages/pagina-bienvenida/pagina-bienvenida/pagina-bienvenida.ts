import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type AcentoTarjeta = 'azul' | 'naranja' | 'turquesa';
type IconoTarjeta = 'vehiculo' | 'animacion' | 'curva';

interface TarjetaCaracteristica {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  acento: AcentoTarjeta;
  icono: IconoTarjeta;
}

interface IndicadorHud {
  etiqueta: string;
  valor: string;
  actual: number;
  total: number;
  color: string;
}

@Component({
  selector: 'app-pagina-bienvenida',
  imports: [RouterLink],
  templateUrl: './pagina-bienvenida.html',
  styleUrl: './pagina-bienvenida.css'
})
export class PaginaBienvenida {
  public readonly subtitulo =
    'Explora trayectorias vehiculares en curvas y retornos viales con un catálogo de vehículos circulantes, medidas editables y control automático o manual en tiempo real.';

  public readonly nombreAlumno = 'Arles Jhosimar Tolentino Vera';
  public readonly carrera = 'Ingeniería Civil';
  public readonly nombreCurso = 'Diseño Vial Urbano';
  public readonly fotoAlumno = '';

  public readonly datos: readonly IndicadorHud[] = [
    { etiqueta: 'Radios', valor: '×3', actual: 3, total: 3, color: 'bg-[#EE8600]' },
    { etiqueta: 'Control', valor: 'AUTO/MAN', actual: 2, total: 2, color: 'bg-[#3FBFEF]' },
    { etiqueta: 'Motor', valor: '2D LIVE', actual: 5, total: 5, color: 'bg-[#76C043]' }
  ];

  public readonly caracteristicas: readonly TarjetaCaracteristica[] = [
    {
      titulo: 'Vehículos Circulantes',
      descripcion:
        'Catálogo de diseño listo o dimensiones editables en metros al instante.',
      etiqueta: 'Catálogo + Custom',
      acento: 'azul',
      icono: 'vehiculo'
    },
    {
      titulo: 'Control Dual 2D',
      descripcion:
        'Reproducción fluida o avance manual paso a paso para validar cada giro.',
      etiqueta: 'Auto / Manual',
      acento: 'naranja',
      icono: 'animacion'
    },
    {
      titulo: 'Curvas y Holguras',
      descripcion:
        'Curvas simples o de 3 radios, bordes de calzada y holguras de seguridad.',
      etiqueta: 'Precisión 2D',
      acento: 'turquesa',
      icono: 'curva'
    }
  ];

  public get iniciales(): string {
    return this.nombreAlumno
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join('');
  }

  public rango(total: number): number[] {
    return Array.from({ length: total }, (_, indice) => indice);
  }

  public obtenerClaseTexto(acento: AcentoTarjeta): string {
    if (acento === 'naranja') {
      return 'text-[#EE8600]';
    }
    if (acento === 'turquesa') {
      return 'text-[#43B3C0]';
    }
    return 'text-[#3FBFEF]';
  }

  public obtenerClaseBordeNivel(acento: AcentoTarjeta): string {
    if (acento === 'naranja') {
      return 'border-[#EE8600]';
    }
    if (acento === 'turquesa') {
      return 'border-[#43B3C0]';
    }
    return 'border-[#3FBFEF]';
  }

  public obtenerClasesBarra(acento: AcentoTarjeta): string {
    if (acento === 'naranja') {
      return 'bg-linear-to-r from-[#EE8600] to-[#FDD839]';
    }
    if (acento === 'turquesa') {
      return 'bg-linear-to-r from-[#43B3C0] to-[#3FBFEF]';
    }
    return 'bg-linear-to-r from-[#005FAE] to-[#3FBFEF]';
  }
}