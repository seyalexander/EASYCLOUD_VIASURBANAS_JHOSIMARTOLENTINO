/** Sentido del giro en el plano 2D */
export type SentidoGiro = 'derecha' | 'izquierda';

/** Tipo de geometría de curva a calcular */
export type TipoCurva = 'simple' | 'compuesta-3-radios';

/** Punto cartesiano en metros dentro del sistema de coordenadas del simulador */
export interface Punto2D {
  x: number;
  y: number;
}

/** Parámetros configurables de la curva o retorno vial */
export interface ParametrosCurva {
  tipoCurva: TipoCurva;
  sentidoGiro: SentidoGiro;
  /** Ángulo de deflexión total en grados sexagesimales (ej. 90 o 180) */
  anguloDeflexionGrados: number;
  /** Radio inicial R1 en metros */
  radio1Metros: number;
  /** Radio central/principal R2 en metros (usado en curva compuesta de 3 radios) */
  radio2Metros: number;
  /** Radio final R3 en metros (usado en curva compuesta de 3 radios) */
  radio3Metros: number;
  /** Desplazamiento o disloque inicial d1 en metros */
  desplazamiento1Metros: number;
  /** Desplazamiento o disloque final d2 en metros */
  desplazamiento2Metros: number;
  /** Ancho de calzada disponible en metros */
  anchoCalzadaMetros: number;
  /** Longitud de tramo recto de entrada y salida en metros */
  longitudTramoRectoMetros: number;
}

/** Resultados geométricos calculados para la curva */
export interface ResultadoGeometriaCurva {
  esValida: boolean;
  mensajeValidacion: string;
  /** Ángulo central del primer tramo en grados */
  angulo1Grados: number;
  /** Ángulo central del tramo intermedio en grados */
  angulo2Grados: number;
  /** Ángulo central del tercer tramo en grados */
  angulo3Grados: number;
  /** Longitud de arco del tramo 1 en metros */
  longitudArco1Metros: number;
  /** Longitud de arco del tramo 2 en metros */
  longitudArco2Metros: number;
  /** Longitud de arco del tramo 3 en metros */
  longitudArco3Metros: number;
  /** Longitud total de la curva en metros */
  longitudTotalCurvaMetros: number;
  /** Longitud total del recorrido (recta entrada + curva + recta salida) en metros */
  longitudTotalRecorridoMetros: number;
  /** Puntos muestreados del eje/trayectoria base a lo largo de todo el recorrido */
  puntosEje: Punto2D[];
  /** Puntos del borde interno de la calzada */
  puntosBordeInterno: Punto2D[];
  /** Puntos del borde externo de la calzada */
  puntosBordeExterno: Punto2D[];
}