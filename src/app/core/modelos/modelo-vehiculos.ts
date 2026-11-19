/** Identificador único de cada vehículo predefinido o personalizado */
export type IdVehiculo =
  | 'auto-compacto'
  | 'suv-sedan'
  | 'camion-rigido-su'
  | 'bus-urbano'
  | 'tractocamion-wb'
  | 'vehiculo-personalizado';

/** Categoría general del vehículo para agrupación y visualización */
export type CategoriaVehiculo = 'Liviano' | 'Bus' | 'Camión Rígido' | 'Articulado' | 'Personalizado';

/** Especificaciones geométricas y visuales de un vehículo de diseño */
export interface EspecificacionVehiculo {
  id: IdVehiculo;
  nombre: string;
  categoria: CategoriaVehiculo;
  descripcion: string;
  /** Largo total del vehículo en metros */
  largoMetros: number;
  /** Ancho total del vehículo en metros */
  anchoMetros: number;
  /** Distancia entre ejes (wheelbase) en metros */
  distanciaEjesMetros: number;
  /** Voladizo o vuelo delantero (desde eje delantero al frente) en metros */
  vueloDelanteroMetros: number;
  /** Voladizo o vuelo trasero (desde eje trasero a la cola) en metros */
  vueloTraseroMetros: number;
  /** Radio mínimo de giro de la rueda delantera exterior en metros */
  radioMinimoGiroMetros: number;
  /** Holgura lateral de seguridad recomendada en metros */
  holguraSeguridadMetros: number;
  /** Ruta de imagen o ícono representativo */
  rutaImagen: string;
  /** Indica si las medidas pueden ser editadas manualmente por el usuario */
  esPersonalizable: boolean;
}