import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs'; // Імпортуємо Subject

export interface RegionCard {
  id: string;
  regionId: string;       // До якого регіону належить карта (наприклад, 'Краб', 'Журавель', тощо)
  title: string;          // Назва карти (наприклад, 'Рокіровка')
  description: string;    // Опис ефекту
  status: 'pool' | 'owned' | 'discarded'; // Статус: у пулі, у гравця, чи у скиді
  ownerClan?: string | null;             // Клан, який зараз володіє цією картою
}

@Injectable({
  providedIn: 'root',
})
export class RegionCardService {
  private closeRokirovkaModalSubject = new Subject<void>();
  closeRokirovkaModal$ = this.closeRokirovkaModalSubject.asObservable();
  // Повний список усіх 22 карт регіонів (по 2 на регіон)
 private allRegionCards: RegionCard[] = [
    // КРАБ (Територія Краба)
    { id: 'crab-1', regionId: 'Територія Краба', title: 'Рокіровка', description: 'Виберіть одну картку армії, флоту чи шинобі у вашому скиді і верніть його у ваш актив (у ширму). Потім виберіть 1 жетон битви і або викиньте його у скид або розмістіть у ваш запас.', status: 'pool' },
    { id: 'crab-2', regionId: 'Територія Краба', title: 'Вихід до моря', description: 'Розмістіть материкову провінцію і помістіть там іконку порту. Тепер ця провінція рахується прибережною.', status: 'pool' },
    
    // ЖУРАВЕЛЬ (Територія Журавля)
    { id: 'crane-1', regionId: 'Територія Журавля', title: 'Дипломатична місія', description: 'Виберіть провінцію і помістіть туди значок миру. Якщо цю провінцію контролює інший гравець, помістіть 2 жетони контролю в любу свою провінцію.', status: 'pool' },
    { id: 'crane-2', regionId: 'Територія Журавля', title: 'Кодекс честі', description: 'Виберіть 2 провінції (крім тіньових земель) і помістіть в кожну з них по 1 бонусу честі.', status: 'pool' },

    // ДРАКОН (Територія Дракона)
    { id: 'dragon-1', regionId: 'Територія Дракона', title: 'Благословенна земля', description: 'Виберіть провінцію і помістіть у неї жетон святині. Цю провінцію не можна атакувати, але гравець може з неї атакувати сусідні провінції.', status: 'pool' },
    { id: 'dragon-2', regionId: 'Територія Дракона', title: 'Рух до цілі', description: 'Виберіть 2 підконтрольні вам провінції, і помістіть в кожну з них по 1 жетону контролю.', status: 'pool' },

    // ЛЕВ (Територія Лева)
    { id: 'lion-1', regionId: 'Територія Лева', title: 'Бусідо', description: 'Виберіть провінцію (крім тіньових земель), і замініть її честь на рівно 4.', status: 'pool' },
    { id: 'lion-2', regionId: 'Територія Лева', title: 'Шляхетна битва', description: 'Виберіть провінцію і розмістіть на ній жетон "Слави", тепер в цій провінції не можна ставити жетон дипломатії чи погрому.', status: 'pool' },

    // ФЕНІКС (Територія Фенікса)
    { id: 'phoenix-1', regionId: 'Територія Фенікса', title: 'Підтримка Камі', description: 'Виберіть провінцію (крім тіньових земель) і помістіть там бонус до захисту +2', status: 'pool' },
    { id: 'phoenix-2', regionId: 'Територія Фенікса', title: 'Очищення', description: 'Заберіть з любої провінції жетон спаленої землі та помістіть туди два жетони захисту', status: 'pool' },

    // СКОРПІОН (Територія Скорпіона)
    { id: 'scorpion-1', regionId: 'Територія Скорпіона', title: 'Вогні повстання', description: 'Заберіть з любої провінції жетон миру, якщо ви контролюєте цю провінцію то поставте туди 2 жетони захисту', status: 'pool' },
    { id: 'scorpion-2', regionId: 'Територія Скорпіона', title: 'Шпіонська мережа', description: 'Виберіть гравця і подивіться на його картки атаки в його ширмі, цей гравець не може використовувати пустий жетон в цьому раунді.', status: 'pool' },

    // ЄДИНОРІГ (Територія Єдинорога)
    { id: 'unicorn-1', regionId: 'Територія Єдинорога', title: 'Підкріплення', description: 'Виберіть дві картки армії у вашому скиді і верніть його у ваш актив (у ширму). Потім виберіть 2 жетони битви і або викиньте їх у скид або розмістіть у ваш запас.', status: 'pool' },
    { id: 'unicorn-2', regionId: 'Територія Єдинорога', title: 'Культурний обмін', description: 'Виберіть провінцію під вашим контролем і провінцію під контролем вашого супротивника і поміняйте всі жетони контролю місцями після чого власність провінцій теж поміняється.', status: 'pool' },

    
    // ТІНЬОВІ ЗЕМЛІ (Територія Тіньових Земель) — оскільки в базі це один регіон на дві провінції, розіб'ємо на дві карти під цей regionId
    { id: 'nords-shadowlands-1', regionId: 'Територія північних Тіньових Земель', title: 'Вбивство слабких', description: 'Скиньте карту битви з вашого активу в скид, в цьому ході ви не можете розміщувати карти атаки, потім виберіть 2 любих намета ворогів на карті і відправте їх у скид.', status: 'pool' },
    { id: 'nords-shadowlands-2', regionId: 'Територія північних Тіньових Земель', title: 'Контракт з дияволом', description: 'Заберіть один жетон контролю з вашої провінції  (крім тіньових земель), потім відкрийте 4 ворожі намети на карті, і виберіть один з них який піде у скид.', status: 'pool' },

    { id: 'south-shadowlands-1', regionId: 'Територія південних Тіньових Земель', title: 'Воскресіння мертвих', description: 'Заберіть один жетон контролю з вашої провінції і скиньте його в скид, після чого з скиду виберіть картку атаки і помістіть на карту гри.', status: 'pool' },
    { id: 'south-shadowlands-2', regionId: 'Територія південних Тіньових Земель', title: 'Влада жаху', description: 'Заберіть ваш жетон контролю з любої вашої провінції після чого можете забрати особливі жетони з карти.', status: 'pool' },

    // ОСТРОВИ ШОВКОВИХ ШЛЯХІВ
    { id: 'silk-1', regionId: 'Острови Шовкових Шляхів', title: 'Піратські набіги', description: 'Виберіть любу провінцію, і помістіть у неї жетон випаленої землі. Якщо провінція Ваша — помістіть 3 жетони контролю в іншу вашу провінцію.', status: 'pool' },
    { id: 'silk-2', regionId: 'Острови Шовкових Шляхів', title: 'Процвітання', description: 'Виберіть 1 провíнцiю (крiм тiньових земель) i помiстiть туди +2 бонуси честi.', status: 'pool' },

    // УЗБЕРЕЖЖЯ ТОРГОВЦІВ
    { id: 'merchant-1', regionId: 'Узбережжя Торговців', title: 'Народне ополчення', description: 'Виберіть 2 провінції (крім тіньових земель) і помістіть в кожну з них +1 до жетонів захисту.', status: 'pool' },
    { id: 'merchant-2', regionId: 'Узбережжя Торговців', title: 'Багатий Врожай', description: 'Виберіть провінцію під вашим контролем і помістіть туди 2 жетони контролю.', status: 'pool' }
  ];

