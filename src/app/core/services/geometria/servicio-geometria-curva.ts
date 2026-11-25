import { Injectable } from '@angular/core';
import {
  NumeroCarril,
  ParametrosCurva,
  Punto2D,
  ResultadoGeometriaCurva,
  RutaOvalo
} from '../../modelos/modelo-curva';
import { EspecificacionVehiculo } from '../../modelos/modelo-vehiculos';

@Injectable({
  providedIn: 'root'
})
export class ServicioGeometriaCurva {
  /** Separación mínima de seguridad del Capítulo 4 del libro (m) */
  public readonly separacionSeguridadLibroMetros = 0.6;

  private readonly pasoDiscretizacionMetros = 0.6;

  public calcularGeometria(parametros: ParametrosCurva): ResultadoGeometriaCurva {
    const validacionBase = this.validarParametrosBase(parametros);
    if (!validacionBase.esValida) {
      return this.crearResultadoInvalido(validacionBase.mensaje);
    }

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

      const argumentoCos1 =
        (radio1 - radio2 - parametros.desplazamiento1Metros) / (radio1 - radio2);
      if (argumentoCos1 < -1 || argumentoCos1 > 1) {
        return this.crearResultadoInvalido(
          'El argumento de cos⁻¹ para Δ1 está fuera de [-1, 1]. Revisa R1, R2 o d1.'
        );
      }

      const argumentoCos3 =
        (radio3 - radio2 - parametros.desplazamiento2Metros) / (radio3 - radio2);
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

    const tangente1 = radio1 * Math.tan(angulo1Rad / 2);
    const tangente2 = radio2 * Math.tan(angulo2Rad / 2);
    const tangente3 = radio3 * Math.tan(angulo3Rad / 2);

    const longitudArco1 = radio1 * angulo1Rad;
    const longitudArco2 = radio2 * angulo2Rad;
    const longitudArco3 = radio3 * angulo3Rad;
    const longitudTotalCurva = longitudArco1 + longitudArco2 + longitudArco3;

    const anchoCalzadaEfectivo = Math.max(4.4, parametros.anchoCalzadaMetros);
    const anchoCarrilEfectivo = anchoCalzadaEfectivo / 2;

    const parametrosEfectivos: ParametrosCurva = {
      ...parametros,
      anchoCalzadaMetros: anchoCalzadaEfectivo,
      anchoCarrilMetros: anchoCarrilEfectivo
    };

    const puntosEjeCalzada = this.generarPuntosRuta(
      parametrosEfectivos,
      parametrosEfectivos.rutaOvalo
    );

    const puntosCarril1 = this.generarOffsetParalelo(
      puntosEjeCalzada,
      -anchoCarrilEfectivo * 0.5
    );
    const puntosCarril2 = this.generarOffsetParalelo(
      puntosEjeCalzada,
      anchoCarrilEfectivo * 0.5
    );

    const puntosEje =
      parametros.carrilSeleccionado === 1 ? puntosCarril1 : puntosCarril2;

    const mitadCalzada = anchoCalzadaEfectivo / 2;
    const puntosBordeInterno = this.generarOffsetParalelo(puntosEjeCalzada, -mitadCalzada);
    const puntosBordeExterno = this.generarOffsetParalelo(puntosEjeCalzada, mitadCalzada);

    const { franjasViales, contornoIsletaCentral } =
      this.generarEscenaOvaloMetropolitana(parametrosEfectivos);

    const longitudTotalRecorrido = this.calcularLongitudPolilinea(puntosEje);

    return {
      esValida: true,
      mensajeValidacion: 'Óvalo con carriles centrados y paso inferior válido.',
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
      puntosCarril1,
      puntosCarril2,
      puntosBordeInterno,
      puntosBordeExterno,
      franjasViales,
      contornoIsletaCentral
    };
  }

