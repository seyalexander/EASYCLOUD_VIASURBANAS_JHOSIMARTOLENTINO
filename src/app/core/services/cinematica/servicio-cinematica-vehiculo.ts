import { Injectable } from '@angular/core';
import { Punto2D, ResultadoGeometriaCurva } from '../../modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../modelos/modelo-vehiculos';
import { EstadoHolgura, PosturaVehiculo } from '../../modelos/modelo-simulacion';


@Injectable({
  providedIn: 'root'
})
export class ServicioCinematicaVehiculo {
  /**
   * Calcula la postura del vehículo dado un progreso entre 0 y 1 sobre el recorrido.
   */
  public calcularPosturaEnProgreso(
    geometria: ResultadoGeometriaCurva,
    vehiculo: EspecificacionVehiculo,
    progreso: number
  ): PosturaVehiculo {
    const progresoAcotado = Math.min(1, Math.max(0, progreso));
    const distanciaRecorrida =
      progresoAcotado * geometria.longitudTotalRecorridoMetros;

    const puntos = geometria.puntosEje;
    if (puntos.length < 2) {
      return this.crearPosturaVacia(progresoAcotado);
    }

    // Acumulamos longitudes de segmento para ubicar el punto objetivo en el eje
    const longitudesSegmento: number[] = [0];
    let acumulado = 0;
    for (let i = 1; i < puntos.length; i++) {
      acumulado += Math.hypot(
        puntos[i].x - puntos[i - 1].x,
        puntos[i].y - puntos[i - 1].y
      );
      longitudesSegmento.push(acumulado);
    }

    const totalLongitud = acumulado || 1;
    const distanciaObjetivo = progresoAcotado * totalLongitud;

    const puntoGuia = this.interpolarPuntoPorDistancia(
      puntos,
      longitudesSegmento,
      distanciaObjetivo
    );

    // Punto guía ligeramente adelantado (distancia entre ejes L) para orientar la dirección natural
    const distanciaAdelantada = Math.min(
      totalLongitud,
      distanciaObjetivo + Math.max(1.0, vehiculo.distanciaEjesMetros)
    );
    const puntoAdelantado = this.interpolarPuntoPorDistancia(
      puntos,
      longitudesSegmento,
      distanciaAdelantada
    );

    const anguloTangenteGuia = Math.atan2(
      puntoAdelantado.y - puntoGuia.y,
      puntoAdelantado.x - puntoGuia.x
    );

    // Suavizado cinemático según distancia entre ejes (L) para un giro más realista
    const anguloCarroceriaRad = anguloTangenteGuia;

    // Estimación del ángulo de dirección de las ruedas delanteras (modelo de bicicleta: tan(delta) ~ L / R)
    const puntoPosterior = this.interpolarPuntoPorDistancia(
      puntos,
      longitudesSegmento,
      Math.max(0, distanciaObjetivo - Math.max(1.0, vehiculo.distanciaEjesMetros))
    );
    const anguloAnterior = Math.atan2(
      puntoGuia.y - puntoPosterior.y,
      puntoGuia.x - puntoPosterior.x
    );
    const diferenciaAngular = this.normalizarAngulo(anguloTangenteGuia - anguloAnterior);
    const anguloDireccionRuedasRad = Math.atan2(
      vehiculo.distanciaEjesMetros * Math.sin(diferenciaAngular),
      Math.max(0.5, vehiculo.distanciaEjesMetros)
    );

    // El centro geométrico del rectángulo del vehículo está desplazado respecto al eje trasero
    const centroGeometricoX =
      puntoGuia.x +
      (-vehiculo.vueloTraseroMetros + vehiculo.largoMetros / 2) *
        Math.cos(anguloCarroceriaRad);
    const centroGeometricoY =
      puntoGuia.y +
      (-vehiculo.vueloTraseroMetros + vehiculo.largoMetros / 2) *
        Math.sin(anguloCarroceriaRad);

    const esquinasCarroceria = this.calcularCuatroEsquinas(
      { x: centroGeometricoX, y: centroGeometricoY },
      vehiculo.largoMetros,
      vehiculo.anchoMetros,
      anguloCarroceriaRad
    );

    const { estadoHolgura, distanciaMinimaBorde } = this.evaluarHolguraConBordes(
      esquinasCarroceria,
      geometria,
      vehiculo.holguraSeguridadMetros
    );

    return {
      distanciaRecorridaMetros: distanciaRecorrida,
      progreso: progresoAcotado,
      posicionEjeTrasero: puntoGuia,
      anguloCarroceriaRad,
      anguloDireccionRuedasRad,
      esquinasCarroceria,
      estadoHolgura,
      distanciaMinimaBordeMetros: distanciaMinimaBorde
    };
  }

