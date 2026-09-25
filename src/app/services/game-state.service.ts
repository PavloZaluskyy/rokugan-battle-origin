import { Injectable } from '@angular/core';
import { GameState, ClanType, BattleToken, BattleTokenType, PlayerState, Province } from '../models/game.model';
import { ORIGINAL_PROVINCES, PROVINCE_ADJACENCY } from '../models/provinces-data';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root' // Завдяки цьому Angular AppModule автоматично бачить цей сервіс як Singleton
})
export class GameStateService {
  // Сигнал для банера ботів на мапі
  private botTurnBannerSubject = new Subject<{ clan: string; text: string } | null>();
  botTurnBanner$ = this.botTurnBannerSubject.asObservable();
  
  private readonly STORAGE_KEY = 'rokugan_battle_save';
  // Стан кінематографічної битви
  private isCinematicBattleActive: boolean = false;
  private currentBattleProvinceId: string | null = null;
  // Внутрішній стан гри (поки null, доки не почнеться гра)
  private state: GameState | null = null;
  selectedToken: BattleToken | null = null;

  // ID провінції, яка зараз у фокусі кінематографічної камери
  isAttackingStrikeActive: boolean = false;
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
      const initialDeck = this.generatePlayerDeck(clan);
      const initialHand = initialDeck.splice(0, 5); // Беремо перші 5 з колоди

      // Додаємо Блеф
      initialHand.push({
        id: `${clan.toLowerCase()}-blank-init`,
        type: 'Blank',
        strength: 0,
        clan: clan
      });