  public calcularGeometriaParaRuta(
    parametros: ParametrosCurva,
    ruta: RutaOvalo,
    carril: NumeroCarril
  ): ResultadoGeometriaCurva {
    const anchoCalzadaEfectivo = Math.max(4.4, parametros.anchoCalzadaMetros);
    const anchoCarrilEfectivo = anchoCalzadaEfectivo / 2;
    const pEfectivos: ParametrosCurva = {
      ...parametros,
      rutaOvalo: ruta,
      carrilSeleccionado: carril,
      anchoCalzadaMetros: anchoCalzadaEfectivo,
      anchoCarrilMetros: anchoCarrilEfectivo
    };

    const puntosEjeCalzada = this.generarPuntosRuta(pEfectivos, ruta);
    const mitadCalzada = anchoCalzadaEfectivo / 2;
    const puntosCarril1 = this.generarOffsetParalelo(
      puntosEjeCalzada,
      -anchoCarrilEfectivo * 0.5
    );
    const puntosCarril2 = this.generarOffsetParalelo(
      puntosEjeCalzada,
      anchoCarrilEfectivo * 0.5
    );
    const puntosEjeActivo = carril === 1 ? puntosCarril1 : puntosCarril2;
    const puntosBordeInterno = this.generarOffsetParalelo(puntosEjeCalzada, -mitadCalzada);
    const puntosBordeExterno = this.generarOffsetParalelo(puntosEjeCalzada, mitadCalzada);
    const longitudTotalRecorridoMetros = this.calcularLongitudPolilinea(puntosEjeActivo);

    return {
      esValida: true,
      mensajeValidacion: '',
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
      longitudTotalRecorridoMetros,
      puntosEje: puntosEjeActivo,
      puntosCarril1,
      puntosCarril2,
      puntosBordeInterno,
      puntosBordeExterno,
      franjasViales: [],
      contornoIsletaCentral: []
    };
  }

  public ajustarParametrosAVehiculo(
    actuales: ParametrosCurva,
    vehiculo: EspecificacionVehiculo
  ): ParametrosCurva {
    const holguraPorLado = Math.max(
      this.separacionSeguridadLibroMetros,
      vehiculo.holguraSeguridadMetros
    );

    const esVehiculoLargo =
      vehiculo.largoMetros >= 9 ||
      vehiculo.categoria === 'Articulado' ||
      vehiculo.categoria === 'Bus' ||
      vehiculo.categoria === 'Camión Rígido';

    const factorBarridoCurva =
      vehiculo.categoria === 'Articulado'
        ? 0.9
        : esVehiculoLargo
          ? 0.45
          : 0;

    const anchoCarrilCalculado = Number(
      Math.max(
        3.6,
        vehiculo.anchoMetros + holguraPorLado * 2 + factorBarridoCurva
      ).toFixed(2)
    );
    const anchoCalzadaCalculada = Number((anchoCarrilCalculado * 2).toFixed(2));

    const radio2Ajustado = Number(
      Math.max(6.0, vehiculo.radioMinimoGiroMetros).toFixed(1)
    );
    const margenRadiosCompuestos = esVehiculoLargo ? 12 : 8;
    const radio1Ajustado = Number(
      Math.max(actuales.radio1Metros, radio2Ajustado + margenRadiosCompuestos).toFixed(1)
    );
    const radio3Ajustado = Number(
      Math.max(actuales.radio3Metros, radio2Ajustado + margenRadiosCompuestos).toFixed(1)
    );

    const semiejeXAjustado = Number(
      Math.max(
        18,
        radio2Ajustado * (esVehiculoLargo ? 3.2 : 2.8) +
          vehiculo.largoMetros * (esVehiculoLargo ? 1.3 : 1.0) +
          anchoCalzadaCalculada
      ).toFixed(1)
    );
    const semiejeYAjustado = Number(
      Math.max(
        14,
        radio2Ajustado * (esVehiculoLargo ? 2.4 : 2.0) +
          vehiculo.largoMetros * (esVehiculoLargo ? 1.0 : 0.8) +
          anchoCalzadaCalculada
      ).toFixed(1)
    );

    return {
      ...actuales,
      anchoCarrilMetros: anchoCarrilCalculado,
      anchoCalzadaMetros: anchoCalzadaCalculada,
      radio1Metros: radio1Ajustado,
      radio2Metros: radio2Ajustado,
      radio3Metros: radio3Ajustado,
      semiejeXMetros: semiejeXAjustado,
      semiejeYMetros: semiejeYAjustado
    };
  }

