import { Component, OnInit } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { GameState } from '../../models/game.model';

@Component({
  selector: 'app-game-hud',
  standalone: false,
  templateUrl: './game-hud.html',
  styleUrl: './game-hud.css',
})
export class GameHud implements OnInit {
  gameState: GameState | null = null;

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameState = this.gameStateService.getGameState();
  }

  get phaseDisplayName(): string {
    if (!this.gameState) return '';
    
    if (this.gameStateService.getInitialPlacementStatus()) {
      return 'РОЗСТАНОВКА КОНТРОЛЮ (Кликайте на сусідні землі)';
    }

    return this.gameStateService.getPhaseName(this.gameState.currentPhase);
  }
  
  get actionButtonText(): string {
    if (!this.gameState) return '';

    if (this.gameStateService.getInitialPlacementStatus()) {
      return 'ЗАВЕРШИТИ РОЗСТАНОВКУ ➔';
    }

    if (this.gameState.currentPhase === 'Placement') {
      return 'РОЗКРИТТИ ЖЕТОНИ / БИТВИ ⚔️';
    }

    return 'НАСТУПНИЙ РАУНД ➔';
  }

  onNextPhaseClick(): void {
    this.gameStateService.nextPhase();
    this.gameState = this.gameStateService.getGameState(); // оновлюємо дані
  }
}
