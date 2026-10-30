import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscardSelectionModal } from './discard-selection-modal';

describe('DiscardSelectionModal', () => {
  let component: DiscardSelectionModal;
  let fixture: ComponentFixture<DiscardSelectionModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscardSelectionModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscardSelectionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
