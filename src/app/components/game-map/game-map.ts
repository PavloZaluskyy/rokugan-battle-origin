import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
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

  // Параметри трансформації карти
  scale: number = 1;
  translateX: number = 0;
  translateY: number = 0;

  // Стан для перетягування мишкою (Panning)
  isDragging: boolean = false;
  startX: number = 0;
  startY: number = 0;

  private coordMap: { [id: string]: { x: number; y: number } } = {
    // Краби
    'crab-capital': { x: 33, y: 79 },
    'crab-sub-1': { x: 29, y: 60 },
    'crab-sub-2': { x: 30, y: 50 },
    'crab-sub-3': { x: 10, y: 50 },

    // Журавлі
    'crane-capital': { x: 67, y: 41 },
    'crane-sub-1': { x: 57, y: 54 },
    'crane-sub-2': { x: 57, y: 46 },

    // Дракони
    'dragon-capital': { x: 52, y: 17.5 },
    'dragon-sub-1': { x: 55, y: 25 },
    'dragon-sub-2': { x: 30 , y: 10 },

    // Леви
    'lion-capital': { x: 55.8, y: 35.5 },
    'lion-sub-1': { x: 70, y: 29 },
    'lion-sub-2': { x: 41, y: 26 },

    // Фенікси
    'phoenix-capital': { x: 63, y: 14 },
    'phoenix-sub-1': { x: 74, y: 12 },
    'phoenix-sub-2': { x: 82, y: 13 },

    // Скорпіони
    'scorpion-capital': { x: 46.5, y: 46 },
    'scorpion-sub-1': { x: 40, y: 38 },
    'scorpion-sub-2': { x: 25, y: 40 },

    // Єдинороги
    'unicorn-capital': { x: 20.5, y: 19.5 },
    'unicorn-sub-1': { x: 31, y: 29 },
    'unicorn-sub-2': { x: 15, y: 27 },

    // Теневі землі
    'shadowlands-north': { x: 8, y: 65 },
    'shadowlands-south': { x: 15, y: 85 },

    // 🏝️ Острови Шовкових Шляхів (Архіпелаг знизу праворуч)
    'silk-sun-island': { x: 79, y: 73 },
    'silk-silkworm-island': { x: 68, y: 82.5 },
    'silk-golden-sand-island': { x: 78.5, y: 83 },

    // 🌊 Узбережжя Торговців (Східна прибережна смуга)
    'merchant-three-trees': { x: 47, y: 61 },
    'merchant-small-bay': { x: 59, y: 61 },
    'merchant-sunken-ships': { x: 43, y: 75 }
  };

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
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

  // --- МЕХАНІКА ЗУМУ (Коліщатко мишки) ---
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault(); // Запобігаємо скролу самої сторінки браузера
    
    const zoomIntensity = 0.1;
    const oldScale = this.scale;

    // Зміна масштабу залежно від напрямку прокрутки
    if (event.deltaY < 0) {
      this.scale = Math.min(this.scale + zoomIntensity, 3); // Макс зум 3x
    } else {
      this.scale = Math.max(this.scale - zoomIntensity, 1); // Мін зум 1x (100% ширини)
    }

    // Якщо скинули на 1x, центруємо карту назад
    if (this.scale === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
  }

  // --- МЕХАНІКА КНОПОК (Лупа+ / Лупа-) ---
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

  // --- МЕХАНІКА ПЕРЕТЯГУВАННЯ МИШКОЮ (Drag & Pan) ---
  startDrag(event: MouseEvent) {
    if (this.scale === 1) return; // На мінімальному зумі рухати не потрібно
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
  // --- КЕРУВАННЯ ТАЧЕМ (Мобільні пристрої) ---
  onTouchStart(event: TouchEvent) {
    if (this.scale === 1 || event.touches.length !== 1) return;
    this.isDragging = true;
    this.startX = event.touches[0].clientX - this.translateX;
    this.startY = event.touches[0].clientY - this.translateY;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    // Запобігаємо стандартному скролу сторінки пальцем, коли тягнемо карту
    event.preventDefault(); 
    this.translateX = event.touches[0].clientX - this.startX;
    this.translateY = event.touches[0].clientY - this.startY;
  }



  /**
   * Закриття тултіпа
   */
  closeTooltip(): void {
    this.selectedProvince = null;
  }
  // --- КЕРУВАННЯ КЛАВІАТУРОЮ (WASD / Стрілки) ---
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Не спрацьовує, якщо користувач вводить текст десь у полі (якщо такі будуть)
    if (['input', 'textarea'].includes((event.target as HTMLElement).tagName.toLowerCase())) {
      return;
    }

    const step = 40; // Крок зсуву карти в пікселях

    switch (event.key.toLowerCase()) {
      case 'w':
      case 'W':
      case 'ц':
      case 'Ц':
      case 'arrowup':
        this.translateY += step;
        break;
      case 's':
      case 'S':
      case 'і':
      case 'І':
      case 'arrowdown':
        this.translateY -= step;
        break;
      case 'a':
      case 'A':
      case 'ф':
      case 'Ф':
      case 'arrowleft':
        this.translateX += step;
        break;
      case 'd':
      case 'D':
      case 'в':
      case 'В':
      case 'arrowright':
        this.translateX -= step;
        break;
    }
    if (event.key === 'Shift') {
      this.zoomIn();
    } else if (event.key === 'Control') {
      event.preventDefault(); // Запобігаємо системному масштабуванню браузера
      this.zoomOut();
    }
  }
  // Перевірка: чи підсвічувати цю провінцію як ціль для вибраної карти
  isProvinceTargetable(province: Province): boolean {
    const selectedToken = this.gameStateService.getSelectedToken();
    if (!selectedToken) return false;
    
    // Вважаємо поточним гравцем того, чия ширма відкрита (наприклад, Crab)
    return this.gameStateService.isProvinceValidTarget(province, this.activePlayerClan);
  }

  onProvinceClick(province: Province): void {
    const selectedToken = this.gameStateService.getSelectedToken();

    // Якщо карта виділена і провінція підходить — ставимо анімований загін!
    if (selectedToken && this.isProvinceTargetable(province)) {
const success = this.gameStateService.placeTokenOnProvince(province.id, this.activePlayerClan);      
      if (success) {
        console.log(`Загін увійшов у провінцію ${province.name}!`);
        // Оновлюємо списки провінцій з сейву
        const gameState = this.gameStateService.getGameState();
        if (gameState) {
          this.provinces = Object.values(gameState.provinces);
        }
      }
      return;
    }

    // Відкриття/закриття інфо-тултіпа
    if (this.selectedProvince && this.selectedProvince.id === province.id) {
      this.closeTooltip();
    } else {
      this.selectedProvince = province;
    }
  }
}
