import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginaSimulacion } from './pagina-simulacion';

describe('PaginaSimulacion', () => {
  let component: PaginaSimulacion;
  let fixture: ComponentFixture<PaginaSimulacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaSimulacion],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginaSimulacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
