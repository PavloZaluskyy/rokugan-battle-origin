// 1. Перелік усіх 7 Великих Кланів Рокугану + Нейтральні сили
export type ClanType = 'Crab' | 'Crane' | 'Dragon' | 'Lion' | 'Phoenix' | 'Scorpion' | 'Unicorn' | 'Neutral';

// 2. Типи жетонів битви (згідно з правилами гри)
export type BattleTokenType = 'Army' | 'Navy' | 'Shinobi' | 'Blessing' | 'Diplomacy' | 'Raid' | 'Blank';

// 3. Інтерфейс для Жетона Битви
export interface BattleToken {
  id: string;             // Унікальний ID жетона (наприклад, 'crab-army-1')
  clan: ClanType;         // Якому клану належить
  type: BattleTokenType;  // Тип жетона
  strength: number;       // Сила жетона (0 для пустих, дипломатії, погрому)
}

// 4. Типи особливих жетонів, що змінюють статус провінції
export type SpecialTokenType = 'Peace' | 'ScorchedEarth' | 'Shrine' | 'Glory' | 'Harbor' | 'None';

// 5. Інтерфейс для Провінції (одиниці карти)
export interface Province {
  id: string;               // Ідентифікатор (наприклад, 'province-1', 'shadowlands-north')
  name: string;             // Назва провінції
  regionId: string;         // До якого регіону (кольору) належить
  isCoastal: boolean;       // Чи є прибрежною (для атак флоту)
  isCapital: boolean;       // Чи це столиця клану
  capitalOf?: ClanType;     // Якщо столиця, то якого саме клану
  baseDefense: number;      // Вбудований захист на карті
  honorFlowers: number;     // Кількість квіток честі (очки)
  placedTokens: PlacedToken[]; // Усі викладені жетони на цій провінції
  
  // Динамічний стан під час гри:
  controllingClan: ClanType;    // Хто зараз контролює
  controlTokensFaceUp: number;  // Кількість жетонів контролю горілиць (+1 до захисту кожен)
  specialToken: SpecialTokenType; // Особливий жетон (Мир, Випалена земля тощо)

  hasPeaceToken?: boolean;          // Маркер Миру (від Дипломатії)
  hasScorchedEarth?: boolean;       // Випалена земля (від Погрому)
  hasShrine?: boolean;              // Святиня
  hasGlory?: boolean;               // Слава
  hasHarbor?: boolean;              // Гавань (робить материкову провінцію прибережною)
  blessedTokenId?: string;          // ID жетона, на який покладено Благословення

  imageUrl?: string;                // Шлях до унікальної мініатюри замку/міста
  x?: number; // Координата X у відсотках (0 - 100)
  y?: number; // Координата Y у відсотках (0 - 100)
}

// 6. Стан конкретного гравця (Клана)
export interface PlayerState {
  clan: ClanType;
  honorPoints: number;
  isFirstPlayer: boolean;
  isRonin: boolean;
  secretObjectiveCardId: string | null;
  
  // Пули жетонів:
  combatTokenPool: BattleToken[]; // Жетони, що ще лежать у мішку (лицевою вниз)
  activeHandTokens: BattleToken[]; // Жетони за ширмою (актив на раунд, максимум 6)
  deck: BattleToken[]; // Скинуті (використані) жетони
  remainingControlTokens: number; // Скільки жетонів контролю залишилось у запасі
  discardPile: BattleToken[]; // Скид використаних карток
}

// 7. Головний інтерфейс усього стану гри (це те, що ми будемо зберігати)
export interface GameState {
  gameId: string;
  currentRound: number; // Від 1 до 5
  currentPhase: 'Planning' | 'Placement' | 'Execution'; // Фази раунду
  firstPlayerClan: ClanType;
  provinces: { [id: string]: Province }; // Словник усіх провінцій на карті
  players: { [clan in Exclude<ClanType, 'Neutral'>]?: PlayerState }; // Дані живих гравців
  roundLog: string[]; // Історія подій
}
export interface PlacedToken {
  strength: number;
  id: string;
  clan: ClanType;
  token: BattleToken;
  isFaceUp: boolean; // false під час розміщення, true у фазі виконання
}
export type GamePhase = 'Regroup' | 'Placement' | 'Execution';