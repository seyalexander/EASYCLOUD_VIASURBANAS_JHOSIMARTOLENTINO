import {
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PanelVehiculos } from '../../../../components/panel-vehiculos/panel-vehiculos/panel-vehiculos';
import { PanelParametrosCurva } from '../../../../components/panel-parametros-curva/panel-parametros-curva/panel-parametros-curva';
import { LienzoSimulacion } from '../../../../components/lienzo-simulacion/lienzo-simulacion/lienzo-simulacion';
import { ServicioGeometriaCurva } from '../../../../core/services/geometria/servicio-geometria-curva';
import { ServicioCinematicaVehiculo } from '../../../../core/services/cinematica/servicio-cinematica-vehiculo';
import { EspecificacionVehiculo, IdVehiculo } from '../../../../core/modelos/modelo-vehiculos';
import { CATALOGO_VEHICULOS } from '../../../../core/datos/catalogo-vehiculos';
import {
  NumeroCarril,
  ParametrosCurva,
  Punto2D,
  ResultadoGeometriaCurva,
  RutaOvalo
} from '../../../../core/modelos/modelo-curva';
import {
  ConfiguracionTrafico,
  ModoMovimiento,
  VehiculoEnEscena
} from '../../../../core/modelos/modelo-simulacion';

interface EstadoActorInterno {
  idInstancia: string;
  idVehiculo: IdVehiculo;
  ruta: RutaOvalo;
  carril: NumeroCarril;
  progreso: number;
  factorVelocidad: number;
}

