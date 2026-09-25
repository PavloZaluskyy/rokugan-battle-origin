import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ClanType, Province } from '../../models/game.model';

@Component({
  selector: 'app-game-map',
  standalone: false,
  templateUrl: './game-map.html',
  styleUrl: './game-map.css',
})
export class GameMap implements OnInit {
  provinces: Province[] = [];
  selectedProvince: Province | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isMoved: boolean = false;

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
  private windTimeout: any = null;
  // Стан для перетягування мишкою (Panning)
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;
  isZoomingIn: boolean = false;
  isZoomingOut: boolean = false;

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

  constructor(private gameStateService: GameStateService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadGameState();
    this.cdr.detectChanges();
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
  }

  loadGameState(): void {
    const gameState = this.gameStateService.getGameState();
    if (gameState) {
      this.provinces = Object.values(gameState.provinces);
    }
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
  }

  
 async executeBattleCinematicSequence() {
    if (this.isCinematicPlaying) return;

    // 1. Збираємо всі унікальні провінції, де є бої або атаки
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
      return;
    }

    this.isCinematicPlaying = true;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;

    // Розкриваємо жетони через сервіс
    this.gameStateService.startCinematicResolution(() => {
      this.loadGameState();
    });

    try {
      const totalProvincesCount = battleProvinces.length;

      // Цільовий загальний час — 10 секунд (10000 мс)
      // Виділяємо фіксований час на перельоти камери для кожного замку (наприклад, 800мс на вліт + 600мс на відліт = 1400мс на замок)
      // решту часу ділимо на бої та удари.
      
      for (const provId of battleProvinces) {
        this.currentBattleProvinceId = provId;
        
        const prov = this.provinces.find(p => p.id === provId);
        if (prov) {
          // ПЕРЕВІРКА СПЕЦІАЛЬНИХ СТАНІВ (МИР / ПОГРОМ / АТАКА)
          if (prov.hasPeaceToken) {
            this.currentBannerState = { text: 'МИР', type: 'peace' };
          } else if (prov.hasScorchedEarth) {
            this.currentBannerState = { text: 'ПОГРОМ', type: 'pogrom' };
          } else {
            const activeToken = prov.placedTokens?.find(pt => pt.isFaceUp);
            const clan = activeToken ? activeToken.clan : 'Ворог';
            const unitType = activeToken ? activeToken.token.type : 'Армія';
            const faceUpTokens = prov.placedTokens?.filter(
              pt => pt.isFaceUp && pt.token.strength > 0
            ) ?? [];
            
            let strength = 1;
            if (faceUpTokens.length > 0) {
              strength = Math.max(...faceUpTokens.map(t => t.token.strength));
            }
            let totalAttackStrength = 0;
            const tokenDescriptions: string[] = [];

            faceUpTokens.forEach(pt => {
              if (['Army', 'Navy', 'Shinobi'].includes(pt.token.type)) {
                // Використовуємо актуальну силу (з урахуванням Благословення, якщо воно вже застосоване)
                const str = pt.strength !== undefined ? pt.strength : pt.token.strength;
                totalAttackStrength += str;
                tokenDescriptions.push(`${pt.token.type} (${str})`);
              } else if (pt.token.type === 'Blessing') {
                tokenDescriptions.push(`Благословення (+2)`);
              } else if (pt.token.type === 'Raid') {
                tokenDescriptions.push(`Погром`);
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

        // Зближення камери з містом
        this.zoomToProvince(provId);
        await this.delay(800); // Час підльоту камери

        // Визначаємо кількість ударів для поточного юніта
        let strikesCount = 1;
        if (prov && prov.placedTokens) {
          const activeTokens = prov.placedTokens.filter(pt => pt.isFaceUp);
          if (activeTokens.length > 0) {
            const strengths = activeTokens.map(t => t.token?.strength || 1);
            strikesCount = Math.max(...strengths, 1);
          }
        }

        // Динамічний розрахунок часу на один удар, щоб укластися в загальний бюджет 10 секунд на всю гру
        // Наприклад, виділяємо приблизно (10000мс / кількість провінцій) на один замок.
        const timeBudgetPerProvince = Math.max(1500, Math.floor(10000 / totalProvincesCount) - 1400);
        const singleStrikeCycleTime = Math.max(100, Math.floor(timeBudgetPerProvince / strikesCount));
        
        // Розбиваємо цей час на сам удар (60%) та паузу після нього (40%)
        const strikeDuration = Math.max(80, Math.floor(singleStrikeCycleTime * 0.6));
        const strikePause = Math.max(40, Math.floor(singleStrikeCycleTime * 0.4));

        // Серія ударів юніта
        for (let i = 0; i < strikesCount; i++) {
          this.isAttackingStrikeActive = true;  
          await this.delay(strikeDuration);                
          this.isAttackingStrikeActive = false; 
          await this.delay(strikePause);                
        }

        // Ховаємо банер для цього замку
        this.currentBannerState = null;
        await this.delay(200);

        // Віддалення камери перед переходом до наступного замку
        this.resetCamera();
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
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
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

  private executeStandardProvinceClick(province: Province): void {
    if (this.gameStateService.getInitialPlacementStatus()) {
      const success = this.gameStateService.placeInitialControlToken(province.id, this.activePlayerClan);
      if (success) this.loadGameState();
      return;
    }

    const selectedToken = this.gameStateService.getSelectedToken();
    if (selectedToken && this.isProvinceTargetable(province)) {
      const success = this.gameStateService.placeTokenOnProvince(province.id, this.activePlayerClan);
      if (success) this.loadGameState();
      return;
    }

    if (this.selectedProvince && this.selectedProvince.id === province.id) {
      this.closeTooltip();
    } else {
      this.selectedProvince = province;
    }
  }
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
  
}