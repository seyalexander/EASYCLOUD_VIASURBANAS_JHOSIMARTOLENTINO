import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  input
} from '@angular/core';
import { Punto2D, ResultadoGeometriaCurva } from '../../../core/modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../../core/modelos/modelo-vehiculos';
import { PosturaVehiculo } from '../../../core/modelos/modelo-simulacion';

@Component({
  selector: 'app-lienzo-simulacion',
  imports: [],
  templateUrl: './lienzo-simulacion.html',
  styleUrl: './lienzo-simulacion.css'
})
export class LienzoSimulacion implements AfterViewInit, OnChanges {
  @ViewChild('canvasSimulacion')
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  public readonly geometria = input.required<ResultadoGeometriaCurva>();
  public readonly vehiculo = input.required<EspecificacionVehiculo>();
  public readonly postura = input.required<PosturaVehiculo>();

  private vistaLista = false;

  public ngAfterViewInit(): void {
    this.vistaLista = true;
    this.dibujarEscena();
  }

  public ngOnChanges(_changes: SimpleChanges): void {
    if (this.vistaLista) {
      this.dibujarEscena();
    }
  }

  public obtenerTextoEstado(): string {
    const estado = this.postura().estadoHolgura;
    if (estado === 'invasion') {
      return 'Alerta: Proximidad crítica / posible invasión de borde';
    }
    if (estado === 'ajuste') {
      return 'Holgura ajustada: menor a la recomendada';
    }
    return 'Trayectoria dentro de holgura segura';
  }

