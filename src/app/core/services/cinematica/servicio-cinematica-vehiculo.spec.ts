import { TestBed } from '@angular/core/testing';

import { ServicioCinematicaVehiculo } from './servicio-cinematica-vehiculo';

describe('ServicioCinematicaVehiculo', () => {
  let service: ServicioCinematicaVehiculo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioCinematicaVehiculo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
