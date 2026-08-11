import { Component, OnInit, ViewChild } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { GameState } from '../../models/game.model';
import { GameMap } from '../game-map/game-map';

@Component({
  selector: 'app-game-hud',
  standalone: false,
  templateUrl: './game-hud.html',
  styleUrl: './game-hud.css',
})
export class GameHud implements OnInit {
  gameState: GameState | null = null;
  @ViewChild(GameMap) gameMap!: GameMap;
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
    if (this.gameStateService.getInitialPlacementStatus()) {
      this.gameStateService.nextPhase();
      return;
    }

    if (this.gameStateService.getGameState()?.currentPhase === 'Placement') {
      // Запускаємо кінематограф битв!
      
      this.gameStateService.requestCinematicBattles();  
    } else {
      this.gameStateService.nextPhase();
      this.gameState = this.gameStateService.getGameState();
    }
    // this.gameState = this.gameStateService.getGameState(); // оновлюємо дані
  }
  // onExecutePhaseClick(): void {
  //   const state = this.gameStateService.getGameState();
  //   if (state && state.currentPhase === 'Placement') {
  //     console.log(this.gameMap);
  //     // Запускаємо твій чіткий покроковий сценарій на мапі
  //     if (this.gameMap) {
  //       console.log('Запускаємо кінематографічну фазу бою...');
  //       this.gameMap.executeBattleCinematicSequence();
  //     } else {
  //       this.gameStateService.nextPhase();
  //     }
  //   } else {
  //     this.gameStateService.nextPhase();
  //   }
  // }
}
