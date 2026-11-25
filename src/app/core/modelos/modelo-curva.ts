/** Sentido del giro en el plano 2D */
export type SentidoGiro = 'derecha' | 'izquierda';

/** Tipo de geometría de curva a calcular */
export type TipoCurva = 'simple' | 'compuesta-3-radios';

/** Acceso, cruce o recorrido de ingreso/salida en el óvalo */
export type RutaOvalo =
  | 'ovalo-perimetral'
  | 'sur-a-norte'
  | 'norte-a-sur'
  | 'oeste-a-este'
  | 'este-a-oeste'
  | 'norte-a-ovalo'
  | 'sur-a-ovalo'
  | 'oeste-a-ovalo'
  | 'este-a-ovalo'
  | 'ovalo-a-norte'
  | 'ovalo-a-sur'
  | 'ovalo-a-oeste'
  | 'ovalo-a-este';

/** Carril seleccionado dentro de una calzada de 2 carriles por sentido */
export type NumeroCarril = 1 | 2;

/** Punto cartesiano en metros dentro del sistema de coordenadas del simulador */
export interface Punto2D {
  x: number;
  y: number;
}

/** Parámetros configurables de la curva, óvalo o retorno vial */
export interface ParametrosCurva {
  tipoCurva: TipoCurva;
  sentidoGiro: SentidoGiro;
  /** Ruta o acceso seleccionado en el óvalo */
  rutaOvalo: RutaOvalo;
  /** Carril activo (1 = carril interior/izquierdo del sentido, 2 = carril exterior/derecho) */
  carrilSeleccionado: NumeroCarril;
  /** Ancho de cada carril en metros (ej. 3.60 m) */
  anchoCarrilMetros: number;
  /** Semieje horizontal (X) y vertical (Y) del óvalo en metros */
  semiejeXMetros: number;
  semiejeYMetros: number;
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

/** Resultados geométricos calculados para el óvalo y la curva */
export interface ResultadoGeometriaCurva {
  esValida: boolean;
  mensajeValidacion: string;
  observacionesLibro: string[];
  angulo1Grados: number;
  angulo2Grados: number;
  angulo3Grados: number;
  tangente1Metros: number;
  tangente2Metros: number;
  tangente3Metros: number;
  longitudArco1Metros: number;
  longitudArco2Metros: number;
  longitudArco3Metros: number;
  longitudTotalCurvaMetros: number;
  longitudTotalRecorridoMetros: number;
  /** Trayectoria activa del carril elegido para el vehículo */
  puntosEje: Punto2D[];
  /** Trayectoria del carril 1 */
  puntosCarril1: Punto2D[];
  /** Trayectoria del carril 2 */
  puntosCarril2: Punto2D[];
  /** Bordes del corredor activo */
  puntosBordeInterno: Punto2D[];
  puntosBordeExterno: Punto2D[];
  /** Múltiples franjas viales del óvalo, ramales y curvas de empalme R */
  franjasViales: Punto2D[][];
  /** Contorno de la isleta central del óvalo */
  contornoIsletaCentral: Punto2D[];
}