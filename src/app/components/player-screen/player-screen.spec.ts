import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerScreen } from './player-screen';

describe('PlayerScreen', () => {
  let component: PlayerScreen;
  let fixture: ComponentFixture<PlayerScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlayerScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
