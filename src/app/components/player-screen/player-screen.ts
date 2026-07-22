import { Component, Input, OnInit } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { PlayerState, BattleToken } from '../../models/game.model';

@Component({
  selector: 'app-player-screen',
  standalone: false,
  templateUrl: './player-screen.html',
  styleUrls: ['./player-screen.css'],
})
export class PlayerScreen implements OnInit {
  // Передаємо тип клану з батьківського компонента (наприклад, 'Crab')
  @Input() clanType!: string;
  isScreenOpen: boolean = false;
  playerState: PlayerState | null = null;

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.updateScreenData();
  }
  toggleScreen(): void {
    this.isScreenOpen = !this.isScreenOpen;
    if (this.isScreenOpen) {
      this.updateScreenData(); // Перечитуємо активні карти з сервісу
    }
  }
  getCardImage(tokenType: string): string {
    const type = tokenType.toLowerCase();
    // Повертає шлях до файлу в папці assets
     const path = `assets/images/tokens/${type}_cart.jpg`;
  return path;
  }

  /**
   * Завантажуємо актуальний стан гравця з сервісу
   */
  updateScreenData(): void {
    const fullState = this.gameStateService.getGameState();
    if (fullState && fullState.players) {
      // Оскільки в моделях тип ключа — це ClanType, приводимо аспект до any для простоти відображення
      this.playerState = (fullState.players as any)[this.clanType] || null;
    }
  }

  /**
   * Допоміжний метод, щоб красиво підсвічувати тип жетона
   */
  getTokenLabel(token: BattleToken): string {
    if (token.type === 'Blank') return 'Блеф 🥷';
    if (token.type === 'Army') return `Армія (Сила: ${token.strength}) ⚔️`;
    if (token.type === 'Navy') return `Флот (Сила: ${token.strength}) 🌊`;
    if (token.type === 'Shinobi') return `Синобі (Сила: ${token.strength}) 🗡️`;
    if (token.type === 'Blessing') return `Благословення ✨`;
    if (token.type === 'Diplomacy') return `Дипломатія 📜`;
    if (token.type === 'Raid') return `Погром 🔥`;
    return token.type;
  }
  // --- ВИБІР КАРТИ ---
  selectCard(token: BattleToken): void {
    this.gameStateService.setSelectedToken(token);
    
    // Якщо карту вибрано — плавно згортаємо ширму, щоб гравець бачив карту Рокугану
    if (this.isSelected(token)) {
      this.isScreenOpen = false;
    }
  }
isSelected(token: BattleToken): boolean {
    const selected = this.gameStateService.getSelectedToken();
    return selected ? selected.id === token.id : false;
  }
  /**
   * Повертає шлях до зображення клану
   */
  getClanImage(clanType: string): string {
    // Повертає шлях до файлу в папці assets
    const path = `assets/images/Clans/${clanType}.jpg`;
    return path;
  }
}
