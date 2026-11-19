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
import { ParametrosCurva } from '../../../../core/modelos/modelo-curva';
import { ModoMovimiento } from '../../../../core/modelos/modelo-simulacion';

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
    anguloDeflexionGrados: 90,
    radio1Metros: 22,
    radio2Metros: 12,
    radio3Metros: 20,
    desplazamiento1Metros: 1.5,
    desplazamiento2Metros: 1.5,
    anchoCalzadaMetros: 7.2,
    longitudTramoRectoMetros: 14
  });

  public readonly modoMovimiento = signal<ModoMovimiento>('automatico');
  public readonly estaReproduciendo = signal<boolean>(true);
  public readonly progreso = signal<number>(0);
  public readonly velocidad = signal<number>(1.0);

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

  private idFrameAnimacion: number | null = null;
  private marcaTiempoAnterior: number | null = null;

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
    this.parametrosCurva.set(nuevosParametros);
  }

  public alCambiarModo(nuevoModo: ModoMovimiento): void {
    this.modoMovimiento.set(nuevoModo);
    if (nuevoModo === 'manual') {
      this.estaReproduciendo.set(false);
    }
  }

  public alAlternarReproduccion(): void {
    if (this.progreso() >= 1) {
      this.progreso.set(0);
    }
    this.estaReproduciendo.update((estado) => !estado);
  }

  public alReiniciarAnimacion(): void {
    this.progreso.set(0);
    this.marcaTiempoAnterior = null;
  }

  public alCambiarProgresoManual(nuevoProgreso: number): void {
    this.progreso.set(Math.min(1, Math.max(0, nuevoProgreso)));
  }

  public alCambiarVelocidad(nuevaVelocidad: number): void {
    this.velocidad.set(nuevaVelocidad);
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
        const incremento = deltaSegundos / duracionCicloSegundos;

        const siguienteProgreso = this.progreso() + incremento;
        if (siguienteProgreso >= 1) {
          this.progreso.set(1);
          this.estaReproduciendo.set(false);
          this.detenerBucleAnimacion();
          return;
        }
        this.progreso.set(siguienteProgreso);
      }

      this.marcaTiempoAnterior = timestamp;
      this.idFrameAnimacion = requestAnimationFrame(pasoFrame);
    };

    this.idFrameAnimacion = requestAnimationFrame(pasoFrame);
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