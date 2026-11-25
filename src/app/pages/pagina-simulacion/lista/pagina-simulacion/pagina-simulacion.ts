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
  ColorSemaforo,
  ConfiguracionTrafico,
  ModoMovimiento,
  SemaforoInterseccion,
  VehiculoEnEscena
} from '../../../../core/modelos/modelo-simulacion';

interface EstadoActorInterno {
  idInstancia: string;
  idVehiculo: IdVehiculo;
  ruta: RutaOvalo;
  carril: NumeroCarril;
  progreso: number;
  factorVelocidad: number;
  detenidoPorSemaforo?: boolean;
}

const TODAS_LAS_RUTAS: RutaOvalo[] = [
  'ovalo-perimetral',
  'sur-a-norte',
  'norte-a-sur',
  'oeste-a-este',
  'este-a-oeste',
  'norte-a-ovalo',
  'sur-a-ovalo',
  'oeste-a-ovalo',
  'este-a-ovalo',
  'ovalo-a-norte',
  'ovalo-a-sur',
  'ovalo-a-oeste',
  'ovalo-a-este'
];

/**
 * Rutas de ingreso desde los extremos exteriores de las vías.
 * En Perú: subida hacia el Norte por la derecha (+X), bajada hacia el Sur por la izquierda (-X).
 */
