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
    const playerCount = selectedClans.length;
    let startingControlTokens = 11;
    if (playerCount === 3) startingControlTokens = 7;
    else if (playerCount === 4) startingControlTokens = 5;
    else if (playerCount >= 5) startingControlTokens = 4;

    const playersMap: { [key: string]: any } = {};

    selectedClans.forEach(clan => {
      playersMap[clan] = {
        clan: clan,
        honorPoints: 0,
        // Оскільки 1 жетон автоматично витрачається на столицю, в резерві лишається на 1 менше!
        remainingControlTokens: startingControlTokens - 1, 
        activeHandTokens: this.generateInitialHand()
      };
    });

    const provincesMap: { [key: string]: Province } = {};
    ORIGINAL_PROVINCES.forEach(prov => {
      // Повністю клонуємо оригінальну провінцію з усіма її полями (name, regionId, baseDefense, isCoastal тощо)
      provincesMap[prov.id] = { 
        ...prov, 
        placedTokens: [],
        controlTokensFaceUp: 0,
        controllingClan: prov.isCapital && selectedClans.includes(prov.capitalOf as ClanType) ? prov.capitalOf! : 'Neutral'
      };
    });

    // Ставимо 1 стартовий жетон контролю горілиць ВИКЛЮЧНО на столиці активних кланів
    selectedClans.forEach(clan => {
      const capital = Object.values(provincesMap).find(p => p.capitalOf === clan);
      if (capital) {
        capital.controllingClan = clan;
        capital.controlTokensFaceUp = 1;
      }
    });

    this.isInitialPlacementPhase = true; // Активуємо пре-фазу розстановки

    this.state = {
      gameId: Math.random().toString(36).substring(2, 9),
      currentRound: 1,
      currentPhase: 'Placement',
      firstPlayerClan: selectedClans[0],
      players: playersMap as any,
      provinces: provincesMap,
      roundLog: [`Розпочалася пре-фаза розстановки жетонів контролю. Доступно жетонів у резерві: ${startingControlTokens - 1}.`]
    };

    this.saveGame();
  }

  /**
   * Фаза перегрупування: гравець бере 5 карт атаки + 1 пустий (блеф) = разом 6 карток у руку
   */
  private generateInitialHand(): BattleToken[] {
    const hand: BattleToken[] = [];
    let idCounter = 1;

    // Пул усіх можливих жетонів, з яких випадково формується рука на раунд
    const possibleTokens: Array<{ type: 'Army' | 'Navy' | 'Shinobi' | 'Blessing' | 'Diplomacy' | 'Raid', hasStrength: boolean }> = [
      { type: 'Army', hasStrength: true },
      { type: 'Army', hasStrength: true },
      { type: 'Army', hasStrength: true },
      { type: 'Navy', hasStrength: true },
      { type: 'Shinobi', hasStrength: true },
      { type: 'Blessing', hasStrength: false },
      { type: 'Diplomacy', hasStrength: false },
      { type: 'Raid', hasStrength: true }
    ];

    // Випадково вибираємо 5 унікальних або повторюваних жетонів із пулу
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * possibleTokens.length);
      const selectedTemplate = possibleTokens[randomIndex];

      // Випадкова сила від 1 до 3 (для тих, де вона передбачена)
      const strength = selectedTemplate.hasStrength ? Math.floor(Math.random() * 3) + 1 : 0;

      hand.push({
        id: `token-${idCounter++}-${Math.random().toString(36).substring(2, 7)}`,
        type: selectedTemplate.type,
        strength: strength,
        clan: 'Crab'
      });
    }

    // + 1 канонічний Блеф (Blank), який ніколи не міняється і завжди присутній у руці
    hand.push({
      id: `token-${idCounter++}-blank`,
      type: 'Blank',
      strength: 0,
      clan: 'Crab'
    });

    return hand;
  }
  /**
   * Оновлення рук гравців на початку нового раунду (Фаза перегрупування)
   */
  private replenishPlayerHands(): void {
    if (!this.state) return;

    Object.values(this.state.players).forEach(player => {
      // Добираємо карти до стандарту (якщо лишилися малі залишки, відновлюємо повну руку)
      player.activeHandTokens = this.generateInitialHand();
      this.state!.roundLog.push(`Клан ${player.clan} отримав нові жетони на руку (5 бойових + 1 блеф).`);
    });
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

    // 1. Блеф та Синобі куди завгодно
    if (token.type === 'Shinobi' || token.type === 'Blank') {
      return true;
    }

    // 2. БЛАГОСЛОВЕННЯ та ДИПЛОМАТІЯ — викладаються ТІЛЬКИ у свої провінції
    if (token.type === 'Blessing' || token.type === 'Diplomacy') {
      return isOwner;
    }

    // 3. Ронін чи базовий захист власних земель
    if (isOwner) {
      if (token.type === 'Navy') return province.isCoastal;
      return true;
    }

    // 4. АТАКА (Армія, Флот, ПОГРОМ / Raid) на ворожі чи нейтральні землі
    if (!isOwner) {
      // Погром вимагає сусіднього кордону, так само як і звичайна атака армією
      const adjacentProvinces = PROVINCE_ADJACENCY[province.id] || [];
      const sharedBordersCount = adjacentProvinces.filter(adjId => {
        const adjProv = this.state?.provinces[adjId];
        return adjProv && adjProv.controllingClan === playerClan;
      }).length;

      if (sharedBordersCount === 0) {
        if (token.type === 'Navy' && province.isCoastal) return true;
        return false;
      }

      // Перевірка ліміту атак
      const currentAttacksFromPlayer = (province.placedTokens || []).filter(
        pt => pt.clan === playerClan && pt.token.type !== 'Shinobi'
      ).length;

      if (currentAttacksFromPlayer >= sharedBordersCount) {
        return false;
      }

      if (token.type === 'Navy') return province.isCoastal;

      return true; // Армія або Погром (Raid)
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
  // Стан: чи триває зараз пре-гральна фаза розстановки жетонів контролю
  private isInitialPlacementPhase: boolean = true;

  getInitialPlacementStatus(): boolean {
    return this.isInitialPlacementPhase;
  }

  /**
   * Перевірка: чи може гравець поставити жетон контролю на цю провінцію під час пре-гральної розстановки
   */
  isValidInitialControlPlacement(province: Province, playerClan: ClanType): boolean {
    if (!this.isInitialPlacementPhase || !this.state) return false;

    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];
    if (!player || player.remainingControlTokens <= 0) return false;

    // Провінція вже належить цьому клану — не можна ставити вдруге
    if (province.controllingClan === playerClan) return false;

    // Перевіряємо, чи є хоча б один сусід, який вже належить цьому клану
    const adjacentIds = PROVINCE_ADJACENCY[province.id] || [];
    const hasControlledNeighbor = adjacentIds.some(adjId => {
      const adjProv = this.state?.provinces[adjId];
      return adjProv && adjProv.controllingClan === playerClan;
    });

    return hasControlledNeighbor;
  }

  /**
   * Виконання розміщення жетона контролю на пре-гральному етапі
   */
  placeInitialControlToken(provinceId: string, playerClan: ClanType): boolean {
    if (!this.state) return false;

    const province = this.state.provinces[provinceId];
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];

    if (!province || !player) return false;
    if (!this.isValidInitialControlPlacement(province, playerClan)) return false;

    // 1. Захоплюємо провінцію (всі інші властивості провінції: name, regionId, isCoastal — залишаються недоторканими!)
    province.controllingClan = playerClan;
    province.controlTokensFaceUp += 1;
    player.remainingControlTokens -= 1;

    this.state.roundLog.push(`Клан ${playerClan} встановив жетон контролю на ${province.name}. Залишок: ${player.remainingControlTokens}`);

    // 2. Перевірка завершення пре-фази
    if (player.remainingControlTokens <= 0) {
      this.isInitialPlacementPhase = false;
      this.state.roundLog.push(`Пре-гральна розстановка контролю завершена! Починається Раунд 1.`);
    }

    this.saveGame();
    return true;
  }


  nextPhase(): void {
    if (!this.state) return;

    if (this.isInitialPlacementPhase) {
      this.isInitialPlacementPhase = false;
      this.state.roundLog.push(`Пре-фазу розстановки завершено. Починається Раунд 1.`);
      this.saveGame();
      return;
    }

    if (this.state.currentPhase === 'Placement') {
      // ЗАПУСКАЄМО РОЗРАХУНОК БИТВ ПРИ ПЕРЕХОДІ ДО ВИКОНАННЯ
      this.resolveExecutionPhase();

      this.state.currentPhase = 'Execution';
      this.state.roundLog.push(`Раунд ${this.state.currentRound}: Фаза виконання та розкриття завершена.`);
    } else if (this.state.currentPhase === 'Execution') {
      if (this.state.currentRound >= 5) {
        alert('Гра завершена! Час підраховувати очки честі.');
      } else {
        this.state.currentRound++;
        this.state.currentPhase = 'Placement';
        
        // ОЧИЩАЄМО СТАРІ РОЗКРИТІ ЖЕТОНИ З МАПИ НА ПОЧАТКУ НОВОГО РАУНДУ
        Object.values(this.state.provinces).forEach(prov => {
          prov.placedTokens = [];
        });

        this.replenishPlayerHands();
        this.distributeRoundControlTokens();
        this.state.roundLog.push(`Розпочався раунд ${this.state.currentRound}. Фаза розміщення.`);
      }
    }

    this.saveGame();
  }

  getPhaseName(phase: string): string {
    switch (phase) {
      case 'Planning':
      case 'Placement': return 'Фаза Розміщення (Ходи)';
      case 'Execution': return 'Фаза Виконання (Битви)';
      default: return phase;
    }
  }
  /**
   * Нарахування нових жетонів контролю на початку нового раунду (Фаза перегрупування)
   */
  private distributeRoundControlTokens(): void {
    if (!this.state) return;

    // Проходимо по всіх гравцях і даємо їм жетони за контроль над провінціями
    Object.values(this.state.players).forEach(player => {
      // Рахуємо, скільки провінцій контролює клан
      const controlledProvincesCount = Object.values(this.state!.provinces).filter(
        p => p.controllingClan === player.clan
      ).length;

      // Базове правило: гравець отримує жетони контролю за свої провінції (наприклад, мінімум 3 або за кількістю земель)
      const tokensToAdd = Math.max(3, Math.floor(controlledProvincesCount / 2));
      player.remainingControlTokens += tokensToAdd;

      this.state!.roundLog.push(`Клан ${player.clan} отримав ${tokensToAdd} нових жетонів контролю в резерв.`);
    });
  }
  resolveExecutionPhase(): void {
    if (!this.state) return;

    this.state.roundLog.push(`--- Фаза виконання Раунду ${this.state.currentRound} (Спеціальні жетони) ---`);

    Object.values(this.state.provinces).forEach(province => {
      const placedTokens = province.placedTokens || [];

      if (placedTokens.length === 0) {
        if (province.controllingClan !== 'Neutral') {
          province.controlTokensFaceUp += 1;
          this.state!.roundLog.push(`Провінція ${province.name} мирно утримана кланом ${province.controllingClan}.`);
        }
        return;
      }

      // 1. Розкриваємо жетони
      placedTokens.forEach(pt => pt.isFaceUp = true);

      // 2. ПЕРЕВІРКА ДИПЛОМАТІЇ (Diplomacy 📜)
      // Якщо власник виклав Дипломатію на свою територію, будь-які атаки ворогів скасовуються!
      const hasDiplomacy = placedTokens.some(pt => pt.clan === province.controllingClan && pt.token.type === 'Diplomacy');
      if (hasDiplomacy) {
        this.state!.roundLog.push(`📜 Дипломатія захистила провінцію ${province.name}! Усі атаки противників скасовано в цьому раунді.`);
        // Захисник отримує бонусний жетон контролю за мирний захист завдяки дипломатії
        province.controlTokensFaceUp += 1;
        return; // Виходимо з обробки цієї провінції, бо тут мир
      }

      // 3. ПІДРАХУНОК СИЛИ ЗАХИСНИКА (включаючи Благословення ✨)
      let defenseTotal = province.baseDefense + province.controlTokensFaceUp;
      const defenderClan = province.controllingClan;
      
      placedTokens
        .filter(pt => pt.clan === defenderClan)
        .forEach(pt => {
          if (pt.token.type === 'Army' || pt.token.type === 'Navy') {
            defenseTotal += pt.token.strength;
          }
          // Благословення додає фіксовану потужну підтримку захисту (+3 до сили)
          if (pt.token.type === 'Blessing') {
            defenseTotal += 3;
            this.state!.roundLog.push(`✨ Благословення дарувало +3 до захисту провінції ${province.name}!`);
          }
        });

      // 4. ПІДРАХУНОК АТАК (Розрізняємо звичайні атаки та ПОГРОМ / Raid 🔥)
      const attackerClans = Array.from(new Set(
        placedTokens.filter(pt => pt.clan !== defenderClan).map(pt => pt.clan)
      ));

      if (attackerClans.length === 0) {
        province.controlTokensFaceUp += 1;
        this.state!.roundLog.push() ? null : this.state!.roundLog.push(`Клан ${defenderClan} зміцнив провінцію ${province.name}.`);
      } else {
        // Перевіряємо, чи є тут жетони Погрому (Raid)
        const raidTokens = placedTokens.filter(pt => pt.token.type === 'Raid');
        const armyTokens = placedTokens.filter(pt => pt.token.type === 'Army' || pt.token.type === 'Navy');

        // Якщо це чистий Погром без армій
        if (raidTokens.length > 0 && armyTokens.length === 0) {
          raidTokens.forEach(rt => {
            // Якщо сила погрому перевищує захист, він руйнує 1 жетон контролю ворога
            if (rt.token.strength >= defenseTotal && province.controlTokensFaceUp > 0) {
              province.controlTokensFaceUp -= 1;
              this.state!.roundLog.push(`🔥 Погром клану ${rt.clan} успішно спустошив провінцію ${province.name}! Знищено 1 жетон контролю.`);
            } else {
              this.state!.roundLog.push(`🔥 Погром клану ${rt.clan} на провінцію ${province.name} відбито захистом.`);
            }
          });
        } else {
          // Стандартна битва з урахуванням атак
          let strongestAttackerClan: ClanType | null = null;
          let maxAttackStrength = -1;
          let isTie = false;

          attackerClans.forEach(attackerClan => {
            let clanAttackSum = 0;
            placedTokens
              .filter(pt => pt.clan === attackerClan)
              .forEach(pt => {
                if (pt.token.type === 'Army' || pt.token.type === 'Navy' || pt.token.type === 'Raid') {
                  clanAttackSum += pt.token.strength;
                }
              });

            if (clanAttackSum > maxAttackStrength) {
              maxAttackStrength = clanAttackSum;
              strongestAttackerClan = attackerClan;
              isTie = false;
            } else if (clanAttackSum === maxAttackStrength) {
              isTie = true;
            }
          });

          if (strongestAttackerClan && !isTie && maxAttackStrength > defenseTotal) {
            this.state!.roundLog.push(`Клан ${strongestAttackerClan} завоював ${province.name} (Сила ${maxAttackStrength} vs Захист ${defenseTotal})!`);
            province.controllingClan = strongestAttackerClan;
            province.controlTokensFaceUp = 1;
          } else {
            this.state!.roundLog.push(`Клан ${defenderClan} відбив атаку на ${province.name}!`);
            province.controlTokensFaceUp += 1;
          }
        }
      }
    });

    this.saveGame();
  }
}