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

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, anchoCanvas, altoCanvas);

    const geom = this.geometria();
    if (!geom.esValida || geom.puntosEje.length < 2) {
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(geom.mensajeValidacion || 'Sin geometría válida.', 24, 40);
      return;
    }

    const transformacion = this.calcularEscalaYOffset(
      geom.puntosEje,
      anchoCanvas,
      altoCanvas
    );

    const aPantalla = (pt: Punto2D): Punto2D => ({
      x: transformacion.offsetX + pt.x * transformacion.escalaPxPorMetro,
      y: transformacion.offsetY - pt.y * transformacion.escalaPxPorMetro
    });

    this.dibujarSuperficieCalzada(
      ctx,
      geom.puntosBordeInterno,
      geom.puntosBordeExterno,
      aPantalla
    );

    this.dibujarPolilinea(ctx, geom.puntosBordeInterno, aPantalla, '#f8fafc', 2.5);
    this.dibujarPolilinea(ctx, geom.puntosBordeExterno, aPantalla, '#f8fafc', 2.5);

    ctx.save();
    ctx.setLineDash([10, 8]);
    this.dibujarPolilinea(ctx, geom.puntosEje, aPantalla, '#f59e0b', 2);
    ctx.restore();

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

    const margen = 70;
    const anchoMundo = Math.max(10, maxX - minX + 12);
    const altoMundo = Math.max(10, maxY - minY + 12);

    const escalaX = (anchoCanvas - margen * 2) / anchoMundo;
    const escalaY = (altoCanvas - margen * 2) / altoMundo;
    const escala = Math.max(4, Math.min(28, Math.min(escalaX, escalaY)));

    const centroMundoX = (minX + maxX) / 2;
    const centroMundoY = (minY + maxY) / 2;

    return {
      escalaPxPorMetro: escala,
      offsetX: anchoCanvas / 2 - centroMundoX * escala,
      offsetY: altoCanvas / 2 + centroMundoY * escala
    };
  }

  private dibujarSuperficieCalzada(
    ctx: CanvasRenderingContext2D,
    bordeA: Punto2D[],
    bordeB: Punto2D[],
    aPantalla: (pt: Punto2D) => Punto2D
  ): void {
    if (bordeA.length < 2 || bordeB.length < 2) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    const primeroA = aPantalla(bordeA[0]);
    ctx.moveTo(primeroA.x, primeroA.y);

    for (let i = 1; i < bordeA.length; i++) {
      const pt = aPantalla(bordeA[i]);
      ctx.lineTo(pt.x, pt.y);
    }

    for (let i = bordeB.length - 1; i >= 0; i--) {
      const pt = aPantalla(bordeB[i]);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
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

    let colorCarroceria = '#0f766e';
    if (post.estadoHolgura === 'ajuste') {
      colorCarroceria = '#d97706';
    } else if (post.estadoHolgura === 'invasion') {
      colorCarroceria = '#dc2626';
    }

    ctx.fillStyle = colorCarroceria;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(xInicioCarroceria, yInicioCarroceria, largoPx, anchoPx, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
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