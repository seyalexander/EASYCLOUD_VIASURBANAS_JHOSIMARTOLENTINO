import { Injectable } from '@angular/core';
import { ParametrosCurva, Punto2D, ResultadoGeometriaCurva } from '../../modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../modelos/modelo-vehiculos';

@Injectable({
  providedIn: 'root'
})
export class ServicioGeometriaCurva {
  /** Paso de discretización en metros para generar puntos suaves de trayectoria y bordes */
  private readonly pasoDiscretizacionMetros = 0.5;

  /**
   * Calcula la geometría completa de la curva y el recorrido total.
   */
  public calcularGeometria(parametros: ParametrosCurva): ResultadoGeometriaCurva {
    const validacion = this.validarParametros(parametros);
    if (!validacion.esValida) {
      return {
        esValida: false,
        mensajeValidacion: validacion.mensaje,
        angulo1Grados: 0,
        angulo2Grados: 0,
        angulo3Grados: 0,
        longitudArco1Metros: 0,
        longitudArco2Metros: 0,
        longitudArco3Metros: 0,
        longitudTotalCurvaMetros: 0,
        longitudTotalRecorridoMetros: 0,
        puntosEje: [],
        puntosBordeInterno: [],
        puntosBordeExterno: []
      };
    }

    const signoGiro = parametros.sentidoGiro === 'derecha' ? -1 : 1;
    const deltaTotalRad = this.gradosARadianes(parametros.anguloDeflexionGrados);

    let angulo1Rad = 0;
    let angulo2Rad = 0;
    let angulo3Rad = 0;

    let radio1 = parametros.radio1Metros;
    let radio2 = parametros.radio2Metros;
    let radio3 = parametros.radio3Metros;

    if (parametros.tipoCurva === 'simple') {
      radio1 = parametros.radio2Metros;
      radio2 = parametros.radio2Metros;
      radio3 = parametros.radio2Metros;
      angulo2Rad = deltaTotalRad;
    } else {
      // Curva compuesta de 3 radios con desplazamientos/disloques d1 y d2
      const denom1 = Math.max(0.1, radio1 - radio2);
      const coseno1 = this.limitarRango(
        (radio1 - radio2 - parametros.desplazamiento1Metros) / denom1,
        -1,
        1
      );
      angulo1Rad = Math.acos(coseno1);

      const denom3 = Math.max(0.1, radio3 - radio2);
      const coseno3 = this.limitarRango(
        (radio3 - radio2 - parametros.desplazamiento2Metros) / denom3,
        -1,
        1
      );
      angulo3Rad = Math.acos(coseno3);

      angulo2Rad = deltaTotalRad - angulo1Rad - angulo3Rad;

      // Si la suma de ángulos extremos excede deltaTotal, se reparte proporcionalmente
      if (angulo2Rad < 0) {
        const sumaExtremos = angulo1Rad + angulo3Rad;
        const factor = (deltaTotalRad * 0.6) / Math.max(0.0001, sumaExtremos);
        angulo1Rad *= factor;
        angulo3Rad *= factor;
        angulo2Rad = Math.max(0.05, deltaTotalRad - angulo1Rad - angulo3Rad);
      }
    }

    const longitudArco1 = radio1 * angulo1Rad;
    const longitudArco2 = radio2 * angulo2Rad;
    const longitudArco3 = radio3 * angulo3Rad;
    const longitudTotalCurva = longitudArco1 + longitudArco2 + longitudArco3;

    const puntosEje = this.generarPuntosRecorrido(
      parametros,
      signoGiro,
      radio1,
      radio2,
      radio3,
      angulo1Rad,
      angulo2Rad,
      angulo3Rad
    );

    const mitadAncho = parametros.anchoCalzadaMetros / 2;
    const puntosBordeIzquierdo = this.generarOffsetParalelo(puntosEje, mitadAncho);
    const puntosBordeDerecho = this.generarOffsetParalelo(puntosEje, -mitadAncho);

    const puntosBordeInterno =
      parametros.sentidoGiro === 'derecha' ? puntosBordeDerecho : puntosBordeIzquierdo;
    const puntosBordeExterno =
      parametros.sentidoGiro === 'derecha' ? puntosBordeIzquierdo : puntosBordeDerecho;

    const longitudTotalRecorrido =
      parametros.longitudTramoRectoMetros * 2 + longitudTotalCurva;

    return {
      esValida: true,
      mensajeValidacion: 'Geometría calculada correctamente.',
      angulo1Grados: this.radianesAGrados(angulo1Rad),
      angulo2Grados: this.radianesAGrados(angulo2Rad),
      angulo3Grados: this.radianesAGrados(angulo3Rad),
      longitudArco1Metros: longitudArco1,
      longitudArco2Metros: longitudArco2,
      longitudArco3Metros: longitudArco3,
      longitudTotalCurvaMetros: longitudTotalCurva,
      longitudTotalRecorridoMetros: longitudTotalRecorrido,
      puntosEje,
      puntosBordeInterno,
      puntosBordeExterno
    };
  }