  // Стан виконання карти регіону Рокіровка
  public rokirovkaEffect: {
    cardId: string;
    clan: string;
    step: 'select_from_discard' | 'select_from_hand';
    selectedDiscardToken?: any;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Вихід до моря"
  public harborEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Дипломатична місія"
  public diplomacyEffect: {
    cardId: string;
    clan: string;
    step: 'select_target_province' | 'select_first_own_province' | 'select_second_own_province';
    targetProvinceId?: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Кодекс честі"
  public honorCodeEffect: {
    cardId: string;
    clan: string;
    step: 'select_first_province' | 'select_second_province';
    firstProvinceId?: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Благословенна земля"
  public shrineEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;
  // Стан виконання карти регіону "Рух до цілі"
  public targetMovementEffect: {
    cardId: string;
    clan: string;
    step: 'select_first_province' | 'select_second_province';
    firstProvinceId?: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Бусідо"
  public bushidoEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Шляхетна битва"
  public gloryEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Підтримка Камі"
  public kamiSupportEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Очищення"
  public cleansingEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Вогні повстання"
  public firesOfRebellionEffect: {
    cardId: string;
    clan: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  public spyNetworkEffect: {
    cardId: string;
    clan: string; // Клан Скорпіона, що розігрує карту
    step: 'select_target_clan' | 'view_hand';
    targetClan: string | null;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Підкріплення" (Єдиноріг)
  public reinforcementEffect: {
    cardId: string;
    clan: string;
    step: 'select_two_from_discard' | 'select_two_from_hand';
    selectedTokens: any[]; // Дві вибрані карти армії зі скиду
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Культурний обмін"
  public culturalExchangeEffect: {
    cardId: string;
    clan: string;
    step: 'select_own_province' | 'select_enemy_province';
    ownProvinceId?: string;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Стан виконання карти регіону "Воскресіння мертвих" (Південні Тіньові Землі)
  public resurrectionEffect: {
    cardId: string;
    clan: string;
    step: 'select_province_for_sacrifice' | 'select_card_from_discard' | 'place_on_map';
    sacrificedProvinceId?: string;
    selectedAttackCard?: any;
    timer: number;
    timerInterval?: any;
  } | null = null;

  // Активні картки регіонів, задіяні в поточній партії (по 1 на кожен регіон)
  private activeGameRegionCards: RegionCard[] = [];

  constructor(private ngZone: NgZone) {}

  // Ініціалізація партії: вибирає випадково по 1 карті на кожен унікальний регіон
  initializeNewGameRegionCards(): void {
    const regionsMap = new Map<string, RegionCard[]>();

    // Групуємо всі карти за регіонами
    this.allRegionCards.forEach(card => {
      if (!regionsMap.has(card.regionId)) {
        regionsMap.set(card.regionId, []);
      }
      regionsMap.get(card.regionId)!.push(card);
    });

    this.activeGameRegionCards = [];

    // Для кожного регіону випадково вибираємо рівно 1 карту
    regionsMap.forEach((cards, regionId) => {
      const randomIndex = Math.floor(Math.random() * cards.length);
      const selectedCard = { ...cards[randomIndex], status: 'pool' as const, ownerClan: null };
      this.activeGameRegionCards.push(selectedCard);
    });
  }

  // Отримати активні картки регіонів поточної гри
  getActiveRegionCards(): RegionCard[] {
    return this.activeGameRegionCards;
  }
  /**
   * Відновлює стан активних карток регіонів із завантаженого сейву
   */
  setActiveRegionCards(cards: RegionCard[]): void {
    if (Array.isArray(cards)) {
      this.activeGameRegionCards = cards;
    }
  }

  // Перевірка володіння регіоном (викликається при зміні контролю провінцій)
  // Якщо клан контролює ВСІ провінції певного регіону, він отримує активну карту цього регіону
  // Оновлений метод для перевірки регіонів по всій мапі для всіх кланів
  updateRegionControl(provinces: { [id: string]: any }, playersMap: { [clan: string]: any }): void {
    if (!provinces || !playersMap) return;

    const activeClans = Object.keys(playersMap);
    
    // Спершу скидаємо в пул ті карти, чиї власники більше не контролюють весь регіон
    this.activeGameRegionCards.forEach(card => {
      if (card.status === 'owned' && card.ownerClan) {
        const owner = card.ownerClan;
        // Перевіряємо, чи цей клан досі володіє всіма провінціями цього регіону
        const regionProvIds = Object.values(provinces)
          .filter((p: any) => p.regionId === card.regionId)
          .map((p: any) => p.id);
        
        const controlsAll = regionProvIds.length > 0 && regionProvIds.every(id => provinces[id]?.controllingClan === owner);
        
        if (!controlsAll) {
          card.status = 'pool';
          card.ownerClan = null;
        }
      }
    });

    // Тепер перевіряємо, чи якийсь клан повністю захопив новий регіон
    activeClans.forEach(clan => {
      const regionProvinces = new Map<string, { total: number; controlledByClan: number }>();

      Object.values(provinces).forEach((p: any) => {
        if (!p || !p.regionId) return;
        if (!regionProvinces.has(p.regionId)) {
          regionProvinces.set(p.regionId, { total: 0, controlledByClan: 0 });
        }
        const data = regionProvinces.get(p.regionId)!;
        data.total++;
        if (p.controllingClan === clan) {
          data.controlledByClan++;
        }
      });

      regionProvinces.forEach((data, regionId) => {
        const card = this.activeGameRegionCards.find(c => c.regionId === regionId);
        if (!card) return;

        // Якщо клан контролює всі провінції регіону і карта зараз в пулі
        if (data.total > 0 && data.controlledByClan === data.total && card.status === 'pool') {
          card.status = 'owned';
          card.ownerClan = clan;
        }
      });
    });
  }

  // Використання карти регіону гравцем (переходить у статус 'discarded')
  useRegionCard(cardId: string, clan: string): boolean {
    const card = this.activeGameRegionCards.find(c => c.id === cardId);
    if (card && card.status === 'owned' && card.ownerClan === clan) {
      card.status = 'discarded';
      card.ownerClan = null;
      return true;
    }
    return false;
  }
  // Отримати кількість карт регіонів, які зараз на руках у конкретного клану
  getOwnedCardsCountForClan(clan: string): number {
    return this.activeGameRegionCards.filter(
      card => card.status === 'owned' && card.ownerClan === clan
    ).length;
  }
  /**
   * Запуск ефекту Рокіровки
   */
  startRokirovkaEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.rokirovkaEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_from_discard',
      timer: 10
    };
    // Запускаємо 10-секундний таймер через NgZone, щоб він оновлював UI незалежно від руху мишки
    if (this.rokirovkaEffect.timerInterval) clearInterval(this.rokirovkaEffect.timerInterval);
    // Запускаємо 10-секундний таймер
    this.rokirovkaEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.rokirovkaEffect && this.rokirovkaEffect.timer > 0) {
          this.rokirovkaEffect.timer--;
        } else {
          // Таймер добіг до 0 у модалці скиду: закриваємо ширму і списуємо карту регіону
          if (this.rokirovkaEffect) {
            const cardId = this.rokirovkaEffect.cardId;
            const clan = this.rokirovkaEffect.clan;
            this.useRegionCard(cardId, clan); // карта регіону зникає / використовується
          }
          this.cancelRokirovkaEffect();
          this.closeRokirovkaModalSubject.next(); // повідомляємо підписників, що модалка закрилася
          onTimeout();
        }

      });
    }, 1000);

    return true;
  }

  /**
   * Крок 1: Гравець вибрав картку зі скиду (Армія, Флот, Шинобі)
   */
  selectCardFromDiscard(token: any, gameState: any): void {
    if (!this.rokirovkaEffect) return;
    
    const clan = this.rokirovkaEffect.clan;
    const player = gameState.players[clan];
    if (!player) return;

    // 1. Видаляємо картку зі скиду
    player.discardPile = player.discardPile.filter((t: any) => t.id !== token.id);

    // 2. Додаємо в активну руку (ширму) з прапорцем для зеленої обводки
    const highlightedToken = { ...token, isNewlyAdded: true } as any;
    player.activeHandTokens.push(highlightedToken);
    // 3. ПОЗНАЧАЄМО КАРТУ РЕГІОНУ ЯК ВИКОРИСТАНУ (ВХОДИТЬ У DISCARDED)
    this.useRegionCard(this.rokirovkaEffect.cardId, clan);

    // 3. Повністю закриваємо ефект Рокіровки (модалка скиду закриється, відкриється ширма player-screen)
    this.cancelRokirovkaEffect();
    this.closeRokirovkaModalSubject.next();
  }

  /**
   * Крок 2: Завершення Рокіровки (вибір карти з ширми для скиду або запасу)
   */
  completeRokirovkaEffect(handTokenToDiscard: any, gameState: any): void {
    if (!this.rokirovkaEffect) return;

    const clan = this.rokirovkaEffect.clan;
    const player = gameState.players[clan];

    if (player && handTokenToDiscard) {
      // 1. Видаляємо обрану карту з ширми (ту, яку гравець клікнув на кроці 8)
      player.activeHandTokens = player.activeHandTokens.filter((t: any) => t.id !== handTokenToDiscard.id);

      // 2. Відправляємо її у скид
      player.discardPile.push(handTokenToDiscard);

      // 3. Знімаємо мітку newlyAdded з поверненої карти, щоб підсвічування зникло або залишалось за бажанням
      player.activeHandTokens.forEach((t: any) => {
        delete t.isNewlyAdded;
      });

      gameState.roundLog.push(`⛩️ Клан ${clan} успішно завершив рокіровку.`);
    }

    this.cancelRokirovkaEffect();
  }

  /**
   * Скасування / згорання ефекту (якщо час вийшов)
   */
  cancelRokirovkaEffect(): void {
    // if (this.rokirovkaEffect) {
    //   // Якщо час вийшов і гравець нічого не вибрав — карта регіону все одно вважається використаною (зникає)
    //   this.useRegionCard(this.rokirovkaEffect.cardId, this.rokirovkaEffect.clan);
    // }
    if (this.rokirovkaEffect && this.rokirovkaEffect.timerInterval) {
      clearInterval(this.rokirovkaEffect.timerInterval);
    }
    this.rokirovkaEffect = null;
    this.closeRokirovkaModalSubject.next(); // Закриваємо модалку при відмініі
  }

  /* Карта регіону  ВИХІД ДО МОРЯ */
  startHarborEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.harborEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.harborEffect.timerInterval) {
      clearInterval(this.harborEffect.timerInterval);
    }