@Component({
  selector: 'app-pagina-simulacion',
  imports: [PanelVehiculos, PanelParametrosCurva, LienzoSimulacion],
  templateUrl: './pagina-simulacion.html',
  styleUrl: './pagina-simulacion.css'
})
export class PaginaSimulacion implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly servicioGeometria = inject(ServicioGeometriaCurva);
  private readonly servicioCinematica = inject(ServicioCinematicaVehiculo);

  public readonly listaVehiculos = signal<EspecificacionVehiculo[]>(
    CATALOGO_VEHICULOS.map((v) => ({ ...v }))
  );

  public readonly idVehiculoSeleccionado = signal<IdVehiculo>('auto-compacto');

  public readonly parametrosCurva = signal<ParametrosCurva>({
    tipoCurva: 'compuesta-3-radios',
    sentidoGiro: 'derecha',
    rutaOvalo: 'ovalo-perimetral',
    carrilSeleccionado: 1,
    anchoCarrilMetros: 3.6,
    semiejeXMetros: 42,
    semiejeYMetros: 28,
    anguloDeflexionGrados: 90,
    radio1Metros: 22,
    radio2Metros: 12,
    radio3Metros: 20,
    desplazamiento1Metros: 1.5,
    desplazamiento2Metros: 1.5,
    anchoCalzadaMetros: 7.2,
    longitudTramoRectoMetros: 14
  });

  public readonly configuracionTrafico = signal<ConfiguracionTrafico>({
    modoTrafico: 'unico',
    cantidadVehiculos: 1,
    tiposHabilitados: [
      'auto-compacto',
      'suv-sedan',
      'bus-urbano',
      'camion-rigido-su',
      'tractocamion-wb'
    ],
    incluirViaRecta: true
  });

  public readonly modoMovimiento = signal<ModoMovimiento>('automatico');
  public readonly estaReproduciendo = signal<boolean>(true);
  public readonly progreso = signal<number>(0);
  public readonly velocidad = signal<number>(1.0);

  private readonly actoresInternos = signal<EstadoActorInterno[]>([
    {
      idInstancia: 'veh-principal',
      idVehiculo: 'auto-compacto',
      ruta: 'ovalo-perimetral',
      carril: 1,
      progreso: 0,
      factorVelocidad: 1
    }
  ]);

  public readonly vehiculoActual = computed<EspecificacionVehiculo>(() => {
    const id = this.idVehiculoSeleccionado();
    const encontrado = this.listaVehiculos().find((v) => v.id === id);
    return encontrado ?? this.listaVehiculos()[0];
  });

  public readonly geometriaActual = computed(() =>
    this.servicioGeometria.calcularGeometria(this.parametrosCurva())
  );

  public readonly posturaActual = computed(() =>
    this.servicioCinematica.calcularPosturaEnProgreso(
      this.geometriaActual(),
      this.vehiculoActual(),
      this.progreso()
    )
  );

  public readonly vehiculosEnEscena = computed<VehiculoEnEscena[]>(() => {
    const actores = this.actoresInternos();
    const catalogo = this.listaVehiculos();
    const mapaGeom = this.obtenerMapaGeometriasPorRuta();
    const geomBase = this.geometriaActual();

    return actores.map((actor) => {
      const spec =
        catalogo.find((v) => v.id === actor.idVehiculo) ?? this.vehiculoActual();
      const geomRuta =
        mapaGeom.get(`${actor.ruta}:${actor.carril}`) ?? geomBase;
      const postura = this.servicioCinematica.calcularPosturaEnProgreso(
        geomRuta,
        spec,
        actor.progreso
      );
      return {
        ...actor,
        postura
      };
    });
  });

  private idFrameAnimacion: number | null = null;
  private marcaTiempoAnterior: number | null = null;
  private contadorInstancias = 1;

  constructor() {
    effect(() => {
      const activo =
        this.modoMovimiento() === 'automatico' && this.estaReproduciendo();
      if (activo) {
        this.iniciarBucleAnimacion();
      } else {
        this.detenerBucleAnimacion();
      }
    });
  }

  public ngOnDestroy(): void {
    this.detenerBucleAnimacion();
  }

  public alSeleccionarVehiculo(id: IdVehiculo): void {
    this.idVehiculoSeleccionado.set(id);
    const vehiculo = this.listaVehiculos().find((v) => v.id === id);
    if (vehiculo) {
      this.parametrosCurva.update((actuales) =>
        this.servicioGeometria.ajustarParametrosAVehiculo(actuales, vehiculo)
      );
    }
    this.regenerarFlotaVehicular();
  }

  public alAjustarCurvaAVehiculoActual(): void {
    this.parametrosCurva.update((actuales) =>
      this.servicioGeometria.ajustarParametrosAVehiculo(actuales, this.vehiculoActual())
    );
  }

  public alCambiarVehiculoPersonalizado(vehiculoActualizado: EspecificacionVehiculo): void {
    this.listaVehiculos.update((lista) =>
      lista.map((item) =>
        item.id === vehiculoActualizado.id ? { ...vehiculoActualizado } : item
      )
    );
    this.parametrosCurva.update((actuales) =>
      this.servicioGeometria.ajustarParametrosAVehiculo(actuales, vehiculoActualizado)
    );
  }

  public alCambiarParametros(nuevosParametros: ParametrosCurva): void {
    const anteriores = this.parametrosCurva();
    const calzadaCambio =
      nuevosParametros.anchoCalzadaMetros !== anteriores.anchoCalzadaMetros;

    this.parametrosCurva.set({
      ...nuevosParametros,
      anchoCarrilMetros: calzadaCambio
        ? Number((nuevosParametros.anchoCalzadaMetros / 2).toFixed(2))
        : nuevosParametros.anchoCarrilMetros
    });
  }

  public alCambiarConfiguracionTrafico(nuevaConfig: ConfiguracionTrafico): void {
    this.configuracionTrafico.set(nuevaConfig);
    this.regenerarFlotaVehicular();
    if (nuevaConfig.cantidadVehiculos > 1 && !this.estaReproduciendo()) {
      this.estaReproduciendo.set(true);
    }
  }

  public alCambiarModo(nuevoModo: ModoMovimiento): void {
    this.modoMovimiento.set(nuevoModo);
    if (nuevoModo === 'manual') {
      this.estaReproduciendo.set(false);
    }
  }

  public alAlternarReproduccion(): void {
    if (this.progreso() >= 1 && this.configuracionTrafico().cantidadVehiculos === 1) {
      this.progreso.set(0);
    }
    this.estaReproduciendo.update((estado) => !estado);
  }

  public alReiniciarAnimacion(): void {
    this.progreso.set(0);
    this.marcaTiempoAnterior = null;
    this.regenerarFlotaVehicular();
  }

  public alCambiarProgresoManual(nuevoProgreso: number): void {
    const acotado = Math.min(1, Math.max(0, nuevoProgreso));
    this.progreso.set(acotado);
    this.actoresInternos.update((lista) =>
      lista.map((actor, indice) =>
        indice === 0 ? { ...actor, progreso: acotado } : actor
      )
    );
  }

  public alCambiarVelocidad(nuevaVelocidad: number): void {
    this.velocidad.set(nuevaVelocidad);
  }

  private obtenerMapaGeometriasPorRuta(): Map<string, ResultadoGeometriaCurva> {
    const base = this.parametrosCurva();
    const mapa = new Map<string, ResultadoGeometriaCurva>();
    const rutas: RutaOvalo[] = ['ovalo-perimetral', 'sur-a-norte', 'norte-a-sur'];
    const carriles: NumeroCarril[] = [1, 2];

    for (const ruta of rutas) {
      for (const carril of carriles) {
        const clave = `${ruta}:${carril}`;
        const geom = this.servicioGeometria.calcularGeometria({
          ...base,
          rutaOvalo: ruta,
          carrilSeleccionado: carril
        });
        mapa.set(clave, this.ajustarGeometriaViaRecta(geom, base, ruta, carril));
      }
    }
    return mapa;
  }

  private regenerarFlotaVehicular(): void {
    const config = this.configuracionTrafico();
    const total = Math.max(1, config.cantidadVehiculos);
    const idBase = this.idVehiculoSeleccionado();
    const carrilBase = this.parametrosCurva().carrilSeleccionado;
    const rutaBase = this.parametrosCurva().rutaOvalo;

    const nuevos: EstadoActorInterno[] = [];

    for (let i = 0; i < total; i++) {
      if (i === 0) {
        nuevos.push({
          idInstancia: 'veh-principal',
          idVehiculo: idBase,
          ruta: rutaBase,
          carril: carrilBase,
          progreso: this.progreso(),
          factorVelocidad: 1.0
        });
        continue;
      }

      const rutaAsignada = this.elegirRutaParaIndice(i, config, rutaBase);
      const carrilAsignado: NumeroCarril = i % 2 === 0 ? 1 : 2;
      const idVehiculoAsignado =
        config.modoTrafico === 'fluido-aleatorio'
          ? this.elegirTipoAleatorio(config.tiposHabilitados, idBase)
          : idBase;

      const progresoInicial = Number(((i * 0.16) % 0.92).toFixed(3));

      nuevos.push({
        idInstancia: `veh-${++this.contadorInstancias}`,
        idVehiculo: idVehiculoAsignado,
        ruta: rutaAsignada,
        carril: carrilAsignado,
        progreso: progresoInicial,
        factorVelocidad:
          config.modoTrafico === 'fluido-aleatorio'
            ? 0.88 + ((i * 7) % 5) * 0.05
            : 1.0
      });
    }

    this.actoresInternos.set(nuevos);
  }

  private elegirRutaParaIndice(
    indice: number,
    config: ConfiguracionTrafico,
    rutaBase: RutaOvalo
  ): RutaOvalo {
    if (config.modoTrafico === 'unico' || !config.incluirViaRecta) {
      return rutaBase;
    }
    const opciones: RutaOvalo[] = [
      'norte-a-sur',
      'ovalo-perimetral',
      'sur-a-norte',
      'ovalo-perimetral'
    ];
    return opciones[indice % opciones.length];
  }

  private elegirTipoAleatorio(
    habilitados: IdVehiculo[],
    respaldo: IdVehiculo
  ): IdVehiculo {
    if (habilitados.length === 0) {
      return respaldo;
    }
    const idx = Math.floor(Math.random() * habilitados.length);
    return habilitados[idx];
  }

  private ajustarGeometriaViaRecta(
    geom: ResultadoGeometriaCurva,
    base: ParametrosCurva,
    ruta: RutaOvalo,
    carril: NumeroCarril
  ): ResultadoGeometriaCurva {
    if (ruta !== 'sur-a-norte' && ruta !== 'norte-a-sur') {
      return geom;
    }

    const anchoDosCarriles = base.anchoCalzadaMetros;
    const separacionSentidos = Math.max(4.5, base.anchoCarrilMetros * 1.4);
    const centroCalzadaX =
      ruta === 'sur-a-norte'
        ? separacionSentidos / 2 + anchoDosCarriles / 2
        : -(separacionSentidos / 2 + anchoDosCarriles / 2);

    const desplazamientoCarril =
      carril === 1 ? -base.anchoCarrilMetros * 0.5 : base.anchoCarrilMetros * 0.5;
    const xObjetivo = centroCalzadaX + desplazamientoCarril;

    const extensionAcceso = Math.max(24, base.longitudTramoRectoMetros * 1.6);
    const yLimite = base.semiejeYMetros + extensionAcceso;
    const yInicio = ruta === 'norte-a-sur' ? yLimite : -yLimite;
    const yFin = ruta === 'norte-a-sur' ? -yLimite : yLimite;

    const pasos = 60;
    const puntosEje: Punto2D[] = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      puntosEje.push({
        x: xObjetivo,
        y: yInicio + (yFin - yInicio) * t
      });
    }

    const mitadCalzada = anchoDosCarriles / 2;
    const bordeIzq: Punto2D[] = puntosEje.map((p) => ({
      x: centroCalzadaX - mitadCalzada,
      y: p.y
    }));
    const bordeDer: Punto2D[] = puntosEje.map((p) => ({
      x: centroCalzadaX + mitadCalzada,
      y: p.y
    }));

    return {
      ...geom,
      longitudTotalRecorridoMetros: Math.abs(yFin - yInicio),
      puntosEje,
      puntosBordeInterno: bordeIzq,
      puntosBordeExterno: bordeDer
    };
  }

  private iniciarBucleAnimacion(): void {
    if (!isPlatformBrowser(this.platformId) || this.idFrameAnimacion !== null) {
      return;
    }

    this.marcaTiempoAnterior = null;

    const pasoFrame = (timestamp: number): void => {
      if (this.marcaTiempoAnterior !== null) {
        const deltaSegundos = (timestamp - this.marcaTiempoAnterior) / 1000;
        const duracionCicloSegundos = 8 / Math.max(0.1, this.velocidad());
        const incrementoBase = deltaSegundos / duracionCicloSegundos;
        const config = this.configuracionTrafico();
        const esFlujoContinuo =
          config.modoTrafico === 'fluido-aleatorio' || config.cantidadVehiculos > 1;

        const actualizados = this.avanzarActoresSinCongestion(
          this.actoresInternos(),
          incrementoBase,
          esFlujoContinuo
        );

        this.actoresInternos.set(actualizados);

        const principal = actualizados[0];
        if (principal) {
          this.progreso.set(principal.progreso);
          if (!esFlujoContinuo && principal.progreso >= 1) {
            this.estaReproduciendo.set(false);
            this.detenerBucleAnimacion();
            return;
          }
        }
      }

      this.marcaTiempoAnterior = timestamp;
      this.idFrameAnimacion = requestAnimationFrame(pasoFrame);
    };

    this.idFrameAnimacion = requestAnimationFrame(pasoFrame);
  }

  private avanzarActoresSinCongestion(
    actores: EstadoActorInterno[],
    incrementoBase: number,
    flujoContinuo: boolean
  ): EstadoActorInterno[] {
    const config = this.configuracionTrafico();
    const catalogo = this.listaVehiculos();
    const mapaGeom = this.obtenerMapaGeometriasPorRuta();
    const longBase = Math.max(40, this.geometriaActual().longitudTotalRecorridoMetros);

    return actores.map((actor, indice) => {
      const spec =
        catalogo.find((v) => v.id === actor.idVehiculo) ?? this.vehiculoActual();
      const geomRuta = mapaGeom.get(`${actor.ruta}:${actor.carril}`);
      const longitudRuta = Math.max(
        30,
        geomRuta?.longitudTotalRecorridoMetros ?? longBase
      );

      const ajusteLongitud = longBase / longitudRuta;
      let paso = incrementoBase * actor.factorVelocidad * ajusteLongitud;

      const brechaMinimaProgreso = (spec.largoMetros + 8.5) / longitudRuta;

      for (let j = 0; j < actores.length; j++) {
        if (indice === j) {
          continue;
        }
        const otro = actores[j];
        if (otro.ruta !== actor.ruta || otro.carril !== actor.carril) {
          continue;
        }

        let diferencia = otro.progreso - actor.progreso;
        if (actor.ruta === 'ovalo-perimetral' && diferencia < 0) {
          diferencia += 1;
        }

        if (diferencia > 0 && diferencia < brechaMinimaProgreso * 1.4) {
          const factorFrenado = Math.max(
            0.15,
            (diferencia - brechaMinimaProgreso * 0.6) / brechaMinimaProgreso
          );
          paso *= Math.min(1, factorFrenado);
        }
      }

      let siguienteProgreso = actor.progreso + paso;

      if (siguienteProgreso >= 1) {
        if (!flujoContinuo) {
          return { ...actor, progreso: 1 };
        }

        const nuevaRuta =
          indice === 0
            ? this.parametrosCurva().rutaOvalo
            : this.elegirRutaParaIndice(
                indice + Math.floor(Math.random() * 4),
                config,
                this.parametrosCurva().rutaOvalo
              );
        const nuevoCarril: NumeroCarril =
          indice === 0
            ? this.parametrosCurva().carrilSeleccionado
            : Math.random() < 0.5
              ? 1
              : 2;
        const nuevoTipo =
          indice === 0
            ? this.idVehiculoSeleccionado()
            : config.modoTrafico === 'fluido-aleatorio'
              ? this.elegirTipoAleatorio(
                  config.tiposHabilitados,
                  this.idVehiculoSeleccionado()
                )
              : this.idVehiculoSeleccionado();

        const entradaOcupada = actores.some(
          (otro, k) =>
            k !== indice &&
            otro.ruta === nuevaRuta &&
            otro.carril === nuevoCarril &&
            otro.progreso < brechaMinimaProgreso * 1.3
        );

        if (entradaOcupada) {
          return { ...actor, progreso: 0.995 };
        }

        return {
          ...actor,
          idVehiculo: nuevoTipo,
          ruta: nuevaRuta,
          carril: nuevoCarril,
          progreso: 0
        };
      }

      return {
        ...actor,
        progreso: siguienteProgreso
      };
    });
  }

  private detenerBucleAnimacion(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.idFrameAnimacion !== null) {
      cancelAnimationFrame(this.idFrameAnimacion);
      this.idFrameAnimacion = null;
    }
    this.marcaTiempoAnterior = null;
  }
}