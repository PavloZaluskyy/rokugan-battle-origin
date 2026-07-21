import { Component, OnInit } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ClanType } from '../../models/game.model';

@Component({
  selector: 'app-game-page',
  standalone: false,
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage implements OnInit {
  playerClan: ClanType = 'Crab'; // Дефолтний клан

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
    const state = this.gameStateService.getGameState();
    if (state && state.firstPlayerClan) {
      // Беремо той клан, який гравець щойно обрав на сторінці вибору
      this.playerClan = state.firstPlayerClan;
    }
  }
}