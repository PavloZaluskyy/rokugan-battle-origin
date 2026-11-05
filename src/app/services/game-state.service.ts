import { Injectable } from '@angular/core';
import { GameState, ClanType, BattleToken, BattleTokenType, PlayerState, Province } from '../models/game.model';
import { ORIGINAL_PROVINCES, PROVINCE_ADJACENCY } from '../models/provinces-data';
import { Subject } from 'rxjs';
import { RegionCardService } from './region-card.service';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private botTurnBannerSubject = new Subject<{ clan: string; text: string } | null>();
  botTurnBanner$ = this.botTurnBannerSubject.asObservable();
  
  private readonly STORAGE_KEY = 'rokugan_battle_save';
  private state: GameState | null = null;
  selectedToken: BattleToken | null = null;

  isAttackingStrikeActive: boolean = false;
  public globalTimer: number = 0;
  private timerInterval: any = null;
  private dragonSkillTimerSubject = new Subject();
  dragonSkillTimer$ = this.dragonSkillTimerSubject.asObservable();

  public isReconActive: boolean = false;
  public isShugenjaActive: boolean = false;
  private isInitialPlacementPhase: boolean = true;

  constructor(private regionCardService: RegionCardService) {
    this.loadGame();
  }

  setSelectedToken(token: BattleToken | null): void {
    if (this.selectedToken && token && this.selectedToken.id === token.id) {
      this.selectedToken = null;
    } else {
      this.selectedToken = token;
    }
  }

  getSelectedToken(): BattleToken | null {
    return this.selectedToken;
  }

  getGameState(): GameState | null {
    return this.state;
  }

  createNewGame(selectedClans: ClanType[]): void {
    const playerCount = selectedClans.length;
    let startingControlTokens = 11;
    if (playerCount === 3) startingControlTokens = 7;
    else if (playerCount === 4) startingControlTokens = 5;
    else if (playerCount >= 5) startingControlTokens = 4;

    const playersMap: { [key: string]: any } = {};

    selectedClans.forEach(clan => {
      const initialDeck = this.generatePlayerDeck(clan);
      const handSize = clan === 'Dragon' ? 6 : 5;
      const initialHand = initialDeck.splice(0, handSize);

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
        deck: initialDeck,
        discardPile: [],
        bonusCards: {
          shugenja: 1,
          recon: 2
        }
      };
    });

    const provincesMap: { [key: string]: Province } = {};
    ORIGINAL_PROVINCES.forEach(prov => {
      let initialBaseDefense = prov.baseDefense;
      const isCrabCapital = prov.isCapital && prov.capitalOf === 'Crab' && selectedClans.includes('Crab');
      
      if (isCrabCapital) {
        initialBaseDefense = prov.baseDefense + 1;
      }

      provincesMap[prov.id] = { 
        ...prov, 
        baseDefense: initialBaseDefense,
        placedTokens: [],
        controlTokensFaceUp: 0,
        controllingClan: prov.isCapital && selectedClans.includes(prov.capitalOf as ClanType) ? prov.capitalOf! : 'Neutral',
        imageUrl: `assets/images/provinces/${prov.id}.png`
      };
    });

    selectedClans.forEach(clan => {
      const capital = Object.values(provincesMap).find(p => p.capitalOf === clan);
      if (capital) {
        capital.controllingClan = clan;
        capital.controlTokensFaceUp = 1;
      }
    });

    this.isInitialPlacementPhase = true;
    // Ініціалізуємо випадкові картки регіонів для нової партії у RegionCardService
    this.regionCardService.initializeNewGameRegionCards();

    this.state = {
      gameId: Math.random().toString(36).substring(2, 9),
      currentRound: 1,
      currentPhase: 'Placement',
      firstPlayerClan: selectedClans[0],
      players: playersMap as any,
      provinces: provincesMap,
      roundLog: [`Розпочалася пре-фаза розстановки жетонів контролю. Доступно жетонів у резерві: ${startingControlTokens - 1}.`],
      regionCards: this.regionCardService.getActiveRegionCards() // <--- Зберігаємо початковий стан регіонів у стейт
    };
    this.regionCardService.initializeNewGameRegionCards();
    this.saveGame();
  }

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

    addToken('Army', 1, 6);
    addToken('Army', 2, 4);
    addToken('Army', 3, 3);
    addToken('Army', 4, 2);
    addToken('Army', 5, 1);
    addToken('Navy', 1, 2);
    addToken('Navy', 2, 1);
    addToken('Shinobi', 1, 1);
    addToken('Shinobi', 2, 1);
    addToken('Diplomacy', 0, 1);
    addToken('Raid', 0, 1);
    addToken('Blessing', 2, 2);

    switch (clan) {
      case 'Unicorn': addToken('Raid', 0, 1); break;
      case 'Crane': addToken('Diplomacy', 0, 1); break;
      case 'Lion': addToken('Army', 6, 1); break;
      case 'Dragon': addToken('Blessing', 3, 1); break;
      case 'Scorpion': addToken('Shinobi', 3, 1); break;
      case 'Phoenix': addToken('Blessing', 3, 1); break;
      case 'Crab': addToken('Navy', 3, 1); break;
    }

    return this.shuffleArray(tokens);
  }

  /**
   * Оновлення рук гравців та перенесення невикористаних карт у скид (discardPile)
   */
  private replenishPlayerHands(): void {
    if (!this.state) return;
    let hasDragonPlayer = false;

    Object.values(this.state.players).forEach(player => {
      const isDragon = player.clan === 'Dragon';
      if (isDragon) hasDragonPlayer = true;

      // Усе, що лишилося в активній руці (окрім Блефу), летить у скид
      const leftoverCards = player.activeHandTokens.filter((t: BattleToken) => t.type !== 'Blank');
      leftoverCards.forEach((card: BattleToken) => {
        const alreadyInDiscard = player.discardPile.some((t: any) => t.id === card.id);
        if (!alreadyInDiscard) {
          player.discardPile.push(card);
        }
      });

      const targetHandSize = isDragon ? 6 : 5;
      const newHand: BattleToken[] = [];

      if (player.deck.length < targetHandSize) {
        if (player.discardPile.length > 0) {
          player.deck = this.shuffleArray([...player.deck, ...player.discardPile]);
          player.discardPile = [];
        }
      }

      const drawnCards = player.deck.splice(0, targetHandSize);
      newHand.push(...drawnCards);

      newHand.push({
        id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type: 'Blank',
        strength: 0,
        clan: player.clan
      });

      player.activeHandTokens = newHand;
      this.state!.roundLog.push(`Клан ${player.clan} оновив руку. Скид містить карток: ${player.discardPile.length}.`);
    });

    if (hasDragonPlayer && this.state.players['Dragon']) {
      this.state.isDragonSkillSelectionActive = true;
      this.state.roundLog.push(`🐉 Клан Дракона отримав 7 карт: необхідно вибрати одну карту для повернення в колоду.`);
    }

    this.saveGame();
  }

  saveGame(): void {
    if (this.state) {
      // Синхронізуємо актуальні картки регіонів перед збереженням у state
      this.state.regionCards = this.regionCardService.getActiveRegionCards();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      console.log('Game progress and region cards saved successfully to rokugan_battle_save!');
    }
  }

  loadGame(): boolean {
   const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        this.state = JSON.parse(savedData);
        
        // Якщо в збереженому стані є картки регіонів, відновлюємо їх через RegionCardService
        if (this.state && this.state.regionCards) {
          this.regionCardService.setActiveRegionCards(this.state.regionCards);
        }

        console.log('Game and region cards loaded from storage successfully.');
        return true;
      } catch (e) {
        console.error('Failed to parse saved game data', e);
        return false;
      }
    }
    return false;
  }

  clearSave(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.state = null;
    console.log('Saved game cleared.');
  }

  private shuffleArray(array: any[]): any[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  isProvinceValidTarget(province: Province, playerClan: ClanType): boolean {
    if (!this.selectedToken || !this.state) return false;
    const token = this.selectedToken;
    const tokenType = token.type as string;
    const isOwner = province.controllingClan === playerClan;

    if (province.hasScorchedEarth || province.hasPeaceToken) return false;
    const selectedTokenClan = token.clan;
    if (['Army', 'Navy', 'Shinobi'].includes(tokenType)) {
      const adjacentIds = PROVINCE_ADJACENCY[province.id] || [];
    }
    if (province.hasShrine && !isOwner) return false;
    if (tokenType === 'Harbor') return isOwner && !province.isCoastal;

    if (token.type === 'Blessing') {
      return (province.placedTokens || []).some(pt => pt.clan === playerClan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type));
    }

    if (token.type === 'Diplomacy') return isOwner && !province.hasGlory;

    if (token.type === 'Raid') {
      if (isOwner || province.hasGlory) return false;
      const hasFriendlyCombatToken = (province.placedTokens || []).some(pt => pt.clan === playerClan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type));
      if (!hasFriendlyCombatToken) return false;
      const hasShinobiHere = (province.placedTokens || []).some(pt => pt.clan === playerClan && pt.token.type === 'Shinobi');
      const hasLandBorder = this.hasLandBorder(province, playerClan);
      const hasNavyHere = (province.placedTokens || []).some(pt => pt.clan === playerClan && pt.token.type === 'Navy');
      const isCoastalAccess = Boolean(province.isCoastal || province.hasHarbor) && hasNavyHere;
      return hasShinobiHere || hasLandBorder || isCoastalAccess;
    }

    if (token.type === 'Shinobi' || token.type === 'Blank') return true;

    if (isOwner) {
      if (token.type === 'Navy') return Boolean(province.isCoastal || province.hasHarbor);
      return true;
    }

    if (!isOwner) {
      if (token.type === 'Navy') {
        return Boolean(province.isCoastal || province.hasHarbor) && Boolean(province.isCoastal || province.hasHarbor);
      }
      const adjacentIds = PROVINCE_ADJACENCY[province.id] || [];
      const hasValidBorderWithoutPeace = adjacentIds.some(adjId => {
        const adjProv = this.state?.provinces[adjId];
        return adjProv && adjProv.controllingClan === playerClan && !adjProv.hasPeaceToken;
      });

      if (!hasValidBorderWithoutPeace) return false;
      const controlledBorders = this.getControlledBorderCount(province, playerClan);
      const existingFriendlyTokensCount = (province.placedTokens || []).filter(
        pt => pt.clan === playerClan && ['Army', 'Navy'].includes(pt.token.type)
      ).length;

      if (existingFriendlyTokensCount >= controlledBorders) return false;
      if (token.type === 'Army') return this.hasLandBorder(province, playerClan);
      return this.hasLandBorder(province, playerClan);
    }

    return false;
  }

  private hasLandBorder(province: Province, playerClan: ClanType): boolean {
    const adjacentProvinces = PROVINCE_ADJACENCY[province.id] || [];
    return adjacentProvinces.some(adjId => this.state?.provinces[adjId]?.controllingClan === playerClan);
  }

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
    if (player && (player as any).cantPlaceAttackCardsThisTurn) {
      console.warn('Розміщення карт атаки заблоковано ефектом «Вбивство слабких» у цьому ході!');
      return false; 
    }


    if (!province || !player) return false;
    if (!this.isProvinceValidTarget(province, playerClan)) return false;

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

    if (playerClan === 'Scorpion') {
      this.triggerBotTurnSimulation();
    }

    return true;
  }

  private triggerBotTurnSimulation(): void {
    if (!this.state) return;
    const activeClans = Object.keys(this.state.players) as ClanType[];
    const enemyClans = activeClans.filter(c => c !== 'Scorpion');
    if (enemyClans.length === 0) return;

    const randomEnemyClan = enemyClans[Math.floor(Math.random() * enemyClans.length)];

    this.botTurnBannerSubject.next({
      clan: randomEnemyClan,
      text: `ХІД КЛАНУ ${randomEnemyClan.toUpperCase()} (ДУМАЄ...)`
    });

    setTimeout(() => {
      if (!this.state) return;
      const emptyProvinces = Object.values(this.state.provinces).filter(
        p => !p.hasScorchedEarth && !p.hasPeaceToken && (!p.placedTokens || p.placedTokens.length === 0)
      );

      if (emptyProvinces.length > 0) {
        const targetProv = emptyProvinces[Math.floor(Math.random() * emptyProvinces.length)];
        if (!targetProv.placedTokens) targetProv.placedTokens = [];

        targetProv.placedTokens.push({
          id: `bot-token-${Date.now()}`,
          clan: randomEnemyClan,
          strength: 2,
          token: { id: `tok-${Date.now()}`, type: 'Army', strength: 2, clan: randomEnemyClan },
          isFaceUp: false
        });

        this.state.roundLog.push(`🤖 Клан ${randomEnemyClan} зробив хід і виставив загін на ${targetProv.name}.`);
        this.saveGame();
      }
      this.botTurnBannerSubject.next(null);
    }, 1500);
  }

  getInitialPlacementStatus(): boolean {
    return this.isInitialPlacementPhase;
  }

  isValidInitialControlPlacement(province: Province, playerClan: ClanType): boolean {
    if (!this.isInitialPlacementPhase || !this.state) return false;
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];
    if (!player || player.remainingControlTokens <= 0) return false;
    if (province.controllingClan === playerClan) return false;

    const adjacentIds = PROVINCE_ADJACENCY[province.id] || [];
    return adjacentIds.some(adjId => {
      const adjProv = this.state?.provinces[adjId];
      return adjProv && adjProv.controllingClan === playerClan;
    });
  }

  placeInitialControlToken(provinceId: string, playerClan: ClanType): boolean {
    if (!this.state) return false;
    const province = this.state.provinces[provinceId];
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>];

    if (!province || !player) return false;
    if (!this.isValidInitialControlPlacement(province, playerClan)) return false;

    province.controllingClan = playerClan;
    const defenseBonus = playerClan === 'Crab' ? 2 : 1;
    province.controlTokensFaceUp += defenseBonus;
    player.remainingControlTokens -= 1;

    this.state.roundLog.push(`Клан ${playerClan} встановив жетон контролю на ${province.name}. Залишок: ${player.remainingControlTokens}`);
    this.regionCardService.updateRegionControl(this.state.provinces, this.state.players);

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
      this.checkDragonSkillBeforePlacement();
      this.saveGame();
      return;
    }

    if (this.state.currentPhase === 'Placement') {
      this.resolveExecutionPhase();
      this.state.currentPhase = 'Execution';
      this.state.roundLog.push(`Раунд ${this.state.currentRound}: Фаза виконання та розкриття завершена.`);
    } else if (this.state.currentPhase === 'Execution') {
      if (this.state.currentRound >= 5) {
        alert('Гра завершена! Час підраховувати очки честі.');
      } else {
        this.checkDragonSkillBeforePlacement();
        this.state.currentRound++;
        this.state.currentPhase = 'Placement';
        
        Object.values(this.state.provinces).forEach(prov => {
          prov.placedTokens = [];
        });

        this.replenishPlayerHands();
        this.distributeRoundControlTokens();
        this.state.roundLog.push(`Розпочався раунд ${this.state.currentRound}. Фаза розміщення.`);
      }
    }

    Object.values(this.state.players).forEach(p => {
      (p as any).cantPlaceAttackCardsThisTurn = false;
      p.isSkillUsedThisRound = false;
      delete (p as any)._crabBonusApplied;
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

  private distributeRoundControlTokens(): void {
    if (!this.state) return;
    Object.values(this.state.players).forEach(player => {
      const controlledProvincesCount = Object.values(this.state!.provinces).filter(
        p => p.controllingClan === player.clan
      ).length;
      const tokensToAdd = Math.max(3, Math.floor(controlledProvincesCount / 2));
      player.remainingControlTokens += tokensToAdd;
      this.state!.roundLog.push(`Клан ${player.clan} отримав ${tokensToAdd} нових жетонів контролю в резерв.`);
    });
  }

  /**
   * Розрахунок фази виконання битв та збір усіх виставлених карт із провінцій у discardPile
   */
  resolveExecutionPhase(): void {
    if (!this.state) return;

    this.state.roundLog.push(`--- Фаза виконання Раунду ${this.state.currentRound} ---`);

    Object.values(this.state.provinces).forEach(province => {
      const placedTokens = province.placedTokens || [];
      if (province.hasScorchedEarth || province.hasPeaceToken || placedTokens.length === 0) return;

      placedTokens.forEach(pt => pt.isFaceUp = true);

      const raidTokens = placedTokens.filter(pt => pt.token.type === 'Raid');
      if (raidTokens.length > 0) {
        let raidSuccessful = false;
        raidTokens.forEach(rt => {
          const hasCombatToken = placedTokens.some(pt => pt.clan === rt.clan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type));
          const hasShinobiHere = placedTokens.some(pt => pt.clan === rt.clan && pt.token.type === 'Shinobi');
          const hasBorder = this.hasLandBorder(province, rt.clan);
          const hasNavyHere = placedTokens.some(pt => pt.clan === rt.clan && pt.token.type === 'Navy');
          const isCoastalAccess = Boolean(province.isCoastal || province.hasHarbor) && hasNavyHere;

          if (hasCombatToken && (hasShinobiHere || hasBorder || isCoastalAccess)) {
            raidSuccessful = true;
          }
          
        }); 
        if (raidSuccessful) {
            province.hasScorchedEarth = true;
            province.controllingClan = 'Neutral';
            province.controlTokensFaceUp = 0;
            province.placedTokens = [];
            this.state!.roundLog.push(`🔥 Погром (Raid) силами флоту/армії у провінції ${province.name} успішно виконано! Земля спустошена.`);
          }
        return;
      }
      const blessingTokens = placedTokens.filter(pt => pt.token.type === 'Blessing');
      blessingTokens.forEach(blessingToken => {
        const targetCombatToken = placedTokens.find(pt => 
          pt.clan === blessingToken.clan && ['Army', 'Navy', 'Shinobi'].includes(pt.token.type)
        );
        if (targetCombatToken) {
          // targetCombatToken.strength += 2;
          // if (targetCombatToken.token) targetCombatToken.token.strength += 2;
        }
      });

      const diplomacyToken = placedTokens.find(pt => pt.clan === province.controllingClan && pt.token.type === 'Diplomacy');
      if (diplomacyToken) {
        province.hasPeaceToken = true;
        province.placedTokens = [];
        return;
      }

      

      if (province.hasScorchedEarth) return;

      let defenseTotal = province.baseDefense + province.controlTokensFaceUp;
      const defenderClan = province.controllingClan;

      placedTokens
        .filter(pt => pt.clan === defenderClan)
        .forEach(pt => {
          if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
            defenseTotal += pt.strength !== undefined ? pt.strength : pt.token.strength;
          }
        });

      placedTokens
        .filter(pt => pt.clan === 'Lion' && pt.token.type === 'Blank')
        .forEach(() => { defenseTotal += 2; });

      const attackerClans = Array.from(new Set(
        placedTokens.filter(pt => pt.clan !== defenderClan).map(pt => pt.clan)
      ));

      // ЯКЩО НІХТО НЕ НАПАВ НА ВЛАСНУ ПРОВІНЦІЮ (або атакуючих нема)
      if (attackerClans.length === 0 && defenderClan !== 'Neutral') {
        const hasFriendlyTokens = placedTokens.some(pt => pt.clan === defenderClan);
        if (hasFriendlyTokens) {
          const defenseBonus = defenderClan === 'Crab' ? 2 : 1;
          province.controlTokensFaceUp = (province.controlTokensFaceUp || 0) + defenseBonus;
          this.state!.roundLog.push(`🛡️ Провінція ${province.name} під захистом власника: жетон контролю збільшено на +${defenseBonus}.`);
        }
      }

      if (attackerClans.length > 0) {
        let strongestAttackerClan: ClanType | null = null;
        let maxAttackStrength = -1;

        attackerClans.forEach(attackerClan => {
          let clanAttackSum = 0;
          let hasBlessingHere = placedTokens.some(pt => pt.clan === attackerClan && pt.token.type === 'Blessing');
          placedTokens
            .filter(pt => pt.clan === attackerClan)
            .forEach(pt => {
              if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
                clanAttackSum += pt.strength !== undefined ? pt.strength : pt.token.strength;
              }
            });
            // Додаємо бонус Благословення до загальної суми атаки, якщо воно є
          if (hasBlessingHere) {
            clanAttackSum += 2; // або силі благословення, якщо воно має різний номінал
          }

          let effectiveDefense = defenseTotal;
          if (attackerClan === 'Phoenix' && province.isCapital) {
            effectiveDefense = Math.max(0, defenseTotal - 2);
          }

          if (clanAttackSum > maxAttackStrength) {
            maxAttackStrength = clanAttackSum;
            strongestAttackerClan = attackerClan;
          }
        });

        let effectiveDefenseForWinner = defenseTotal;
        if (strongestAttackerClan === 'Phoenix' && province.isCapital) {
          effectiveDefenseForWinner = Math.max(0, defenseTotal - 2);
        }

        const isCraneTieBreak = strongestAttackerClan === 'Crane' && maxAttackStrength === effectiveDefenseForWinner;
        
        if (strongestAttackerClan && (maxAttackStrength > effectiveDefenseForWinner || isCraneTieBreak)) {
          province.controllingClan = strongestAttackerClan;
          const defenseBonus = strongestAttackerClan === 'Crab' ? 2 : 1;
          province.controlTokensFaceUp = defenseBonus;
        } else {
          const defenseBonus = defenderClan === 'Crab' ? 2 : 1;
          province.controlTokensFaceUp = (province.controlTokensFaceUp || 0) + defenseBonus;
          this.state!.roundLog.push(`🛡️ Провінція ${province.name} успішно відбила атаку! Захист (жетони контролю) збільшено на +${defenseBonus}.`);
        }
      }
    });

    // ЗБИРАЄМО ВСІ ВИСТАВЛЕНІ НА ПРОВІНЦІЇ КАРТИ В DISCARD_PILE ГРАВЦІВ ПЕРЕД ОЧИЩЕННЯМ МАПИ
    Object.values(this.state.provinces).forEach((province: any) => {
      if (province.placedTokens && province.placedTokens.length > 0) {
        province.placedTokens.forEach((pt: any) => {
          if (pt.clan && pt.clan !== 'Neutral' && pt.token && pt.token.type !== 'Blank') {
            const player = this.state!.players[pt.clan as Exclude<ClanType, 'Neutral'>];
            if (player && player.discardPile) {
              const alreadyInDiscard = player.discardPile.some((t: any) => t.id === pt.token.id);
              if (!alreadyInDiscard) {
                // ПРИМІТКА: Створюємо копію карти з її ОРИГІНАЛЬНОЮ базовою силою з поля pt.token.strength (або оригінального шаблону), 
                // щоб тимчасові бонуси битви (як-от Благословення +2) не псували базову силу жетона в скиді!
                const cleanToken = {
                  ...pt.token,
                  strength: pt.token.originalStrength !== undefined ? pt.token.originalStrength : (pt.token.strength > 4 ? pt.token.strength - 2 : pt.token.strength) // або зберігаємо чисту силу
                };
                player.discardPile.push(pt.token);
              }
            }
          }
        });
      }
    });

    if (this.state && this.state.players) {
      const activeClans = Object.keys(this.state.players) as ClanType[];
      activeClans.forEach(clan => {
        this.regionCardService.updateRegionControl(this.state!.provinces, this.state!.players);
      });
    }

    this.saveGame();
  }

  startCinematicResolution(callbackOnComplete: () => void): void {
    if (!this.state) return;
    Object.values(this.state.provinces).forEach(province => {
      const placedTokens = province.placedTokens || [];
      placedTokens.forEach(pt => pt.isFaceUp = true);
    });
    this.saveGame();

    setTimeout(() => {
      this.resolveExecutionPhase();
      this.state!.currentPhase = 'Execution';
      this.saveGame();
      callbackOnComplete();
    }, 1200);
  }

  requestCinematicBattles() {
    this.triggerCinematicSubject.next();
  }

  private triggerCinematicSubject = new Subject<void>();
  triggerCinematic$ = this.triggerCinematicSubject.asObservable();

  getUnicornSkillState() {
    const player = this.state?.players['Unicorn'];
    return {
      isActive: this.state?.isUnicornSkillActive || false,
      selectedProvinceId: this.state?.unicornSelectedProvinceId || null,
      isUsed: player?.isSkillUsedThisRound || false
    };
  }

  activateUnicornSkill(): void {
    if (!this.state) return;
    const player = this.state.players['Unicorn'];
    if (!player || player.isSkillUsedThisRound) return;
    this.state.isUnicornSkillActive = true;
    this.state.unicornSelectedProvinceId = null;
    this.saveGame();
  }

  cancelUnicornSkill(): void {
    if (!this.state) return;
    this.state.isUnicornSkillActive = false;
    this.state.unicornSelectedProvinceId = null;
    this.saveGame();
  }

  handleUnicornProvinceClick(provinceId: string): boolean {
    if (!this.state || !this.state.isUnicornSkillActive) return false;
    const province = this.state.provinces[provinceId];
    if (!province) return false;

    const hasUnicornTokens = (province.placedTokens || []).some(pt => pt.clan === 'Unicorn');

    if (!this.state.unicornSelectedProvinceId) {
      if (!hasUnicornTokens) return false; 
      this.state.unicornSelectedProvinceId = provinceId;
      this.saveGame();
      return true;
    } else {
      const firstProvinceId = this.state.unicornSelectedProvinceId;
      if (firstProvinceId === provinceId) {
        this.state.unicornSelectedProvinceId = null;
        this.saveGame();
        return true;
      }
      if (!hasUnicornTokens) return false; 

      const firstProv = this.state.provinces[firstProvinceId];
      const secondProv = province;

      const firstUnicornTokens = firstProv.placedTokens.filter((pt: any) => pt.clan === 'Unicorn');
      const otherFirstTokens = firstProv.placedTokens.filter((pt: any) => pt.clan !== 'Unicorn');
      const secondUnicornTokens = secondProv.placedTokens.filter((pt: any) => pt.clan === 'Unicorn');
      const otherSecondTokens = secondProv.placedTokens.filter((pt: any) => pt.clan !== 'Unicorn');

      firstProv.placedTokens = [...otherFirstTokens, ...secondUnicornTokens];
      secondProv.placedTokens = [...otherSecondTokens, ...firstUnicornTokens];

      this.state.isUnicornSkillActive = false;
      this.state.unicornSelectedProvinceId = null;
      const player = this.state.players['Unicorn'];
      if (player) player.isSkillUsedThisRound = true;

      this.saveGame();
      return true;
    }
  }

  activateClanSkill(clan: ClanType): void {
    if (!this.state) return;
    const player = this.state.players[clan as Exclude<ClanType, 'Neutral'>];
    if (!player || player.isSkillUsedThisRound) return;
    if (clan === 'Unicorn') this.activateUnicornSkill();
    this.saveGame();
  }

  getScorpionSkillState() {
    const player = this.state?.players['Scorpion'];
    return {
      isActive: this.state?.isScorpionSkillActive || false,
      isUsed: player?.isSkillUsedThisRound || false
    };
  }

  activateScorpionSkill(): void {
    if (!this.state) return;
    const player = this.state.players['Scorpion'];
    if (!player || player.isSkillUsedThisRound) return;
    this.state.isScorpionSkillActive = true;
    this.saveGame();
  }

  cancelScorpionSkill(): void {
    if (!this.state) return;
    this.state.isScorpionSkillActive = false;
    this.saveGame();
  }

  handleScorpionProvinceClick(provinceId: string): boolean {
    if (!this.state || !this.state.isScorpionSkillActive) return false;
    const province = this.state.provinces[provinceId];
    if (!province) return false;

    province.placedTokens.forEach((pt: any) => {
      if (pt.clan !== 'Scorpion') pt.isFaceUp = true;
    });

    this.state.isScorpionSkillActive = false;
    const player = this.state.players['Scorpion'];
    if (player) player.isSkillUsedThisRound = true;

    this.saveGame();
    return true;
  }

  startGlobalTimer(seconds: number, onComplete: () => void): void {
    this.clearGlobalTimer();
    this.globalTimer = seconds;
    this.timerInterval = setInterval(() => {
      this.globalTimer--;
      if (this.globalTimer <= 0) {
        this.clearGlobalTimer();
        onComplete();
      }
    }, 1000);
  }

  clearGlobalTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.globalTimer = 0;
  }

  checkDragonSkillBeforePlacement(): void {
    if (!this.state) return;
    const hasDragon = Object.values(this.state.players).some(p => p.clan === 'Dragon');
    if (!hasDragon) return;

    this.state.isDragonSkillSelectionActive = true;
    this.botTurnBannerSubject.next({ clan: 'Dragon', text: 'ВИКОРИСТАННЯ СКІЛА КЛАНУ ДРАКОНА' });

    this.startGlobalTimer(10, () => {
      if (this.state && this.state.isDragonSkillSelectionActive) {
        const currentDragonPlayer = this.state.players['Dragon'];
        if (currentDragonPlayer) {
          const randomCard = this.getRandomCardFromHand(currentDragonPlayer);
          if (randomCard) this.returnCardToDeck(randomCard.id);
        }
        this.state.isDragonSkillSelectionActive = false;
        this.botTurnBannerSubject.next(null);
        this.saveGame();
      }
    });

    this.dragonSkillTimerSubject.next(10);
    this.saveGame();
  }

  getRandomCardFromHand(playerState: PlayerState): BattleToken | null {
    if (!playerState || !playerState.activeHandTokens) return null;
    const validCards = playerState.activeHandTokens.filter(t => t.type !== 'Blank');
    if (validCards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * validCards.length);
    return validCards[randomIndex];
  }

  cancelDragonSkillSelection(): void {
    if (!this.state) return;
    this.state.isDragonSkillSelectionActive = false;
    this.saveGame();
  }

  returnCardToDeck(cardId: string): void {
    if (!this.state || !this.state.isDragonSkillSelectionActive) return;
    const dragonPlayer = this.state.players['Dragon'];
    if (!dragonPlayer) return;

    const cardToReturn = dragonPlayer.activeHandTokens.find((t: BattleToken) => t.id === cardId);
    if (!cardToReturn || cardToReturn.type === 'Blank') return;

    dragonPlayer.activeHandTokens = dragonPlayer.activeHandTokens.filter((t: BattleToken) => t.id !== cardId);
    dragonPlayer.deck.push(cardToReturn);
    dragonPlayer.deck = this.shuffleArray(dragonPlayer.deck);

    this.state.isDragonSkillSelectionActive = false;
    this.botTurnBannerSubject.next(null);
    this.saveGame();
  }

  setupCrabDefenseTest(): void {
    if (!this.state) return;
    const crabProvinces = Object.values(this.state.provinces).filter(p => p.controllingClan === 'Crab');
    if (crabProvinces.length === 0) return;
    const randomCrabProvince = crabProvinces[Math.floor(Math.random() * crabProvinces.length)];
    if (!randomCrabProvince.placedTokens) randomCrabProvince.placedTokens = [];
    
    randomCrabProvince.placedTokens.push({
      id: `crab-test-enemy-${Date.now()}`,
      clan: 'Lion',
      strength: 3,
      token: { id: 'test-tok-lion', type: 'Army', strength: 3, clan: 'Lion' },
      isFaceUp: false // ⛺ Замасковано під намет (закритою стороною)
    });
    this.saveGame();
  }

  setupLionDefenseTest(): void {
    if (!this.state) return;
    const lionProvinces = Object.values(this.state.provinces).filter(p => p.controllingClan === 'Lion');
    if (lionProvinces.length === 0) return;
    const targetProvince = lionProvinces[Math.floor(Math.random() * lionProvinces.length)];
    if (!targetProvince.placedTokens) targetProvince.placedTokens = [];
    
    targetProvince.placedTokens.push({
      id: `lion-test-enemy-${Date.now()}`,
      clan: 'Crane',
      strength: 3,
      token: { id: 'test-tok-crane', type: 'Army', strength: 3, clan: 'Crane' },
      isFaceUp: false // ⛺ Замасковано під намет (закритою стороною)
    });
    this.saveGame();
  }

  activateReconBonus(playerClan: ClanType): void {
    if (!this.state || playerClan === 'Neutral') return;
    this.isReconActive = true;
    this.isShugenjaActive = false;
    this.saveGame();
  }

  activateShugenjaBonus(playerClan: ClanType): void {
    if (!this.state || playerClan === 'Neutral') return;
    this.isShugenjaActive = true;
    this.isReconActive = false;
    this.saveGame();
  }

  handleReconProvinceClick(provinceId: string, playerClan: ClanType): boolean {
    if (!this.state || !this.isReconActive) return false;
    const province = this.state.provinces[provinceId];
    if (!province) return false;

    province.placedTokens.forEach((pt: any) => {
      if (pt.clan !== playerClan) pt.isFaceUp = true;
    });

    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>] as any;
    if (player?.bonusCards) player.bonusCards.recon -= 1;

    this.isReconActive = false;
    this.saveGame();
    return true;
  }

  handleShugenjaProvinceClick(provinceId: string, playerClan: ClanType): boolean {
    if (!this.state || !this.isShugenjaActive) return false;
    const province = this.state.provinces[provinceId];
    if (!province || !province.placedTokens) return false;

    const enemyTokenIndex = province.placedTokens.findIndex((pt: any) => pt.clan !== playerClan);
    if (enemyTokenIndex === -1) return false;

    province.placedTokens.splice(enemyTokenIndex, 1);
    const player = this.state.players[playerClan as Exclude<ClanType, 'Neutral'>] as any;
    if (player?.bonusCards) player.bonusCards.shugenja -= 1;

    this.isShugenjaActive = false;
    this.saveGame();
    return true;
  }
  selectCardFromDiscardForRokirovka(token: any): void {
    if (!this.state) return;
    const effect = this.regionCardService.rokirovkaEffect;
    if (!effect) return;

    const player = this.state.players[effect.clan as Exclude<ClanType, 'Neutral'>];
    if (!player) return;

    // 1. Видаляємо картку зі скиду
    player.discardPile = player.discardPile.filter((t: any) => t.id !== token.id);

    // 2. Додаємо картку до активної руки (ширми) та позначаємо її для зеленого підсвічування
    const highlightedToken = { ...token, isNewlyAdded: true };
    player.activeHandTokens.push(highlightedToken);

    // 3. Завершуємо ефект Рокіровки (або переводимо стан, оскільки картку вже повернуто в ширму)
    this.regionCardService.cancelRokirovkaEffect();
    this.saveGame();
  }
}