    this.harborEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.harborEffect && this.harborEffect.timer > 0) {
          this.harborEffect.timer--;
        } else {
          // Час вийшов: списуємо картку регіону
          if (this.harborEffect) {
            this.useRegionCard(this.harborEffect.cardId, this.harborEffect.clan);
          }
          this.cancelHarborEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next(); // Використовуємо наш потік для оновлення UI
      });
    }, 1000);

    return true;
  }

  cancelHarborEffect(): void {
    if (this.harborEffect && this.harborEffect.timerInterval) {
      clearInterval(this.harborEffect.timerInterval);
    }
    this.harborEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeHarborEffect(provinceId: string, gameState: any): void {
    if (!this.harborEffect) return;

    const { cardId, clan } = this.harborEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Робимо провінцію прибережною та додаємо іконку порту
      province.isCoastal = true;
      province.hasHarbor = true;
      
      gameState.roundLog.print?.(`⚓ Клан ${clan} побудував порт у провінції ${province.name}! Тепер вона прибережна.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelHarborEffect();
  }

  /* Карта регіону  ДИПЛОМАТИЧНА МІСІЯ */
  startDiplomacyEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.diplomacyEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_target_province',
      timer: 10
    };

    if (this.diplomacyEffect.timerInterval) {
      clearInterval(this.diplomacyEffect.timerInterval);
    }

    this.diplomacyEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.diplomacyEffect && this.diplomacyEffect.timer > 0) {
          this.diplomacyEffect.timer--;
        } else {
          // Час вийшов: списуємо картку регіону
          if (this.diplomacyEffect) {
            this.useRegionCard(this.diplomacyEffect.cardId, this.diplomacyEffect.clan);
          }
          this.cancelDiplomacyEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelDiplomacyEffect(): void {
    if (this.diplomacyEffect && this.diplomacyEffect.timerInterval) {
      clearInterval(this.diplomacyEffect.timerInterval);
    }
    this.diplomacyEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /* Карта регіону  КОДЕКС ЧЕСТІ */
  startHonorCodeEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.honorCodeEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_first_province',
      timer: 10
    };

    if (this.honorCodeEffect.timerInterval) {
      clearInterval(this.honorCodeEffect.timerInterval);
    }

    this.honorCodeEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.honorCodeEffect && this.honorCodeEffect.timer > 0) {
          this.honorCodeEffect.timer--;
        } else {
          if (this.honorCodeEffect) {
            this.useRegionCard(this.honorCodeEffect.cardId, this.honorCodeEffect.clan);
          }
          this.cancelHonorCodeEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelHonorCodeEffect(): void {
    if (this.honorCodeEffect && this.honorCodeEffect.timerInterval) {
      clearInterval(this.honorCodeEffect.timerInterval);
    }
    this.honorCodeEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /* Карта регіону  БЛАГОСЛОВЕННА ЗЕМЛЯ */
  startShrineEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.shrineEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.shrineEffect.timerInterval) {
      clearInterval(this.shrineEffect.timerInterval);
    }

    this.shrineEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.shrineEffect && this.shrineEffect.timer > 0) {
          this.shrineEffect.timer--;
        } else {
          if (this.shrineEffect) {
            this.useRegionCard(this.shrineEffect.cardId, this.shrineEffect.clan);
          }
          this.cancelShrineEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelShrineEffect(): void {
    if (this.shrineEffect && this.shrineEffect.timerInterval) {
      clearInterval(this.shrineEffect.timerInterval);
    }
    this.shrineEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeShrineEffect(provinceId: string, gameState: any): void {
    if (!this.shrineEffect) return;

    const { cardId, clan } = this.shrineEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Ставимо жетон святині та робимо провінцію своєю (або залишаємо контроль гравця)
      province.hasShrine = true;
      province.controllingClan = clan as any;

      gameState.roundLog.push(`⛩️ Клан ${clan} звів святиню у провінції ${province.name}! Цю землю тепер не можна атакувати.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelShrineEffect();
  }

  /* Карта регіону  РУХ ДО ЦІЛІ */
  startTargetMovementEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.targetMovementEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_first_province',
      timer: 10
    };

    if (this.targetMovementEffect.timerInterval) {
      clearInterval(this.targetMovementEffect.timerInterval);
    }

    this.targetMovementEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.targetMovementEffect && this.targetMovementEffect.timer > 0) {
          this.targetMovementEffect.timer--;
        } else {
          if (this.targetMovementEffect) {
            this.useRegionCard(this.targetMovementEffect.cardId, this.targetMovementEffect.clan);
          }
          this.cancelTargetMovementEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelTargetMovementEffect(): void {
    if (this.targetMovementEffect && this.targetMovementEffect.timerInterval) {
      clearInterval(this.targetMovementEffect.timerInterval);
    }
    this.targetMovementEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /* Карта регіону  БУСІДО */
  startBushidoEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.bushidoEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.bushidoEffect.timerInterval) {
      clearInterval(this.bushidoEffect.timerInterval);
    }

    this.bushidoEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.bushidoEffect && this.bushidoEffect.timer > 0) {
          this.bushidoEffect.timer--;
        } else {
          if (this.bushidoEffect) {
            this.useRegionCard(this.bushidoEffect.cardId, this.bushidoEffect.clan);
          }
          this.cancelBushidoEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelBushidoEffect(): void {
    if (this.bushidoEffect && this.bushidoEffect.timerInterval) {
      clearInterval(this.bushidoEffect.timerInterval);
    }
    this.bushidoEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeBushidoEffect(provinceId: string, gameState: any): void {
    if (!this.bushidoEffect) return;

    const { cardId, clan } = this.bushidoEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Встановлюємо значення очок честі рівно на 4
      province.honorFlowers = 4;

      gameState.roundLog.push(`🦁 Бусідо застосовано: честь провінції ${province.name} встановлено на рівно 4.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelBushidoEffect();
  }
  /* Карта регіону  ШЛЯХЕТНА БИТВА */
  startGloryEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.gloryEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.gloryEffect.timerInterval) {
      clearInterval(this.gloryEffect.timerInterval);
    }

    this.gloryEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.gloryEffect && this.gloryEffect.timer > 0) {
          this.gloryEffect.timer--;
        } else {
          if (this.gloryEffect) {
            this.useRegionCard(this.gloryEffect.cardId, this.gloryEffect.clan);
          }
          this.cancelGloryEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelGloryEffect(): void {
    if (this.gloryEffect && this.gloryEffect.timerInterval) {
      clearInterval(this.gloryEffect.timerInterval);
    }
    this.gloryEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeGloryEffect(provinceId: string, gameState: any): void {
    if (!this.gloryEffect) return;

    const { cardId, clan } = this.gloryEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Розміщуємо жетон Слави та очищаємо старі статуси Миру/Погрому (замінюємо їх)
      province.hasGlory = true;
      province.hasPeaceToken = false;
      province.hasScorchedEarth = false;

      gameState.roundLog.push(`🦁 Шляхетна битва: на провінції ${province.name} встановлено жетон Слави. Попередні жетони миру чи погрому скасовано.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelGloryEffect();
  }

  // Карта регіону  ПІДТРИМКА КАМІ
  startKamiSupportEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.kamiSupportEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.kamiSupportEffect.timerInterval) {
      clearInterval(this.kamiSupportEffect.timerInterval);
    }

    this.kamiSupportEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.kamiSupportEffect && this.kamiSupportEffect.timer > 0) {
          this.kamiSupportEffect.timer--;
        } else {
          if (this.kamiSupportEffect) {
            this.useRegionCard(this.kamiSupportEffect.cardId, this.kamiSupportEffect.clan);
          }
          this.cancelKamiSupportEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelKamiSupportEffect(): void {
    if (this.kamiSupportEffect && this.kamiSupportEffect.timerInterval) {
      clearInterval(this.kamiSupportEffect.timerInterval);
    }
    this.kamiSupportEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeKamiSupportEffect(provinceId: string, gameState: any): void {
    if (!this.kamiSupportEffect) return;

    const { cardId, clan } = this.kamiSupportEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Додаємо +2 до захисту (controlTokensFaceUp)
      province.controlTokensFaceUp += 2;

      gameState.roundLog.push(`🔥 Підтримка Камі: у провінції ${province.name} збільшено захист на +2 завдяки божественній благодаті.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelKamiSupportEffect();
  }

  /* Карта регіону  ОЧИЩЕННЯ */
  startCleansingEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.cleansingEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.cleansingEffect.timerInterval) {
      clearInterval(this.cleansingEffect.timerInterval);
    }

    this.cleansingEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.cleansingEffect && this.cleansingEffect.timer > 0) {
          this.cleansingEffect.timer--;
        } else {
          if (this.cleansingEffect) {
            this.useRegionCard(this.cleansingEffect.cardId, this.cleansingEffect.clan);
          }
          this.cancelCleansingEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelCleansingEffect(): void {
    if (this.cleansingEffect && this.cleansingEffect.timerInterval) {
      clearInterval(this.cleansingEffect.timerInterval);
    }
    this.cleansingEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeCleansingEffect(provinceId: string, clan: string, gameState: any): void {
    if (!this.cleansingEffect) return;

    const { cardId } = this.cleansingEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Знімаємо попіл/погром і робимо провінцію підконтрольною гравцю з +2 захисту
      province.hasScorchedEarth = false;
      province.controllingClan = clan as any;
      province.controlTokensFaceUp = (province.controlTokensFaceUp || 0) + 2;

      gameState.roundLog.push(`✨ Очищення: провінцію ${province.name} очищено від погрому. Клан ${clan} встановив там контроль і +2 захисту.`);

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelCleansingEffect();
  }

  /* Карта регіону  ВОГНІ ПОВСТАННЯ */
  startFiresOfRebellionEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.firesOfRebellionEffect = {
      cardId: cardId,
      clan: clan,
      timer: 10
    };

    if (this.firesOfRebellionEffect.timerInterval) {
      clearInterval(this.firesOfRebellionEffect.timerInterval);
    }

    this.firesOfRebellionEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.firesOfRebellionEffect && this.firesOfRebellionEffect.timer > 0) {
          this.firesOfRebellionEffect.timer--;
        } else {
          if (this.firesOfRebellionEffect) {
            this.useRegionCard(this.firesOfRebellionEffect.cardId, this.firesOfRebellionEffect.clan);
          }
          this.cancelFiresOfRebellionEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelFiresOfRebellionEffect(): void {
    if (this.firesOfRebellionEffect && this.firesOfRebellionEffect.timerInterval) {
      clearInterval(this.firesOfRebellionEffect.timerInterval);
    }
    this.firesOfRebellionEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  completeFiresOfRebellionEffect(provinceId: string, clan: string, gameState: any): void {
    if (!this.firesOfRebellionEffect) return;

    const { cardId } = this.firesOfRebellionEffect;
    const province = gameState.provinces[provinceId];

    if (province) {
      // Знімаємо жетон миру
      province.hasPeaceToken = false;

      // Якщо провінція підконтрольна гравцю, додаємо 2 жетони захисту
      if (province.controllingClan === clan) {
        province.controlTokensFaceUp = (province.controlTokensFaceUp || 0) + 2;
        gameState.roundLog.push(`🔥 Вогні повстання: з провінції ${province.name} знято мир. Клан ${clan} контролює її, тому додано +2 захисту.`);
      } else {
        gameState.roundLog.push(`🔥 Вогні повстання: з провінції ${province.name} знято мир.`);
      }

      // Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelFiresOfRebellionEffect();
  }

  /* Карта регіону  ШПИГУНСЬКА МЕРЕЖА */
  startSpyNetworkEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.spyNetworkEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_target_clan',
      targetClan: null,
      timer: 10
    };

    if (this.spyNetworkEffect.timerInterval) {
      clearInterval(this.spyNetworkEffect.timerInterval);
    }

    this.spyNetworkEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.spyNetworkEffect && this.spyNetworkEffect.timer > 0) {
          this.spyNetworkEffect.timer--;
        } else {
          if (this.spyNetworkEffect) {
            this.useRegionCard(this.spyNetworkEffect.cardId, this.spyNetworkEffect.clan);
          }
          this.cancelSpyNetworkEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    // Обов'язково повідомляємо підписників про відкриття модалки
    this.closeRokirovkaModalSubject.next();
    return true;
  }

  cancelSpyNetworkEffect(): void {
    if (this.spyNetworkEffect && this.spyNetworkEffect.timerInterval) {
      clearInterval(this.spyNetworkEffect.timerInterval);
    }
    this.spyNetworkEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /* Карта регіону  Підкріплення */
  startReinforcementEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.reinforcementEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_two_from_discard',
      selectedTokens: [],
      timer: 10
    };

    if (this.reinforcementEffect.timerInterval) {
      clearInterval(this.reinforcementEffect.timerInterval);
    }

    this.reinforcementEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.reinforcementEffect && this.reinforcementEffect.timer > 0) {
          this.reinforcementEffect.timer--;
        } else {
          if (this.reinforcementEffect) {
            this.useRegionCard(this.reinforcementEffect.cardId, this.reinforcementEffect.clan);
          }
          this.cancelReinforcementEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    this.closeRokirovkaModalSubject.next();
    return true;
  }

  /**
   * Вибір картки армії зі скиду для Підкріплення (збираємо рівно 2)
   */
  selectReinforcementDiscardToken(token: any, gameState: any): void {
    if (!this.reinforcementEffect) return;

    // Перевіряємо, чи ця карта вже не була обрана
    if (this.reinforcementEffect.selectedTokens.some((t: any) => t.id === token.id)) return;

    this.reinforcementEffect.selectedTokens.push(token);

    // Якщо вибрали рівно 2 карти
    if (this.reinforcementEffect.selectedTokens.length === 2) {
      const clan = this.reinforcementEffect.clan;
      const player = gameState.players[clan];
      if (!player) return;

      // 1. Видаляємо обидві карти зі скиду і додаємо в активну руку з унікальним прапорцем підсвічування
      this.reinforcementEffect.selectedTokens.forEach(t => {
        player.discardPile = player.discardPile.filter((item: any) => item.id !== t.id);
        player.activeHandTokens.push({ ...t, isReinforcementAdded: true });
      });

      // 2. Списуємо картку регіону
      this.useRegionCard(this.reinforcementEffect.cardId, clan);

      // 3. Закриваємо модалку скиду і даємо сигнал відкрити ширму
      this.cancelReinforcementEffect();
    }
  }

  /**
   * Завершення Підкріплення (коли гравець у ширмі вибрав 2 карти і куди їх діти: discard / reserve)
   */
  completeReinforcementEffect(chosenTokens: any[], action: 'discard' | 'reserve', gameState: any, targetClan?: string): void {
    // Визначаємо клан (або з переданого параметра, або з поточного ефекту, або з активного гравця)
    const clan = targetClan || (this.reinforcementEffect ? this.reinforcementEffect.clan : null) || gameState.firstPlayerClan;
    const player = gameState.players[clan];
    
    if (!player || !chosenTokens || chosenTokens.length !== 2) {
      console.error('Помилка виконання Підкріплення: не знайдено гравця або обрано не 2 карти.');
      return;
    }

    chosenTokens.forEach(tokenToProcess => {
      // 1. Видаляємо карту з активної руки (ширми)
      player.activeHandTokens = player.activeHandTokens.filter((t: any) => t.id !== tokenToProcess.id);

      // Очищаємо службові мітки
      delete tokenToProcess.isReinforcementAdded;
      delete tokenToProcess.isNewlyAdded;

      // 2. Переносимо відповідно до вибору гравця
      if (action === 'discard') {
        if (!player.discardPile) player.discardPile = [];
        player.discardPile.push(tokenToProcess);
      } else if (action === 'reserve') {
        if (!player.deck) player.deck= [];
        player.deck.push(tokenToProcess);
      }
    });

    // 3. Очищаємо службовий прапорець у решти карт у ширмі
    player.activeHandTokens.forEach((t: any) => {
      delete t.isReinforcementAdded;
    });

    gameState.roundLog.push(`🦄 Клан ${clan} завершив «Підкріплення»: обрані карти перенесено у ${action === 'discard' ? 'скид' : 'запас'}.`);
    
    // Завершуємо та повністю очищаємо ефект регіону
    this.cancelReinforcementEffect();
  }

  cancelReinforcementEffect(): void {
    if (this.reinforcementEffect && this.reinforcementEffect.timerInterval) {
      clearInterval(this.reinforcementEffect.timerInterval);
    }
    this.reinforcementEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /* Карта регіону Культурний обмін */
  /* Карта регіону: КУЛЬТУРНИЙ ОБМІН (Єдиноріг) */
  startCulturalExchangeEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.culturalExchangeEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_own_province',
      timer: 10
    };

    if (this.culturalExchangeEffect.timerInterval) {
      clearInterval(this.culturalExchangeEffect.timerInterval);
    }

    this.culturalExchangeEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.culturalExchangeEffect && this.culturalExchangeEffect.timer > 0) {
          this.culturalExchangeEffect.timer--;
        } else {
          if (this.culturalExchangeEffect) {
            this.useRegionCard(this.culturalExchangeEffect.cardId, this.culturalExchangeEffect.clan);
          }
          this.cancelCulturalExchangeEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelCulturalExchangeEffect(): void {
    if (this.culturalExchangeEffect && this.culturalExchangeEffect.timerInterval) {
      clearInterval(this.culturalExchangeEffect.timerInterval);
    }
    this.culturalExchangeEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /**
   * Завершення Культурного обміну (обмін жетонами контролю та власністю між двома провінціями)
   */
  completeCulturalExchangeEffect(enemyProvinceId: string, gameState: any): void {
    if (!this.culturalExchangeEffect || !this.culturalExchangeEffect.ownProvinceId) return;

    const { cardId, clan, ownProvinceId } = this.culturalExchangeEffect;
    const ownProv = gameState.provinces[ownProvinceId];
    const enemyProv = gameState.provinces[enemyProvinceId];

    if (ownProv && enemyProv) {
      // 1. Зберігаємо старі значення для власної провінції гравця
      const tempControlTokens = ownProv.controlTokensFaceUp || 0;
      const tempClan = ownProv.controllingClan;
      const tempBaseDefense = ownProv.baseDefense || 0;

      // 2. Переносимо параметри ворожої провінції на власну
      ownProv.controlTokensFaceUp = enemyProv.controlTokensFaceUp || 0;
      ownProv.controllingClan = enemyProv.controllingClan;
      
      // Зберігаємо оригінальний базовий захист ворожої провінції (не чіпаємо звичайні провінції, роблячи їх базовий захист 0 або відповідно до типу)
      ownProv.baseDefense = enemyProv.isCapital ? 2 : (enemyProv.regionId?.includes('shadowlands') ? 1 : 0);
      // Якщо це була столиця або тіньові землі, залишаємо їхню базову силу, інакше для звичайної провінції ставимо 0

      // 3. Переносимо параметри власної провінції на колишню ворожу
      enemyProv.controlTokensFaceUp = tempControlTokens;
      enemyProv.controllingClan = tempClan;
      enemyProv.baseDefense = ownProv.isCapital ? 2 : (ownProv.regionId?.includes('shadowlands') ? 1 : 0);

      gameState.roundLog.push(`🦄 Культурний обмін: клан ${clan} помінявся володінням та жетонами контролю між провінціями ${ownProv.name} та ${enemyProv.name}!`);

      // 4. Списуємо картку регіону
      this.useRegionCard(cardId, clan);
    }

    this.cancelCulturalExchangeEffect();
  }

  /*Карта регіону "Воскресіння мертвих (Південні Тіньові Землі) */
  /* Карта регіону: ВОСКРЕСІННЯ МЕРТВИХ (Південні Тіньові Землі) */
  startResurrectionEffect(cardId: string, clan: string, onTimeout: () => void): boolean {
    this.resurrectionEffect = {
      cardId: cardId,
      clan: clan,
      step: 'select_province_for_sacrifice',
      timer: 10
    };

    if (this.resurrectionEffect.timerInterval) {
      clearInterval(this.resurrectionEffect.timerInterval);
    }

    this.resurrectionEffect.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (this.resurrectionEffect && this.resurrectionEffect.timer > 0) {
          this.resurrectionEffect.timer--;
        } else {
          if (this.resurrectionEffect) {
            this.useRegionCard(this.resurrectionEffect.cardId, this.resurrectionEffect.clan);
          }
          this.cancelResurrectionEffect();
          onTimeout();
        }
        this.closeRokirovkaModalSubject.next();
      });
    }, 1000);

    return true;
  }

  cancelResurrectionEffect(): void {
    if (this.resurrectionEffect && this.resurrectionEffect.timerInterval) {
      clearInterval(this.resurrectionEffect.timerInterval);
    }
    this.resurrectionEffect = null;
    this.closeRokirovkaModalSubject.next();
  }

  /**
   * Крок 1: Жертвуємо жетон контролю з провінції і переходимо до вибору карти зі скиду
   */
  sacrificeTokenForResurrection(provinceId: string, gameState: any): void {
    if (!this.resurrectionEffect) return;

    const province = gameState.provinces[provinceId];
    if (!province) return;

    // Визначаємо вартість пожертви: для Краба — 2, для інших — 1
    const sacrificeCost = province.controllingClan === 'Crab' ? 2 : 1;

    // Перевіряємо, чи достатньо жетонів на провінції для пожертви
    const currentTokens = province.controlTokensFaceUp || 0;
    if (currentTokens < sacrificeCost) {
      return; // Жетонів замало для пожертви
    }

    // Віднімаємо жетони захисту
    province.controlTokensFaceUp -= sacrificeCost;

    // Якщо після зняття жетонів додатковий захист став 0 або менше, провінція стає нейтральною
    if (province.controlTokensFaceUp <= 0) {
      province.controlTokensFaceUp = 0;
      province.controllingClan = 'Neutral';
      // Скидаємо базовий захист до дефолтного (якщо це була не столиця)
      if (!province.isCapital) {
        province.baseDefense = province.regionId?.includes('shadowlands') ? 1 : 0;
      }
    }

    this.resurrectionEffect.sacrificedProvinceId = provinceId;
    this.resurrectionEffect.step = 'select_card_from_discard';

    gameState.roundLog.push(`💀 Воскресіння мертвих: з провінції ${province.name} знято ${sacrificeCost} жетон(и) контролю для ритуалу.`);
    
    // Закриваємо модалку мапи та відкриваємо вибір зі скиду
    this.closeRokirovkaModalSubject.next();
  }

  /**
   * Крок 2: Вибір картки атаки зі скиду та перенесення її в активну руку
   */
  selectCardFromDiscardForResurrection(token: any, gameState: any, gameStateService: any): void {
    if (!this.resurrectionEffect) return;

    const clan = this.resurrectionEffect.clan;
    const player = gameState.players[clan];
    if (!player) return;

    // 1. Видаляємо картку зі скиду
    player.discardPile = player.discardPile.filter((t: any) => t.id !== token.id);

    // 2. Робимо цю карту поточною вибраною картою для розміщення (як через gameStateService.setSelectedToken)
    // Зберігаємо її початкову силу, якщо потрібно
    const resurrectionCard = { ...token, isResurrected: true };
    gameStateService.setSelectedToken(resurrectionCard);

    // 3. Списуємо картку регіону
    this.useRegionCard(this.resurrectionEffect.cardId, clan);

    gameState.roundLog.push(`💀 Воскресіння мертвих: карту ${token.type} забрано зі скиду. Оберіть провінцію на мапі для її розміщення.`);

    // 4. Повністю закриваємо ефект Воскресіння
    this.cancelResurrectionEffect();
  }
}
