import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameMap } from './game-map';

describe('GameMap', () => {
  let component: GameMap;
  let fixture: ComponentFixture<GameMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