  /** Valida que los parámetros geométricos sean coherentes */
  private validarParametros(p: ParametrosCurva): { esValida: boolean; mensaje: string } {
    if (p.anguloDeflexionGrados <= 5 || p.anguloDeflexionGrados > 180) {
      return {
        esValida: false,
        mensaje: 'El ángulo de deflexión debe estar entre 5° y 180°.'
      };
    }
    if (p.radio2Metros <= 2) {
      return {
        esValida: false,
        mensaje: 'El radio principal R2 debe ser mayor a 2.0 m.'
      };
    }
    if (p.anchoCalzadaMetros < 2.5) {
      return {
        esValida: false,
        mensaje: 'El ancho de calzada debe ser al menos de 2.5 m.'
      };
    }
    return { esValida: true, mensaje: '' };
  }

  /**
   * Construye la secuencia de puntos (x, y) a lo largo del tramo de entrada,
   * los arcos de la curva y el tramo de salida.
   */
  private generarPuntosRecorrido(
    p: ParametrosCurva,
    signoGiro: number,
    r1: number,
    r2: number,
    r3: number,
    a1: number,
    a2: number,
    a3: number
  ): Punto2D[] {
    const puntos: Punto2D[] = [];

    // Inicio en el origen (0, 0) avanzando hacia +X (rumbo 0 rad)
    let xActual = 0;
    let yActual = 0;
    let rumboRad = 0;

    puntos.push({ x: xActual, y: yActual });

    // 1. Tramo recto de entrada
    const pasosEntrada = Math.max(
      1,
      Math.ceil(p.longitudTramoRectoMetros / this.pasoDiscretizacionMetros)
    );
    const pasoEntradaReal = p.longitudTramoRectoMetros / pasosEntrada;
    for (let i = 1; i <= pasosEntrada; i++) {
      xActual += pasoEntradaReal * Math.cos(rumboRad);
      yActual += pasoEntradaReal * Math.sin(rumboRad);
      puntos.push({ x: xActual, y: yActual });
    }

    // Helper para avanzar sobre un arco circular de radio R y ángulo total deltaArco
    const agregarArco = (radioArco: number, deltaArcoRad: number): void => {
      if (deltaArcoRad <= 0.0001 || radioArco <= 0.01) {
        return;
      }
      const longitudArco = radioArco * deltaArcoRad;
      const pasos = Math.max(
        2,
        Math.ceil(longitudArco / this.pasoDiscretizacionMetros)
      );
      const pasoAngulo = (deltaArcoRad / pasos) * signoGiro;

      // Centro de curvatura perpendicular al rumbo actual
      const anguloAlCentro = rumboRad + signoGiro * (Math.PI / 2);
      const cx = xActual + radioArco * Math.cos(anguloAlCentro);
      const cy = yActual + radioArco * Math.sin(anguloAlCentro);

      let anguloDesdeCentro = Math.atan2(yActual - cy, xActual - cx);

      for (let i = 1; i <= pasos; i++) {
        anguloDesdeCentro += pasoAngulo;
        xActual = cx + radioArco * Math.cos(anguloDesdeCentro);
        yActual = cy + radioArco * Math.sin(anguloDesdeCentro);
        rumboRad += pasoAngulo;
        puntos.push({ x: xActual, y: yActual });
      }
    };

    if (p.tipoCurva === 'simple') {
      agregarArco(r2, a2);
    } else {
      agregarArco(r1, a1);
      agregarArco(r2, a2);
      agregarArco(r3, a3);
    }

    // 3. Tramo recto de salida
    const pasosSalida = Math.max(
      1,
      Math.ceil(p.longitudTramoRectoMetros / this.pasoDiscretizacionMetros)
    );
    const pasoSalidaReal = p.longitudTramoRectoMetros / pasosSalida;
    for (let i = 1; i <= pasosSalida; i++) {
      xActual += pasoSalidaReal * Math.cos(rumboRad);
      yActual += pasoSalidaReal * Math.sin(rumboRad);
      puntos.push({ x: xActual, y: yActual });
    }

    return puntos;
  }

