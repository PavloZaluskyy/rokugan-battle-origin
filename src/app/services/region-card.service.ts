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
    { id: 'shadowlands-1', regionId: 'Територія північних Тіньових Земель', title: 'Воскресіння мертвих / Вбивство слабких', description: 'Заберіть один жетон контролю з вашої провінції і скиньте його в скид, після чого з скиду виберіть картку атаки і помістіть на карту гри.', status: 'pool' },
    { id: 'shadowlands-2', regionId: 'Територія південних Тіньових Земель', title: 'Влада жаху / Контракт з дияволом', description: 'Заберіть ваш жетон контролю з любої вашої провінції після чого можете забрати особливі жетони з карти.', status: 'pool' },

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
}
