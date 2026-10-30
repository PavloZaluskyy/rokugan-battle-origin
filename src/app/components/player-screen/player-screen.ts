import { Component, Input, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { RegionCardService } from '../../services/region-card.service';
import { PlayerState, BattleToken } from '../../models/game.model';

@Component({
  selector: 'app-player-screen',
  standalone: false,
  templateUrl: './player-screen.html',
  styleUrls: ['./player-screen.css'],
})
export class PlayerScreen implements OnInit, DoCheck {
  // Передаємо тип клану з батьківського компонента (наприклад, 'Crab')
  @Input() clanType!: string;
  isScreenOpen: boolean = false;
  playerState: PlayerState | null = null;
 
  localDragonTimer: number = 10;
  private dragonTimerInterval: any = null;

  constructor(
    private gameStateService: GameStateService,
    private regionCardService: RegionCardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateScreenData();
  }
  // Відстежуємо зміни, щоб автоматично відкрити ширму Дракону
  ngDoCheck() {
    if (this.isDragonSelectionActive && !this.isScreenOpen) {
      this.isScreenOpen = true; // Автоматично розгортаємо ширму
    }
    const gameState = this.gameStateService as GameStateService & {
      openPlayerScreenTrigger?: boolean;
    };
    if (gameState.openPlayerScreenTrigger) {
      this.isScreenOpen = true;
      gameState.openPlayerScreenTrigger = false; // скидаємо тригер
      this.updateScreenData();
    }
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
    if (token.type === 'Blessing') return `Благословення (Сила: ${token.strength}) ✨`;
    if (token.type === 'Diplomacy') return `Дипломатія 📜`;
    if (token.type === 'Raid') return `Погром 🔥`;
    return token.type;
  }
  // --- ВИБІР КАРТИ ---
  // selectCard(token: BattleToken): void {
  //   this.gameStateService.setSelectedToken(token);
    
  //   // Якщо карту вибрано — плавно згортаємо ширму, щоб гравець бачив карту Рокугану
  //   if (this.isSelected(token)) {
  //     this.isScreenOpen = false;
  //   }
  // }
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
  /**
   * Повертає іконку для активного скілу залежно від клану
   */
  getSkillIcon(clan: string): string {
    if (clan === 'Unicorn') return '🐎'; // Зміна місцями двох карт
    if (clan === 'Scorpion') return '🦂'; // Шпигунство / підгляд жетона
    return '⚡';
  }
  // Перевірка, чи доступний скіл зараз
  isSkillAvailable(): boolean {
    if (!this.playerState) return false;
    // Наприклад, якщо скіл ще не використовувався в цьому раунді і це клан зі скілом (Скорпіон, Єдинорог тощо)
    return !this.playerState.isSkillUsedThisRound && ['Scorpion', 'Unicorn'].includes(this.playerState.clan);
  }

  // Клік по іконці клану з інтегрованим скілом
  onClanCrestClick(): void {
    const playerState = this.playerState;
    if (!playerState || !this.isSkillAvailable()) return;
    this.gameStateService.activateClanSkill(playerState.clan);
  }

  // Опис здібності для зеленої зони
  getClanSkillDescription(clan: string): string {
    switch (clan) {
      case 'Scorpion': return '[Активна] Шпигунство: Один раз на раунд ви можете таємно подивитися на один намет атаки суперника на карті.';
      case 'Unicorn': return '[Активна] Маневр: Перед фазою бою перемістіть/поміняйте місцями дві власні картки атаки на мапі.';
      case 'Dragon': return '[Пасивна] Медитація: Отримуйте на 1 картку атаки більше під час роздачі, після чого поверніть одну картку з пулу назад у колоду.';
      case 'Crab': return '[Пасивна] Фортеця: Базовий захист усіх ваших провінцій становить +2. Успішний захист також додає +2.';
      case 'Lion': return '[Пасивна] Честь: Пуста карта атаки (Блеф) дає +2 до захисту і не скидається після бою.';
      case 'Crane': return '[Пасивна] Дипломатія: У разі нічиєї в битві завжди перемагає Журавля.';
      case 'Phoenix': return '[Пасивна] Прозріння: Атакуючи столичну провінцію, ігноруйте її базові 2 одиниці захисту.';
      default: return 'Спеціальна пасивна або активна дія';
    }
  }

  // Опис унікальної карти клану
  getUniqueCardDescription(clan: string): string {
    switch (clan) {
      case 'Unicorn': return 'Додатковий Погром (Raid)';
      case 'Crane': return 'Додаткова Дипломатія';
      case 'Lion': return 'Армія сили 6';
      case 'Dragon': return 'Благословення сили 3';
      case 'Scorpion': return 'Синобі сили 3';
      case 'Phoenix': return 'Благословення сили 3';
      case 'Crab': return 'Флот сили 3';
      default: return 'Стандартний арсенал';
    }
  }

  /**
   * Текст підказки для скілу
   */
  getSkillTooltip(clan: string): string {
    if (clan === 'Unicorn') return 'Скіл: Поміняти місцями 2 свої карти на мапі';
    if (clan === 'Scorpion') return 'Скіл: Подивитися закритий жетон ворога';
    return 'Здібність клану';
  }

  /**
   * Виклик активної здібності клану
   */
 useClanSkill(): void {
    if (!this.playerState) return;

    if (this.playerState.isSkillUsedThisRound) {
      // alert('Ця здібність уже була використана в поточному раунді!');
      return;
    }

    if (this.playerState.clan === 'Unicorn') {
      this.gameStateService.activateUnicornSkill();
      // Закриваємо ширму, щоб гравець міг бачити карту і тикнути на намети
      this.isScreenOpen = false;
    } else if (this.playerState.clan === 'Scorpion') {
      this.gameStateService.activateScorpionSkill();
      this.isScreenOpen = false; // Закриваємо ширму, щоб гравець бачив карту ворогів
    } else {
      this.gameStateService.activateClanSkill(this.playerState.clan);
    }
    this.updateScreenData();
  }
  get isDragonSelectionActive(): boolean {
    const state = this.gameStateService.getGameState();
    const active = (state?.isDragonSkillSelectionActive && this.playerState?.clan === 'Dragon') || false;
    
    // Якщо скіл став активним, а таймер ще не крутиться — запускаємо його локально
    if (active && !this.dragonTimerInterval) {
      this.startLocalDragonTimer();
    }
    return active;
  }
  startLocalDragonTimer() {
    this.localDragonTimer = 10;
    clearInterval(this.dragonTimerInterval);

    this.dragonTimerInterval = setInterval(() => {
      if (this.localDragonTimer > 0) {
        this.localDragonTimer--;
        this.cdr.detectChanges(); // Примусово оновлюємо UI ширми щосекунди
      } else {
        clearInterval(this.dragonTimerInterval);
        this.dragonTimerInterval = null;
      }
    }, 1000);
  }

  // Клік по карті для Дракона (повернення в колоду)
  onDragonCardClick(token: any): void {
    if (!this.isDragonSelectionActive) return;
    if (token.type === 'Blank') return; // Блеф чіпати не можна

    clearInterval(this.dragonTimerInterval);
    this.dragonTimerInterval = null;
    this.gameStateService.returnCardToDeck(token.id);
    this.updateScreenData();
  }

  get dragonDisplayTimer(): number {
   return this.gameStateService.globalTimer;
  }

  testCrabDefense(): void {
    this.gameStateService.setupCrabDefenseTest();
    this.isScreenOpen = false;
    // alert('Тестовий ворожий загін додано на провінцію Краба! Тепер натисніть кнопку "Виконати / Битва", щоб перевірити результат захисту.');
  }
  testLionDefense(): void {
    this.gameStateService.setupLionDefenseTest();
    this.isScreenOpen = false;
    // alert('Тестовий ворожий загін додано на провінцію Лева! Тепер натисніть кнопку "Виконати / Битва", щоб перевірити результат захисту.');
  }

  // Стан, який відстежує, чи ми зараз робимо крок скиду карти після Рокіровки
  // (можеш також тримати цей стан у gameStateService, якщо робиш це глобально)
  
  selectCard(token: BattleToken): void {
   // Перевіряємо, чи є в активній руці щойно повернута карта з Рокіровки (з міткою isNewlyAdded)
    const newlyAddedCard = this.playerState?.activeHandTokens.find((t: any) => t.isNewlyAdded);

    if (newlyAddedCard && !token.isNewlyAdded && token.type !== 'Blank') {
      // КРОК 8-9: Гравець натиснув на іншу карту в ширмі — відправляємо її у скид замість неї!
      // Зупиняємо таймер рокіровки, оскільки гравець зробив вибір
      clearInterval(this.rokirovkaTimerInterval);
      this.rokirovkaTimerInterval = null;
      if (this.playerState) {
        // 1. Видаляємо вибрану для скиду карту з активної руки
        this.playerState.activeHandTokens = this.playerState.activeHandTokens.filter(t => t.id !== token.id);
        
        // 2. Додаємо її до масиву скиду (discardPile)
        this.playerState.discardPile.push(token);

        // 3. Знімаємо мітку isNewlyAdded з повернутої карти, щоб зелена обводка зникла
        this.playerState.activeHandTokens.forEach((t: any) => {
          delete t.isNewlyAdded;
        });

        // Списуємо картку регіону
        this.consumeRokirovkaCard();
        // 4. Зберігаємо зміни через сервіс стану гри
        this.gameStateService.saveGame();
        
        // alert('Зайву карту успішно відправлено у скид! Кількість карт у ширмі знову в нормі.');
        return;
      }
    }

    // Звичайний вибір карти для розміщення на мапі (якщо Рокіровка не активна)
    this.gameStateService.setSelectedToken(token);
    if (this.isSelected(token)) {
      this.isScreenOpen = false;
    }
  }
 hasNewlyAddedCard(): boolean {
    return !!this.playerState?.activeHandTokens?.some((t: any) => t.isNewlyAdded);
  }

  // Стан локального таймера для Рокіровки
  localRokirovkaTimer: number = 10;
  private rokirovkaTimerInterval: any = null;

  // Перевірка, чи активний режим вибору карти для скиду після Рокіровки
  get isRokirovkaSelectionActive(): boolean {
    const hasNewlyAdded = !!this.playerState?.activeHandTokens?.some((t: any) => t.isNewlyAdded);
    
    // Якщо режим активний, а таймер ще не запущено — запускаємо його
    if (hasNewlyAdded && !this.rokirovkaTimerInterval) {
      this.startRokirovkaTimer();
    }
    return hasNewlyAdded;
  }

  startRokirovkaTimer() {
    this.localRokirovkaTimer = 10;
    clearInterval(this.rokirovkaTimerInterval);

    this.rokirovkaTimerInterval = setInterval(() => {
      if (this.localRokirovkaTimer > 0) {
        this.localRokirovkaTimer--;
        this.cdr.detectChanges(); // Оновлюємо UI щосекунди
      } else {
        clearInterval(this.rokirovkaTimerInterval);
        this.rokirovkaTimerInterval = null;
        this.handleRokirovkaTimeout();
      }
    }, 1000);
  }

  // Час вийшов — рандомно вибираємо карту і скидаємо її
  handleRokirovkaTimeout() {
    if (!this.playerState) return;

    // Знаходимо всі карти, окрім нещодавно доданої та Блефу
    const eligibleCards = this.playerState.activeHandTokens.filter((t: any) => !t.isNewlyAdded && t.type !== 'Blank');
    
    if (eligibleCards.length > 0) {
      const randomCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
      
      // Відправляємо випадкову карту у скид
      this.playerState.activeHandTokens = this.playerState.activeHandTokens.filter(t => t.id !== randomCard.id);
      this.playerState.discardPile.push(randomCard);
    }

    // Знімаємо мітку newlyAdded з поверненої карти
    this.playerState.activeHandTokens.forEach((t: any) => {
      delete t.isNewlyAdded;
    });
    // Списуємо картку регіону Рокіровка через RegionCardService (шукаємо її за назвою або ID у гравця)
    this.consumeRokirovkaCard();

    this.gameStateService.saveGame();
    this.cdr.detectChanges();
    // alert('Час на рокіровку вийшов! Випадкову карту автоматично відправлено у скид.');
  }
  // Допоміжний метод для знаходження та списання карти Рокіровка у поточного гравця
  consumeRokirovkaCard() {
    const activeCards = this.regionCardService.getActiveRegionCards();
    const rokirovkaCard = activeCards.find(c => c.title === 'Рокіровка' && c.ownerClan === this.playerState?.clan && c.status === 'owned');
    if (rokirovkaCard && this.playerState) {
      this.regionCardService.useRegionCard(rokirovkaCard.id, this.playerState.clan);
    }
  }
}
