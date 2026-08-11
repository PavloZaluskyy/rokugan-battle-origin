import { Component, OnInit, HostListener } from '@angular/core';
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

  // Параметри трансформації карти (рух та звичайний зум)
  scale: number = 1;
  translateX: number = 0;
  translateY: number = 0;
  
  // Параметри кінематографічної камери
  cameraTransform: string = 'scale(1) translate(0px, 0px)';
  currentBattleProvinceId: string | null = null;
  isAttackingStrikeActive: boolean = false;
  isCinematicPlaying: boolean = false;
  // Стан для перетягування мишкою (Panning)
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;
  isZoomingIn: boolean = false;
  isZoomingOut: boolean = false;

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

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.loadGameState();

    // Слухаємо сигнал від кнопки в HUD на запуск битв
    this.gameStateService.triggerCinematic$.subscribe(() => {
      this.executeBattleCinematicSequence();
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
    if (this.scale === 1 || event.touches.length !== 1) return;
    this.isDragging = true;
    this.startX = event.touches[0].clientX - this.translateX;
    this.startY = event.touches[0].clientY - this.startY;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    event.preventDefault();
    this.translateX = event.touches[0].clientX - this.translateX;
    this.translateY = event.touches[0].clientY - this.translateY;
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

  
 // --- ПОКРОКОВИЙ КІНЕМАТОГРАФІЧНИЙ ЦИКЛ БИТВ З УДАРАМИ ЗА СИЛОЮ ---
  async executeBattleCinematicSequence() {
    if (this.isCinematicPlaying) return;

    // Збираємо унікальні провінції з боями
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

    // Спочатку розкриваємо жетони
    this.gameStateService.startCinematicResolution(() => {
      this.loadGameState();
    });

    try {
      for (const provId of battleProvinces) {
        this.currentBattleProvinceId = provId;
        
        // Знаходимо саму провінцію, щоб дізнатися силу атаки
        const prov = this.provinces.find(p => p.id === provId);
        
        // 1. Зближення камери з містом
        this.zoomToProvince(provId);
        await this.delay(800); // Чекаємо завершення плавного зуму камери

        // Визначаємо кількість ударів на основі сили карти (наприклад, strength 3 -> 3 удари)
        let strikesCount = 1;
        if (prov && prov.placedTokens) {
          const faceUpTokens = prov.placedTokens.filter(pt => pt.isFaceUp && pt.token.strength > 0);
          if (faceUpTokens.length > 0) {
            strikesCount = Math.max(...faceUpTokens.map(t => t.token.strength));
          }
        }

        // 2. Програємо серію ударів (рівно стільки разів, яка сила карти)
        for (let i = 0; i < strikesCount; i++) {
          this.isAttackingStrikeActive = true;  // Удар
          await this.delay(350);                // Тривалість візуального удару
          this.isAttackingStrikeActive = false; // Повернення карти
          await this.delay(250);                // Пауза між ударами
        }

        // 3. Віддалення камери назад перед переходом до наступного міста
        this.resetCamera();
        await this.delay(800); // Час на плавне віддалення
      }
    } finally {
      this.currentBattleProvinceId = null;
      this.isCinematicPlaying = false;
      
      this.gameStateService.nextPhase();
      this.loadGameState();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  zoomToProvince(provinceId: string) {
  const coords = this.coordMap[provinceId];
  if (!coords) return;
  // Вмикаємо ефект вітру в обличчя (зближення)
    this.isZoomingIn = true;
    this.isZoomingOut = false;

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
    
  }
}

  resetCamera() {
   // Вмикаємо зворотний ефект вітру (віддалення)
    this.isZoomingIn = false;
    this.isZoomingOut = true;
    this.cameraTransform = 'translate(0px, 0px) scale(1)';
    setTimeout(() => {
    this.isZoomingOut = false;
    }, 800);
  }
}