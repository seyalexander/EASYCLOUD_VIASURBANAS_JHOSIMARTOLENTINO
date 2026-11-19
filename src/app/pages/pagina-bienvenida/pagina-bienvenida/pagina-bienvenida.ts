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

@Component({
  selector: 'app-pagina-bienvenida',
  imports: [RouterLink],
  templateUrl: './pagina-bienvenida.html',
  styleUrl: './pagina-bienvenida.css'
})
export class PaginaBienvenida {
  public readonly nombreProyecto = 'GeoVial 2D · Simulador de Giros y Retornos';
  public readonly subtitulo =
    'Explora trayectorias vehiculares en curvas y retornos viales con un catálogo de vehículos circulantes, medidas editables y control automático o manual en tiempo real.';

  // Ficha académica (cambia estos datos)
  public readonly nombreCurso = 'Diseño Geométrico de Vías';
  public readonly nombreAlumno = 'Arles Jhosimar Tolentino Vera';
  // Ruta de la foto dentro de la carpeta public/ (ej. 'foto-alumno.jpg').
  // Déjalo vacío ('') para mostrar un avatar con las iniciales.
  public readonly fotoAlumno = '';

  public readonly caracteristicas: readonly TarjetaCaracteristica[] = [
    {
      titulo: 'Vehículos Circulantes y Personalizados',
      descripcion:
        'Elige vehículos típicos con sus medidas y radios de giro listos o ajusta dimensiones personalizadas en metros al instante.',
      etiqueta: 'Catálogo + Custom',
      acento: 'azul',
      icono: 'vehiculo'
    },
    {
      titulo: 'Animación Automática y Control Manual',
      descripcion:
        'Reproduce el recorrido con fluidez o desplaza el vehículo manualmente para revisar cada punto del giro con precisión.',
      etiqueta: 'Doble Modo',
      acento: 'naranja',
      icono: 'animacion'
    },
    {
      titulo: 'Geometría de Curvas y Holguras',
      descripcion:
        'Analiza curvas simples o compuestas de tres radios, bordes de calzada y holguras de seguridad en una vista limpia.',
      etiqueta: 'Precisión 2D',
      acento: 'turquesa',
      icono: 'curva'
    }
  ];

  // Iniciales para el avatar cuando no hay foto (máx. 2 letras)
  public get iniciales(): string {
    return this.nombreAlumno
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0).toUpperCase())
      .join('');
  }

  public obtenerClasesIcono(acento: AcentoTarjeta): string {
    if (acento === 'naranja') {
      return 'bg-linear-to-br from-[#EE8600] to-[#F5A93A] text-white shadow-[0_10px_20px_-8px_rgba(238,134,0,0.6)]';
    }
    if (acento === 'turquesa') {
      return 'bg-linear-to-br from-[#43B3C0] to-[#3FBFEF] text-white shadow-[0_10px_20px_-8px_rgba(67,179,192,0.6)]';
    }
    return 'bg-linear-to-br from-[#005FAE] to-[#0A7FCB] text-white shadow-[0_10px_20px_-8px_rgba(0,95,174,0.6)]';
  }

  public obtenerClasesInsignia(acento: AcentoTarjeta): string {
    if (acento === 'naranja') {
      return 'bg-[#EE8600]/10 text-[#b86500]';
    }
    if (acento === 'turquesa') {
      return 'bg-[#43B3C0]/12 text-[#1c6f78]';
    }
    return 'bg-[#005FAE]/8 text-[#005FAE]';
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