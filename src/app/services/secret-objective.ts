import { Injectable } from '@angular/core';
import { GameStateService } from './game-state.service';
import { PROVINCE_ADJACENCY } from '../models/provinces-data'; // Підключи правильний шлях до файлу сусіДностей, якщо він в окремому файлі
export interface SecretObjectiveModel {
  id: number;
  title: string;
  description: string;
  rewardHonor: number;
  // Функція перевірки виконання (будемо реалізовувати на етапі фіналу гри)
  checkCondition?: (gameState: any, playerClan: string) => boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SecretObjective {
  // Повний список 12 таємних цілей
  private allObjectives: SecretObjectiveModel[] = [
    {
      id: 1,
      title: 'Смарагдова Імперія',
      description: 'Якщо в кінці гри ви контролюєте ланцюжок з 6 послідовно сусідніх провінцій, котрі належать 3 різним регіонам.',
      rewardHonor: 10
    },
    {
      id: 2,
      title: 'Привселюдний Вплив',
      description: 'Якщо в кінці гри ви контролюєте хоча б по одній провінції в 7 різних регіонах.',
      rewardHonor: 10
    },
    {
      id: 3,
      title: 'Рисова миска імперії',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Журавля або 2 провінції в регіоні клану Журавля.',
      rewardHonor: 6
    },
    {
      id: 4,
      title: 'Останній рубіж оборони',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Краба або 2 провінції в регіоні клану Краба.',
      rewardHonor: 5
    },
    {
      id: 5,
      title: 'Скромність - ввічливість королів',
      description: 'Якщо в кінці гри ви контролюєте найменшу кількість провінцій (при нічії ціль також зараховується).',
      rewardHonor: 10
    },
    {
      id: 6,
      title: 'Велика бібліотека',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Фенікса або 2 провінції в регіоні клану Фенікса.',
      rewardHonor: 7
    },
    {
      id: 7,
      title: 'Поле битви',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Лева або 2 провінції в регіоні клану Лева.',
      rewardHonor: 7
    },
    {
      id: 8,
      title: 'Забуті краї',
      description: 'Якщо в кінці гри ви контролюєте Тіньові землі (обидві провінції).',
      rewardHonor: 3
    },
    {
      id: 9,
      title: 'Велика стіна Півдня',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Дракона або 2 провінції в регіоні клану Дракона.',
      rewardHonor: 6
    },
    {
      id: 10,
      title: 'Зберігання таємниць',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Скорпіона або 2 провінції в регіоні клану Скорпіона.',
      rewardHonor: 7
    },
    {
      id: 11,
      title: 'Володар морів',
      description: 'Якщо в кінці гри ви контролюєте 6 прибережних провінцій.',
      rewardHonor: 10
    },
    {
      id: 12,
      title: 'Знамення П\'яти вітрів',
      description: 'Якщо в кінці гри ви контролюєте столичну провінцію клану Єдинорога або 2 провінції в регіоні клану Єдинорога.',
      rewardHonor: 6
    }
  ];

  // Зберігання обраних цілей гравців у форматі { [clanName]: SecretObjective }
  private playerObjectives: { [clan: string]: SecretObjectiveModel } = {};

  constructor(private gameStateService: GameStateService) {}

  // Отримати випадкові 2 картки для вибору гравцю
  getRandomPair(): SecretObjectiveModel[] {
    const shuffled = [...this.allObjectives].sort(() => 0.5 - Math.random());
    return [shuffled[0], shuffled[1]];
  }

  // Зберегти вибрану ціль у загальний state гри та викликати saveGame()
  setPlayerObjective(clan: string, objective: SecretObjectiveModel): void {
    const state = this.gameStateService.getGameState();
    if (state) {
      if (!state.secretObjectives) {
        state.secretObjectives = {};
      }
      state.secretObjectives[clan] = objective;
      
      // Автоматично зберігаємо весь ігровий стан (разом із ціллю) у localStorage через твій метод
      this.gameStateService.saveGame();
    }
  }

  // Отримати таємну ціль гравця з поточного state гри
  getPlayerObjective(clan: string): SecretObjectiveModel | null {
    const state = this.gameStateService.getGameState();
    if (state && state.secretObjectives) {
      return state.secretObjectives[clan] || null;
    }
    return null;
  }
  // Головний метод перевірки цілі за її ID
  isObjectiveCompleted(objectiveId: number, gameState: any, clan: string): boolean {
    if (!gameState || !gameState.provinces) return false;

    switch (objectiveId) {
      case 1:
        return this.checkEmeraldEmpire(gameState, clan);
      case 2:
        return this.checkPublicInfluence(gameState, clan);
        // Універсальні цілі для кланів (Столиця або 2 провінції в регіоні)
      case 3: // Рисова миска імперії (Журавель / Crane)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Crane', 'Територія Журавля'); // Адаптуй назву регіону під свої дані у провінціях
      case 4: // Останній рубіж оборони (Краб / Crab)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Crab', 'Територія Краба');
      case 5:
        return this.checkModestyPoliteness(gameState, clan); // Додаємо перевірку цілі №5
      case 6: // Велика бібліотека (Фенікс / Phoenix)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Phoenix', 'Територія Фенікса');
      case 7: // Поле битви (Лев / Lion)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Lion', 'Територія Лева');
      case 8: // Забуті краї (Тіньові землі - обидві провінції)
        return this.checkForgottenRealms(gameState, clan);
      case 9: // Велика стіна Півдня (Дракон / Dragon)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Dragon', 'Територія Дракона');
      case 10: // Зберігання таємниць (Скорпіон / Scorpion)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Scorpion', 'Територія Скорпіона');
      case 11: // Володар морів (6 прибережних провінцій)
        return this.checkLordOfSeas(gameState, clan);
      case 12: // Знамення П'яти вітрів (Єдиноріг / Unicorn)
        return this.checkClanCapitalOrRegion(gameState, clan, 'Unicorn', 'Територія Єдинорога');
      default:
        return false;
    }
  }
  /// Перевірка цілі №1: Смарагдова Імперія (ланцюжок із 6 сусідніх провінцій, що належать до 3 різних регіонів)
  private checkEmeraldEmpire(gameState: any, clan: string): boolean {
    const provinces = gameState.provinces;
    
    // 1. Отримуємо ID всіх провінцій, які зараз контролює цей клан (controllingClan)
    const controlledProvinceIds = Object.keys(provinces).filter(id => {
      const p = provinces[id];
      return p && p.controllingClan === clan;
    });

    // Якщо менше 6 провінцій під контролем, ціль виконати неможливо
    if (controlledProvinceIds.length < 6) return false;

    // 2. Шукаємо зв'язний ланцюжок із 6 провінцій за допомогою пошуку в ширину/глибину (BFS/DFS)
    for (const startId of controlledProvinceIds) {
      const chain = this.findLongestChain(startId, controlledProvinceIds, provinces, new Set(), 6);
      
      if (chain.length >= 6) {
        // 3. Перевіряємо, чи входять провінції цього ланцюжка щонайменше в 3 різні регіони (regionId)
        const regions = new Set(chain.map(id => provinces[id].regionId));
        if (regions.size >= 3) {
          return true; // Ланцюжок знайдено! Ціль виконана.
        }
      }
    }

    return false;
  }

  // Рекурсивний пошук ланцюжка сусідніх провінцій з використанням PROVINCE_ADJACENCY
  private findLongestChain(currentId: string, controlledIds: string[], provinces: any, visited: Set<string>, targetLength: number): string[] {
    if (visited.size >= targetLength) return Array.from(visited);

    visited.add(currentId);
    let longestPath: string[] = Array.from(visited);

    // Отримуємо сусідів із глобального словника PROVINCE_ADJACENCY
    const neighbors = PROVINCE_ADJACENCY[currentId] || [];
    
    for (const neighborId of neighbors) {
      // Сусід має контролюватися цим же кланом і ще не бути відвіданим у цьому шляху
      if (controlledIds.includes(neighborId) && !visited.has(neighborId)) {
        const path = this.findLongestChain(neighborId, controlledIds, provinces, new Set(visited), targetLength);
        if (path.length > longestPath.length) {
          longestPath = path;
        }
        if (longestPath.length >= targetLength) break;
      }
    }

    return longestPath;
  }
  // Перевірка цілі №2: Привселюдний Вплив (контроль хоча б по одній провінції у 7 різних регіонах)
  private checkPublicInfluence(gameState: any, clan: string): boolean {
    const provinces = gameState.provinces;
    
    // 1. Збираємо всі унікальні regionId провінцій, які контролює клан
    const controlledRegions = new Set<string>();

    Object.values(provinces).forEach((p: any) => {
      if (p && p.controllingClan === clan && p.regionId) {
        controlledRegions.add(p.regionId);
      }
    });

    // 2. Перевіряємо, чи кількість унікальних регіонів більша або дорівнює 7
    return controlledRegions.size >= 7;
  }
  // Універсальна перевірка: контроль столиці певного клану АБО контроль >= 2 провінцій у його регіоні
  private checkClanCapitalOrRegion(gameState: any, playerClan: string, targetClan: string, targetRegionId: string): boolean {
    const provinces = gameState.provinces;
    let controlledInRegionCount = 0;
    let controlsCapital = false;

    Object.values(provinces).forEach((p: any) => {
      if (!p) return;

      // Перевіряємо, чи це столиця цільового клану і чи контролює її гравець
      if (p.isCapital && p.capitalOf === targetClan && p.controllingClan === playerClan) {
        controlsCapital = true;
      }

      // Рахуємо провінції в регіоні цього клану, які контролює гравець
      if (p.regionId === targetRegionId && p.controllingClan === playerClan) {
        controlledInRegionCount++;
      }
    });

    // Умова виконана, якщо гравець контролює столицю АБО щонайменше 2 провінції в регіоні
    return controlsCapital || controlledInRegionCount >= 2;
  }
  // Перевірка цілі №5: Скромність - ввічливість королів (найменша кількість провінцій на мапі, нічия зараховується)
  private checkModestyPoliteness(gameState: any, clan: string): boolean {
    const provinces = gameState.provinces;
    const players = gameState.players;

    if (!players) return false;

    // Отримуємо список усіх активних кланів у грі
    const activeClans = Object.keys(players);
    if (activeClans.length === 0) return false;

    // Рахуємо кількість провінцій під контролем кожного клану
    const clanProvinceCounts: { [clanName: string]: number } = {};
    activeClans.forEach(c => {
      clanProvinceCounts[c] = 0;
    });

    Object.values(provinces).forEach((p: any) => {
      if (p && p.controllingClan && clanProvinceCounts[p.controllingClan] !== undefined) {
        clanProvinceCounts[p.controllingClan]++;
      }
    });

    // Знаходимо кількість провінцій у поточного гравця
    const playerMobilityCount = clanProvinceCounts[clan] || 0;

    // Знаходимо мінімальну кількість провінцій серед усіх гравців на мапі
    let minCount = Infinity;
    Object.values(clanProvinceCounts).forEach(count => {
      if (count < minCount) {
        minCount = count;
      }
    });

    // Ціль виконана, якщо у поточного гравця мінімальна кількість провінцій (у разі нічиї з іншими — також зараховується)
    return playerMobilityCount === minCount;
  }
  // Перевірка цілі №11: Володар морів (контроль щонайменше 6 прибережних провінцій)
  private checkLordOfSeas(gameState: any, clan: string): boolean {
    const provinces = gameState.provinces;
    let coastalCount = 0;

    Object.values(provinces).forEach((p: any) => {
      if (!p) return;

      // Перевіряємо, чи провінція контролюється нашим кланом
      if (p.controllingClan === clan) {
        // Провінція вважається прибережною, якщо є `isCoastal` або якщо до неї підключена гавань `hasHarbor`
        if (p.isCoastal || p.hasHarbor) {
          coastalCount++;
        }
      }
    });

    return coastalCount >= 6;
  }

  // Бонус: перевірка цілі №8 (Забуті краї — контроль обох провінцій Тіньових земель)
  private checkForgottenRealms(gameState: any, clan: string): boolean {
    const provinces = gameState.provinces;
    
    // Ідентифікатори провінцій Тіньових земель відповідно до твого словника сусідства
    const shadowlandsIds = ['shadowlands-north', 'shadowlands-south'];
    
    // Перевіряємо, чи обидві провінції існують і контролюються нашим кланом
    for (const id of shadowlandsIds) {
      const p = provinces[id];
      if (!p || p.controllingClan !== clan) {
        return false;
      }
    }

    return true;
  }
}
