import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ClanType, PlayerState, Province } from '../../models/game.model';
import { SecretObjective, SecretObjectiveModel } from '../../services/secret-objective';
import { RegionCardService, RegionCard } from '../../services/region-card.service';

@Component({
  selector: 'app-game-map',
  standalone: false,
  templateUrl: './game-map.html',
  styleUrl: './game-map.css',
})
export class GameMap implements OnInit {
[x: string]: any;
  provinces: Province[] = [];
  selectedProvince: Province | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isMoved: boolean = false;
  // Зберігаємо статус виконання у змінній, щоб не навантажувати сторінку кожну секунду
  isObjectiveCompleted: boolean = false;

  // activePlayerClan: string = 'Crab'; // Приклад поточного клану
  playerSecretObjective: SecretObjectiveModel | null = null;
  isObjectiveDrawerOpen: boolean = false;

  // Параметри трансформації карти (рух та звичайний зум)
  scale: number = 1;
  translateX: number = 0;
  translateY: number = 0;
  
  // Параметри кінематографічної камери
  cameraTransform: string = 'scale(1) translate(0px, 0px)';
  currentBattleProvinceId: string | null = null;
  isAttackingStrikeActive: boolean = false;
  isCinematicPlaying: boolean = false;
  // Стани для ефекту вітру
  isWindZoomingIn: boolean = false;
  isWindZoomingOut: boolean = false;
  // Стан для перетягування мишкою (Panning)
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;
  isZoomingIn: boolean = false;
  isZoomingOut: boolean = false;

  // Локальний таймер візуального відображення в компоненті мапи
  displayTimer: number = 0;
  private localTimerInterval: any = null;

  isRegionDrawerOpen: boolean = false;

  currentBannerState: { text: string; type: 'attack' | 'pogrom' | 'peace'; style?: any } | null = null;
  private clanColors: { [key: string]: string } = {
    'Crab': '#ced4da',
    'Crane': '#79b3ec',
    'Dragon': '#63e295',
    'Lion': '#fff2a3',
    'Phoenix': '#ffa18f',
    'Scorpion': '#ff6b6b',
    'Unicorn': '#ebadff',
    'Neutral': '#ffd699'
  };

  private coordMap: { [id: string]: { x: number; y: number } } = {
    'crab-capital': { x: 33, y: 79 },
    'crab-sub-1': { x: 29, y: 60 },
    'crab-sub-2': { x: 30, y: 50 },
    'crab-sub-3': { x: 10, y: 50 },
    'crane-capital': { x: 67, y: 41 },
    'crane-sub-1': { x: 57, y: 54 },
    'crane-sub-2': { x: 57, y: 46 },
    'dragon-capital': { x: 52, y: 17.5 },
    'dragon-sub-1': { x: 55, y: 25 },
    'dragon-sub-2': { x: 30 , y: 10 },
    'lion-capital': { x: 55.8, y: 35.5 },
    'lion-sub-1': { x: 70, y: 29 },
    'lion-sub-2': { x: 41, y: 26 },
    'phoenix-capital': { x: 63, y: 14 },
    'phoenix-sub-1': { x: 74, y: 12 },
    'phoenix-sub-2': { x: 82, y: 13 },
    'scorpion-capital': { x: 46.5, y: 46 },
    'scorpion-sub-1': { x: 40, y: 38 },
    'scorpion-sub-2': { x: 25, y: 40 },
    'unicorn-capital': { x: 20.5, y: 19.5 },
    'unicorn-sub-1': { x: 31, y: 29 },
    'unicorn-sub-2': { x: 15, y: 27 },
    'shadowlands-north': { x: 8, y: 65 },
    'shadowlands-south': { x: 15, y: 85 },
    'silk-sun-island': { x: 79, y: 73 },
    'silk-silkworm-island': { x: 68, y: 82.5 },
    'silk-golden-sand-island': { x: 78.5, y: 83 },
    'merchant-three-trees': { x: 47, y: 61 },
    'merchant-small-bay': { x: 59, y: 61 },
    'merchant-sunken-ships': { x: 43, y: 75 }
  };

  constructor(public gameStateService: GameStateService, 
              private cdr: ChangeDetectorRef,
              private objectiveService: SecretObjective,
              public regionCardService: RegionCardService) {}

  ngOnInit(): void {
    this.loadGameState();
    this.loadRegionCardsFromLocalStorage();
    this.cdr.detectChanges();
    // Завантажуємо таємну ціль поточного гравця з сервісу
    this.playerSecretObjective = this.objectiveService.getPlayerObjective(this.activePlayerClan);
    this.updateObjectiveStatus();
    // Слухаємо сигнал запуску таймера для Дракона
    this.gameStateService.dragonSkillTimer$.subscribe((seconds: unknown) => {
      if (typeof seconds !== 'number') {
        return;
      }
      this.startDragonVisualTimer(seconds, () => {
        // Що відбувається після закінчення 10 секунд (наприклад, ховаємо банер)
        this.currentBannerState = null;
        this.cdr.detectChanges();
      });
      // Слухаємо ходи ботів для виведення банера
    this.gameStateService.botTurnBanner$.subscribe(bannerData => {
      if (bannerData) {
        const clanColor = this.clanColors[bannerData.clan] || '#ffd699';
        this.currentBannerState = {
          text: bannerData.text,
          type: 'attack',
          style: { color: clanColor }
        };
      } else {
        this.currentBannerState = null;
      }
      this.loadGameState();
    });
    });
    // Слухаємо сигнал від кнопки в HUD на запуск битв
    this.gameStateService.triggerCinematic$.subscribe(() => {
      this.executeBattleCinematicSequence();
    });


    // Слухаємо ходи ботів для виведення банера
    this.gameStateService.botTurnBanner$.subscribe(bannerData => {
      if (bannerData) {
        const clanColor = this.clanColors[bannerData.clan] || '#ffd699';
        this.currentBannerState = {
          text: bannerData.text,
          type: 'attack',
          style: { color: clanColor }
        };
      } else {
        this.currentBannerState = null;
      }
      this.loadGameState();
    });
    // ПІДПИСУЄМОСЯ НА ЗАКРИТТЯ МОДАЛКИ РОКІРОВКИ
    this.regionCardService.closeRokirovkaModal$.subscribe(() => {
      this.loadGameState();
      this.cdr.detectChanges(); // Гарантовано оновлює екран і закриває модалку без руху миші!
    });
  }
  // Метод для точкового перерахунку статусу (викликатимемо після битв та ходів)
  updateObjectiveStatus(): void {
    if (!this.playerSecretObjective) {
      this.isObjectiveCompleted = false;
      return;
    }
    const gameState = this.gameStateService.getGameState();
    this.isObjectiveCompleted = this.objectiveService.isObjectiveCompleted(
      this.playerSecretObjective.id, 
      gameState, 
      this.activePlayerClan
    );
  }

