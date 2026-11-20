import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  input } from '@angular/core';
import { Punto2D, ResultadoGeometriaCurva } from '../../../core/modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../../core/modelos/modelo-vehiculos';
import {
  PosturaVehiculo,
  VehiculoEnEscena
} from '../../../core/modelos/modelo-simulacion';

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
  public readonly catalogoVehiculos = input<readonly EspecificacionVehiculo[]>([]);
  public readonly vehiculosEnEscena = input<readonly VehiculoEnEscena[]>([]);

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
    const colorFondo = '#e8efe8';
    const colorAsfalto = '#1e293b';
    const colorLineaCarril = 'rgba(255, 255, 255, 0.6)';

    ctx.clearRect(0, 0, anchoCanvas, altoCanvas);
    ctx.fillStyle = colorFondo;
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

    const viasVerticales = geom.franjasViales.slice(0, 2);
    const viasHorizontales = geom.franjasViales.slice(2, 4);
    const franjaAnillo =
      geom.franjasViales.length > 4 ? geom.franjasViales[4] : null;

    // 1. Vías horizontales de acceso y sus 2 carriles
    for (const viaX of viasHorizontales) {
      this.dibujarPoligonoRelleno(ctx, viaX, aPantalla, colorAsfalto, null, 0);
    }

    ctx.save();
    ctx.setLineDash([7, 7]);
    for (const viaX of viasHorizontales) {
      this.dibujarCarrilesEnFranjaHorizontal(ctx, viaX, aPantalla, colorLineaCarril);
    }
    ctx.restore();

    // 2. Limpiar interior del óvalo para anular el paso horizontal interno sin líneas residuales
    if (franjaAnillo && viasHorizontales.length >= 2) {
      this.limpiarInteriorOvalo(
        ctx,
        franjaAnillo,
        viasHorizontales,
        aPantalla,
        transformacion.escalaPxPorMetro,
        colorFondo
      );
    }

    // 3. Vías verticales continuas de arriba a abajo con sus 2 carriles punteados
    for (const viaY of viasVerticales) {
      this.dibujarPoligonoRelleno(ctx, viaY, aPantalla, colorAsfalto, null, 0);
    }

    ctx.save();
    ctx.setLineDash([7, 7]);
    for (const viaY of viasVerticales) {
      this.dibujarCarrilesEnFranjaVertical(ctx, viaY, aPantalla, colorLineaCarril);
    }
    ctx.restore();

    // Separar vehículos verticales (pasan por debajo del óvalo) y vehículos del óvalo
    const actores = this.vehiculosEnEscena();
    const catalogo = this.catalogoVehiculos();

    const actoresVerticales = actores.filter(
      (a) => a.ruta === 'sur-a-norte' || a.ruta === 'norte-a-sur'
    );
    const actoresOvalo = actores.filter(
      (a) => a.ruta !== 'sur-a-norte' && a.ruta !== 'norte-a-sur'
    );

    // 4. Vehículos de la vía vertical (dibujados antes del anillo para que pasen por debajo)
    for (const actor of actoresVerticales) {
      const spec =
        catalogo.find((v) => v.id === actor.idVehiculo) ?? this.vehiculo();
      this.dibujarVehiculoIndividual(
        ctx,
        spec,
        actor.postura,
        aPantalla,
        transformacion.escalaPxPorMetro
      );
    }

    // 5. Anillo del óvalo y sus 2 líneas punteadas de carril encima (el óvalo va sobre la vía vertical)
    if (franjaAnillo) {
      this.dibujarPoligonoRelleno(ctx, franjaAnillo, aPantalla, colorAsfalto, null, 0);
    }

    ctx.save();
    ctx.setLineDash([7, 7]);
    this.dibujarPolilinea(ctx, geom.puntosCarril1, aPantalla, colorLineaCarril, 1.4);
    this.dibujarPolilinea(ctx, geom.puntosCarril2, aPantalla, colorLineaCarril, 1.4);
    ctx.restore();

    // 6. Vehículos circulando en el óvalo (o vehículo principal si no hay actores)
    if (actores.length > 0) {
      for (const actor of actoresOvalo) {
        const spec =
          catalogo.find((v) => v.id === actor.idVehiculo) ?? this.vehiculo();
        this.dibujarVehiculoIndividual(
          ctx,
          spec,
          actor.postura,
          aPantalla,
          transformacion.escalaPxPorMetro
        );
      }
    } else {
      this.dibujarVehiculoIndividual(
        ctx,
        this.vehiculo(),
        this.postura(),
        aPantalla,
        transformacion.escalaPxPorMetro
      );
    }
  }

  private limpiarInteriorOvalo(
    ctx: CanvasRenderingContext2D,
    franjaAnillo: Punto2D[],
    viasHorizontales: Punto2D[][],
    aPantalla: (pt: Punto2D) => Punto2D,
    escalaPxPorMetro: number,
    colorFondo: string
  ): void {
    const xsAnillo = franjaAnillo.map((p) => p.x);
    const ysAnillo = franjaAnillo.map((p) => p.y);
    const rxExt = (Math.max(...xsAnillo) - Math.min(...xsAnillo)) / 2;
    const ryExt = (Math.max(...ysAnillo) - Math.min(...ysAnillo)) / 2;

    const pCarril1 = this.geometria().puntosCarril1[0];
    const pCarril2 = this.geometria().puntosCarril2[0];
    const anchoCarril =
      pCarril1 && pCarril2
        ? Math.hypot(pCarril2.x - pCarril1.x, pCarril2.y - pCarril1.y)
        : 3.6;
    const anchoCalzada = Math.max(4.4, anchoCarril * 2);

    const rxInt = Math.max(4, rxExt - anchoCalzada - 0.15);
    const ryInt = Math.max(3, ryExt - anchoCalzada - 0.15);

    const centroPx = aPantalla({ x: 0, y: 0 });
    const rxIntPx = rxInt * escalaPxPorMetro;
    const ryIntPx = ryInt * escalaPxPorMetro;

    const ysHoriz = viasHorizontales.flat().map((p) => p.y);
    const minYHoriz = Math.min(...ysHoriz) - 0.25;
    const maxYHoriz = Math.max(...ysHoriz) + 0.25;

    const rectInterior: Punto2D[] = [
      { x: -rxInt, y: minYHoriz },
      { x: rxInt, y: minYHoriz },
      { x: rxInt, y: maxYHoriz },
      { x: -rxInt, y: maxYHoriz }
    ];

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centroPx.x, centroPx.y, rxIntPx, ryIntPx, 0, 0, Math.PI * 2);
    ctx.clip();

    this.dibujarPoligonoRelleno(ctx, rectInterior, aPantalla, colorFondo, null, 0);

    ctx.restore();
  }

  private dibujarCarrilesEnFranjaVertical(
    ctx: CanvasRenderingContext2D,
    franja: Punto2D[],
    aPantalla: (pt: Punto2D) => Punto2D,
    color: string
  ): void {
    if (franja.length < 4) {
      return;
    }
    const xs = franja.map((p) => p.x);
    const ys = franja.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const anchoFranja = maxX - minX;
    const xCarril1 = minX + anchoFranja * 0.25;
    const xCarril2 = minX + anchoFranja * 0.75;

    this.dibujarPolilinea(
      ctx,
      [
        { x: xCarril1, y: minY },
        { x: xCarril1, y: maxY }
      ],
      aPantalla,
      color,
      1.3
    );
    this.dibujarPolilinea(
      ctx,
      [
        { x: xCarril2, y: minY },
        { x: xCarril2, y: maxY }
      ],
      aPantalla,
      color,
      1.3
    );
  }

  private dibujarCarrilesEnFranjaHorizontal(
    ctx: CanvasRenderingContext2D,
    franja: Punto2D[],
    aPantalla: (pt: Punto2D) => Punto2D,
    color: string
  ): void {
    if (franja.length < 4) {
      return;
    }
    const xs = franja.map((p) => p.x);
    const ys = franja.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const altoFranja = maxY - minY;
    const yCarril1 = minY + altoFranja * 0.25;
    const yCarril2 = minY + altoFranja * 0.75;

    this.dibujarPolilinea(
      ctx,
      [
        { x: minX, y: yCarril1 },
        { x: maxX, y: yCarril1 }
      ],
      aPantalla,
      color,
      1.3
    );
    this.dibujarPolilinea(
      ctx,
      [
        { x: minX, y: yCarril2 },
        { x: maxX, y: yCarril2 }
      ],
      aPantalla,
      color,
      1.3
    );
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

  private dibujarVehiculoIndividual(
    ctx: CanvasRenderingContext2D,
    veh: EspecificacionVehiculo,
    post: PosturaVehiculo,
    aPantalla: (pt: Punto2D) => Punto2D,
    escalaPxPorMetro: number
  ): void {
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

    let colorCarroceria = this.obtenerColorPorCategoria(veh);
    if (post.estadoHolgura === 'ajuste') {
      colorCarroceria = '#EE8600';
    } else if (post.estadoHolgura === 'invasion') {
      colorCarroceria = '#F04C4D';
    }

    ctx.fillStyle = colorCarroceria;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(xInicioCarroceria, yInicioCarroceria, largoPx, anchoPx, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(xInicioCarroceria + largoPx - 5, yInicioCarroceria + 2, 3.5, anchoPx - 4);

    const largoRuedaPx = Math.max(5, 0.65 * escalaPxPorMetro);
    const anchoRuedaPx = Math.max(2.5, 0.25 * escalaPxPorMetro);
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

  private obtenerColorPorCategoria(veh: EspecificacionVehiculo): string {
    switch (veh.categoria) {
      case 'Bus':
        return '#0284c7';
      case 'Camión Rígido':
        return '#4f46e5';
      case 'Articulado':
        return '#7c3aed';
      case 'Personalizado':
        return '#0d9488';
      default:
        return '#005FAE';
    }
  }
}