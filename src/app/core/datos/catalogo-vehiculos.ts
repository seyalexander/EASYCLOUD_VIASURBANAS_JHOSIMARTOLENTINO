import { EspecificacionVehiculo } from "../modelos/modelo-vehiculos";


/**
 * Catálogo inicial de vehículos circulantes y opción personalizada.
 * Las medidas están expresadas en metros para el simulador geométrico.
 */
export const CATALOGO_VEHICULOS: readonly EspecificacionVehiculo[] = [
  {
    id: 'auto-compacto',
    nombre: 'Automóvil Compacto',
    categoria: 'Liviano',
    descripcion: 'Vehículo liviano de uso urbano cotidiano (sedán/hatchback).',
    largoMetros: 4.35,
    anchoMetros: 1.78,
    distanciaEjesMetros: 2.65,
    vueloDelanteroMetros: 0.88,
    vueloTraseroMetros: 0.82,
    radioMinimoGiroMetros: 5.4,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/auto-compacto.svg',
    esPersonalizable: false
  },
  {
    id: 'suv-sedan',
    nombre: 'SUV / Camioneta Ligera',
    categoria: 'Liviano',
    descripcion: 'Vehículo utilitario deportivo de mayor despeje y trocha.',
    largoMetros: 4.75,
    anchoMetros: 1.92,
    distanciaEjesMetros: 2.82,
    vueloDelanteroMetros: 0.95,
    vueloTraseroMetros: 0.98,
    radioMinimoGiroMetros: 6.1,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/suv-sedan.svg',
    esPersonalizable: false
  },
  {
    id: 'bus-urbano',
    nombre: 'Bus Urbano Estándar',
    categoria: 'Bus',
    descripcion: 'Autobús de transporte público urbano con mayor distancia entre ejes.',
    largoMetros: 11.5,
    anchoMetros: 2.55,
    distanciaEjesMetros: 5.8,
    vueloDelanteroMetros: 2.45,
    vueloTraseroMetros: 3.25,
    radioMinimoGiroMetros: 11.8,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/bus-urbano.svg',
    esPersonalizable: false
  },
  {
    id: 'camion-rigido-su',
    nombre: 'Camión Rígido (Tipo SU)',
    categoria: 'Camión Rígido',
    descripcion: 'Camión de carga de dos ejes con voladizo trasero pronunciado.',
    largoMetros: 9.15,
    anchoMetros: 2.5,
    distanciaEjesMetros: 5.05,
    vueloDelanteroMetros: 1.5,
    vueloTraseroMetros: 2.6,
    radioMinimoGiroMetros: 12.8,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/camion-rigido-su.svg',
    esPersonalizable: false
  },
  {
    id: 'tractocamion-wb',
    nombre: 'Tractocamión / Semirremolque',
    categoria: 'Articulado',
    descripcion: 'Vehículo pesado de gran radio de giro y barrido lateral en curvas.',
    largoMetros: 16.5,
    anchoMetros: 2.6,
    distanciaEjesMetros: 8.5,
    vueloDelanteroMetros: 1.4,
    vueloTraseroMetros: 2.2,
    radioMinimoGiroMetros: 14.5,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/tractocamion-wb.svg',
    esPersonalizable: false
  },
  {
    id: 'vehiculo-personalizado',
    nombre: 'Vehículo Personalizado',
    categoria: 'Personalizado',
    descripcion: 'Define manualmente largo, ancho, distancia entre ejes, vuelos y giro.',
    largoMetros: 5.2,
    anchoMetros: 2.0,
    distanciaEjesMetros: 3.1,
    vueloDelanteroMetros: 1.0,
    vueloTraseroMetros: 1.1,
    radioMinimoGiroMetros: 7.2,
    holguraSeguridadMetros: 0.6,
    rutaImagen: 'assets/vehiculos/vehiculo-personalizado.svg',
    esPersonalizable: true
  }
];