  /**
   * Genera una polilínea paralela desplazada una distancia lateral (positiva = izquierda, negativa = derecha).
   */
  private generarOffsetParalelo(puntos: Punto2D[], offsetMetros: number): Punto2D[] {
    if (puntos.length < 2) {
      return [];
    }
    const resultado: Punto2D[] = [];

    for (let i = 0; i < puntos.length; i++) {
      const anterior = puntos[Math.max(0, i - 1)];
      const siguiente = puntos[Math.min(puntos.length - 1, i + 1)];
      const dx = siguiente.x - anterior.x;
      const dy = siguiente.y - anterior.y;
      const longitud = Math.hypot(dx, dy) || 1;

      // Vector normal izquierdo unitario (-dy / L, dx / L)
      const nx = -dy / longitud;
      const ny = dx / longitud;

      resultado.push({
        x: puntos[i].x + nx * offsetMetros,
        y: puntos[i].y + ny * offsetMetros
      });
    }

    return resultado;
  }

  private gradosARadianes(grados: number): number {
    return (grados * Math.PI) / 180;
  }

  private radianesAGrados(radianes: number): number {
    return (radianes * 180) / Math.PI;
  }

  private limitarRango(valor: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, valor));
  }

  /**
   * Ajusta y sugiere parámetros de curva coherentes con el tamaño y radio de giro
   * del vehículo seleccionado (inspirado en los criterios del Capítulo 4).
   */
  public ajustarParametrosAVehiculo(
    actuales: ParametrosCurva,
    vehiculo: EspecificacionVehiculo
  ): ParametrosCurva {
    // Radio de giro base del vehículo más margen operativo
    const radioBase = Math.max(4.5, vehiculo.radioMinimoGiroMetros);

    // En curvas compuestas de 3 radios, R2 es el radio central más cerrado y R1/R3 son más amplios
    const radio2Ajustado = Number(Math.max(radioBase * 0.9, 5.0).toFixed(1));
    const radio1Ajustado = Number(Math.max(radio2Ajustado * 1.65, radio2Ajustado + 4).toFixed(1));
    const radio3Ajustado = Number(Math.max(radio2Ajustado * 1.55, radio2Ajustado + 3.5).toFixed(1));

    // Ensanchamiento estimado por barrido en curva + holgura lateral (ej. 0.60 m por lado)
    const efectoBarridoCurva =
      (vehiculo.largoMetros * vehiculo.largoMetros) / Math.max(8, radio2Ajustado * 4);
    const holguraTotal = vehiculo.holguraSeguridadMetros * 2;
    const anchoRequerido =
      vehiculo.anchoMetros + efectoBarridoCurva + holguraTotal + 1.4;
    const anchoCalzadaAjustado = Number(Math.max(4.2, anchoRequerido).toFixed(1));

    // Tramos rectos proporcionales al largo del vehículo para apreciar entrada y salida
    const tramoRectoAjustado = Number(
      Math.max(12, vehiculo.largoMetros * 2.2).toFixed(1)
    );

    const desplazamientoAjustado = Number(
      Math.max(0.8, Math.min(4.5, vehiculo.anchoMetros * 0.55)).toFixed(1)
    );

    return {
      ...actuales,
      radio1Metros: radio1Ajustado,
      radio2Metros: radio2Ajustado,
      radio3Metros: radio3Ajustado,
      desplazamiento1Metros: desplazamientoAjustado,
      desplazamiento2Metros: desplazamientoAjustado,
      anchoCalzadaMetros: anchoCalzadaAjustado,
      longitudTramoRectoMetros: tramoRectoAjustado
    };
  }
}