  private obtenerGeometriaBaseVias(p: ParametrosCurva) {
    const rx = p.semiejeXMetros;
    const ry = p.semiejeYMetros;
    const anchoDosCarriles = p.anchoCalzadaMetros;
    const separacionSentidos = Math.max(4.5, p.anchoCarrilMetros * 1.4);
    const extensionAcceso = Math.max(24, p.longitudTramoRectoMetros * 1.6);

    const xSubidaCentral = separacionSentidos / 2 + anchoDosCarriles / 2;
    const xBajadaCentral = -(separacionSentidos / 2 + anchoDosCarriles / 2);

    const xRamalIzquierdo = xBajadaCentral - anchoDosCarriles;
    const xRamalDerecho = xSubidaCentral + anchoDosCarriles;

    const yInferior = -(separacionSentidos / 2 + anchoDosCarriles / 2);
    const ySuperior = separacionSentidos / 2 + anchoDosCarriles / 2;

    return {
      rx,
      ry,
      anchoDosCarriles,
      separacionSentidos,
      extensionAcceso,
      xSubidaCentral,
      xBajadaCentral,
      xRamalIzquierdo,
      xRamalDerecho,
      yInferior,
      ySuperior
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
    if (p.anchoCalzadaMetros < 4.4 || p.anchoCarrilMetros < 2.2) {
      return {
        esValida: false,
        mensaje: 'El ancho de calzada debe ser al menos de 4.4 m (2.2 m por carril).'
      };
    }
    if (p.semiejeXMetros < 12 || p.semiejeYMetros < 10) {
      return {
        esValida: false,
        mensaje: 'Las dimensiones del óvalo son demasiado pequeñas para maniobras seguras.'
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
      puntosCarril1: [],
      puntosCarril2: [],
      puntosBordeInterno: [],
      puntosBordeExterno: [],
      franjasViales: [],
      contornoIsletaCentral: []
    };
  }

  /**
   * Genera el eje central de la calzada para cada ruta; luego calcularGeometria /
   * calcularGeometriaParaRuta aplica el offset exacto del carril 1 o carril 2.
   */
  private generarPuntosRuta(p: ParametrosCurva, ruta: RutaOvalo): Punto2D[] {
    const {
      rx,
      ry,
      extensionAcceso,
      xSubidaCentral,
      xBajadaCentral,
      xRamalIzquierdo,
      xRamalDerecho,
      yInferior,
      ySuperior
    } = this.obtenerGeometriaBaseVias(p);

    const radioEmpalme = Math.max(4, Math.min(p.radio2Metros, rx * 0.24, ry * 0.28));

    switch (ruta) {
      case 'ovalo-perimetral': {
        return this.muestrearArcoElipse(rx, ry, 0, Math.PI * 2, 140);
      }

      case 'sur-a-norte': {
        const x = xSubidaCentral;
        return this.muestrearSegmentos([
          { x, y: -(ry + extensionAcceso) },
          { x, y: -ry * 0.45 },
          { x, y: ry * 0.45 },
          { x, y: ry + extensionAcceso }
        ]);
      }

      case 'norte-a-sur': {
        const x = xBajadaCentral;
        return this.muestrearSegmentos([
          { x, y: ry + extensionAcceso },
          { x, y: ry * 0.45 },
          { x, y: -ry * 0.45 },
          { x, y: -(ry + extensionAcceso) }
        ]);
      }

      case 'oeste-a-este': {
        const y = yInferior;
        return this.muestrearSegmentos([
          { x: -(rx + extensionAcceso), y },
          { x: -rx * 0.45, y },
          { x: rx * 0.45, y },
          { x: rx + extensionAcceso, y }
        ]);
      }

      case 'este-a-oeste': {
        const y = ySuperior;
        return this.muestrearSegmentos([
          { x: rx + extensionAcceso, y },
          { x: rx * 0.45, y },
          { x: -rx * 0.45, y },
          { x: -(rx + extensionAcceso), y }
        ]);
      }

      case 'norte-a-ovalo': {
        const xCarril = xRamalIzquierdo;
        const yInicio = ry + extensionAcceso;
        const cosClamped = Math.max(-0.85, Math.min(0.85, xCarril / rx));
        const angEntrada = Math.acos(cosClamped);

        const puntoContacto: Punto2D = {
          x: rx * Math.cos(angEntrada),
          y: ry * Math.sin(angEntrada)
        };
        const yPreContacto = puntoContacto.y + Math.max(2.5, radioEmpalme * 0.45);

        const curvaIncorporacion = this.muestrearCurvaCuadratica(
          { x: xCarril, y: yPreContacto },
          { x: xCarril, y: puntoContacto.y },
          puntoContacto,
          16
        );
        const anilloTramo = this.muestrearArcoElipse(
          rx,
          ry,
          angEntrada,
          angEntrada + Math.PI * 0.9,
          36
        );
        return this.muestrearSegmentos([
          { x: xCarril, y: yInicio },
          ...curvaIncorporacion,
          ...anilloTramo
        ]);
      }

      case 'sur-a-ovalo': {
        const xCarril = xRamalDerecho;
        const yInicio = -(ry + extensionAcceso);
        const cosClamped = Math.max(-0.85, Math.min(0.85, xCarril / rx));
        const angEntrada = -Math.acos(cosClamped);

        const puntoContacto: Punto2D = {
          x: rx * Math.cos(angEntrada),
          y: ry * Math.sin(angEntrada)
        };
        const yPreContacto = puntoContacto.y - Math.max(2.5, radioEmpalme * 0.45);

        const curvaIncorporacion = this.muestrearCurvaCuadratica(
          { x: xCarril, y: yPreContacto },
          { x: xCarril, y: puntoContacto.y },
          puntoContacto,
          16
        );
        const anilloTramo = this.muestrearArcoElipse(
          rx,
          ry,
          angEntrada,
          angEntrada + Math.PI * 0.9,
          36
        );
        return this.muestrearSegmentos([
          { x: xCarril, y: yInicio },
          ...curvaIncorporacion,
          ...anilloTramo
        ]);
      }

      case 'oeste-a-ovalo': {
        const yCarril = yInferior;
        const xInicio = -(rx + extensionAcceso);
        const angEntrada = Math.PI * 1.15;
        const puntoContacto: Punto2D = {
          x: rx * Math.cos(angEntrada),
          y: ry * Math.sin(angEntrada)
        };
        const curvaIncorporacion = this.muestrearCurvaCuadratica(
          { x: puntoContacto.x - Math.max(3, radioEmpalme * 0.5), y: yCarril },
          { x: puntoContacto.x, y: yCarril },
          puntoContacto,
          16
        );
        const anilloTramo = this.muestrearArcoElipse(
          rx,
          ry,
          angEntrada,
          angEntrada + Math.PI * 0.85,
          34
        );
        return this.muestrearSegmentos([
          { x: xInicio, y: yCarril },
          ...curvaIncorporacion,
          ...anilloTramo
        ]);
      }

      case 'este-a-ovalo': {
        const yCarril = ySuperior;
        const xInicio = rx + extensionAcceso;
        const angEntrada = Math.PI * 0.15;
        const puntoContacto: Punto2D = {
          x: rx * Math.cos(angEntrada),
          y: ry * Math.sin(angEntrada)
        };
        const curvaIncorporacion = this.muestrearCurvaCuadratica(
          { x: puntoContacto.x + Math.max(3, radioEmpalme * 0.5), y: yCarril },
          { x: puntoContacto.x, y: yCarril },
          puntoContacto,
          16
        );
        const anilloTramo = this.muestrearArcoElipse(
          rx,
          ry,
          angEntrada,
          angEntrada + Math.PI * 0.85,
          34
        );
        return this.muestrearSegmentos([
          { x: xInicio, y: yCarril },
          ...curvaIncorporacion,
          ...anilloTramo
        ]);
      }

      case 'ovalo-a-norte': {
        const xCarril = xRamalDerecho;
        const ySalida = ry + extensionAcceso;
        const cosClamped = Math.max(-0.85, Math.min(0.85, xCarril / rx));
        const angSalida = Math.acos(cosClamped);

        const anilloPrevio = this.muestrearArcoElipse(
          rx,
          ry,
          angSalida - Math.PI * 0.65,
          angSalida,
          28
        );
        const puntoSalida: Punto2D = {
          x: rx * Math.cos(angSalida),
          y: ry * Math.sin(angSalida)
        };
        const curvaSalida = this.muestrearCurvaCuadratica(
          puntoSalida,
          { x: xCarril, y: puntoSalida.y },
          { x: xCarril, y: puntoSalida.y + Math.max(2.5, radioEmpalme * 0.45) },
          14
        );
        return this.muestrearSegmentos([
          ...anilloPrevio,
          ...curvaSalida,
          { x: xCarril, y: ySalida }
        ]);
      }

      case 'ovalo-a-sur': {
        const xCarril = xRamalIzquierdo;
        const ySalida = -(ry + extensionAcceso);
        const cosClamped = Math.max(-0.85, Math.min(0.85, xCarril / rx));
        const angSalida = -Math.acos(cosClamped);

        const anilloPrevio = this.muestrearArcoElipse(
          rx,
          ry,
          angSalida - Math.PI * 0.65,
          angSalida,
          28
        );
        const puntoSalida: Punto2D = {
          x: rx * Math.cos(angSalida),
          y: ry * Math.sin(angSalida)
        };
        const curvaSalida = this.muestrearCurvaCuadratica(
          puntoSalida,
          { x: xCarril, y: puntoSalida.y },
          { x: xCarril, y: puntoSalida.y - Math.max(2.5, radioEmpalme * 0.45) },
          14
        );
        return this.muestrearSegmentos([
          ...anilloPrevio,
          ...curvaSalida,
          { x: xCarril, y: ySalida }
        ]);
      }

      case 'ovalo-a-oeste': {
        const yCarril = ySuperior;
        const xSalida = -(rx + extensionAcceso);
        const angSalida = Math.PI * 0.85;
        const anilloPrevio = this.muestrearArcoElipse(
          rx,
          ry,
          angSalida - Math.PI * 0.5,
          angSalida,
          24
        );
        const puntoSalida: Punto2D = {
          x: rx * Math.cos(angSalida),
          y: ry * Math.sin(angSalida)
        };
        const curvaSalida = this.muestrearCurvaCuadratica(
          puntoSalida,
          { x: puntoSalida.x - Math.max(2.5, radioEmpalme * 0.45), y: yCarril },
          { x: puntoSalida.x - Math.max(5, radioEmpalme * 0.85), y: yCarril },
          14
        );
        return this.muestrearSegmentos([
          ...anilloPrevio,
          ...curvaSalida,
          { x: xSalida, y: yCarril }
        ]);
      }

      case 'ovalo-a-este': {
        const yCarril = yInferior;
        const xSalida = rx + extensionAcceso;
        const angSalida = -Math.PI * 0.15;
        const anilloPrevio = this.muestrearArcoElipse(
          rx,
          ry,
          angSalida - Math.PI * 0.5,
          angSalida,
          24
        );
        const puntoSalida: Punto2D = {
          x: rx * Math.cos(angSalida),
          y: ry * Math.sin(angSalida)
        };
        const curvaSalida = this.muestrearCurvaCuadratica(
          puntoSalida,
          { x: puntoSalida.x + Math.max(2.5, radioEmpalme * 0.45), y: yCarril },
          { x: puntoSalida.x + Math.max(5, radioEmpalme * 0.85), y: yCarril },
          14
        );
        return this.muestrearSegmentos([
          ...anilloPrevio,
          ...curvaSalida,
          { x: xSalida, y: yCarril }
        ]);
      }
    }
  }

  private muestrearCurvaCuadratica(
    p0: Punto2D,
    p1: Punto2D,
    p2: Punto2D,
    pasos: number
  ): Punto2D[] {
    const pts: Punto2D[] = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const u = 1 - t;
      pts.push({
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
      });
    }
    return pts;
  }

  private generarEscenaOvaloMetropolitana(p: ParametrosCurva): {
    franjasViales: Punto2D[][];
    contornoIsletaCentral: Punto2D[];
  } {
    const {
      rx,
      ry,
      anchoDosCarriles,
      extensionAcceso,
      xSubidaCentral,
      xBajadaCentral,
      xRamalIzquierdo,
      xRamalDerecho,
      yInferior,
      ySuperior
    } = this.obtenerGeometriaBaseVias(p);

    const franjasViales: Punto2D[][] = [];

    franjasViales.push(
      this.crearRectanguloFranja(
        xSubidaCentral - anchoDosCarriles / 2,
        -(ry + extensionAcceso),
        anchoDosCarriles,
        (ry + extensionAcceso) * 2
      )
    );
    franjasViales.push(
      this.crearRectanguloFranja(
        xBajadaCentral - anchoDosCarriles / 2,
        -(ry + extensionAcceso),
        anchoDosCarriles,
        (ry + extensionAcceso) * 2
      )
    );

    franjasViales.push(
      this.crearRectanguloFranja(
        -(rx + extensionAcceso),
        yInferior - anchoDosCarriles / 2,
        (rx + extensionAcceso) * 2,
        anchoDosCarriles
      )
    );
    franjasViales.push(
      this.crearRectanguloFranja(
        -(rx + extensionAcceso),
        ySuperior - anchoDosCarriles / 2,
        (rx + extensionAcceso) * 2,
        anchoDosCarriles
      )
    );

    const yTop = ry + extensionAcceso;
    const yBottom = -(ry + extensionAcceso);

    const yContactoIzqSup =
      ry * Math.sqrt(Math.max(0.15, 1 - (xRamalIzquierdo / rx) ** 2)) -
      anchoDosCarriles * 0.25;
    const yContactoDerSup =
      ry * Math.sqrt(Math.max(0.15, 1 - (xRamalDerecho / rx) ** 2)) -
      anchoDosCarriles * 0.25;

    franjasViales.push(
      this.crearRectanguloFranja(
        xRamalIzquierdo - anchoDosCarriles / 2,
        yContactoIzqSup,
        anchoDosCarriles,
        yTop - yContactoIzqSup
      )
    );
    franjasViales.push(
      this.crearRectanguloFranja(
        xRamalDerecho - anchoDosCarriles / 2,
        yContactoDerSup,
        anchoDosCarriles,
        yTop - yContactoDerSup
      )
    );
    franjasViales.push(
      this.crearRectanguloFranja(
        xRamalIzquierdo - anchoDosCarriles / 2,
        yBottom,
        anchoDosCarriles,
        -yContactoIzqSup - yBottom
      )
    );
    franjasViales.push(
      this.crearRectanguloFranja(
        xRamalDerecho - anchoDosCarriles / 2,
        yBottom,
        anchoDosCarriles,
        -yContactoDerSup - yBottom
      )
    );

    const anilloExterno: Punto2D[] = [];
    const anilloInterno: Punto2D[] = [];
    const pasos = 120;
    const rxInt = Math.max(6, rx - anchoDosCarriles / 2);
    const ryInt = Math.max(5, ry - anchoDosCarriles / 2);
    const rxExt = rx + anchoDosCarriles / 2;
    const ryExt = ry + anchoDosCarriles / 2;

    for (let i = 0; i <= pasos; i++) {
      const ang = (i / pasos) * Math.PI * 2;
      anilloExterno.push({ x: rxExt * Math.cos(ang), y: ryExt * Math.sin(ang) });
      anilloInterno.push({ x: rxInt * Math.cos(ang), y: ryInt * Math.sin(ang) });
    }
    franjasViales.push([...anilloExterno, ...anilloInterno.reverse()]);

    const contornoIsletaCentral: Punto2D[] = [];
    const rxIsleta = Math.max(4, rxInt - 2.5);
    const ryIsleta = Math.max(3.5, ryInt - 2.5);
    for (let i = 0; i <= pasos; i++) {
      const ang = (i / pasos) * Math.PI * 2;
      contornoIsletaCentral.push({
        x: rxIsleta * Math.cos(ang),
        y: ryIsleta * Math.sin(ang)
      });
    }

    return { franjasViales, contornoIsletaCentral };
  }

  private muestrearArcoElipse(
    rx: number,
    ry: number,
    angInicio: number,
    angFin: number,
    pasos: number
  ): Punto2D[] {
    const pts: Punto2D[] = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const a = angInicio + (angFin - angInicio) * t;
      pts.push({
        x: rx * Math.cos(a),
        y: ry * Math.sin(a)
      });
    }
    return pts;
  }

  private crearRectanguloFranja(
    x: number,
    y: number,
    ancho: number,
    alto: number
  ): Punto2D[] {
    return [
      { x, y },
      { x: x + ancho, y },
      { x: x + ancho, y: y + alto },
      { x, y: y + alto }
    ];
  }

  private muestrearSegmentos(nodos: Punto2D[]): Punto2D[] {
    if (nodos.length < 2) {
      return [...nodos];
    }
    const resultado: Punto2D[] = [{ ...nodos[0] }];
    for (let i = 1; i < nodos.length; i++) {
      const a = nodos[i - 1];
      const b = nodos[i];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const pasos = Math.max(1, Math.ceil(dist / this.pasoDiscretizacionMetros));
      for (let s = 1; s <= pasos; s++) {
        const t = s / pasos;
        resultado.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t
        });
      }
    }
    return resultado;
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

  private calcularLongitudPolilinea(puntos: Punto2D[]): number {
    let total = 0;
    for (let i = 1; i < puntos.length; i++) {
      total += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
    }
    return total;
  }

  private gradosARadianes(grados: number): number {
    return (grados * Math.PI) / 180;
  }

  private radianesAGrados(radianes: number): number {
    return (radianes * 180) / Math.PI;
  }
}