  public obtenerClasesEstado(): string {
    const estado = this.postura().estadoHolgura;
    if (estado === 'invasion') {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (estado === 'ajuste') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  private dibujarEscena(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const anchoCanvas = canvas.width;
    const altoCanvas = canvas.height;

    ctx.clearRect(0, 0, anchoCanvas, altoCanvas);

    ctx.fillStyle = '#e8efe8';
    ctx.fillRect(0, 0, anchoCanvas, altoCanvas);

    const geom = this.geometria();
    if (!geom.esValida || geom.puntosEje.length < 2) {
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(geom.mensajeValidacion || 'Sin geometría válida.', 24, 40);
      return;
    }

    const puntosReferenciaEscala =
      geom.franjasViales.length > 0 ? geom.franjasViales.flat() : geom.puntosEje;

    const transformacion = this.calcularEscalaYOffset(
      puntosReferenciaEscala,
      anchoCanvas,
      altoCanvas
    );

    const aPantalla = (pt: Punto2D): Punto2D => ({
      x: transformacion.offsetX + pt.x * transformacion.escalaPxPorMetro,
      y: transformacion.offsetY - pt.y * transformacion.escalaPxPorMetro
    });

    // 1. Vías rectas transversales (arriba-abajo e izquierda-derecha)
    const franjasRectas = geom.franjasViales.slice(0, -1);
    const franjaAnillo =
      geom.franjasViales.length > 4
        ? geom.franjasViales[geom.franjasViales.length - 1]
        : null;

    for (const franja of franjasRectas) {
      this.dibujarPoligonoRelleno(ctx, franja, aPantalla, '#1e293b', null, 0);
    }

    // 2. Anillo del óvalo (sin isleta central verde)
    if (franjaAnillo) {
      this.dibujarPoligonoRelleno(ctx, franjaAnillo, aPantalla, '#1e293b', null, 0);
    }

    for (const franja of geom.franjasViales) {
      if (franja.length > 2) {
        this.dibujarPolilinea(
          ctx,
          [...franja, franja[0]],
          aPantalla,
          'rgba(248, 250, 252, 0.35)',
          1.2
        );
      }
    }

    // 3. Líneas punteadas centradas en cada carril
    ctx.save();
    ctx.setLineDash([7, 7]);
    this.dibujarPolilinea(
      ctx,
      geom.puntosCarril1,
      aPantalla,
      'rgba(255, 255, 255, 0.55)',
      1.4
    );
    this.dibujarPolilinea(
      ctx,
      geom.puntosCarril2,
      aPantalla,
      'rgba(255, 255, 255, 0.55)',
      1.4
    );
    ctx.restore();

    // 4. Vehículo circulando en su carril
    this.dibujarVehiculo(ctx, aPantalla, transformacion.escalaPxPorMetro);
  }

  private calcularEscalaYOffset(
    puntos: Punto2D[],
    anchoCanvas: number,
    altoCanvas: number
  ): { escalaPxPorMetro: number; offsetX: number; offsetY: number } {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of puntos) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const margen = 45;
    const anchoMundo = Math.max(10, maxX - minX + 8);
    const altoMundo = Math.max(10, maxY - minY + 8);

    const escalaX = (anchoCanvas - margen * 2) / anchoMundo;
    const escalaY = (altoCanvas - margen * 2) / altoMundo;
    const escala = Math.max(2.5, Math.min(28, Math.min(escalaX, escalaY)));

    const centroMundoX = (minX + maxX) / 2;
    const centroMundoY = (minY + maxY) / 2;

    return {
      escalaPxPorMetro: escala,
      offsetX: anchoCanvas / 2 - centroMundoX * escala,
      offsetY: altoCanvas / 2 + centroMundoY * escala
    };
  }

  private dibujarPoligonoRelleno(
    ctx: CanvasRenderingContext2D,
    puntos: Punto2D[],
    aPantalla: (pt: Punto2D) => Punto2D,
    colorRelleno: string,
    colorBorde: string | null,
    grosorBorde: number
  ): void {
    if (puntos.length < 3) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    const primero = aPantalla(puntos[0]);
    ctx.moveTo(primero.x, primero.y);
    for (let i = 1; i < puntos.length; i++) {
      const pt = aPantalla(puntos[i]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fillStyle = colorRelleno;
    ctx.fill();
    if (colorBorde && grosorBorde > 0) {
      ctx.strokeStyle = colorBorde;
      ctx.lineWidth = grosorBorde;
      ctx.stroke();
    }
    ctx.restore();
  }

  private dibujarPolilinea(
    ctx: CanvasRenderingContext2D,
    puntos: Punto2D[],
    aPantalla: (pt: Punto2D) => Punto2D,
    color: string,
    grosor: number
  ): void {
    if (puntos.length < 2) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    const inicio = aPantalla(puntos[0]);
    ctx.moveTo(inicio.x, inicio.y);

    for (let i = 1; i < puntos.length; i++) {
      const pt = aPantalla(puntos[i]);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();
    ctx.restore();
  }

  private dibujarVehiculo(
    ctx: CanvasRenderingContext2D,
    aPantalla: (pt: Punto2D) => Punto2D,
    escalaPxPorMetro: number
  ): void {
    const veh = this.vehiculo();
    const post = this.postura();

    const ejeTraseroPx = aPantalla(post.posicionEjeTrasero);
    const largoPx = veh.largoMetros * escalaPxPorMetro;
    const anchoPx = veh.anchoMetros * escalaPxPorMetro;
    const distanciaEjesPx = veh.distanciaEjesMetros * escalaPxPorMetro;
    const vueloTraseroPx = veh.vueloTraseroMetros * escalaPxPorMetro;

    const anguloCanvas = -post.anguloCarroceriaRad;

    ctx.save();
    ctx.translate(ejeTraseroPx.x, ejeTraseroPx.y);
    ctx.rotate(anguloCanvas);

    const xInicioCarroceria = -vueloTraseroPx;
    const yInicioCarroceria = -anchoPx / 2;

    let colorCarroceria = '#005FAE';
    if (post.estadoHolgura === 'ajuste') {
      colorCarroceria = '#EE8600';
    } else if (post.estadoHolgura === 'invasion') {
      colorCarroceria = '#F04C4D';
    }

    ctx.fillStyle = colorCarroceria;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(xInicioCarroceria, yInicioCarroceria, largoPx, anchoPx, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(xInicioCarroceria + largoPx - 6, yInicioCarroceria + 2, 4, anchoPx - 4);

    const largoRuedaPx = Math.max(6, 0.65 * escalaPxPorMetro);
    const anchoRuedaPx = Math.max(3, 0.25 * escalaPxPorMetro);
    const desplazamientoLateralRueda = anchoPx * 0.42;

    const dibujarRueda = (rx: number, ry: number, anguloRuedaRad: number): void => {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(-anguloRuedaRad);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-largoRuedaPx / 2, -anchoRuedaPx / 2, largoRuedaPx, anchoRuedaPx);
      ctx.restore();
    };

    dibujarRueda(
      distanciaEjesPx,
      -desplazamientoLateralRueda,
      post.anguloDireccionRuedasRad
    );
    dibujarRueda(
      distanciaEjesPx,
      desplazamientoLateralRueda,
      post.anguloDireccionRuedasRad
    );

    ctx.restore();
  }
}