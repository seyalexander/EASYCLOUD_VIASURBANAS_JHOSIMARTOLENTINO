import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EspecificacionVehiculo, IdVehiculo } from '../../../core/modelos/modelo-vehiculos';


export type CampoNumericoVehiculo =
  | 'largoMetros'
  | 'anchoMetros'
  | 'distanciaEjesMetros'
  | 'vueloDelanteroMetros'
  | 'vueloTraseroMetros'
  | 'radioMinimoGiroMetros'
  | 'holguraSeguridadMetros';

@Component({
  selector: 'app-panel-vehiculos',
  imports: [FormsModule],
  templateUrl: './panel-vehiculos.html',
  styleUrl: './panel-vehiculos.css'
})
export class PanelVehiculos {
  public readonly vehiculos = input.required<readonly EspecificacionVehiculo[]>();
  public readonly vehiculoSeleccionado = input.required<EspecificacionVehiculo>();

  public readonly seleccionarVehiculo = output<IdVehiculo>();
  public readonly cambiarVehiculoPersonalizado = output<EspecificacionVehiculo>();

  // Clases de estilo reutilizables (strings completos para que Tailwind los detecte)
  public readonly claseCampo =
    'w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FAE]/50';

  private readonly claseBaseTarjeta =
    'relative w-full cursor-pointer rounded-2xl p-3.5 text-left transition-all duration-200';

  public claseTarjetaVehiculo(activo: boolean): string {
    return activo
      ? `${this.claseBaseTarjeta} bg-[#005FAE]/6 ring-2 ring-[#005FAE] shadow-[0_12px_26px_-14px_rgba(0,95,174,0.55)]`
      : `${this.claseBaseTarjeta} bg-slate-50/80 ring-1 ring-slate-900/5 hover:-translate-y-0.5 hover:bg-white hover:ring-[#005FAE]/30 hover:shadow-[0_14px_28px_-16px_rgba(0,95,174,0.35)]`;
  }

  public claseSiluetaVehiculo(activo: boolean): string {
    const base = 'flex h-10 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-200';
    return activo
      ? `${base} bg-linear-to-br from-[#005FAE] to-[#0A7FCB] text-white shadow-[0_8px_16px_-6px_rgba(0,95,174,0.6)]`
      : `${base} bg-white text-[#005FAE] ring-1 ring-slate-900/5`;
  }

  public actualizarCampoPersonalizado(
    campo: CampoNumericoVehiculo,
    valor: number | string | null
  ): void {
    const actual = this.vehiculoSeleccionado();
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;

    if (!actual.esPersonalizable || numero === null || Number.isNaN(numero)) {
      return;
    }

    this.cambiarVehiculoPersonalizado.emit({
      ...actual,
      [campo]: numero
    });
  }
}