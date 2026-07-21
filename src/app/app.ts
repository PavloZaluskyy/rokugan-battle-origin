import { Component, OnInit } from '@angular/core';
import { GameStateService } from './services/game-state.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrls: ['./app.css']
})
export class App implements OnInit {
 constructor(private gameStateService: GameStateService) {}

  ngOnInit() {
    // Симулюємо старт гри для трьох кланів: Краб, Журавель та Дракон
    this.gameStateService.createNewGame(['Crab', 'Crane', 'Dragon']);
  }
}