  loadGameState(): void {
    const gameState = this.gameStateService.getGameState();
    if (gameState) {
      this.provinces = Object.values(gameState.provinces);
      this.updateObjectiveStatus();
    }
  }

  // Перевірка, чи зараз хід поточного активного гравця (наприклад, порівняння з активним ходом у гейм-стейті)
  get isCurrentPlayerTurn(): boolean {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return false;
    // Припустимо, що в гейм-стейті є поле currentClan або активний гравець для ходу
    // Замініть 'gameState.currentClan' на актуальну властивість вашого стану гри, якщо вона називається інакше
    return gameState.firstPlayerClan === this.activePlayerClan; 
  }
  // Отримати всі активні картки регіонів поточної гри
  get activeRegionCards(): RegionCard[] {
    return this.regionCardService.getActiveRegionCards();
  }

  // Кількість доступних карт регіонів у володінні активного гравця
  get ownedRegionCardsCount(): number {
    return this.regionCardService.getOwnedCardsCountForClan(this.activePlayerClan);
  }
  // Тільки карти регіонів, якими володіє поточний активний гравець
  get ownedRegionCardsForActivePlayer(): RegionCard[] {
    return this.regionCardService.getActiveRegionCards().filter(
      card => card.status === 'owned' && card.ownerClan === this.activePlayerClan
    );
  }

  get activePlayerClan(): ClanType {
    const state = this.gameStateService.getGameState();
    return state ? state.firstPlayerClan : 'Crab';
  }

  getProvinceStyle(provinceId: string): { [key: string]: string } {
    const coords = this.coordMap[provinceId] || { x: 50, y: 50 };
    return {
      top: `${coords.y}%`,
      left: `${coords.x}%`
    };
  }

  isProvinceUnderAttack(provinceId: string): boolean {
    return this.currentBattleProvinceId === provinceId;
  }

  // --- МЕХАНІКА ЗУМУ ТА ПЕРЕТЯГУВАННЯ ---
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    if (event.deltaY < 0) {
      this.scale = Math.min(this.scale + zoomIntensity, 3);
    } else {
      this.scale = Math.max(this.scale - zoomIntensity, 1);
    }
    if (this.scale === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }
  // Зупиняє передачу події коліщатка миші на карту, щоб працював скрол у шухлядці
  onDrawerWheel(event: WheelEvent): void {
    event.stopPropagation();
  }

  zoomIn() {
    this.scale = Math.min(this.scale + 0.2, 3);
  }

  zoomOut() {
    this.scale = Math.max(this.scale - 0.2, 1);
    if (this.scale === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  startDrag(event: MouseEvent) {
    if (this.scale === 1) return;
    this.isDragging = true;
    this.startX = event.clientX - this.translateX;
    this.startY = event.clientY - this.translateY;
  }

  onDrag(event: MouseEvent) {
    if (!this.isDragging) return;
    this.translateX = event.clientX - this.startX;
    this.translateY = event.clientY - this.startY;
  }

  stopDrag() {
    this.isDragging = false;
  }
onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    
    // Запам'ятовуємо координати початку дотику для перевірки кліку
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isMoved = false;

    if (this.scale === 1) return;

    this.isDragging = true;
    this.startX = this.touchStartX - this.translateX;
    this.startY = this.touchStartY - this.translateY;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging || event.touches.length !== 1) return;

    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;

    // Якщо палець змістився більше ніж на 5 пікселів, вважаємо це перетягуванням карти
    if (Math.abs(currentX - this.touchStartX) > 5 || Math.abs(currentY - this.touchStartY) > 5) {
      this.isMoved = true;
    }

    if (this.isMoved) {
      event.preventDefault(); // Забороняємо скрол тільки коли реально тягнемо карту
      this.translateX = currentX - this.startX;
      this.translateY = currentY - this.startY;
    }
  }

  closeTooltip(): void {
    this.selectedProvince = null;
  }

  // --- ПОВЕРНУТО КЕРУВАННЯ КЛАВІАТУРОЮ (WASD, Стрілки, Shift, Ctrl) ---
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (['input', 'textarea'].includes((event.target as HTMLElement).tagName.toLowerCase())) return;
    
    const step = 40;

