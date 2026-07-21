import { Injectable } from '@angular/core';
import { GameState, ClanType, BattleToken, BattleTokenType, PlayerState, Province } from '../models/game.model';
import { ORIGINAL_PROVINCES, PROVINCE_ADJACENCY } from '../models/provinces-data';

@Injectable({
  providedIn: 'root' // Завдяки цьому Angular AppModule автоматично бачить цей сервіс як Singleton
})
export class GameStateService {
 
  private readonly STORAGE_KEY = 'rokugan_battle_save';
  
  // Внутрішній стан гри (поки null, доки не почнеться гра)
  private state: GameState | null = null;
  selectedToken: BattleToken | null = null;

  constructor() {
    // При старті сервісу намагаємося автоматично завантажити збережену гру
    this.loadGame();
  }
  setSelectedToken(token: BattleToken | null): void {
    // Якщо клікнули на ту саму карту — знімаємо вибір
    if (this.selectedToken && token && this.selectedToken.id === token.id) {
      this.selectedToken = null;
    } else {
      this.selectedToken = token;
    }
  }
  getSelectedToken(): BattleToken | null {
    return this.selectedToken;
  }

  /**
   * Повертає поточний стан гри (лише для читання)
   */
  getGameState(): GameState | null {
    return this.state;
  }

  /**
   * Створення нової гри з базовими параметрами
   */
 createNewGame(selectedClans: ClanType[]): void {
    const provinceMap: { [id: string]: any } = {};
    
    // Ініціалізація мапи
    ORIGINAL_PROVINCES.forEach(prov => {
      provinceMap[prov.id] = { ...prov };
      if (prov.isCapital && prov.capitalOf && !selectedClans.includes(prov.capitalOf)) {
        provinceMap[prov.id].controllingClan = 'Neutral';
      }
    });

    const playerMap: { [clan in Exclude<ClanType, 'Neutral'>]?: PlayerState } = {};

    // Генеруємо стан для кожного живого гравця
    selectedClans.forEach(clan => {
      if (clan === 'Neutral') return;

      // 1. Отримуємо повний мішок жетонів і перемішуємо його
      let shuffledPool = this.shuffleArray(this.generateInitialTokenPool(clan));

      // 2. Створюємо пустий жетон (Blank), який за правилами завжди в активі
      const blankToken: BattleToken = {
        id: `${clan.toLowerCase()}-blank-init`,
        clan: clan,
        type: 'Blank',
        strength: 0
      };

      // 3. Беремо 5 випадкових жетонів з мішка на руку (до ширми)
      const activeHand = shuffledPool.splice(0, 5);
      activeHand.push(blankToken); // Разом виходить 6 жетонів за ширмою

      // Определяємо кількість стартових жетонів контролю залежно від кількості гравців
      // 2 гравці = 11, 3 гравці = 7, 4 гравці = 5, 5 гравців = 4
      const controlTokensCount = selectedClans.length === 2 ? 11 : (selectedClans.length === 3 ? 7 : 5);

      playerMap[clan] = {
        clan: clan,
        honorPoints: 0,
        isFirstPlayer: selectedClans[0] === clan,
        isRonin: false,
        secretObjectiveCardId: null,
        combatTokenPool: shuffledPool, // Решта жетонів лишається в мішку
        activeHandTokens: activeHand,   // 6 жетонів на руках
        discardedTokens: [],
        remainingControlTokens: controlTokensCount
      };
    });

    this.state = {
      gameId: Math.random().toString(36).substring(2, 9),
      currentRound: 1,
      currentPhase: 'Planning',
      firstPlayerClan: selectedClans[0] || 'Neutral',
      provinces: provinceMap,
      players: playerMap,
      roundLog: ['The Battle for Rokugan has begun. Players set up behind their screens!']
    };

    // Фіксуємо повний стартовий стан у LocalStorage
    this.saveGame();
  }

