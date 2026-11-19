import { TestBed } from '@angular/core/testing';

import { ServicioGeometriaCurva } from './servicio-geometria-curva';

describe('ServicioGeometriaCurva', () => {
  let service: ServicioGeometriaCurva;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioGeometriaCurva);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
