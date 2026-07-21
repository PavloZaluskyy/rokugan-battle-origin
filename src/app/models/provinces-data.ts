import { Province } from './game.model';

export const ORIGINAL_PROVINCES: Province[] = [
  // ==========================================
  // 🦀 КЛАН КРАБА (Crab Territory)
  // ==========================================
  {
    id: 'crab-capital',
    name: 'Хіда',
    regionId: 'Територія Краба',
    isCoastal: true,
    isCapital: true,
    capitalOf: 'Crab',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Crab',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'crab-sub-1',
    name: 'Ясукі',
    regionId: 'Територія Краба',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 2,
    controllingClan: 'Crab',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'crab-sub-2',
    name: 'Стіна Кайтоку',
    regionId: 'Територія Краба',
    isCoastal: true,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 3,
    controllingClan: 'Crab',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'crab-sub-3',
    name: 'Куні',
    regionId: 'Територія Краба',
    isCoastal: true,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 1,
    controllingClan: 'Crab',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🪶 КЛАН ЖУРАВЛЯ (Crane Territory)
  // ==========================================
  {
    id: 'crane-capital',
    name: 'Доджі',
    regionId: 'Територія Журавля',
    isCoastal: true,
    isCapital: true,
    capitalOf: 'Crane',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Crane',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'crane-sub-1',
    name: 'Дайдоджі',
    regionId: 'Територія Журавля',
    isCoastal: true,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 3,
    controllingClan: 'Crane',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'crane-sub-2',
    name: 'Асахіна',
    regionId: 'Територія Журавля',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 2,
    controllingClan: 'Crane',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🐉 КЛАН ДРАКОНА (Dragon Territory)
  // ==========================================
  {
    id: 'dragon-capital',
    name: 'Тогаші',
    regionId: 'Територія Дракона',
    isCoastal: false,
    isCapital: true,
    capitalOf: 'Dragon',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Dragon',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'dragon-sub-1',
    name: 'Кинджальні гори',
    regionId: 'Територія Дракона',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 3,
    controllingClan: 'Dragon',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'dragon-sub-2',
    name: 'Мірумо',
    regionId: 'Територія Дракона',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 1,
    controllingClan: 'Dragon',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🦁 КЛАН ЛЕВА (Lion Territory)
  // ==========================================
  {
    id: 'lion-capital',
    name: 'Ікома',
    regionId: 'Територія Лева',
    isCoastal: false,
    isCapital: true,
    capitalOf: 'Lion',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Lion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'lion-sub-1',
    name: 'Акадо',
    regionId: 'Територія Лева',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 2,
    controllingClan: 'Lion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'lion-sub-2',
    name: 'Мацу',
    regionId: 'Територія Лева',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 2,
    controllingClan: 'Lion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🔥 КЛАН ФЕНІКСА (Phoenix Territory)
  // ==========================================
  {
    id: 'phoenix-capital',
    name: 'Асако',
    regionId: 'Територія Фенікса',
    isCoastal: false,
    isCapital: true,
    capitalOf: 'Phoenix',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Phoenix',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'phoenix-sub-1',
    name: 'Ісава',
    regionId: 'Територія Фенікса',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 2,
    controllingClan: 'Phoenix',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'phoenix-sub-2',
    name: 'Шіба',
    regionId: 'Територія Фенікса',
    isCoastal: true,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 1,
    controllingClan: 'Phoenix',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🦂 КЛАН СКОРПІОНА (Scorpion Territory)
  // ==========================================
  {
    id: 'scorpion-capital',
    name: 'Баюші',
    regionId: 'Територія Скорпіона',
    isCoastal: false,
    isCapital: true,
    capitalOf: 'Scorpion',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Scorpion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'scorpion-sub-1',
    name: 'Долина Тіней',
    regionId: 'Територія Скорпіона',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 3,
    controllingClan: 'Scorpion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'scorpion-sub-2',
    name: 'Шошуро',
    regionId: 'Територія Скорпіона',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 1,
    controllingClan: 'Scorpion',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🦄 КЛАН ЄДИНОРОГА (Unicorn Territory)
  // ==========================================
  {
    id: 'unicorn-capital',
    name: 'Шіньйо',
    regionId: 'Територія Єдинорога',
    isCoastal: false,
    isCapital: true,
    capitalOf: 'Unicorn',
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Unicorn',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'unicorn-sub-1',
    name: 'Рівнини Грому',
    regionId: 'Територія Єдинорога',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 3,
    controllingClan: 'Unicorn',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'unicorn-sub-2',
    name: 'Утаку',
    regionId: 'Територія Єдинорога',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 1,
    controllingClan: 'Unicorn',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 💀 ТЕНЕВІ ЗЕМЛІ ТА НЕЙТРАЛЬНІ РЕГІОНИ
  // ==========================================
  {
    id: 'shadowlands-north',
    name: 'Тіньові землі',
    regionId: 'Територія Тіньових Земель',
    isCoastal: false,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 0,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'shadowlands-south',
    name: 'Прокляті болота',
    regionId: 'Територія Тіньових Земель',
    isCoastal: true,
    isCapital: false,
    baseDefense: 1,
    honorFlowers: 0,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  
  // ==========================================
  // 🏝️ Острови Шовкових Шляхів (Унікальні ID)
  // ==========================================
  {
    id: 'silk-sun-island',
    name: 'Острів Сонця',
    regionId: 'Острови Шовкових Шляхів',
    isCoastal: true,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'silk-silkworm-island',
    name: 'Острів Шовкопряда',
    regionId: 'Острови Шовкових Шляхів',
    isCoastal: true,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 1,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'silk-golden-sand-island',
    name: 'Острів Золотого Піску',
    regionId: 'Острови Шовкових Шляхів',
    isCoastal: true,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 1,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },

  // ==========================================
  // 🌊 Узбережжя Торговців (Унікальні ID)
  // ==========================================
  {
    id: 'merchant-three-trees',
    name: 'Рівнина Трьох Дерев',
    regionId: 'Узбережжя Торговців',
    isCoastal: false,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 3,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'merchant-small-bay',
    name: 'Мала Бухта',
    regionId: 'Узбережжя Торговців',
    isCoastal: true,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  },
  {
    id: 'merchant-sunken-ships',
    name: 'Узбережжя Затонулих Кораблів',
    regionId: 'Узбережжя Торговців',
    isCoastal: true,
    isCapital: false,
    baseDefense: 2,
    honorFlowers: 2,
    controllingClan: 'Neutral',
    controlTokensFaceUp: 0,
    specialToken: 'None',
    placedTokens: []
  }
];