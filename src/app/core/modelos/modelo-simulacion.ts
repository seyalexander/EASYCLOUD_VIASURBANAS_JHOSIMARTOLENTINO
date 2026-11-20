import { NumeroCarril, Punto2D } from './modelo-curva';

/** Modo de control de movimiento del vehículo */
export type ModoMovimiento = 'automatico' | 'manual';

/** Estado de proximidad o invasión respecto a los bordes de calzada */
export type EstadoHolgura = 'seguro' | 'ajuste' | 'invasion';

/** Postura y estado físico-geométrico del vehículo en un instante dado */
export interface PosturaVehiculo {
  /** Distancia recorrida acumulada desde el inicio en metros */
  distanciaRecorridaMetros: number;
  /** Progreso normalizado de 0 a 1 */
  progreso: number;
  /** Posición (x, y) del centro del eje trasero en metros */
  posicionEjeTrasero: Punto2D;
  /** Ángulo de orientación de la carrocería en radianes */
  anguloCarroceriaRad: number;
  /** Ángulo de giro de las ruedas delanteras respecto a la carrocería en radianes */
  anguloDireccionRuedasRad: number;
  /** Las 4 esquinas de la carrocería en coordenadas del mundo (metros) */
  esquinasCarroceria: Punto2D[];
  /** Estado de holgura respecto al borde de la calzada */
  estadoHolgura: EstadoHolgura;
  /** Menor distancia estimada entre el vehículo y los bordes de calzada en metros */
  distanciaMinimaBordeMetros: number;
}



export interface PosturaVehiculo {
  distanciaRecorridaMetros: number;
  progreso: number;
  carril: NumeroCarril;
  posicionEjeTrasero: Punto2D;
  anguloCarroceriaRad: number;
  anguloDireccionRuedasRad: number;
  esquinasCarroceria: Punto2D[];
  estadoHolgura: EstadoHolgura;
  distanciaMinimaBordeMetros: number;
}