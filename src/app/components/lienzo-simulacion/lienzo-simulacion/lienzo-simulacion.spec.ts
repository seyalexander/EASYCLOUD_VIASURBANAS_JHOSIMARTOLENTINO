import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LienzoSimulacion } from './lienzo-simulacion';

describe('LienzoSimulacion', () => {
  let component: LienzoSimulacion;
  let fixture: ComponentFixture<LienzoSimulacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LienzoSimulacion],
    }).compileComponents();

    fixture = TestBed.createComponent(LienzoSimulacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