    switch (event.key.toLowerCase()) {
      case 'w': case 'ц': case 'arrowup': this.translateY += step; break;
      case 's': case 'і': case 'arrowdown': this.translateY -= step; break;
      case 'a': case 'ф': case 'arrowleft': this.translateX += step; break;
      case 'd': case 'в': case 'arrowright': this.translateX -= step; break;
      case 'shift': 
        event.preventDefault();
        this.zoomIn(); 
        break;
      case 'control': 
        event.preventDefault();
        this.zoomOut(); 
        break;
    }
  }

  isProvinceTargetable(province: Province): boolean {
    if (this.gameStateService.getInitialPlacementStatus()) {
      return this.gameStateService.isValidInitialControlPlacement(province, this.activePlayerClan);
    }
    const selectedToken = this.gameStateService.getSelectedToken();
    if (!selectedToken) return false;
    return this.gameStateService.isProvinceValidTarget(province, this.activePlayerClan);
  }
  
 onProvinceClick(province: Province): void {
  // this.updateObjectiveStatus();
    const unicornState = this.getUnicornState();
    if (unicornState.isActive) {
      const handled = this.gameStateService.handleUnicornProvinceClick(province.id);
      if (handled) {
        this.loadGameState();
        this.cdr.detectChanges(); // Примусово оновлюємо UI
        return; 
      }
    }
    // 2. ПЕРЕВІРКА СКІЛУ СКОРПІОНА: якщо шпигунство активне, розкриваємо ворожий жетон
    const scorpionState = this.getScorpionState();
    if (scorpionState.isActive) {
      const handled = this.gameStateService.handleScorpionProvinceClick(province.id);
      if (handled) {
        this.loadGameState();
        this.cdr.detectChanges();
        return;
      }
    }
    // Перевірка бонусів Розвідки та Сюгендзя
    if (this.isReconActive) {
      const handled = this.gameStateService.handleReconProvinceClick(province.id, this.activePlayerClan);
      if (handled) {
        this.loadGameState();
        this.cdr.detectChanges();
        return;
      }
    }

    if (this.isShugenjaActive) {
      const handled = this.gameStateService.handleShugenjaProvinceClick(province.id, this.activePlayerClan);
      if (handled) {
        this.loadGameState();
        this.cdr.detectChanges();
        return;
      }
    }

    if (this.gameStateService.getInitialPlacementStatus()) {
      const success = this.gameStateService.placeInitialControlToken(province.id, this.activePlayerClan);
      if (success) {
        this.loadGameState();
        this.cdr.detectChanges();
      }
      return;
    }

    const selectedToken = this.gameStateService.getSelectedToken();
    if (selectedToken && this.isProvinceTargetable(province)) {
      const success = this.gameStateService.placeTokenOnProvince(province.id, this.activePlayerClan);
      if (success) {
        this.loadGameState();
        this.cdr.detectChanges();
      }
      return;
    }

    if (this.selectedProvince && this.selectedProvince.id === province.id) {
      this.closeTooltip();
    } else {
      this.selectedProvince = province;
    }
    // 1. ПЕРЕВІРКА ЕФЕКТУ "ВИХІД ДО МОРЯ"
    if (this.regionCardService.harborEffect) {
      this.onHarborProvinceClick(province);
      return;
    }
    // 2. ПЕРЕВІРКА ЕФЕКТУ "ДИПЛОМАТИЧНА МІСІЯ"
    if (this.regionCardService.diplomacyEffect) {
      this.onDiplomacyProvinceClick(province);
      return;
    }
    // 3. ПЕРЕВІРКА ЕФЕКТУ "КОДЕКС ЧЕСТІ"
    if (this.regionCardService.honorCodeEffect) {
      this.onHonorCodeProvinceClick(province);
      return;
    }
    // 4. ПЕРЕВІРКА ЕФЕКТУ "БЛАГОСЛОВЕННА ЗЕМЛЯ"
    if (this.regionCardService.shrineEffect) {
      this.onShrineProvinceClick(province);
      return;
    }
    // 5. ПЕРЕВІРКА ЕФЕКТУ "РУХ ДЛЯ ЦІЛІ"
    if (this.regionCardService.targetMovementEffect) {
      this.onTargetMovementProvinceClick(province);
      return;
    }
    // 6. ПЕРЕВІРКА ЕФЕКТУ "БУСІДО"
    if (this.regionCardService.bushidoEffect) {
      this.onBushidoProvinceClick(province);
      return;
    }
    if (this.regionCardService.gloryEffect) {
      this.onGloryProvinceClick(province);
      return;
    }
    // 7. ПЕРЕВІРКА ЕФЕКТУ "ПІДТРИМКА КАМІ"
    if (this.regionCardService.kamiSupportEffect) {
      this.onKamiSupportProvinceClick(province);
      return;
    }
    // 8. ПЕРЕВІРКА ЕФЕКТУ "ОЧИЩЕННЯ"
    if (this.regionCardService.cleansingEffect) {
      this.onCleansingProvinceClick(province);
      return;
    }
    // 9. ПЕРЕВІРКА ЕФЕКТУ "ВОГНІ ПОВСТАННЯ"
    if (this.regionCardService.firesOfRebellionEffect) {
      this.onFiresOfRebellionProvinceClick(province);
      return;
    } 
    // 10. ПЕРЕВІРКА ЕФЕКТУ "КУЛЬТУРНИЙ ОБМІН"
    if (this.regionCardService.culturalExchangeEffect) {
      this.onCulturalExchangeProvinceClick(province);
      return;
    }
    // 11. ПЕРЕВІРКА ЕФЕКТУ "ВОСКРЕСІННЯ МЕРТВИХ"
    if (this.regionCardService.resurrectionEffect && this.regionCardService.resurrectionEffect.step === 'select_province_for_sacrifice') {
      if (province.controllingClan === this.activePlayerClan && (province.controlTokensFaceUp || 0) > 0) {
        const gameState = this.gameStateService.getGameState();
        if (gameState) {
          this.regionCardService.sacrificeTokenForResurrection(province.id, gameState);
          this.gameStateService.saveGame();
          this.loadGameState();
          this.cdr.detectChanges(); // Примусово оновлюємо UI, щоб з'явилася модалка вибору зі скиду
        }
      }
      return;
    }
    // 12. ПЕРЕВІРКА ЕФЕКТУ "ВЛАДА ЖАХУ"
    if (this.regionCardService.terrorRuleEffect) {
      // Якщо це другий крок і на провінції немає особливих жетонів — ПОВНІСТЮ БЛОКУЄМО КЛІК
      if (this.regionCardService.terrorRuleEffect.step === 'remove_special_tokens') {
        if (!this.regionCardService.hasProvinceSpecialTokens(province)) {
          return; // Клік по звичайній провінції повністю ігнорується
        }
      }
      this.onTerrorRuleProvinceClick(province);
      return;
    }
    // 13. ПЕРЕВІРКА ЕФЕКТУ "ВБИВСТВО СЛАБКИХ"
    if (this.regionCardService.murderOfWeakEffect && this.regionCardService.murderOfWeakEffect.step === 'remove_enemy_tents') {
      this.onMurderOfWeakProvinceClick(province);
      return;
    }
  }

  
 async executeBattleCinematicSequence() {
    if (this.isCinematicPlaying) return;

    const battleProvinces = Array.from(
      new Set(
        this.provinces
          .filter(p => p.placedTokens && p.placedTokens.length > 0 && !p.hasPeaceToken && !p.hasScorchedEarth)
          .map(p => p.id)
      )
    );

    if (battleProvinces.length === 0) {
      this.gameStateService.nextPhase();
      this.loadGameState();
      this.cdr.detectChanges();
      return;
    }

    this.isCinematicPlaying = true;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.cdr.detectChanges(); // Примусово оновлюємо стан на початку

    // Розкриваємо жетони через сервіс
    this.gameStateService.startCinematicResolution(() => {
      this.loadGameState();
      this.cdr.detectChanges();
    });

    try {
      const totalProvincesCount = battleProvinces.length;

      for (const provId of battleProvinces) {
        this.currentBattleProvinceId = provId;
        
        const prov = this.provinces.find(p => p.id === provId);
        if (prov) {
          if (prov.hasPeaceToken) {
            this.currentBannerState = { text: 'МИР', type: 'peace' };
          } else if (prov.hasScorchedEarth) {
            this.currentBannerState = { text: 'ПОГРОМ', type: 'pogrom' };
          } else {
            const activeToken = prov.placedTokens?.find(pt => pt.isFaceUp);
            const clan = activeToken ? activeToken.clan : 'Ворог';
            const faceUpTokens = prov.placedTokens?.filter(
              pt => pt.isFaceUp && pt.token.strength > 0
            ) ?? [];
            
            let totalAttackStrength = 0;
            faceUpTokens.forEach(pt => {
              if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
                const str = pt.strength !== undefined ? pt.strength : pt.token.strength;
                totalAttackStrength += str;
              }
            });

            const clanColor = this.clanColors[clan] || '#ffd699';
            this.currentBannerState = {
              text: `ПРОВІНЦІЯ ${prov.name.toUpperCase()} БУЛО АТАКОВАНО CИЛОЮ: (${totalAttackStrength})`,
              type: 'attack',
              style: { color: clanColor }
            };
          }
        }

        // Оновлюємо UI перед зближенням камери
        this.cdr.detectChanges();

        // Зближення камери з містом
        this.zoomToProvince(provId);
        this.cdr.detectChanges();
        await this.delay(800);

        let strikesCount = 1;
        if (prov && prov.placedTokens) {
          const activeTokens = prov.placedTokens.filter(pt => pt.isFaceUp);
          if (activeTokens.length > 0) {
            const strengths = activeTokens.map(t => t.token?.strength || 1);
            strikesCount = Math.max(...strengths, 1);
          }
        }

        const timeBudgetPerProvince = Math.max(1500, Math.floor(10000 / totalProvincesCount) - 1400);
        const singleStrikeCycleTime = Math.max(100, Math.floor(timeBudgetPerProvince / strikesCount));
        
        const strikeDuration = Math.max(80, Math.floor(singleStrikeCycleTime * 0.6));
        const strikePause = Math.max(40, Math.floor(singleStrikeCycleTime * 0.4));

        for (let i = 0; i < strikesCount; i++) {
          this.isAttackingStrikeActive = true;
          this.cdr.detectChanges(); // Оновлюємо для початку удару
          await this.delay(strikeDuration);                
          
          this.isAttackingStrikeActive = false; 
          this.cdr.detectChanges(); // Оновлюємо для завершення удару
          await this.delay(strikePause);                
        }

        this.currentBannerState = null;
        this.cdr.detectChanges();
        await this.delay(200);

        this.resetCamera();
        this.cdr.detectChanges();
        await this.delay(600); 
      }
    } catch (error) {
      console.error('Помилка під час кінематографічного циклу битв:', error);
    } finally {
      this.currentBannerState = null;
      this.currentBattleProvinceId = null;
      this.isAttackingStrikeActive = false;
      this.isCinematicPlaying = false;
      
      this.gameStateService.nextPhase();
      this.loadGameState();
      this.cdr.detectChanges();
    }
  }

  // Оновлений метод delay із вбудованим викликом ChangeDetectorRef
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.cdr.detectChanges(); // Гарантовано рендерить зміни після кожної мікропаузи
        resolve();
      }, ms);
    });
  }

  zoomToProvince(provinceId: string) {
  const coords = this.coordMap[provinceId];
  if (!coords) return;
  // Вмикаємо вітер на зближення (розмиття країв + розліт ліній назовні)
    this.isWindZoomingIn = true;
    this.isWindZoomingOut = false;

  const viewport = document.querySelector('.map-viewport') as HTMLElement;
  const mapContainer = document.querySelector('.map-image-container') as HTMLElement;

  if (viewport && mapContainer) {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    const zoomScale = 2.5;

    const targetX = (coords.x / 100) * mapWidth;
    const targetY = (coords.y / 100) * mapHeight;

    // Формула тепер працюватиме ідеально завдяки transform-origin: 0 0
    const finalTranslateX = (viewportWidth / 2) - (targetX * zoomScale);
    const finalTranslateY = (viewportHeight / 2) - (targetY * zoomScale);

    this.cameraTransform = `translate(${finalTranslateX}px, ${finalTranslateY}px) scale(${zoomScale})`;
    // Вимикаємо вітер після завершення руху камери (через 800мс, скільки триває transition)
    setTimeout(() => {
      this.isWindZoomingIn = false;
    }, 150);
  }
}

  resetCamera() {
  // Вмикаємо вітер на віддалення (лінії збираються до центру)
    this.isWindZoomingIn = false;
    this.isWindZoomingOut = true;
    this.cameraTransform = 'translate(0px, 0px) scale(1)';
    setTimeout(() => {
    this.isWindZoomingOut = false;
    }, 150);
  }
  getUnicornState() {
    return this.gameStateService.getUnicornSkillState();
  }
  // onProvinceClicked(provinceId: string): void {
  //   // 1. ПЕРЕВІРКА СКІЛУ ЄДИНОРОГА: якщо скіл активний, перехоплюємо клік
  //   const unicornState = this.getUnicornState();
  //   if (unicornState.isActive) {
  //     const handled = this.gameStateService.handleUnicornProvinceClick(provinceId);
  //     if (handled) return; // Якщо клік опрацьовано скілом — перериваємо подальшу логіку
  //   }

  //   // 2. Звичайний код кліку по провінції (знаходимо об'єкт провінції за ID і передаємо далі)
  //   const province = this.provinces.find(p => p.id === provinceId);
  //   if (province) {
  //     this.executeStandardProvinceClick(province);
  //   }
  // }

  // private executeStandardProvinceClick(province: Province): void {
  //   if (this.gameStateService.getInitialPlacementStatus()) {
  //     const success = this.gameStateService.placeInitialControlToken(province.id, this.activePlayerClan);
  //     if (success) this.loadGameState();
  //     return;
  //   }

  //   const selectedToken = this.gameStateService.getSelectedToken();
  //   if (selectedToken && this.isProvinceTargetable(province)) {
  //     const success = this.gameStateService.placeTokenOnProvince(province.id, this.activePlayerClan);
  //     if (success) this.loadGameState();
  //     return;
  //   }

  //   if (this.selectedProvince && this.selectedProvince.id === province.id) {
  //     this.closeTooltip();
  //   } else {
  //     this.selectedProvince = province;
  //   }
  // }
  isUnicornSource(province: Province): boolean {
    const state = this.getUnicornState();
    return state.isActive && state.selectedProvinceId === province.id;
  }

  isUnicornTarget(province: Province): boolean {
    const state = this.getUnicornState();
    if (!state.isActive || !state.selectedProvinceId) return false;
    if (state.selectedProvinceId === province.id) return false;
    return (province.placedTokens || []).some((t: any) => t.clan === 'Unicorn');
  }

  cancelUnicorn(): void {
    this.gameStateService.cancelUnicornSkill();
  }
  getScorpionState() {
    return this.gameStateService.getScorpionSkillState();
  }

  isScorpionTarget(province: Province): boolean {
    const state = this.getScorpionState();
    if (!state.isActive) return false;
    // Перевіряємо, чи є на провінції закриті ворожі жетони (не Скорпіона)
    return (province.placedTokens || []).some(t => t.clan !== 'Scorpion' && !t.isFaceUp);
  }

  cancelScorpion(): void {
    this.gameStateService.cancelScorpionSkill();
  }
 // Метод, який запускає візуальний відлік на мапі
  startDragonVisualTimer(seconds: number, onTimeUp: () => void) {
    this.displayTimer = seconds;
    clearInterval(this.localTimerInterval);

    this.localTimerInterval = setInterval(() => {
      if (this.displayTimer > 0) {
        this.displayTimer--;
        this.cdr.detectChanges(); // Примусово оновлюємо UI щосекунди рівно
      }

      if (this.displayTimer <= 0) {
        clearInterval(this.localTimerInterval);
        onTimeUp(); // Викликаємо подію завершення часу в сервісі
      }
    }, 1000);
  }
  // Отримання даних бонусних карт поточного активного гравця
  get playerBonusCards() {
    const state = this.gameStateService.getGameState();
    if (!state || this.activePlayerClan === 'Neutral') return { shugenja: 0, recon: 0 };
    const player = state.players[this.activePlayerClan] as
      | (PlayerState & { bonusCards?: { shugenja: number; recon: number } })
      | undefined;
    return player?.bonusCards || { shugenja: 0, recon: 0 };
  }

  // Перевірка, чи активний режим Розвідки
  get isReconActive(): boolean {
    return this.gameStateService.isReconActive;
  }

  // Перевірка, чи активний режим Сюгендзя
  get isShugenjaActive(): boolean {
    return this.gameStateService.isShugenjaActive;
  }

  // Клік по іконці Розвідки
  onReconIconClick(): void {
    const cards = this.playerBonusCards;
    if (cards.recon <= 0) return;
    this.gameStateService.activateReconBonus(this.activePlayerClan);
  }

  // Клік по іконці Сюгендзя
  onShugenjaIconClick(): void {
    const cards = this.playerBonusCards;
    if (cards.shugenja <= 0) return;
    this.gameStateService.activateShugenjaBonus(this.activePlayerClan);
  }

  // Перевірка для підсвічування цілей на мапі під час використання бонусів
  isReconTarget(province: Province): boolean {
    if (!this.isReconActive) return false;
    return (province.placedTokens || []).some(t => t.clan !== this.activePlayerClan && !t.isFaceUp);
  }

  isShugenjaTarget(province: Province): boolean {
    if (!this.isShugenjaActive) return false;
    return (province.placedTokens || []).some(t => t.clan !== this.activePlayerClan);
  }

  // Відкрити модальне вікно для перегляду деталей своєї цілі при кліку на прямокутник справа
  toggleObjectiveDrawer(): void {
    this.isObjectiveDrawerOpen = !this.isObjectiveDrawerOpen;
  }
  // Відкрити/закрити шухлядку регіонів
  toggleRegionDrawer(): void {
    this.isRegionDrawerOpen = !this.isRegionDrawerOpen;
    // Закриваємо іншу шухлядку для зручності
    if (this.isRegionDrawerOpen) {
      this.isObjectiveDrawerOpen = false;
    }
  }


  /*КАРТИ РЕГІОНІВ */
  // Клік на картку регіону в шухлядці (активація) з перевіркою ходу та збереженням в localStorage
  onRegionCardClick(card: RegionCard): void {
   if (card.status !== 'owned') return;
    this.isRegionDrawerOpen = false; // Закриваємо шухлядку регіонів
    // Якщо це карта регіону "Рокіровка"
    if (card.title === 'Рокіровка') {
      const success = this.regionCardService.startRokirovkaEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Вихід до моря') {
      const success = this.regionCardService.startHarborEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Дипломатична місія') {
      const success = this.regionCardService.startDiplomacyEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Кодекс честі') {
      const success = this.regionCardService.startHonorCodeEffect(card.id, this.activePlayerClan, () => {});
    }else if (card.title === 'Благословенна земля') {
      const success = this.regionCardService.startShrineEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Рух до цілі') {
      const success = this.regionCardService.startTargetMovementEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Бусідо') {
      const success = this.regionCardService.startBushidoEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Шляхетна битва') {
      const success = this.regionCardService.startGloryEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Підтримка Камі') {
      const success = this.regionCardService.startKamiSupportEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Очищення') {
      const success = this.regionCardService.startCleansingEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Вогні повстання') {
      const success = this.regionCardService.startFiresOfRebellionEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Шпіонська мережа') {
      const success = this.regionCardService.startSpyNetworkEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Підкріплення') {
      const success = this.regionCardService.startReinforcementEffect(card.id, this.activePlayerClan, () => {});
    }else if (card.title === 'Культурний обмін') {
      const success = this.regionCardService.startCulturalExchangeEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title.includes('Воскресіння мертвих')) {
      const success = this.regionCardService.startResurrectionEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title.includes('Влада жаху')) {
      const success = this.regionCardService.startTerrorRuleEffect(card.id, this.activePlayerClan, () => {});
    } else if (card.title === 'Вбивство слабких') {
     const success = this.regionCardService.startMurderOfWeakEffect(card.id, this.activePlayerClan, () => {});
      if (success) {
        if (this.activePlayerClan !== 'Neutral') {
          (this.gameStateService as any).openPlayerScreenTrigger = true;
        }
        this.cdr.detectChanges();        
      }
    } else {
      // alert(`Ефект картки "${card.title}" буде реалізовано на наступному етапі!`);
    }
  }

  // Синхронізація карток регіонів із localStorage
  syncRegionCardsToLocalStorage(): void {
    const activeCards = this.regionCardService.getActiveRegionCards();
    localStorage.setItem('rokugan_region_cards', JSON.stringify(activeCards));
  }

  // Виклик синхронізації при завантаженні (можна додати в ngOnInit)
  loadRegionCardsFromLocalStorage(): void {
    const saved = localStorage.getItem('rokugan_region_cards');
    if (saved) {
      try {
        const parsedCards = JSON.parse(saved);
        // Якщо у вашому сервісі є метод встановлення/завантаження карт, викличте його тут.
        // наприклад: this.regionCardService.setActiveRegionCards(parsedCards);
      } catch (e) {
        console.error('Помилка читання карт регіонів з localStorage', e);
      }
    }
  }

  /*КАРТА РЕГІОНУ "РОКІРОВКА" */
  // Фільтруємо скид гравця (тільки Армія, Флот, Шинобі)
  get filteredDiscardPileForRokirovka() {
    const effect = this.regionCardService.rokirovkaEffect;
    if (!effect) return [];
    const gameState = this.gameStateService.getGameState();
    const player = gameState?.players[effect.clan as keyof NonNullable<typeof gameState>['players']];
    if (!player || !player.discardPile) return [];
    return player.discardPile.filter((t: any) => ['Army', 'Navy', 'Shinobi'].includes(t.type));
  }

  // Отримуємо поточну руку (ширму) клану, що виконує Рокіровку
  get currentRokirovkaHandTokens() {
    const effect = this.regionCardService.rokirovkaEffect;
    if (!effect) return [];
    const gameState = this.gameStateService.getGameState();
    const player = gameState?.players[effect.clan as keyof NonNullable<typeof gameState>['players']];
    if (!player || !player.activeHandTokens) return [];
    return player.activeHandTokens.filter((t: any) => t.type !== 'Blank');
  }

 onSelectDiscardTokenForRokirovka(token: any): void {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;
    
    // Переносимо карту зі скиду в руку з зеленою обводкою і закриваємо модалку скиду
    this.regionCardService.selectCardFromDiscard(token, gameState);
    this.gameStateService.saveGame();

    // АВТОМАТИЧНО ВІДКРИВАЄМО ІГРОВУ ШИРМУ ГРАВЦЯ (Крок 6)
    // Зберігаємо подію/сигнал або викликаємо відкриття ширми:
    // Наприклад, якщо у тебе є доступ до компонента ширми або через @ViewChild, 
    // або просто встановивши прапорець у gameStateService:
    if (this.activePlayerClan !== 'Neutral' && gameState.players[this.activePlayerClan]) {
      // Можемо тримати подію відкриття ширми в сервісі
      (this.gameStateService as any).openPlayerScreenTrigger = true;
    }
  }

  onSelectHandTokenToDiscard(token: any): void {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;
    this.regionCardService.completeRokirovkaEffect(token, gameState);
    this.gameStateService.saveGame();
  }

  onCancelRokirovka(): void {
    this.regionCardService.cancelRokirovkaEffect();
  }
  /*КАРТА РЕГІОНУ "ВИХІД ДО МОРЯ" */
  // Перевірка, чи підсвічувати провінцію для розміщення порту
  isHarborTarget(province: Province): boolean {
    if (!this.regionCardService.harborEffect) return false;
    // Умова: провінція материкова (не прибережна) і не має порту
    return !province.isCoastal && !province.hasHarbor;
  }

  // Клік по провінції під час активного ефекту Порту
  onHarborProvinceClick(province: Province): void {
    if (!this.isHarborTarget(province)) return;
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeHarborEffect(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  // Кнопка відміни ефекту
  cancelHarborEffect(): void {
    this.regionCardService.cancelHarborEffect();
  }

  /* ДИПЛОМАТИЧНА МІСІЯ */
  // Відміна ефекту Дипломатії
  cancelDiplomacyEffect(): void {
    this.regionCardService.cancelDiplomacyEffect();
  }

  // Які провінції підсвічуються залежно від кроку ефекту
  isDiplomacyTarget(province: Province): boolean {
    const effect = this.regionCardService.diplomacyEffect;
    if (!effect) return false;

    if (effect.step === 'select_target_province') {
      return true; // На першому кроці мигають ВСІ провінції
    }
    if (effect.step === 'select_first_own_province' || effect.step === 'select_second_own_province') {
      return province.controllingClan === this.activePlayerClan; // На наступних кроках — тільки свої провінції
    }
    return false;
  }

  // Обробка кліку по провінції для Дипломатії
  onDiplomacyProvinceClick(province: Province): void {
    const effect = this.regionCardService.diplomacyEffect;
    if (!effect) return;
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    if (effect.step === 'select_target_province') {
      // Перевіряємо, чи провінція належить поточному гравцю
      if (province.controllingClan === this.activePlayerClan) {
        // Якщо своя — ставимо значок миру туди, і місія виконана
        province.hasPeaceToken = true;
        this.regionCardService.useRegionCard(effect.cardId, effect.clan);
        gameState.roundLog.push(`🕊️ Дипломатична місія завершена: встановлено мир у власній провінції ${province.name}.`);
        this.regionCardService.cancelDiplomacyEffect();
      } else {
        // Якщо чужа або нейтральна — мир НЕ ставимо, а зразу переходимо до вибору своїх провінцій для контролю
        effect.step = 'select_first_own_province';
        effect.targetProvinceId = province.id;
        gameState.roundLog.push(`🕊️ Дипломатична місія: обрано чужу/нейтральну провінцію ${province.name}. Мир не встановлено. Оберіть першу свою провінцію для бонусу контролю.`);
      }
    } 
    else if (effect.step === 'select_first_own_province') {
      if (province.controllingClan !== this.activePlayerClan) return; // Можна клікати тільки на свої провінції

      province.controlTokensFaceUp += 1;
      effect.step = 'select_second_own_province';
      gameState.roundLog.push(`🕊️ Виберіть другу свою провінцію для збільшення жетона контролю.`);
    } 
    else if (effect.step === 'select_second_own_province') {
      if (province.controllingClan !== this.activePlayerClan) return;

      province.controlTokensFaceUp += 1;
      gameState.roundLog.push(`🕊️ Дипломатична місія повністю завершена!`);

      // Списуємо картку регіону
      this.regionCardService.useRegionCard(effect.cardId, effect.clan);
      this.regionCardService.cancelDiplomacyEffect();
    }

    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "КОДЕКС ЧЕСТІ" */
  cancelHonorCodeEffect(): void {
    this.regionCardService.cancelHonorCodeEffect();
  }

  // Перевірка, чи підсвічувати провінцію (Крім тіньових земель!)
  isHonorCodeTarget(province: Province): boolean {
    const effect = this.regionCardService.honorCodeEffect;
    if (!effect) return false;

    // Забороняємо вибирати провінції тіньових земель (у тебе regionId містить 'shadowlands' або назву тіньових земель)
    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return false;
    }

    // Якщо це другий крок, не даємо вибрати ту саму провінцію двічі
    if (effect.step === 'select_second_province' && effect.firstProvinceId === province.id) {
      return false;
    }

    return true;
  }

  // Обробка кліку по провінції для Кодексу честі
  onHonorCodeProvinceClick(province: Province): void {
    const effect = this.regionCardService.honorCodeEffect;
    if (!effect) return;

    // Заборона на тіньові землі
    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return;
    }

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    if (effect.step === 'select_first_province') {
      // Додаємо 1 бонус честі до першої провінції
      province.honorFlowers = (province.honorFlowers || 0) + 1;
      
      effect.step = 'select_second_province';
      effect.firstProvinceId = province.id;
      gameState.roundLog.push(`📜 Кодекс честі: обрано першу провінцію ${province.name}. Оберіть другу провінцію.`);
    } 
    else if (effect.step === 'select_second_province') {
      if (effect.firstProvinceId === province.id) return; // Не можна вибрати ту саму

      // Додаємо 1 бонус честі до другої провінції
      province.honorFlowers = (province.honorFlowers || 0) + 1;
      
      gameState.roundLog.push(`📜 Кодекс честі успішно застосовано! У дві провінції додано бонуси честі.`);

      // Списуємо картку регіону та закриваємо ефект
      this.regionCardService.useRegionCard(effect.cardId, effect.clan);
      this.regionCardService.cancelHonorCodeEffect();
    }

    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "БЛАГОСЛОВЕННА ЗЕМЛЯ" */
  cancelShrineEffect(): void {
    this.regionCardService.cancelShrineEffect();
  }

  // Підсвічування провінцій для побудови святині (наприклад, підконтрольні гравцю провінції без святині)
  isShrineTarget(province: Province): boolean {
    const effect = this.regionCardService.shrineEffect;
    if (!effect) return false;
    return province.controllingClan === this.activePlayerClan && !province.hasShrine;
  }

  onShrineProvinceClick(province: Province): void {
    const effect = this.regionCardService.shrineEffect;
    if (!effect) return;
    if (province.controllingClan !== this.activePlayerClan) return;

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeShrineEffect(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }
  // /* КАРТА РЕГІОНУ "РУХ ДЛЯ ЦІЛІ" */
  cancelTargetMovementEffect(): void {
    this.regionCardService.cancelTargetMovementEffect();
  }

  // Перевірка підсвічування: тільки підконтрольні поточниму клану провінції (на другому кроці не можна обрати ту саму двічі)
  isTargetMovementTarget(province: Province): boolean {
    const effect = this.regionCardService.targetMovementEffect;
    if (!effect) return false;

    if (province.controllingClan !== this.activePlayerClan) return false;

    if (effect.step === 'select_second_province' && effect.firstProvinceId === province.id) {
      return false;
    }

    return true;
  }

  // Обробка кліку по провінції для "Руху до цілі"
  onTargetMovementProvinceClick(province: Province): void {
    const effect = this.regionCardService.targetMovementEffect;
    if (!effect) return;
    if (province.controllingClan !== this.activePlayerClan) return;

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    if (effect.step === 'select_first_province') {
      province.controlTokensFaceUp += 1;
      
      effect.step = 'select_second_province';
      effect.firstProvinceId = province.id;
      gameState.roundLog.push(`🐉 Рух до цілі: обрано першу провінцію ${province.name}. Оберіть другу провінцію.`);
    } 
    else if (effect.step === 'select_second_province') {
      if (effect.firstProvinceId === province.id) return;

      province.controlTokensFaceUp += 1;
      
      gameState.roundLog.push(`🐉 Рух до цілі успішно застосовано! У дві провінції додано по жетону контролю.`);

      // Списуємо картку регіону та завершуємо ефект
      this.regionCardService.useRegionCard(effect.cardId, effect.clan);
      this.regionCardService.cancelTargetMovementEffect();
    }

    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "БУСІДО" */
  cancelBushidoEffect(): void {
    this.regionCardService.cancelBushidoEffect();
  }

  // Перевірка підсвічування: всі провінції, крім тіньових земель
  isBushidoTarget(province: Province): boolean {
    const effect = this.regionCardService.bushidoEffect;
    if (!effect) return false;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return false;
    }

    return true;
  }

  // Обробка кліку по провінції для "Бусідо"
  onBushidoProvinceClick(province: Province): void {
    const effect = this.regionCardService.bushidoEffect;
    if (!effect) return;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return;
    }

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeBushidoEffect(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "ШЛЯХЕТНА БИТВА" */
  cancelGloryEffect(): void {
    this.regionCardService.cancelGloryEffect();
  }

  // Перевірка підсвічування: всі провінції, крім тіньових земель
  isGloryTarget(province: Province): boolean {
    const effect = this.regionCardService.gloryEffect;
    if (!effect) return false;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return false;
    }

    return true;
  }

  // Обробка кліку по провінції для "Шляхетної битви"
  onGloryProvinceClick(province: Province): void {
    const effect = this.regionCardService.gloryEffect;
    if (!effect) return;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return;
    }

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeGloryEffect(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "ПІДТРИМКА КАМІ" */
  cancelKamiSupportEffect(): void {
    this.regionCardService.cancelKamiSupportEffect();
  }

  // Перевірка підсвічування: всі провінції, крім тіньових земель
  isKamiSupportTarget(province: Province): boolean {
    const effect = this.regionCardService.kamiSupportEffect;
    if (!effect) return false;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return false;
    }

    return true;
  }

  // Обробка кліку по провінції для "Підтримки Камі"
  onKamiSupportProvinceClick(province: Province): void {
    const effect = this.regionCardService.kamiSupportEffect;
    if (!effect) return;

    if (province.regionId.toLowerCase().includes('shadowlands') || province.regionId.includes('Тіньових Земель')) {
      return;
    }

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeKamiSupportEffect(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "ОЧИЩЕННЯ" */
  cancelCleansingEffect(): void {
    this.regionCardService.cancelCleansingEffect();
  }

  // Перевірка підсвічування: тільки провінції зі спаленою землею (погромом)
  isCleansingTarget(province: Province): boolean {
    const effect = this.regionCardService.cleansingEffect;
    if (!effect) return false;
    return Boolean(province.hasScorchedEarth);
  }

  // Обробка кліку по провінції для "Очищення"
  onCleansingProvinceClick(province: Province): void {
    const effect = this.regionCardService.cleansingEffect;
    if (!effect) return;
    if (!province.hasScorchedEarth) return;

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeCleansingEffect(province.id, this.activePlayerClan, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }
  /* КАРТА РЕГІОНУ "ВОГНІ ПОВСТАННЯ" */
  cancelFiresOfRebellionEffect(): void {
    this.regionCardService.cancelFiresOfRebellionEffect();
  }

  // Перевірка підсвічування: тільки провінції з жетоном миру
  isFiresOfRebellionTarget(province: Province): boolean {
    const effect = this.regionCardService.firesOfRebellionEffect;
    if (!effect) return false;
    return Boolean(province.hasPeaceToken);
  }

  // Обробка кліку по провінції для "Вогнів повстання"
  onFiresOfRebellionProvinceClick(province: Province): void {
    const effect = this.regionCardService.firesOfRebellionEffect;
    if (!effect) return;
    if (!province.hasPeaceToken) return;

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.completeFiresOfRebellionEffect(province.id, this.activePlayerClan, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "ШПИГУНСЬКА МЕРЕЖА" */
  // Отримати список суперників (усі окрім поточного гравця) для Шпигунської мережі
  get availableClansForSpy(): string[] {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return [];
    return Object.keys(gameState.players).filter(clan => clan !== this.activePlayerClan);
  }

  // Отримати карти руки цільового гравця для відображення на кроці view_hand
  get targetPlayerHandTokens(): any[] {
    const effect = this.regionCardService.spyNetworkEffect;
    if (!effect || !effect.targetClan) return [];
    const gameState = this.gameStateService.getGameState();
    const player = gameState?.players[effect.targetClan as keyof NonNullable<typeof gameState>['players']];
    return player?.activeHandTokens || [];
  }

  // Обробка вибору клану суперника у модалці
  onSelectSpyClan(targetClan: string): void {
   const gameState = this.gameStateService.getGameState();
    if (!gameState) return;
    const effect = this.regionCardService.spyNetworkEffect as any;
    if (!effect || !gameState.players[targetClan as keyof typeof gameState.players]) return;
    
    effect.targetClan = targetClan;
    effect.step = 'view_hand';
    
    this.gameStateService.saveGame();
    this.cdr.detectChanges();
  }

  // Закриття модалки шпигунства та списання карти регіону
  onCloseSpyModal(): void {
    const effect = this.regionCardService.spyNetworkEffect;
    if (effect) {
      this.regionCardService.useRegionCard(effect.cardId, effect.clan);
    }
    this.regionCardService.spyNetworkEffect = null;
    this.gameStateService.saveGame();
    this.loadGameState();
  }

  /* КАРТА РЕГІОНУ "ПІДКРІПЛЕННЯ" */
  get filteredReinforcementDiscardForModal() {
    const effect = this.regionCardService.reinforcementEffect;
    if (!effect) return [];
    const gameState = this.gameStateService.getGameState();
    const player = gameState?.players[effect.clan as keyof NonNullable<typeof gameState>['players']];
    if (!player || !player.discardPile) return [];
    // Тільки карти типу 'Army'
    return player.discardPile.filter((t: any) => t.type === 'Army');
  }

  onSelectReinforcementToken(token: any): void {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;
    
    this.regionCardService.selectReinforcementDiscardToken(token, gameState);
    this.gameStateService.saveGame();

    // Автоматично відкриваємо ігрову ширму гравця для подальшого вибору 2 карт
    if (this.activePlayerClan !== 'Neutral' && gameState.players[this.activePlayerClan]) {
      (this.gameStateService as any).openPlayerScreenTrigger = true;
    }
    this.cdr.detectChanges();
  }

  onCancelReinforcement(): void {
    this.regionCardService.cancelReinforcementEffect();
  }
  
  /* КАРТА РЕГІОНУ "КУЛЬТУРНИЙ ОБМІН" */
  isCulturalExchangeTarget(province: Province): boolean {
    const effect = this.regionCardService.culturalExchangeEffect;
    if (!effect) return false;

    if (effect.step === 'select_own_province') {
      // На першому кроці підсвічуємо тільки власні провінції гравця
      return province.controllingClan === this.activePlayerClan;
    } else if (effect.step === 'select_enemy_province') {
      // На другому кроці підсвічуємо провінції іншого гравця (не свої)
      return province.controllingClan !== this.activePlayerClan;
    }
    return false;
  }
  onCulturalExchangeProvinceClick(province: Province): void {
    const effect = this.regionCardService.culturalExchangeEffect;
    if (!effect) return;
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    if (effect.step === 'select_own_province') {
      if (province.controllingClan !== this.activePlayerClan) return; // Тільки своя

      effect.ownProvinceId = province.id;
      effect.step = 'select_enemy_province';
      gameState.roundLog.push(`🦄 Культурний обмін: обрано свою провінцію ${province.name}. Тепер оберіть провінцію супротивника.`);
      this.gameStateService.saveGame();
      this.loadGameState();
      this.cdr.detectChanges();
    } 
    else if (effect.step === 'select_enemy_province') {
      if (province.controllingClan === this.activePlayerClan) return; // Тільки чужа

      this.regionCardService.completeCulturalExchangeEffect(province.id, gameState);
      this.gameStateService.saveGame();
      this.loadGameState();
      this.cdr.detectChanges();
    }
  }

  cancelCulturalExchangeEffect(): void {
    this.regionCardService.cancelCulturalExchangeEffect();
  }

  /* КАРТА РЕГІОНУ "ВОСКРЕСІННЯ МЕРТВИХ" */
  isResurrectionTarget(province: Province): boolean {
    const effect = this.regionCardService.resurrectionEffect;
    if (!effect) return false;

    if (effect.step === 'select_province_for_sacrifice') {
      // Можна вибрати тільки власні провінції, де є жетони контролю
      return province.controllingClan === this.activePlayerClan && (province.controlTokensFaceUp || 0) > 0;
    }
    return false;
  }
  // Фільтруємо скид гравця для Воскресіння мертвих (будь-які бойові карти або карти атаки)
  get filteredResurrectionDiscardForModal() {
    const effect = this.regionCardService.resurrectionEffect;
    if (!effect) return [];
    const gameState = this.gameStateService.getGameState();
    const player = gameState?.players[effect.clan as keyof NonNullable<typeof gameState>['players']];
    if (!player || !player.discardPile) return [];
    // Можна вибирати бойові карти (Армія, Флот, Синобі тощо)
    return player.discardPile.filter((t: any) => ['Army', 'Navy', 'Shinobi', 'Blessing'].includes(t.type));
  }

  // Обробка вибору карти зі скиду для Воскресіння мертвих
  onSelectResurrectionToken(token: any): void {
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;
    
    // Викликаємо оновлений метод з передачею gameStateService
    this.regionCardService.selectCardFromDiscardForResurrection(token, gameState, this.gameStateService);
    this.gameStateService.saveGame();
    this.loadGameState();
    this.cdr.detectChanges();
  }

  onCancelResurrection(): void {
    this.regionCardService.cancelResurrectionEffect();
    this.loadGameState();
    this.cdr.detectChanges();
  }

  /* КАРТА РЕГІОНУ "ВЛАДА ЖАХУ" */
  isTerrorRuleTarget(province: Province): boolean {
    const effect = this.regionCardService.terrorRuleEffect;
    if (!effect) return false;

    if (effect.step === 'select_province_for_sacrifice') {
      // Крок 1: Тільки власні провінції, де є хоча б 1 жетон контролю
      return province.controllingClan === this.activePlayerClan && (province.controlTokensFaceUp || 0) > 0;
    } else if (effect.step === 'remove_special_tokens') {
      // Крок 2: ТІЛЬКИ ті провінції, які реально мають спеціальні жетони
      return this.regionCardService.hasProvinceSpecialTokens(province);
    }
    return false;
  }

  onTerrorRuleProvinceClick(province: Province): void {
    const effect = this.regionCardService.terrorRuleEffect;
    if (!effect) return;
    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    if (effect.step === 'select_province_for_sacrifice') {
      if (province.controllingClan !== this.activePlayerClan || (province.controlTokensFaceUp || 0) <= 0) return;
      this.regionCardService.sacrificeTokenForTerrorRule(province.id, gameState);
    } else if (effect.step === 'remove_special_tokens') {
      // Подвійна перевірка через сервіс: якщо жетонів немає, повністю ігноруємо
      if (!this.regionCardService.hasProvinceSpecialTokens(province)) {
        return;
      }
      this.regionCardService.removeSpecialTokenFromProvince(province.id, gameState);
    }

    this.gameStateService.saveGame();
    this.loadGameState();
    this.cdr.detectChanges();
  }

  // Завершити ефект Влади жаху достроково (якщо забрано 0 або 1 жетон)
  completeTerrorRuleEarly(): void {
    const effect = this.regionCardService.terrorRuleEffect;
    if (!effect) return;
    const gameState = this.gameStateService.getGameState();
    if (gameState) {
      this.regionCardService.useRegionCard(effect.cardId, effect.clan);
      gameState.roundLog.push(`👹 Влада жаху: гравець завершив прибирання жетонів (${effect.removedCount} з 2).`);
    }
    this.regionCardService.cancelTerrorRuleEffect();
    this.loadGameState();
    this.cdr.detectChanges();
  }
  /* КАРТА РЕГІОНУ "ВБИВСТВО СЛАБКИХ" */
  isMurderOfWeakTarget(province: Province): boolean {
    const effect = this.regionCardService.murderOfWeakEffect;
    if (!effect || effect.step !== 'remove_enemy_tents') return false;
    
    // Провінція повинна містити хоча б один ворожий намет (не нашого клану)
    return (province.placedTokens || []).some((t: any) => t.clan !== this.activePlayerClan);
  }

  onMurderOfWeakProvinceClick(province: Province): void {
    const effect = this.regionCardService.murderOfWeakEffect;
    if (!effect || effect.step !== 'remove_enemy_tents') return;
    
    if (!this.isMurderOfWeakTarget(province)) return;

    const gameState = this.gameStateService.getGameState();
    if (!gameState) return;

    this.regionCardService.removeEnemyTentForMurderOfWeak(province.id, gameState);
    this.gameStateService.saveGame();
    this.loadGameState();
    this.cdr.detectChanges();
  }
}