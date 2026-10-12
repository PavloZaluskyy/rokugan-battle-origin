import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecretObjectiveSelection } from './secret-objective-selection';

describe('SecretObjectiveSelection', () => {
  let component: SecretObjectiveSelection;
  let fixture: ComponentFixture<SecretObjectiveSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SecretObjectiveSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecretObjectiveSelection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
