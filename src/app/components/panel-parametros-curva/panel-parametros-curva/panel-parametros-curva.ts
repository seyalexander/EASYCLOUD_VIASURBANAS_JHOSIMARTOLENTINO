import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ParametrosCurva,
  ResultadoGeometriaCurva,
  SentidoGiro,
  TipoCurva
} from '../../../core/modelos/modelo-curva';
import {
  ConfiguracionTrafico,
  ModoMovimiento,
  ModoTrafico
} from '../../../core/modelos/modelo-simulacion';
import {
  EspecificacionVehiculo,
  IdVehiculo
} from '../../../core/modelos/modelo-vehiculos';

export type CampoParametroCurva =
  | 'tipoCurva'
  | 'sentidoGiro'
  | 'anguloDeflexionGrados'
  | 'radio1Metros'
  | 'radio2Metros'
  | 'radio3Metros'
  | 'desplazamiento1Metros'
  | 'desplazamiento2Metros'
  | 'anchoCalzadaMetros';

@Component({
  selector: 'app-panel-parametros-curva',
  imports: [FormsModule],
  templateUrl: './panel-parametros-curva.html',
  styleUrl: './panel-parametros-curva.css'
})
export class PanelParametrosCurva {
  public readonly parametros = input.required<ParametrosCurva>();
  public readonly geometria = input.required<ResultadoGeometriaCurva>();
  public readonly modoMovimiento = input.required<ModoMovimiento>();
  public readonly estaReproduciendo = input.required<boolean>();
  public readonly progreso = input.required<number>();
  public readonly velocidad = input.required<number>();
  public readonly configuracionTrafico = input.required<ConfiguracionTrafico>();
  public readonly vehiculosDisponibles = input.required<readonly EspecificacionVehiculo[]>();

  public readonly cambiarParametros = output<ParametrosCurva>();
  public readonly cambiarModo = output<ModoMovimiento>();
  public readonly alternarReproduccion = output<void>();
  public readonly reiniciarAnimacion = output<void>();
  public readonly cambiarProgresoManual = output<number>();
  public readonly cambiarVelocidad = output<number>();
  public readonly ajustarAVehiculo = output<void>();
  public readonly cambiarConfiguracionTrafico = output<ConfiguracionTrafico>();

  public readonly claseCampo =
    'w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FAE]/50';

  private readonly claseBaseSegmento =
    'rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer';

  public claseSegmentoPrimario(activo: boolean): string {
    return activo
      ? `${this.claseBaseSegmento} bg-[#005FAE] text-white shadow-[0_6px_14px_-6px_rgba(0,95,174,0.6)]`
      : `${this.claseBaseSegmento} text-slate-600 hover:text-[#005FAE]`;
  }

  public claseSegmento(activo: boolean): string {
    return activo
      ? `${this.claseBaseSegmento} bg-white text-[#005FAE] shadow-sm ring-1 ring-slate-900/5`
      : `${this.claseBaseSegmento} text-slate-600 hover:text-[#005FAE]`;
  }

  public claseChipVehiculo(activo: boolean): string {
    const base =
      'rounded-full px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer border';
    return activo
      ? `${base} bg-[#005FAE] text-white border-[#005FAE]`
      : `${base} bg-slate-50 text-slate-600 border-slate-200 hover:border-[#005FAE]/40`;
  }

  public obtenerEtiquetaCortaVehiculo(id: IdVehiculo): string {
    switch (id) {
      case 'auto-compacto':
        return 'Auto';
      case 'suv-sedan':
        return 'SUV';
      case 'bus-urbano':
        return 'Bus';
      case 'camion-rigido-su':
        return 'Camión SU';
      case 'tractocamion-wb':
        return 'Articulado';
      case 'vehiculo-personalizado':
        return 'Personalizado';
    }
  }

  public actualizarCampoCurva(
    campo: CampoParametroCurva,
    valor: TipoCurva | SentidoGiro | number | string | null
  ): void {
    if (valor === null) {
      return;
    }

    const esTextoSeleccion = campo === 'tipoCurva' || campo === 'sentidoGiro';
    const valorFinal = esTextoSeleccion
      ? valor
      : typeof valor === 'string'
        ? parseFloat(valor)
        : valor;

    if (typeof valorFinal === 'number' && Number.isNaN(valorFinal)) {
      return;
    }

    this.cambiarParametros.emit({
      ...this.parametros(),
      [campo]: valorFinal
    });
  }

  public alMoverSliderManual(valorPorcentaje: string | number): void {
    const porcentaje =
      typeof valorPorcentaje === 'string' ? parseFloat(valorPorcentaje) : valorPorcentaje;
    if (!Number.isNaN(porcentaje)) {
      this.cambiarProgresoManual.emit(porcentaje / 100);
    }
  }

  public alCambiarSliderVelocidad(valorVelocidad: string | number): void {
    const vel =
      typeof valorVelocidad === 'string' ? parseFloat(valorVelocidad) : valorVelocidad;
    if (!Number.isNaN(vel)) {
      this.cambiarVelocidad.emit(vel);
    }
  }

  public alCambiarModoTrafico(modoTrafico: ModoTrafico): void {
    const actual = this.configuracionTrafico();
    const cantidad =
      modoTrafico === 'fluido-aleatorio' && actual.cantidadVehiculos < 3
        ? 5
        : actual.cantidadVehiculos;

    this.cambiarConfiguracionTrafico.emit({
      ...actual,
      modoTrafico,
      cantidadVehiculos: cantidad
    });
  }

  public alCambiarCantidadVehiculos(valor: string | number): void {
    const cantidad = typeof valor === 'string' ? parseInt(valor, 10) : valor;
    if (Number.isNaN(cantidad)) {
      return;
    }
    const acotada = Math.min(12, Math.max(1, cantidad));
    this.cambiarConfiguracionTrafico.emit({
      ...this.configuracionTrafico(),
      cantidadVehiculos: acotada
    });
  }

  public alternarTipoEnTrafico(id: IdVehiculo): void {
    const actual = this.configuracionTrafico();
    const existe = actual.tiposHabilitados.includes(id);

    if (existe && actual.tiposHabilitados.length === 1) {
      return;
    }

    const siguientes = existe
      ? actual.tiposHabilitados.filter((item) => item !== id)
      : [...actual.tiposHabilitados, id];

    this.cambiarConfiguracionTrafico.emit({
      ...actual,
      tiposHabilitados: siguientes
    });
  }

  public alternarIncluirViaRecta(): void {
    const actual = this.configuracionTrafico();
    this.cambiarConfiguracionTrafico.emit({
      ...actual,
      incluirViaRecta: !actual.incluirViaRecta
    });
  }
}