      playersMap[clan] = {
        clan: clan,
        honorPoints: 0,
        remainingControlTokens: startingControlTokens - 1, 
        activeHandTokens: initialHand,
        deck: initialDeck,        // Решта колоди
        discardPile: []           // Порожній скид на старті
      };
    });

    const provincesMap: { [key: string]: Province } = {};
    ORIGINAL_PROVINCES.forEach(prov => {
      let initialBaseDefense = prov.baseDefense;
      const isCrabCapital = prov.isCapital && prov.capitalOf === 'Crab' && selectedClans.includes('Crab');
      
      // Якщо це власна столиця Краба на старті — одразу даємо +2 до базового захисту за пасивом
      if (isCrabCapital) {
        // Якщо базовий захист за замовчуванням 2, а жетон дає 1, то для отримання 4 
        // базовий захист має бути 3 (тобто 2 + 1 пасивний бонус замість повних +2 на старті, 
        // оскільки жетон контролю додасть ще 1).
        // Або якщо пасив має давати рівно +2 до загального захисту:
        initialBaseDefense = prov.baseDefense + 1; // 2 (база) + 1 (пасив частина) + 1 (жетон контролю на старті) = 4
      }

      provincesMap[prov.id] = { 
        ...prov, 
        baseDefense: initialBaseDefense, // Записуємо чистий базовий захист з урахуванням пасиву
        placedTokens: [],
        controlTokensFaceUp: 0,
        controllingClan: prov.isCapital && selectedClans.includes(prov.capitalOf as ClanType) ? prov.capitalOf! : 'Neutral',
        imageUrl: `assets/images/provinces/${prov.id}.png`
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
   * Генерування початкової руки жетонів для гравця (5 карт + 1 блеф)
   */
  // private generateInitialHand(): BattleToken[] {
  //   const hand: BattleToken[] = [];
  //   let idCounter = 1;

  //   const addToken = (type: BattleTokenType, strength: number, count: number) => {
  //     for (let i = 0; i < count; i++) {
  //       hand.push({
  //         id: `token-${type.toLowerCase()}-${idCounter++}-${Math.random().toString(36).substring(2, 5)}`,
  //         type: type,
  //         strength: strength,
  //         clan: 'Neutral' // Буде встановлено при розподілі
  //       });
  //     }
  //   };

  //   addToken('Army', 1, 2);
  //   addToken('Army', 2, 1);
  //   addToken('Army', 3, 1);
  //   addToken('Navy', 1, 1);
  //   addToken('Shinobi', 1, 1);

  //   // Додаємо пустий жетон (Блеф)
  //   hand.push({
  //     id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
  //     type: 'Blank',
  //     strength: 0,
  //     clan: 'Neutral'
  //   });

  //   return this.shuffleArray(hand);
  // }

  /**
   * Фаза перегрупування: гравець бере 5 карт атаки + 1 пустий (блеф) = разом 6 карток у руку
   */
  private generatePlayerDeck(clan: ClanType): BattleToken[] {
    const tokens: BattleToken[] = [];
    let idCounter = 1;

    const addToken = (type: BattleTokenType, strength: number, count: number) => {
      for (let i = 0; i < count; i++) {
        tokens.push({
          id: `${clan.toLowerCase()}-${type.toLowerCase()}-${idCounter++}-${Math.random().toString(36).substring(2, 5)}`,
          clan: clan,
          type: type,
          strength: strength
        });
      }
    };

    // Суворий розподіл згідно з твоїм словником (Сумарно 26 карт)
    addToken('Army', 1, 6);
    addToken('Army', 2, 4);
    addToken('Army', 3, 3);
    addToken('Army', 4, 2);
    addToken('Army', 5, 1);

    addToken('Navy', 1, 2);
    addToken('Navy', 2, 1);

    addToken('Shinobi', 1, 1);
    addToken('Shinobi', 2, 1);

    addToken('Diplomacy', 0, 1); // Без сили
    addToken('Raid', 0, 1);      // Погром без сили
    addToken('Blessing', 2, 2);  // Благословення з силою 2

    // --- ДОДАВАННЯ УНІКАЛЬНОЇ КАРТИ КЛАНУ ---
    switch (clan) {
      case 'Unicorn':
        addToken('Raid', 0, 1); // Додатковий Погром
        break;
      case 'Crane':
        addToken('Diplomacy', 0, 1); // Додаткова Дипломатія
        break;
      case 'Lion':
        addToken('Army', 6, 1); // Унікальна Армія сили 6
        break;
      case 'Dragon':
        addToken('Blessing', 3, 1); // Благословення сили 3
        break;
      case 'Scorpion':
        addToken('Shinobi', 3, 1); // Синобі сили 3
        break;
      case 'Phoenix':
        addToken('Blessing', 3, 1); // Благословення сили 3
        break;
      case 'Crab':
        addToken('Navy', 3, 1); // Флот сили 3
        break;
    }

    return this.shuffleArray(tokens);
  }

  private drawHandForPlayer(player: PlayerState): BattleToken[] {
    const hand: BattleToken[] = [];

    // Якщо в колоді не вистачає карт для руки, перетасовуємо скид назад у колоду
    if (player.deck.length < 5) {
      if (player.discardPile.length > 0) {
        player.deck = this.shuffleArray([...player.deck, ...player.discardPile]);
        player.discardPile = [];
      }
    }

    // Витягуємо рівно 5 карт із колоди
    const drawnCards = player.deck.splice(0, 5);
    hand.push(...drawnCards);

    // Додаємо незмінний пустий жетон (Блеф), який щоразу генерується заново на руку
    hand.push({
      id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'Blank',
      strength: 0,
      clan: player.clan
    });

    return hand;
  }

  /**
   * Оновлення рук гравців на початку нового раунду (Фаза перегрупування)
   */
  private replenishPlayerHands(): void {
    if (!this.state) return;

    Object.values(this.state.players).forEach(player => {
      // 1. Знаходимо карту, яку гравець залишив за ширмою (не використазив під час фази розміщення)
      // Оскільки гравець міг виставити до 5 карт, а залишити рівно 1 (або навпаки), 
      // шукаємо те, що лишилося в activeHandTokens, виключаючи старий Blank.
      const savedCard = player.activeHandTokens.find(t => t.type !== 'Blank');

      // 2. Усе, що було викладено на поле або вже відіграло, летить у скид. 
      // (Якщо гравець лишив карту, то решта використаних карт вже і так на провінціях, 
      // але якщо в руці лишилося кілька, то залишаємо лише одну, а інші йдуть у скид).
      const cardsToDiscard = player.activeHandTokens.filter(t => t !== savedCard && t.type !== 'Blank');
      player.discardPile.push(...cardsToDiscard);

      // 3. Формуємо нову руку
      const newHand: BattleToken[] = [];

      // Якщо гравець зберіг карту за ширмою — додаємо її у першу чергу
      if (savedCard) {
        newHand.push(savedCard);
      }

      // 4. Вираховуємо, скільки нових карт треба дотягнути з колоди, 
      // щоб разом із збереженою картою загалом було 5 бойових/спеціальних карт.
      const neededCardsCount = 5 - newHand.length;

      // Перевірка колоди / авто-замішування скиду, якщо карт не вистачає
      if (player.deck.length < neededCardsCount) {
        if (player.discardPile.length > 0) {
          player.deck = this.shuffleArray([...player.deck, ...player.discardPile]);
          player.discardPile = [];
        }
      }

      // Добираємо нестаючу кількість карток із колоди
      const drawnCards = player.deck.splice(0, neededCardsCount);
      newHand.push(...drawnCards);

      // 5. Додаємо свіжий пустий жетон (Блеф) на новий раунд
      newHand.push({
        id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type: 'Blank',
        strength: 0,
        clan: player.clan
      });

      // Оновлюємо руку гравця у стані
      player.activeHandTokens = newHand;

      const savedCardInfo = savedCard ? `Збережено за ширмою: ${savedCard.type} (сила ${savedCard.strength})` : 'Нічого не збережено';
      this.state!.roundLog.push(`Клан ${player.clan} оновив руку. ${savedCardInfo}. Добрано карт із колоди: ${drawnCards.length}.`);
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
    const tokenType = token.type as string;
    const isOwner = province.controllingClan === playerClan;

    // 1. ЗАБОРОНИ на випалену землю та мир
    if (province.hasScorchedEarth || province.hasPeaceToken) {
      return false; // Ніхто не може розміщувати жетони у випалених або мирних провінціях
    }

    // 2. Якщо є Святиня і гравець НЕ контролює її — не можна нічого туди ставити
    if (province.hasShrine && !isOwner) {
      return false;
    }

    // 3. Гавань можна ставити ТІЛЬКИ у свої материкові провінції
    if (tokenType === 'Harbor') {
      return isOwner && !province.isCoastal;
    }

    // 4. Благословення: ставиться ТІЛЬКИ на свої жетони (Армію, Флот, Синобі), що вже лежать на полі
    if (token.type === 'Blessing') {
      const hasFriendlyCombatToken = (province.placedTokens || []).some(pt => 
        pt.clan === playerClan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type)
      );
      return hasFriendlyCombatToken;
    }

    // 5. Дипломатія: ставиться на свою провінцію (якщо там немає маркера Слави, де заборонена дипломатія)
    if (token.type === 'Diplomacy') {
      return isOwner && !province.hasGlory;
    }

    // Погром (Raid): ставиться як супутник на ворожу/нейтральну провінцію, 
    // де є наш бойовий жетон (Армія, Флот або Шинобі). 
    // Умова: або є сусідній кордон/флот, АБО на цій провінції стоїть наш Шинобі!
    if (token.type === 'Raid') {
      if (isOwner || province.hasGlory) return false;
      
      const hasFriendlyCombatToken = (province.placedTokens || []).some(pt => 
        pt.clan === playerClan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type)
      );

      if (!hasFriendlyCombatToken) return false;

      const hasShinobiHere = (province.placedTokens || []).some(pt => 
        pt.clan === playerClan && pt.token.type === 'Shinobi'
      );
      
      const hasLandBorder = this.hasLandBorder(province, playerClan);
      
      // Дозволяємо погром, якщо є сухопутний кордон, шинобі, АБО якщо це прибережна провінція і на ній є наш Флот
      const hasNavyHere = (province.placedTokens || []).some(pt => 
        pt.clan === playerClan && pt.token.type === 'Navy'
      );
      const isCoastalAccess = Boolean(province.isCoastal || province.hasHarbor) && hasNavyHere;

      return hasShinobiHere || hasLandBorder || isCoastalAccess;
    }

    // 7. Синобі та Блеф
    if (token.type === 'Shinobi' || token.type === 'Blank') {
      return true;
    }

    // 8. Звичайний захист своїх земель
    if (isOwner) {
      if (token.type === 'Navy') return Boolean(province.isCoastal || province.hasHarbor);
      return true;
    }

    // 9. Атака ворожих земель
    if (!isOwner) {
      // 1. Якщо це ФЛОТ — йому НЕ потрібні сухопутні кордони і на нього НЕ діє ліміт кількості по сусідніх кордонах. 
      // Йому потрібен лише прибережний доступ та наявність води/гавані.
      if (token.type === 'Navy') {
        return Boolean(province.isCoastal || province.hasHarbor) && this.hasValidBorderOrNavy(province, playerClan);
      }

      // 2. Для всіх інших (наприклад, Армія) залишаємо суворі обмеження кордонів та ліміти масиву:
      const controlledBorders = this.getControlledBorderCount(province, playerClan);
      const existingFriendlyTokensCount = (province.placedTokens || []).filter(
        pt => pt.clan === playerClan && ['Army', 'Navy'].includes(pt.token.type)
      ).length;

      if (existingFriendlyTokensCount >= controlledBorders) {
        return false; 
      }

      // АРМІЯ може нападати ворожі землі ТІЛЬКИ через прямий суходільний кордон
      if (token.type === 'Army') {
        return this.hasLandBorder(province, playerClan);
      }

      if (!this.hasLandBorder(province, playerClan)) return false;
      return true;
    
    }

    return false;
  }
  private hasLandBorder(province: Province, playerClan: ClanType): boolean {
    const adjacentProvinces = PROVINCE_ADJACENCY[province.id] || [];
    return adjacentProvinces.some(adjId => this.state?.provinces[adjId]?.controllingClan === playerClan);
  }

  private hasValidBorderOrNavy(province: Province, playerClan: ClanType): boolean {
    // const hasBorder = this.hasLandBorder(province, playerClan);
    const hasCoastalAccess = Boolean(province.isCoastal || province.hasHarbor);
    return hasCoastalAccess;
  }
  /**
   * Рахує кількість спільних сусідніх провінцій, які вже контролює наш клан навколо цільової провінції
   */
  private getControlledBorderCount(province: Province, playerClan: ClanType): number {
    const adjacentIds = PROVINCE_ADJACENCY[province.id] || [];
    return adjacentIds.filter(adjId => {
      const adjProv = this.state?.provinces[adjId];
      return adjProv && adjProv.controllingClan === playerClan;
    }).length;
  }
  
  placeTokenOnProvince(provinceId: string, playerClan: ClanType): boolean {
    if (!this.selectedToken || !this.state) return false;

    const province = this.state.provinces[provinceId];
    const player = this.state.players[playerClan as keyof GameState['players']];

    if (!province || !player) return false;
    if (!this.isProvinceValidTarget(province, playerClan)) return false;

    // 1. Виставляємо жетон гравця
    const newPlacedToken = {
      id: `placed-${Date.now()}`,
      clan: playerClan,
      strength: this.selectedToken.strength,
      token: { ...this.selectedToken },
      isFaceUp: false
    };

    if (!province.placedTokens) province.placedTokens = [];
    province.placedTokens.push(newPlacedToken);

    player.activeHandTokens = player.activeHandTokens.filter(t => t.id !== this.selectedToken?.id);
    this.selectedToken = null;
    this.saveGame();

    // 2. ЯКЩО ХОДИВ СКОРПІОН — ЗАПУСКАЄМО ВІДПОВІДЬ БОТА (Хід ворога)
    if (playerClan === 'Scorpion') {
      this.triggerBotTurnSimulation();
    }

    return true;
  }

  /**
   * Імітація ходу бота з затримкою та виведенням банера
   */
  private triggerBotTurnSimulation(): void {
    if (!this.state) return;

    // Вибираємо випадковий ворожий клан (не Скорпіон) серед активних гравців
    const activeClans = Object.keys(this.state.players) as ClanType[];
    const enemyClans = activeClans.filter(c => c !== 'Scorpion');
    if (enemyClans.length === 0) return;

    const randomEnemyClan = enemyClans[Math.floor(Math.random() * enemyClans.length)];

    // Повідомляємо карту, що бот почав думати
    this.botTurnBannerSubject.next({
      clan: randomEnemyClan,
      text: `ХІД КЛАНУ ${randomEnemyClan.toUpperCase()} (ДУМАЄ...)`
    });

    // Затримка 1.5 секунди (імітація роздумів бота)
    setTimeout(() => {
      if (!this.state) return;

      // Знаходимо вільну провінцію для ворожого намету
      const emptyProvinces = Object.values(this.state.provinces).filter(
        p => !p.hasScorchedEarth && !p.hasPeaceToken && (!p.placedTokens || p.placedTokens.length === 0)
      );

      if (emptyProvinces.length > 0) {
        const targetProv = emptyProvinces[Math.floor(Math.random() * emptyProvinces.length)];
        if (!targetProv.placedTokens) targetProv.placedTokens = [];

        // Ставимо закритий ворожий намет бота
        targetProv.placedTokens.push({
          id: `bot-token-${Date.now()}`,
          clan: randomEnemyClan,
          strength: 2,
          token: { id: `tok-${Date.now()}`, type: 'Army', strength: 2, clan: randomEnemyClan },
          isFaceUp: false
        });

        this.state.roundLog.push(`🤖 Клан \({randomEnemyClan} зробив хід і виставив загін на\){targetProv.name}.`);
        this.saveGame();
      }

      // Ховаємо банер бота
      this.botTurnBannerSubject.next(null);
    }, 1500);
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
    // Якщо це клан Краба, ставимо +2 до захисту жетоном контролю при розстановці, інакше стандартно +1
    const defenseBonus = playerClan === 'Crab' ? 2 : 1;
    province.controlTokensFaceUp += defenseBonus;
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
    Object.values(this.state.players).forEach(p => {
          p.isSkillUsedThisRound = false;
          delete (p as any)._crabBonusApplied; // Відновлюємо доступність кнопки скіла на новий раунд
    });

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

    this.state.roundLog.push(`--- Фаза виконання Раунду ${this.state.currentRound} ---`);

    Object.values(this.state.provinces).forEach(province => {
      const placedTokens = province.placedTokens || [];

      // Якщо провінція випалена, вона ігнорується у боях і не може контролюватися
      if (province.hasScorchedEarth) {
        return;
      }

      // Якщо провінція має Мир, атаки та розміщення заборонені
      if (province.hasPeaceToken) {
        this.state!.roundLog.push(`🕊️ Провінція ${province.name} охороняється Миром.`);
        return;
      }

      if (placedTokens.length === 0) {
        return;
      }

      placedTokens.forEach(pt => pt.isFaceUp = true);
      // --- 0. ПЕРШИМ ДІТОМ ЗАСТОСОВУЄМО БЛАГОСЛОВЕННЯ ---
      // Шукаємо всі жетони Благословення на провінції (їх може бути кілька від різних гравців)
      // --- 0. ПЕРШИМ ДІТОМ ЗАСТОСОВУЄМО БЛАГОСЛОВЕННЯ ---
      const blessingTokens = placedTokens.filter(pt => pt.token.type === 'Blessing');
      blessingTokens.forEach(blessingToken => {
        // Шукаємо бойовий загін СУВОРО ТОГО Ж КЛАНУ, що й жетон Благословення
        const targetCombatToken = placedTokens.find(pt => 
          pt.clan === blessingToken.clan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type)
        );

        if (targetCombatToken) {
          // Збільшуємо силу в обох можливих місцях зберігання, щоб підрахунок атаки її побачив
          targetCombatToken.strength += 2;
          if (targetCombatToken.token) {
            targetCombatToken.token.strength += 2;
          }
          this.state!.roundLog.push(`✨ Благословення клану ${blessingToken.clan} посилило загін (${targetCombatToken.token.type}) на ${province.name} на +2 (Нова сила: ${targetCombatToken.strength})!`);
        }
      });
      // Обробка ДИПЛОМАТІЇ -> Ставимо жетон МИРУ
      const diplomacyToken = placedTokens.find(pt => pt.clan === province.controllingClan && pt.token.type === 'Diplomacy');
      if (diplomacyToken) {
        province.hasPeaceToken = true;
        this.state!.roundLog.push(`📜 Дипломатія в ${province.name} встановила вічний МИР.`);
        province.placedTokens = [];
        return;
      }

      // Обробка ПОГРОМУ -> Ставимо ВИПАЛЕНУ ЗЕМЛЮ якщо спрацювало
      // 1. Обробка ПОГРОМУ (Raid): діє ТІЛЬКИ якщо в стопці є бойовий жетон (Армія, Флот, Шинобі) на ворожій провінції
      const raidTokens = placedTokens.filter(pt => pt.token.type === 'Raid');
      raidTokens.forEach(rt => {
        // Перевіряємо, чи є в цій же стопці бойовий жетон цього ж клану
        const hasCombatToken = placedTokens.some(pt => 
          pt.clan === rt.clan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type)
        );
        const hasShinobiHere = placedTokens.some(pt => pt.clan === rt.clan && pt.token.type === 'Shinobi');
        const hasBorder = this.hasValidBorderOrNavy(province, rt.clan);

        if (hasCombatToken && (hasShinobiHere || hasBorder)) {
          province.hasScorchedEarth = true;
          province.controllingClan = 'Neutral'; // Втрачає контроль
          province.controlTokensFaceUp = 0;
          province.placedTokens = [];
          this.state!.roundLog.push(`🔥 Погром із бойовою підтримкою від клану ${rt.clan} перетворив провінцію ${province.name} на ВИПАЛЕНУ ЗЕМЛЮ!`);
        }
      });

      if (province.hasScorchedEarth) return;

      // Підрахунок захисту та атак (з урахуванням Святині)
      // Підрахунок захисту та атак (з урахуванням Святині та пасивів кланів)
      let defenseTotal = this.getEffectiveBaseDefense(province) + province.controlTokensFaceUp;
      const defenderClan = province.controllingClan;

      placedTokens
        .filter(pt => pt.clan === defenderClan)
        .forEach(pt => {
          if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
            defenseTotal += pt.strength !== undefined ? pt.strength : pt.token.strength;
          }
        });

      const attackerClans = Array.from(new Set(
        placedTokens.filter(pt => pt.clan !== defenderClan).map(pt => pt.clan)
      ));

      if (attackerClans.length > 0) {
        let strongestAttackerClan: ClanType | null = null;
        let maxAttackStrength = -1;

        attackerClans.forEach(attackerClan => {
          let clanAttackSum = 0;
          placedTokens
            .filter(pt => pt.clan === attackerClan)
            .forEach(pt => {
              if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
                clanAttackSum += pt.strength !== undefined ? pt.strength : pt.token.strength;
              }
            });

          // --- СБІЛ КЛАНУ ФЕНІКСА ---
          // Ігнорує 2 захисту при атаці столиці
          let adjustedDefense = defenseTotal;
          if (attackerClan === 'Phoenix' && province.isCapital) {
            adjustedDefense = Math.max(0, defenseTotal - 2);
            this.state!.roundLog.push(`🔥 Фенікс атакує столицю ${province.name}: захист знижено з ${defenseTotal} до ${adjustedDefense}.`);
          }

          if (clanAttackSum > maxAttackStrength) {
            maxAttackStrength = clanAttackSum;
            strongestAttackerClan = attackerClan;
          }
        });

        // Визначаємо переможця бою з урахуванням скілу КЛАНУ ЖУРАВЛЯ (перемога в нічию)
        let isAttackerWinner = maxAttackStrength > defenseTotal; // (або з урахуванням ফенікса)
        
        // Перевірка Фенікса для фінального порівняння конкретного переможця
        let effectiveDefenseForWinner = defenseTotal;
        if (strongestAttackerClan === 'Phoenix' && province.isCapital) {
          effectiveDefenseForWinner = Math.max(0, defenseTotal - 2);
        }

       // Умова перемоги: атака > захисту, АБО (якщо атакуючий Журавель і атака == захисту)
        const isCraneTieBreak = strongestAttackerClan === 'Crane' && maxAttackStrength === effectiveDefenseForWinner;
        
        if (strongestAttackerClan && (maxAttackStrength > effectiveDefenseForWinner || isCraneTieBreak)) {
          // --- БІЙ ПРОГРАНО КРАБОМ (ворог захопив провінцію) ---
          if (isCraneTieBreak) {
            this.state!.roundLog.push(`鶴 Клан Журавля перемагає в нічию на ${province.name}!`);
          }

          this.state!.roundLog.push(`Клан \({strongestAttackerClan} захопив\){province.name} з міцністю атаки \({maxAttackStrength} проти захисту\){effectiveDefenseForWinner}!`);
          province.controllingClan = strongestAttackerClan;
          province.controlTokensFaceUp = 1;
        } else {
          // --- АТАКУ ВІДБИТО (Успішний захист Краба!) ---
          // ПЕРЕВІРЯЄМО ЧИ ЗАХИЩАВСЯ КРАБ
          if (defenderClan === 'Crab') {
            // Клан Краба отримує +2 до захисту провінції
            province.baseDefense += 2;
            this.state!.roundLog.push(`🦀 Клан Краба відбив атаку на \({province.name}: базовий захист збільшено на +2 (Тепер:\){province.baseDefense})!`);
          } else {
            // Для всіх інших кланів стандартно додається +1 за вистояний раунд
            province.controlTokensFaceUp += 1;
          }
        }
      }
    });

    this.saveGame();
  }
  getCinematicStatus() {
    return {
      isActive: this.isCinematicBattleActive,
      provinceId: this.currentBattleProvinceId
    };
  }
  startCinematicResolution(callbackOnComplete: () => void): void {
    if (!this.state) return;
    console.log('Starting cinematic resolution for round', this.state.currentRound);
    this.state.roundLog.push(`--- Фаза виконання Раунду ${this.state.currentRound} розпочалася ---`);

    // 1. Робимо всі жетони видимими (розкриваємо намети)
    Object.values(this.state.provinces).forEach(province => {
      const placedTokens = province.placedTokens || [];
      placedTokens.forEach(pt => pt.isFaceUp = true);
    });

    this.saveGame();

    // 2. Робимо невелику затримку для анімації розкриття, потім виконуємо розрахунок битв
    setTimeout(() => {
      this.resolveExecutionPhase();

      // Переводимо у фазу виконання або завершуємо цикл раунду
      this.state!.currentPhase = 'Execution';
      this.saveGame();

      // Викликаємо колбек оновлення інтерфейсу
      callbackOnComplete();
    }, 1200); // 1.2 секунди на ефект розкриття
  }
  private triggerCinematicSubject = new Subject<void>();
  triggerCinematic$ = this.triggerCinematicSubject.asObservable();

  requestCinematicBattles() {
    this.triggerCinematicSubject.next();
  }
  /**
   * КЛАН ЖУРАВЛЯ: Перемагає в нічиїх (якщо сила атаки дорівнює захисту, Журавель забирає провінцію)
   */
  private applyCraneClanBonus(province: Province, defenderClan: ClanType, attackerClans: ClanType[], placedTokens: any[]): void {
    if (defenderClan === 'Crane') {
      // Якщо Журавлі захищаються і сталася нічия
      // (Логіка нічиєї зазвичай обробляється там, де сила атаки дорівнює захисту)
    }
    // Також перевіряємо, якщо Журавлі атакують і сила атаки дорівнює захисту:
    const isCraneAttacking = attackerClans.includes('Crane');
    if (isCraneAttacking && province.controllingClan !== 'Crane') {
      // Логіку нічиїх ми опрацюємо в блоці порівняння сил нижче
    }
  }
  /**
   * КЛАН ФЕНІКСА: Ігнорує 2 захисту столичних провінцій
   */
  private applyPhoenixClanBonus(province: Province, attackerClan: ClanType): number {
    let defenseReduction = 0;
    if (attackerClan === 'Phoenix' && province.isCapital) {
      defenseReduction = 2;
      this.state!.roundLog.push(`🔥 Клан Фенікса ігнорує 2 захисту столиці ${province.name}!`);
    }
    return defenseReduction;
  }

  /**
   * КЛАН КРАБА: Дефолтний захист провінції +2, а також +2 після успішного захисту
   */
  private applyCrabClanBonus(province: Province, defenderClan: ClanType, wasSuccessfulDefense: boolean): void {
    if (defenderClan === 'Crab' && wasSuccessfulDefense) {
      province.baseDefense += 2; // Збільшуємо саме фізичний базовий захист на +2 після успішного відбиття
      this.state!.roundLog.push(`🦀 Клан Краба відбив атаку на ${province.name}: базовий захист збільшено на +2 (Тепер: ${province.baseDefense})!`);
    }
  }
  /**
   * Базова ініціалізація захисту провінції з урахуванням пасиву Краба (дефолтний захист +2)
   */
  private getEffectiveBaseDefense(province: Province): number {
    return province.baseDefense;
  }
  getUnicornSkillState() {
    const player = this.state?.players['Unicorn'];
    return {
      isActive: this.state?.isUnicornSkillActive || false,
      selectedProvinceId: this.state?.unicornSelectedProvinceId || null,
      isUsed: player?.isSkillUsedThisRound || false
    };
  }
  // Активація скілу по кліку на кнопку Єдинорога
  activateUnicornSkill(): void {
    if (!this.state) return;
    const player = this.state.players['Unicorn'];
    if (!player || player.isSkillUsedThisRound) return;

    this.state.isUnicornSkillActive = true;
    this.state.unicornSelectedProvinceId = null;
    this.state.roundLog.push(`🐎 Клан Єдинорога активує здібність маневру: оберіть перший власний жетон на мапі.`);
    this.saveGame();
  }

  // Скасування скілу (якщо гравець передумав)
  cancelUnicornSkill(): void {
    if (!this.state) return;
    this.state.isUnicornSkillActive = false;
    this.state.unicornSelectedProvinceId = null;
    this.saveGame();
  }

  // Логіка кліку по провінції під час активного скілу Єдинорога
  handleUnicornProvinceClick(provinceId: string): boolean {
    if (!this.state || !this.state.isUnicornSkillActive) return false;

    const province = this.state.provinces[provinceId];
    if (!province) return false;

    // Перевіряємо, чи є на цій провінції жетони клану Єдинорога
    const hasUnicornTokens = (province.placedTokens || []).some(pt => pt.clan === 'Unicorn');

    // Якщо перший жетон ще не вибраний
    if (!this.state.unicornSelectedProvinceId) {
      if (!hasUnicornTokens) {
        console.log('На цій провінції немає жетонів Єдинорога!');
        return false; 
      }
      this.state.unicornSelectedProvinceId = provinceId;
      this.state.roundLog.push(`🐎 Вибрано першу позицію для маневру (${province.name}). Тепер виберіть іншу вашу провінцію з жетоном.`);
      this.saveGame();
      return true;
    } 
    // Якщо перший жетон вже вибраний — вибираємо другий і міняємо їх місцями
    else {
      const firstProvinceId = this.state.unicornSelectedProvinceId;
      if (firstProvinceId === provinceId) {
        // Клікнули туди ж — скасовуємо вибір
        this.state.unicornSelectedProvinceId = null;
        this.saveGame();
        return true;
      }

      if (!hasUnicornTokens) {
        console.log('Друга провінція теж має містити жетони Єдинорога!');
        return false; 
      }

      // МІНЯЄМО ЖЕТОНИ МІЖ ПРОВІНЦІЯМИ МІСЦЯМИ
      const firstProv = this.state.provinces[firstProvinceId];
      const secondProv = province;

      const firstUnicornTokens = firstProv.placedTokens.filter(pt => pt.clan === 'Unicorn');
      const otherFirstTokens = firstProv.placedTokens.filter(pt => pt.clan !== 'Unicorn');

      const secondUnicornTokens = secondProv.placedTokens.filter(pt => pt.clan === 'Unicorn');
      const otherSecondTokens = secondProv.placedTokens.filter(pt => pt.clan !== 'Unicorn');

      // Здійснюємо обмін
      firstProv.placedTokens = [...otherFirstTokens, ...secondUnicornTokens];
      secondProv.placedTokens = [...otherSecondTokens, ...firstUnicornTokens];

      // Завершуємо роботу скілу
      this.state.isUnicornSkillActive = false;
      this.state.unicornSelectedProvinceId = null;

      const player = this.state.players['Unicorn'];
      if (player) {
        player.isSkillUsedThisRound = true;
      }

      this.state.roundLog.push(`🐎 Маневр Єдинорога успішно виконано між ${firstProv.name} та ${secondProv.name}!`);
      this.saveGame();
      return true;
    }
  }
  /**
   * Активація унікальної здібності клану під час раунду
   */
  activateClanSkill(clan: ClanType): void {
    if (!this.state) return;
    const player = this.state.players[clan as Exclude<ClanType, 'Neutral'>];
    if (!player || player.isSkillUsedThisRound) return;

    if (clan === 'Unicorn') {
      this.activateUnicornSkill(); // Викликаємо правильний метод активації маневру
    } 
    else if (clan === 'Scorpion') {
      this.state.roundLog.push(`🦂 Клан Скорпіона активує мережу шпигунів: натисніть на закритий жетон ворога на мапі, щоб підглянути його.`);
      player.isSkillUsedThisRound = true;
    }

    this.saveGame();
  }
  // Повертає поточний статус активації скілу Скорпіона
  getScorpionSkillState() {
    const player = this.state?.players['Scorpion'];
    return {
      isActive: this.state?.isScorpionSkillActive || false,
      isUsed: player?.isSkillUsedThisRound || false
    };
  }

  // Активація скілу Скорпіона по кліку на кнопку
  activateScorpionSkill(): void {
    if (!this.state) return;
    const player = this.state.players['Scorpion'];
    if (!player || player.isSkillUsedThisRound) return;

    this.state.isScorpionSkillActive = true;

    // СТВОРЮЄМО СТАРТОВИЙ ХАРДКОД-НАМЕТ ВОРОГА НА ПОЧАТКУ ХОДУ СКОРПІОНА
    const targetProv = Object.values(this.state.provinces).find(p => !p.placedTokens || p.placedTokens.length === 0);
    if (targetProv) {
      if (!targetProv.placedTokens) targetProv.placedTokens = [];
      targetProv.placedTokens.push({
        id: `start-mock-enemy-${Date.now()}`,
        clan: 'Crane', // Наприклад, клан Журавель як ворог
        strength: 3,
        token: { id: 'mock-token-crane', type: 'Army', strength: 3, clan: 'Crane' },
        isFaceUp: false
      });
      this.state.roundLog.push(`🦂 На початку ходу Скорпіона розвідка виявила ворожий намет на провінції ${targetProv.name}!`);
    }

    this.state.roundLog.push(`🦂 Клан Скорпіона активує мережу шпигунів: виберіть закритий жетон ворога на мапі.`);
    this.saveGame();
  }

  // Скасування скілу шпигунства
  cancelScorpionSkill(): void {
    if (!this.state) return;
    this.state.isScorpionSkillActive = false;
    this.saveGame();
  }

  // Обробка кліку по провінції під час активного шпигунства Скорпіона
  handleScorpionProvinceClick(provinceId: string): boolean {
    if (!this.state || !this.state.isScorpionSkillActive) return false;

    const province = this.state.provinces[provinceId];
    if (!province) return false;

    // Шукаємо закриті жетони супротивника (не нашого клану — 'Scorpion')
    const enemyTokens = (province.placedTokens || []).filter(pt => pt.clan !== 'Scorpion' && !pt.isFaceUp);
    
    if (enemyTokens.length === 0) {
      console.log('На цій провінції немає закритих ворожих жетонів!');
      return false;
    }

    // РЕЖИСУРА ШПИГУНСТВА: робимо ворожі жетони на цій провінції видимими (isFaceUp = true)
    province.placedTokens.forEach(pt => {
      if (pt.clan !== 'Scorpion') {
        pt.isFaceUp = true; // Розкриваємо шпигунську карту для всіх
      }
    });

    // Завершуємо роботу скілу
    this.state.isScorpionSkillActive = false;
    const player = this.state.players['Scorpion'];
    if (player) {
      player.isSkillUsedThisRound = true;
    }
    // --- ТЕСТОВИЙ АВТО-ХАРКОД ---
    // Перевіряємо, чи є на карті хоча б один закритий жетон ворога
    let hasAnyEnemyToken = false;
    Object.values(this.state.provinces).forEach(prov => {
      if ((prov.placedTokens || []).some(pt => pt.clan !== 'Scorpion' && !pt.isFaceUp)) {
        hasAnyEnemyToken = true;
      }
    });

    // Якщо ворогів немає — автоматично ставимо тестовий закритий намет (наприклад, клану Crab) на вільну провінцію
    if (!hasAnyEnemyToken) {
      const targetProv = Object.values(this.state.provinces).find(p => !p.placedTokens || p.placedTokens.length === 0);
      if (targetProv) {
        if (!targetProv.placedTokens) targetProv.placedTokens = [];
        targetProv.placedTokens.push({
          id: `mock-enemy-${Date.now()}`,
          clan: 'Crab',
          strength: 3,
          token: { id: 'mock-token-1', type: 'Army', strength: 3, clan: 'Crab' },
          isFaceUp: false // Закритий намет
        });
        this.state.roundLog.push(`[ТЕСТ] Автоматично створено тестовий ворожий намет на провінції ${targetProv.name}!`);
        console.log(`[ТЕСТ] Автоматично створено тестовий ворожий намет на провінції ${targetProv.name}!`);
      }
    }
    // ----------------------------
    this.state.roundLog.push(`🦂 Шпигуни Скорпіона успішно розкрили ворожі сили на провінції ${province.name}!`);
    this.saveGame();
    return true;
  }

  setupCrabDefenseTest(): void {
    if (!this.state) return;

    // Збираємо ВСІ провінції, які зараз контролює Клан Краба
    const crabProvinces = Object.values(this.state.provinces).filter(
      p => p.controllingClan === 'Crab'
    );

    if (crabProvinces.length === 0) {
      console.log('Клан Краба більше не контролює жодної провінції!');
      return;
    }

    // Вибираємо РАНДОМНУ провінцію Краба зі списку
    const randomCrabProvince = crabProvinces[Math.floor(Math.random() * crabProvinces.length)];

    if (!randomCrabProvince.placedTokens) {
      randomCrabProvince.placedTokens = [];
    }
    
    // Додаємо ворожий загін (наприклад, Армію сили 3 від клану Lion) на цю провінцію
    randomCrabProvince.placedTokens.push({
      id: `crab-test-enemy-${Date.now()}`,
      clan: 'Lion',
      strength: 3,
      token: { id: 'test-tok-lion', type: 'Army', strength: 3, clan: 'Lion' },
      isFaceUp: true // Відкритий для наочності в тестах
    });

    this.state.roundLog.push(`[ТЕСТ КРАБА] Ворожий загін клану Lion напав на провінцію Краба "${randomCrabProvince.name}" із силою 3!`);
    this.saveGame();
  }
}