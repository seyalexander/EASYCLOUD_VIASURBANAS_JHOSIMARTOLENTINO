import { NumeroCarril, Punto2D, RutaOvalo } from './modelo-curva';
import { IdVehiculo } from './modelo-vehiculos';

export type ModoMovimiento = 'automatico' | 'manual';

export type ModoTrafico = 'unico' | 'fluido-aleatorio';

export type EstadoHolgura = 'seguro' | 'ajuste' | 'invasion';

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

export interface VehiculoEnEscena {
  idInstancia: string;
  idVehiculo: IdVehiculo;
  ruta: RutaOvalo;
  carril: NumeroCarril;
  progreso: number;
  factorVelocidad: number;
  postura: PosturaVehiculo;
}

export interface ConfiguracionTrafico {
  modoTrafico: ModoTrafico;
  cantidadVehiculos: number;
  tiposHabilitados: IdVehiculo[];
  incluirViaRecta: boolean;
}