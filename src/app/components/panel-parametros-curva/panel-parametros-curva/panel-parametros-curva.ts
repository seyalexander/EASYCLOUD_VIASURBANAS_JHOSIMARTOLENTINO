import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParametrosCurva, SentidoGiro, TipoCurva } from '../../../core/modelos/modelo-curva';
import { ModoMovimiento } from '../../../core/modelos/modelo-simulacion';


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
  public readonly modoMovimiento = input.required<ModoMovimiento>();
  public readonly estaReproduciendo = input.required<boolean>();
  public readonly progreso = input.required<number>();
  public readonly velocidad = input.required<number>();

  public readonly cambiarParametros = output<ParametrosCurva>();
  public readonly cambiarModo = output<ModoMovimiento>();
  public readonly alternarReproduccion = output<void>();
  public readonly reiniciarAnimacion = output<void>();
  public readonly cambiarProgresoManual = output<number>();
  public readonly cambiarVelocidad = output<number>();
  public readonly ajustarAVehiculo = output<void>();

  // Clases de estilo reutilizables (strings completos para que Tailwind los detecte)
  public readonly claseCampo =
    'w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FAE]/50';

  private readonly claseBaseSegmento =
    'rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer';

  // Segmento activo en azul sólido (selector de modo)
  public claseSegmentoPrimario(activo: boolean): string {
    return activo
      ? `${this.claseBaseSegmento} bg-[#005FAE] text-white shadow-[0_6px_14px_-6px_rgba(0,95,174,0.6)]`
      : `${this.claseBaseSegmento} text-slate-600 hover:text-[#005FAE]`;
  }

  // Segmento activo en pastilla blanca (tipo de curva, sentido de giro)
  public claseSegmento(activo: boolean): string {
    return activo
      ? `${this.claseBaseSegmento} bg-white text-[#005FAE] shadow-sm ring-1 ring-slate-900/5`
      : `${this.claseBaseSegmento} text-slate-600 hover:text-[#005FAE]`;
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
}