const RUTAS_INGRESO_EXTREMOS: RutaOvalo[] = [
  'norte-a-ovalo',
  'sur-a-ovalo',
  'oeste-a-ovalo',
  'este-a-ovalo',
  'norte-a-sur',
  'sur-a-norte'
];

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
    rutaOvalo: 'norte-a-ovalo',
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
  public readonly tiempoCicloSemaforo = signal<number>(0);

  private readonly actoresInternos = signal<EstadoActorInterno[]>([
    {
      idInstancia: 'veh-principal',
      idVehiculo: 'auto-compacto',
      ruta: 'norte-a-ovalo',
      carril: 1,
      progreso: 0,
      factorVelocidad: 1,
      detenidoPorSemaforo: false
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

  public readonly semaforos = computed<SemaforoInterseccion[]>(() => {
    const base = this.parametrosCurva();
    const t = this.tiempoCicloSemaforo();
    const duracionCiclo = 16;
    const fase = ((t % duracionCiclo) + duracionCiclo) % duracionCiclo;

    const estadoOvalo: ColorSemaforo =
      fase < 7 ? 'verde' : fase < 9 ? 'amarillo' : 'rojo';

    const estadoVertical: ColorSemaforo =
      fase >= 9 && fase < 14.5 ? 'verde' : fase >= 14.5 ? 'amarillo' : 'rojo';

    const anchoDosCarriles = base.anchoCalzadaMetros;
    const separacionSentidos = Math.max(4.5, base.anchoCarrilMetros * 1.4);
    const xSurNorte = separacionSentidos / 2 + anchoDosCarriles / 2;
    const xNorteSur = -(separacionSentidos / 2 + anchoDosCarriles / 2);
    const yCruce = Math.max(6, base.semiejeYMetros * 0.45);

    const progOvalo1 = 0.25;
    const progOvalo2 = 0.75;
    const ptsOvalo = this.geometriaActual().puntosEje;
    const posOvalo1 =
      ptsOvalo[Math.min(ptsOvalo.length - 1, Math.floor(progOvalo1 * ptsOvalo.length))] ?? {
        x: 0,
        y: base.semiejeYMetros
      };
    const posOvalo2 =
      ptsOvalo[Math.min(ptsOvalo.length - 1, Math.floor(progOvalo2 * ptsOvalo.length))] ?? {
        x: 0,
        y: -base.semiejeYMetros
      };

    const progSn = this.calcularProgresoEnY(base, 'sur-a-norte', -yCruce);
    const progNs = this.calcularProgresoEnY(base, 'norte-a-sur', yCruce);

    return [
      {
        id: 'sem-ovalo-1',
        etiqueta: 'S1 · ÓVALO',
        ruta: 'ovalo-perimetral',
        posicion: { x: posOvalo1.x, y: posOvalo1.y },
        progresoLineaDetencion: progOvalo1,
        estado: estadoOvalo
      },
      {
        id: 'sem-ovalo-2',
        etiqueta: 'S2 · ÓVALO',
        ruta: 'ovalo-perimetral',
        posicion: { x: posOvalo2.x, y: posOvalo2.y },
        progresoLineaDetencion: progOvalo2,
        estado: estadoOvalo
      },
      {
        id: 'sem-sn',
        etiqueta: 'S3 · S→N',
        ruta: 'sur-a-norte',
        posicion: { x: xSurNorte + anchoDosCarriles * 0.55, y: -yCruce },
        progresoLineaDetencion: progSn,
        estado: estadoVertical
      },
      {
        id: 'sem-ns',
        etiqueta: 'S4 · N→S',
        ruta: 'norte-a-sur',
        posicion: { x: xNorteSur - anchoDosCarriles * 0.55, y: yCruce },
        progresoLineaDetencion: progNs,
        estado: estadoVertical
      }
    ];
  });

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
    this.tiempoCicloSemaforo.set(0);
    this.marcaTiempoAnterior = null;
    this.regenerarFlotaVehicular();
  }

  public alCambiarProgresoManual(nuevoProgreso: number): void {
    const acotado = Math.min(1, Math.max(0, nuevoProgreso));
    this.progreso.set(acotado);
    this.actoresInternos.update((lista) =>
      lista.map((actor, indice) =>
        indice === 0 ? { ...actor, progreso: acotado, detenidoPorSemaforo: false } : actor
      )
    );
  }

  public alCambiarVelocidad(nuevaVelocidad: number): void {
    this.velocidad.set(nuevaVelocidad);
  }

  private calcularProgresoEnY(
    base: ParametrosCurva,
    ruta: RutaOvalo,
    yObjetivo: number
  ): number {
    const geom = this.servicioGeometria.calcularGeometriaParaRuta(base, ruta, 1);
    const pts = geom.puntosEje;
    if (pts.length < 2) return 0.36;

    let mejorIdx = 0;
    let menorDifY = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pts.length; i++) {
      const dif = Math.abs(pts[i].y - yObjetivo);
      if (dif < menorDifY) {
        menorDifY = dif;
        mejorIdx = i;
      }
    }
    return Math.max(0.05, Math.min(0.92, mejorIdx / (pts.length - 1)));
  }

  private obtenerMapaGeometriasPorRuta(): Map<string, ResultadoGeometriaCurva> {
    const base = this.parametrosCurva();
    const mapa = new Map<string, ResultadoGeometriaCurva>();
    const carriles: NumeroCarril[] = [1, 2];

    for (const ruta of TODAS_LAS_RUTAS) {
      for (const carril of carriles) {
        const clave = `${ruta}:${carril}`;
        const geom = this.servicioGeometria.calcularGeometriaParaRuta(base, ruta, carril);
        mapa.set(clave, geom);
      }
    }
    return mapa;
  }

  private obtenerCarrilSegunSentidoPeru(ruta: RutaOvalo, respaldo: NumeroCarril): NumeroCarril {
    switch (ruta) {
      case 'sur-a-norte':
      case 'sur-a-ovalo':
        return 2;
      case 'norte-a-sur':
      case 'norte-a-ovalo':
        return 1;
      default:
        return respaldo;
    }
  }

  private elegirRutaIngresoExtremo(
    indice: number,
    config: ConfiguracionTrafico,
    rutaBase: RutaOvalo
  ): RutaOvalo {
    if (config.modoTrafico === 'unico') {
      return rutaBase;
    }

    const candidatas = config.incluirViaRecta
      ? RUTAS_INGRESO_EXTREMOS
      : RUTAS_INGRESO_EXTREMOS.filter(
          (r) => r !== 'norte-a-sur' && r !== 'sur-a-norte'
        );

    return candidatas[indice % candidatas.length];
  }

  private estaPuntoLibreEnEntrada(
    puntoInicio: Punto2D,
    largoNuevoVehiculo: number,
    posicionesOcupadas: { pos: Punto2D; largo: number }[]
  ): boolean {
    const distanciaMinimaEntrada = largoNuevoVehiculo + 6.5;
    return !posicionesOcupadas.some((o) => {
      const dist = Math.hypot(puntoInicio.x - o.pos.x, puntoInicio.y - o.pos.y);
      return dist < Math.max(distanciaMinimaEntrada, o.largo + 6.0);
    });
  }

  private regenerarFlotaVehicular(): void {
    const config = this.configuracionTrafico();
    const total = Math.max(1, config.cantidadVehiculos);
    const idBase = this.idVehiculoSeleccionado();
    const carrilBase = this.parametrosCurva().carrilSeleccionado;
    const rutaBase = this.parametrosCurva().rutaOvalo;
    const mapaGeom = this.obtenerMapaGeometriasPorRuta();
    const catalogo = this.listaVehiculos();

    const nuevos: EstadoActorInterno[] = [];
    const posicionesOcupadas: { pos: Punto2D; largo: number }[] = [];

    for (let i = 0; i < total; i++) {
      if (i === 0) {
        const spec0 = catalogo.find((v) => v.id === idBase) ?? this.vehiculoActual();
        const geom0 = mapaGeom.get(`${rutaBase}:${carrilBase}`) ?? this.geometriaActual();
        const post0 = this.servicioCinematica.calcularPosturaEnProgreso(
          geom0,
          spec0,
          0
        );
        nuevos.push({
          idInstancia: 'veh-principal',
          idVehiculo: idBase,
          ruta: rutaBase,
          carril: carrilBase,
          progreso: 0,
          factorVelocidad: 1.0,
          detenidoPorSemaforo: false
        });
        posicionesOcupadas.push({
          pos: post0.posicionEjeTrasero,
          largo: spec0.largoMetros
        });
        continue;
      }

      const rutaAsignada = this.elegirRutaIngresoExtremo(i, config, rutaBase);
      const carrilAsignado = this.obtenerCarrilSegunSentidoPeru(
        rutaAsignada,
        i % 2 === 0 ? 1 : 2
      );
      const idVehiculoAsignado =
        config.modoTrafico === 'fluido-aleatorio'
          ? this.elegirTipoAleatorio(config.tiposHabilitados, idBase)
          : idBase;
      const spec =
        catalogo.find((v) => v.id === idVehiculoAsignado) ?? this.vehiculoActual();
      const geom = mapaGeom.get(`${rutaAsignada}:${carrilAsignado}`) ?? this.geometriaActual();

      let progresoInicial = 0;
      const postExtremo = this.servicioCinematica.calcularPosturaEnProgreso(geom, spec, 0);

      if (
        !this.estaPuntoLibreEnEntrada(
          postExtremo.posicionEjeTrasero,
          spec.largoMetros,
          posicionesOcupadas
        )
      ) {
        for (let pasoProg = 0.05; pasoProg <= 0.45; pasoProg += 0.05) {
          const postCand = this.servicioCinematica.calcularPosturaEnProgreso(
            geom,
            spec,
            pasoProg
          );
          if (
            this.estaPuntoLibreEnEntrada(
              postCand.posicionEjeTrasero,
              spec.largoMetros,
              posicionesOcupadas
            )
          ) {
            progresoInicial = Number(pasoProg.toFixed(3));
            break;
          }
        }
      }

      const posturaElegida = this.servicioCinematica.calcularPosturaEnProgreso(
        geom,
        spec,
        progresoInicial
      );
      posicionesOcupadas.push({
        pos: posturaElegida.posicionEjeTrasero,
        largo: spec.largoMetros
      });

      nuevos.push({
        idInstancia: `veh-${++this.contadorInstancias}`,
        idVehiculo: idVehiculoAsignado,
        ruta: rutaAsignada,
        carril: carrilAsignado,
        progreso: progresoInicial,
        factorVelocidad:
          config.modoTrafico === 'fluido-aleatorio'
            ? 0.92 + ((i * 5) % 4) * 0.05
            : 1.0,
        detenidoPorSemaforo: false
      });
    }

    this.progreso.set(0);
    this.actoresInternos.set(nuevos);
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

  private iniciarBucleAnimacion(): void {
    if (!isPlatformBrowser(this.platformId) || this.idFrameAnimacion !== null) {
      return;
    }

    this.marcaTiempoAnterior = null;

    const pasoFrame = (timestamp: number): void => {
      if (this.marcaTiempoAnterior !== null) {
        const deltaSegundos = Math.min(
          0.1,
          (timestamp - this.marcaTiempoAnterior) / 1000
        );
        const velFactor = Math.max(0.1, this.velocidad());

        this.tiempoCicloSemaforo.update((prev) => prev + deltaSegundos * velFactor);

        const duracionCicloSegundos = 8 / velFactor;
        const incrementoBase = deltaSegundos / duracionCicloSegundos;
        const config = this.configuracionTrafico();
        const esFlujoContinuo =
          config.modoTrafico === 'fluido-aleatorio' || config.cantidadVehiculos > 1;

        const actualizados = this.avanzarActoresContinuo(
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

  private aplicaSemaforoARuta(semRuta: RutaOvalo, actorRuta: RutaOvalo): boolean {
    if (semRuta === actorRuta) {
      return true;
    }
    if (semRuta === 'ovalo-perimetral') {
      return actorRuta.includes('ovalo');
    }
    if (semRuta === 'sur-a-norte') {
      return actorRuta === 'sur-a-norte' || actorRuta === 'sur-a-ovalo';
    }
    if (semRuta === 'norte-a-sur') {
      return actorRuta === 'norte-a-sur' || actorRuta === 'norte-a-ovalo';
    }
    return false;
  }

  private avanzarActoresContinuo(
    actores: EstadoActorInterno[],
    incrementoBase: number,
    flujoContinuo: boolean
  ): EstadoActorInterno[] {
    const config = this.configuracionTrafico();
    const catalogo = this.listaVehiculos();
    const mapaGeom = this.obtenerMapaGeometriasPorRuta();
    const longBase = Math.max(40, this.geometriaActual().longitudTotalRecorridoMetros);
    const listaSemaforos = this.semaforos();

    const estadosActuales = actores.map((actor) => {
      const spec =
        catalogo.find((v) => v.id === actor.idVehiculo) ?? this.vehiculoActual();
      const geomRuta = mapaGeom.get(`${actor.ruta}:${actor.carril}`);
      const longitudRuta = Math.max(
        30,
        geomRuta?.longitudTotalRecorridoMetros ?? longBase
      );
      const postura = this.servicioCinematica.calcularPosturaEnProgreso(
        geomRuta ?? this.geometriaActual(),
        spec,
        actor.progreso
      );
      return {
        actor,
        spec,
        geomRuta,
        longitudRuta,
        postura
      };
    });

    const posicionesActivas = estadosActuales.map((e) => ({
      pos: e.postura.posicionEjeTrasero,
      largo: e.spec.largoMetros
    }));

    return estadosActuales.map((actual, indice) => {
      const { actor, spec, longitudRuta, postura } = actual;
      const ajusteLongitud = longBase / longitudRuta;
      let paso = Math.max(0.0004, incrementoBase * actor.factorVelocidad * ajusteLongitud);
      let detenidoPorSemaforo = false;

      const dirX = Math.cos(postura.anguloCarroceriaRad);
      const dirY = Math.sin(postura.anguloCarroceriaRad);
      const frenteX =
        postura.posicionEjeTrasero.x +
        dirX * Math.max(1, spec.largoMetros - spec.vueloTraseroMetros);
      const frenteY =
        postura.posicionEjeTrasero.y +
        dirY * Math.max(1, spec.largoMetros - spec.vueloTraseroMetros);

      // 1. Control estricto de semáforo por distancia espacial real en metros
      const distanciaZonaFrenado = Math.max(10, spec.largoMetros + 8.5);
      const distanciaLineaDetencion = 2.4;

      for (const sem of listaSemaforos) {
        if (!this.aplicaSemaforoARuta(sem.ruta, actor.ruta)) {
          continue;
        }
        if (sem.estado !== 'rojo' && sem.estado !== 'amarillo') {
          continue;
        }

        const dxSem = sem.posicion.x - frenteX;
        const dySem = sem.posicion.y - frenteY;
        const distanciaDirecta = Math.hypot(dxSem, dySem);

        if (distanciaDirecta > distanciaZonaFrenado) {
          continue;
        }

        // Comprobar que el semáforo está delante en el sentido de avance del vehículo
        const avanceHaciaSem =
          distanciaDirecta > 0.001
            ? (dxSem * dirX + dySem * dirY) / distanciaDirecta
            : 1;

        if (avanceHaciaSem > 0.25) {
          if (distanciaDirecta <= distanciaLineaDetencion) {
            paso = 0;
            detenidoPorSemaforo = true;
            break;
          }

          const debeDetener =
            sem.estado === 'rojo' || distanciaDirecta > distanciaZonaFrenado * 0.35;

          if (debeDetener) {
            const proporcion =
              (distanciaDirecta - distanciaLineaDetencion) /
              Math.max(0.5, distanciaZonaFrenado - distanciaLineaDetencion);
            paso *= Math.max(0.05, Math.min(1, proporcion));
          }
        }
      }

      // 2. Separación física respecto a vehículos que van delante
      if (!detenidoPorSemaforo && paso > 0) {
        const centroActualX =
          postura.posicionEjeTrasero.x +
          dirX * (spec.largoMetros * 0.5 - spec.vueloTraseroMetros);
        const centroActualY =
          postura.posicionEjeTrasero.y +
          dirY * (spec.largoMetros * 0.5 - spec.vueloTraseroMetros);

        let factorSeguimiento = 1;

        for (let j = 0; j < estadosActuales.length; j++) {
          if (indice === j) {
            continue;
          }
          const otro = estadosActuales[j];
          const otroDirX = Math.cos(otro.postura.anguloCarroceriaRad);
          const otroDirY = Math.sin(otro.postura.anguloCarroceriaRad);
          const otroCentroX =
            otro.postura.posicionEjeTrasero.x +
            otroDirX * (otro.spec.largoMetros * 0.5 - otro.spec.vueloTraseroMetros);
          const otroCentroY =
            otro.postura.posicionEjeTrasero.y +
            otroDirY * (otro.spec.largoMetros * 0.5 - otro.spec.vueloTraseroMetros);

          const dx = otroCentroX - centroActualX;
          const dy = otroCentroY - centroActualY;
          const distanciaCentros = Math.hypot(dx, dy);

          const distanciaMinima =
            (spec.largoMetros + otro.spec.largoMetros) * 0.5 + 2.4;
          const zonaAdaptacion = distanciaMinima + 4.5;

          if (distanciaCentros < zonaAdaptacion && distanciaCentros > 0.001) {
            const productoEscalar = (dx * dirX + dy * dirY) / distanciaCentros;
            if (productoEscalar > 0.15) {
              if (distanciaCentros <= distanciaMinima) {
                factorSeguimiento = Math.min(factorSeguimiento, 0.12);
              } else {
                const ratio =
                  (distanciaCentros - distanciaMinima) /
                  (zonaAdaptacion - distanciaMinima);
                factorSeguimiento = Math.min(
                  factorSeguimiento,
                  Math.max(0.2, ratio)
                );
              }
            }
          }
        }

        paso *= factorSeguimiento;
      }

      const siguienteProgreso = actor.progreso + paso;

      // 3. Al completar recorrido, reaparece siempre por un extremo de ingreso libre
      if (siguienteProgreso >= 1) {
        if (!flujoContinuo) {
          return { ...actor, progreso: 1, detenidoPorSemaforo: false };
        }

        const nuevaRuta =
          indice === 0
            ? this.parametrosCurva().rutaOvalo
            : this.elegirRutaIngresoExtremo(
                indice + Math.floor(Math.random() * RUTAS_INGRESO_EXTREMOS.length),
                config,
                this.parametrosCurva().rutaOvalo
              );
        const nuevoCarril = this.obtenerCarrilSegunSentidoPeru(
          nuevaRuta,
          indice === 0
            ? this.parametrosCurva().carrilSeleccionado
            : Math.random() < 0.5
              ? 1
              : 2
        );
        const nuevoTipo =
          indice === 0
            ? this.idVehiculoSeleccionado()
            : config.modoTrafico === 'fluido-aleatorio'
              ? this.elegirTipoAleatorio(
                  config.tiposHabilitados,
                  this.idVehiculoSeleccionado()
                )
              : this.idVehiculoSeleccionado();

        const nuevaSpec =
          catalogo.find((v) => v.id === nuevoTipo) ?? this.vehiculoActual();
        const nuevaGeom =
          mapaGeom.get(`${nuevaRuta}:${nuevoCarril}`) ?? this.geometriaActual();
        const postInicio = this.servicioCinematica.calcularPosturaEnProgreso(
          nuevaGeom,
          nuevaSpec,
          0
        );

        if (
          !this.estaPuntoLibreEnEntrada(
            postInicio.posicionEjeTrasero,
            nuevaSpec.largoMetros,
            posicionesActivas
          )
        ) {
          return {
            ...actor,
            progreso: 0.995,
            detenidoPorSemaforo: false
          };
        }

        return {
          ...actor,
          idVehiculo: nuevoTipo,
          ruta: nuevaRuta,
          carril: nuevoCarril,
          progreso: 0,
          detenidoPorSemaforo: false
        };
      }

      return {
        ...actor,
        progreso: siguienteProgreso,
        detenidoPorSemaforo
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