  /** Interpola linealmente un punto sobre la polilínea a una distancia acumulada dada */
  private interpolarPuntoPorDistancia(
    puntos: Punto2D[],
    distanciasAcumuladas: number[],
    distanciaObjetivo: number
  ): Punto2D {
    if (distanciaObjetivo <= 0) {
      return { ...puntos[0] };
    }
    const ultimoIndice = puntos.length - 1;
    if (distanciaObjetivo >= distanciasAcumuladas[ultimoIndice]) {
      return { ...puntos[ultimoIndice] };
    }

    for (let i = 1; i <= ultimoIndice; i++) {
      const dAnterior = distanciasAcumuladas[i - 1];
      const dActual = distanciasAcumuladas[i];
      if (distanciaObjetivo <= dActual) {
        const tramo = dActual - dAnterior || 1;
        const t = (distanciaObjetivo - dAnterior) / tramo;
        return {
          x: puntos[i - 1].x + (puntos[i].x - puntos[i - 1].x) * t,
          y: puntos[i - 1].y + (puntos[i].y - puntos[i - 1].y) * t
        };
      }
    }

    return { ...puntos[ultimoIndice] };
  }

  /** Calcula las 4 esquinas del rectángulo del vehículo rotado por anguloRad */
  private calcularCuatroEsquinas(
    centro: Punto2D,
    largo: number,
    ancho: number,
    anguloRad: number
  ): Punto2D[] {
    const mitadLargo = largo / 2;
    const mitadAncho = ancho / 2;
    const cosA = Math.cos(anguloRad);
    const sinA = Math.sin(anguloRad);

    const locales: Punto2D[] = [
      { x: mitadLargo, y: mitadAncho },
      { x: mitadLargo, y: -mitadAncho },
      { x: -mitadLargo, y: -mitadAncho },
      { x: -mitadLargo, y: mitadAncho }
    ];

    return locales.map((pt) => ({
      x: centro.x + pt.x * cosA - pt.y * sinA,
      y: centro.y + pt.x * sinA + pt.y * cosA
    }));
  }

  /**
   * Evalúa la distancia mínima de las esquinas del vehículo hacia los bordes de calzada
   * para clasificar el estado como seguro, ajuste o invasión.
   */
  private evaluarHolguraConBordes(
    esquinas: Punto2D[],
    geometria: ResultadoGeometriaCurva,
    holguraRequerida: number
  ): { estadoHolgura: EstadoHolgura; distanciaMinimaBorde: number } {
    let distanciaMinima = Number.POSITIVE_INFINITY;

    const revisarPolilinea = (borde: Punto2D[]): void => {
      for (const esquina of esquinas) {
        for (const ptBorde of borde) {
          const dist = Math.hypot(esquina.x - ptBorde.x, esquina.y - ptBorde.y);
          if (dist < distanciaMinima) {
            distanciaMinima = dist;
          }
        }
      }
    };

    revisarPolilinea(geometria.puntosBordeInterno);
    revisarPolilinea(geometria.puntosBordeExterno);

    if (!Number.isFinite(distanciaMinima)) {
      return { estadoHolgura: 'seguro', distanciaMinimaBorde: 0 };
    }

    if (distanciaMinima < 0.15) {
      return { estadoHolgura: 'invasion', distanciaMinimaBorde: distanciaMinima };
    }
    if (distanciaMinima < holguraRequerida) {
      return { estadoHolgura: 'ajuste', distanciaMinimaBorde: distanciaMinima };
    }
    return { estadoHolgura: 'seguro', distanciaMinimaBorde: distanciaMinima };
  }

  private normalizarAngulo(anguloRad: number): number {
    let a = anguloRad;
    while (a > Math.PI) {
      a -= 2 * Math.PI;
    }
    while (a < -Math.PI) {
      a += 2 * Math.PI;
    }
    return a;
  }

  private crearPosturaVacia(progreso: number): PosturaVehiculo {
    return {
      distanciaRecorridaMetros: 0,
      progreso,
      posicionEjeTrasero: { x: 0, y: 0 },
      anguloCarroceriaRad: 0,
      anguloDireccionRuedasRad: 0,
      esquinasCarroceria: [],
      estadoHolgura: 'seguro',
      distanciaMinimaBordeMetros: 0
    };
  }
}