  /**
   * Збереження поточного стану в localStorage
   */
  saveGame(): void {
    if (this.state) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      console.log('Game progress saved successfully!');
    }
  }

  /**
   * Завантаження стану з localStorage
   */
  loadGame(): boolean {
    const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        this.state = JSON.parse(savedData);
        console.log('Game loaded from storage. Active ID:', this.state?.gameId);
        return true;
      } catch (e) {
        console.error('Failed to parse saved game data', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Повне скидання збереження (наприклад, для кнопки "Почати заново")
   */
  clearSave(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.state = null;
    console.log('Saved game cleared.');
  }

  /**
   * Допоміжний метод для створення стартового набору жетонів битви (згідно з правилами)
   */
  private generateInitialTokenPool(clan: ClanType): BattleToken[] {
    const tokens: BattleToken[] = [];
    let idCounter = 1;

    // Функція-хелпер, щоб швидко додавати однотипні жетони
    const addToken = (type: BattleTokenType, strength: number, count: number) => {
      for (let i = 0; i < count; i++) {
        tokens.push({
          id: `${clan.toLowerCase()}-${type.toLowerCase()}-${idCounter++}`,
          clan: clan,
          type: type,
          strength: strength
        });
      }
    };

    // Базовий набір кожного клану (можна уточнити за ширмами в правилах):
    addToken('Army', 1, 4); // 4 армії силою 1
    addToken('Army', 2, 4); // 4 армії силою 2
    addToken('Army', 3, 2); // 2 армії силою 3
    addToken('Army', 4, 1); // 1 елітна армія силою 4
    
    addToken('Navy', 1, 2); // 2 флоти силою 1
    addToken('Navy', 2, 2); // 2 флоти силою 2
    addToken('Navy', 3, 1); // 1 флот силою 3
    
    addToken('Shinobi', 1, 2); // 2 синоби силою 1
    addToken('Shinobi', 2, 1); // 1 синоби силою 2
    
    addToken('Blessing', 1, 2);   // 2 благословення (+1 до сили)
    addToken('Diplomacy', 0, 1);  // 1 жетон дипломатії (мир)
    addToken('Raid', 0, 1);       // 1 жетон погрому (випалена земля)

    // Примітка: Пустий жетон (Blank) НЕ йде в мішок, 
    // він завжди видається окремо на початку раунду згідно з правилами!
    return tokens;
  }

  /**
   * Алгоритм випадкового тасування масиву жетонів
   */
  private shuffleArray(array: any[]): any[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  /**
   * Перевірка за правилами гри: чи можна викласти вибрану карту на цю провінцію?
   */
  isProvinceValidTarget(province: Province, playerClan: ClanType): boolean {
    if (!this.selectedToken || !this.state) return false;

    const token = this.selectedToken;
    const isOwner = province.controllingClan === playerClan;
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];

    // 1. Синобі (Shinobi) та Блеф (Blank) можути йти в будь-яку точку Рокугану
    if (token.type === 'Shinobi' || token.type === 'Blank') {
      return true;
    }

    // 2. Якщо гравець потрапив у стан Роніна (не має жодної землі), він може атакувати будь-яку сухопутну граніцу
    if (player?.isRonin && !isOwner) {
      return token.type === 'Army';
    }

    // 3. Захист ВЛАСНИХ земель (Армія, Флот, Дипломатія, Благословення)
    if (isOwner) {
      if (token.type === 'Navy') return province.isCoastal;
      return true;
    }

    // 4. АТАКА ВОРОЖОЇ ЧИ НЕЙТРАЛЬНОЇ ТЕРИТОРІЇ
    if (!isOwner) {
      // 4.1. Перевірка: чи є у гравця хоча б одна СУСІДНЯ підконтрольна провінція?
      const adjacentProvinces = PROVINCE_ADJACENCY[province.id] || [];
      
      // Рахуємо, скільки наших провінцій межують із цією ціллю
      const sharedBordersCount = adjacentProvinces.filter(adjId => {
        const adjProv = this.state?.provinces[adjId];
        return adjProv && adjProv.controllingClan === playerClan;
      }).length;

      // Якщо немає жодного спільного кордону — звичайна Армія чи Погром не можуть атакувати!
      if (sharedBordersCount === 0) {
        // Флот може атакувати прибережні провінції навіть без сухопутного кордону
        if (token.type === 'Navy' && province.isCoastal) {
          return true;
        }
        return false; // Немає кордону — атака заборонена!
      }

      // 4.2. ПЕРЕВІРКА ЛІМІТУ АТАК (Кількість викладених карт <= Кількість спільних кордонів)
      const currentAttacksFromPlayer = (province.placedTokens || []).filter(
        pt => pt.clan === playerClan && pt.token.type !== 'Shinobi'
      ).length;

      // Якщо викладено стільки ж карт, скільки є кордонів — більше ставити не можна!
      if (currentAttacksFromPlayer >= sharedBordersCount) {
        console.warn(`Ліміт атак вичерпано! Спільних кордонів: ${sharedBordersCount}, вже викладено: ${currentAttacksFromPlayer}`);
        return false;
      }

      // Перевірка типу війська для прибережних/материкових
      if (token.type === 'Navy') return province.isCoastal;

      return true;
    }

    return false;
  }
  
  placeTokenOnProvince(provinceId: string, playerClan: ClanType): boolean {
    if (!this.selectedToken || !this.state) return false;

    const province = this.state.provinces[provinceId];
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];

    if (!province || !player) return false;

    // Перевірка правил
    if (!this.isProvinceValidTarget(province, playerClan)) return false;

    // 1. Створюємо об'єкт викладеного загону (сорочкою догори)
    const newPlacedToken = {
      id: `placed-${Date.now()}`,
      clan: playerClan,
      token: { ...this.selectedToken },
      isFaceUp: false // Сховано від ворогів під час розміщення
    };

    // 2. Додаємо загін на провінцію
    if (!province.placedTokens) province.placedTokens = [];
    province.placedTokens.push(newPlacedToken);

    // 3. Видаляємо карту з активних рук гравця
    player.activeHandTokens = player.activeHandTokens.filter(t => t.id !== this.selectedToken?.id);

    // 4. Скидаємо вибір
    this.selectedToken = null;

    // 5. Зберігаємо стан
    this.saveGame();
    return true;
  }
}