import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ClanDetails, CLAN_DETAILS_DATA } from '../../models/clan-select.model';
import { GameStateService } from '../../services/game-state.service';
import { ClanType } from '../../models/game.model';

@Component({
  selector: 'app-clan-selection',
  standalone: false,
  templateUrl: './clan-selection.html',
  styleUrl: './clan-selection.css',
})
export class ClanSelection implements OnInit, AfterViewInit {
@ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  clans: ClanDetails[] = CLAN_DETAILS_DATA;
  currentIndex: number = 0;
  
  isPlayingIntro: boolean = true;
  currentVideoSource: string = '';

  get currentClan(): ClanDetails {
    return this.clans[this.currentIndex];
  }

  constructor(
    private gameStateService: GameStateService,
    private router: Router,
    private cdr: ChangeDetectorRef // Додаємо детектор змін Angular
  ) {}

  ngOnInit(): void {
    // Встановлюємо перший шлях до інтро відео
    this.currentVideoSource = this.currentClan.videoUrlUrlIntro;
  }

  ngAfterViewInit(): void {
    // Коли DOM повністю готовий, запускаємо відтворення першого відео
    this.loadClanVideo();
  }

  /**
   * Завантаження та гарантований запуск відео
   */
  loadClanVideo(): void {
    this.isPlayingIntro = true;
    this.currentVideoSource = this.currentClan.videoUrlUrlIntro;
    
    // Примусово оновлюємо прив'язку в Angular
    this.cdr.detectChanges();

    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      
      // Скидаємо прапорець циклу для інтро
      video.loop = false;
      video.src = this.currentVideoSource;
      video.load();
      video.volume = 0;

      // Надійний виклик play()
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Автоплей інтро блоковано або файл відсутній, переключаємо на idle:', error);
          // Якщо інтро не змогло запуститися (наприклад, файл для іншого клану ще не створено),
          // ми автоматично перемикаємо на idle або пропускаємо його
          this.onVideoEnded();
        });
      }
    }
  }

  /**
   * Коли закінчилося intro-відео -> вмикаємо зациклене idle-відео
   */
  onVideoEnded(): void {
    if (this.isPlayingIntro) {
      this.isPlayingIntro = false;
      this.currentVideoSource = this.currentClan.videoUrlIdle;
      
      this.cdr.detectChanges();

      if (this.videoPlayer && this.videoPlayer.nativeElement) {
        const video = this.videoPlayer.nativeElement;
        video.src = this.currentVideoSource;
        video.loop = true;
        video.load();
        video.volume = 0; // Можна встановити гучність для idle відео
        video.play().catch(err => {
          console.warn('Помилка відтворення Idle відео:', err);
        });
      }
    }
  }

  nextClan(): void {
    this.currentIndex = (this.currentIndex + 1) % this.clans.length;
    this.loadClanVideo();
  }

  prevClan(): void {
    this.currentIndex = (this.currentIndex - 1 + this.clans.length) % this.clans.length;
    this.loadClanVideo();
  }

  selectClan(): void {
    const selectedClan = this.currentClan.id;
    const allClans: ClanType[] = ['Crab', 'Crane', 'Dragon', 'Lion', 'Phoenix', 'Scorpion', 'Unicorn'];
    const otherClans = allClans.filter(c => c !== selectedClan).slice(0, 2);
    
    this.gameStateService.createNewGame([selectedClan, ...otherClans]);
    this.router.navigate(['/game']);
  }
}
