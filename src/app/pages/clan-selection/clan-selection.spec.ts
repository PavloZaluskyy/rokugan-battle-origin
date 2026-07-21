import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClanSelection } from './clan-selection';

describe('ClanSelection', () => {
  let component: ClanSelection;
  let fixture: ComponentFixture<ClanSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClanSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClanSelection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
