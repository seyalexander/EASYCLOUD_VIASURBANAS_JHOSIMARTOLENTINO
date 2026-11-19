import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelParametrosCurva } from './panel-parametros-curva';

describe('PanelParametrosCurva', () => {
  let component: PanelParametrosCurva;
  let fixture: ComponentFixture<PanelParametrosCurva>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelParametrosCurva],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelParametrosCurva);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
