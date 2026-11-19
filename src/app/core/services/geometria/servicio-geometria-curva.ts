import { Injectable } from '@angular/core';
import { ParametrosCurva, Punto2D, ResultadoGeometriaCurva } from '../../modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../modelos/modelo-vehiculos';


@Injectable({
  providedIn: 'root'
})
export class ServicioGeometriaCurva {
  /** Separación mínima de seguridad establecida en el Capítulo 4 del libro (m) */
  public readonly separacionSeguridadLibroMetros = 0.6;

  /** Paso de discretización en metros para generar puntos suaves de trayectoria y bordes */
  private readonly pasoDiscretizacionMetros = 0.5;

  /**
   * Calcula y valida la geometría de la curva según el Capítulo 4 del libro.
   */
  public calcularGeometria(parametros: ParametrosCurva): ResultadoGeometriaCurva {
    const validacionBase = this.validarParametrosBase(parametros);
    if (!validacionBase.esValida) {
      return this.crearResultadoInvalido(validacionBase.mensaje);
    }

    const signoGiro = parametros.sentidoGiro === 'derecha' ? -1 : 1;
    const deltaTotalRad = this.gradosARadianes(parametros.anguloDeflexionGrados);

    let angulo1Rad = 0;
    let angulo2Rad = 0;
    let angulo3Rad = 0;

    const radio2 = parametros.radio2Metros;
    let radio1 = parametros.radio1Metros;
    let radio3 = parametros.radio3Metros;

    const observacionesLibro: string[] = [];

    if (parametros.tipoCurva === 'simple') {
      radio1 = radio2;
      radio3 = radio2;
      angulo2Rad = deltaTotalRad;
    } else {
      // Validación de radios R1 y R3 respecto a R2 para evitar división por cero o valores inconsistentes
      if (radio1 <= radio2) {
        return this.crearResultadoInvalido(
          'En una curva compuesta de 3 radios, R1 debe ser mayor que R2.'
        );
      }
      if (radio3 <= radio2) {
        return this.crearResultadoInvalido(
          'En una curva compuesta de 3 radios, R3 debe ser mayor que R2.'
        );
      }

      // Argumentos del coseno inverso según las relaciones de desplazamiento d1 y d2 del libro
      const argumentoCos1 = (radio1 - radio2 - parametros.desplazamiento1Metros) / (radio1 - radio2);
      if (argumentoCos1 < -1 || argumentoCos1 > 1) {
        return this.crearResultadoInvalido(
          'El argumento de cos⁻¹ para Δ1 está fuera de [-1, 1]. Revisa R1, R2 o d1.'
        );
      }

      const argumentoCos3 = (radio3 - radio2 - parametros.desplazamiento2Metros) / (radio3 - radio2);
      if (argumentoCos3 < -1 || argumentoCos3 > 1) {
        return this.crearResultadoInvalido(
          'El argumento de cos⁻¹ para Δ3 está fuera de [-1, 1]. Revisa R3, R2 o d2.'
        );
      }

      angulo1Rad = Math.acos(argumentoCos1);
      angulo3Rad = Math.acos(argumentoCos3);
      angulo2Rad = deltaTotalRad - angulo1Rad - angulo3Rad;

      if (angulo2Rad <= 0) {
        return this.crearResultadoInvalido(
          'La suma de Δ1 y Δ3 supera el ángulo de deflexión Δ; no queda tramo central Δ2.'
        );
      }

      const esSimetrica =
        Math.abs(radio1 - radio3) < 0.001 &&
        Math.abs(parametros.desplazamiento1Metros - parametros.desplazamiento2Metros) < 0.001;

      observacionesLibro.push(
        esSimetrica
          ? 'Curva compuesta simétrica (R1 = R3 y desplazamientos iguales).'
          : 'Curva compuesta asimétrica (R1 ≠ R3 o desplazamientos distintos).'
      );
    }

    // Tangentes simples T_i = R_i * tan(delta_i / 2)
    const tangente1 = radio1 * Math.tan(angulo1Rad / 2);
    const tangente2 = radio2 * Math.tan(angulo2Rad / 2);
    const tangente3 = radio3 * Math.tan(angulo3Rad / 2);

    // Longitudes de arco L_i = R_i * delta_i (en radianes, equivalente a pi * R * delta / 180)
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
      mensajeValidacion: 'Geometría válida según parámetros del Capítulo 4.',
      observacionesLibro,
      angulo1Grados: this.radianesAGrados(angulo1Rad),
      angulo2Grados: this.radianesAGrados(angulo2Rad),
      angulo3Grados: this.radianesAGrados(angulo3Rad),
      tangente1Metros: tangente1,
      tangente2Metros: tangente2,
      tangente3Metros: tangente3,
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

  /**
   * Ajusta el radio principal R2 al radio mínimo de giro del vehículo y asegura
   * al menos el ancho del vehículo más la separación de seguridad del libro (0.60 m por lado).
   */
  public ajustarParametrosAVehiculo(
    actuales: ParametrosCurva,
    vehiculo: EspecificacionVehiculo
  ): ParametrosCurva {
    const radio2Ajustado = Number(Math.max(4.5, vehiculo.radioMinimoGiroMetros).toFixed(1));
    const holguraPorLado = Math.max(
      this.separacionSeguridadLibroMetros,
      vehiculo.holguraSeguridadMetros
    );
    const anchoMinimoLibro = Number(
      (vehiculo.anchoMetros + holguraPorLado * 2).toFixed(2)
    );
    const anchoCalzadaAjustado = Math.max(actuales.anchoCalzadaMetros, anchoMinimoLibro);

    const radio1Ajustado = Number(Math.max(actuales.radio1Metros, radio2Ajustado + 6).toFixed(1));
    const radio3Ajustado = Number(Math.max(actuales.radio3Metros, radio2Ajustado + 6).toFixed(1));

    return {
      ...actuales,
      radio1Metros: radio1Ajustado,
      radio2Metros: radio2Ajustado,
      radio3Metros: radio3Ajustado,
      anchoCalzadaMetros: anchoCalzadaAjustado
    };
  }

  private validarParametrosBase(p: ParametrosCurva): { esValida: boolean; mensaje: string } {
    if (p.anguloDeflexionGrados <= 0 || p.anguloDeflexionGrados > 180) {
      return {
        esValida: false,
        mensaje: 'El ángulo de deflexión Δ debe ser mayor a 0° y hasta 180°.'
      };
    }
    if (p.radio2Metros <= 0) {
      return {
        esValida: false,
        mensaje: 'El radio R2 debe ser mayor a 0 m.'
      };
    }
    if (p.anchoCalzadaMetros < this.separacionSeguridadLibroMetros * 2) {
      return {
        esValida: false,
        mensaje: `El ancho de calzada debe permitir al menos ${this.separacionSeguridadLibroMetros * 2} m de separación lateral mínima.`
      };
    }
    return { esValida: true, mensaje: '' };
  }

  private crearResultadoInvalido(mensaje: string): ResultadoGeometriaCurva {
    return {
      esValida: false,
      mensajeValidacion: mensaje,
      observacionesLibro: [],
      angulo1Grados: 0,
      angulo2Grados: 0,
      angulo3Grados: 0,
      tangente1Metros: 0,
      tangente2Metros: 0,
      tangente3Metros: 0,
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

    let xActual = 0;
    let yActual = 0;
    let rumboRad = 0;

    puntos.push({ x: xActual, y: yActual });

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
}