import { Component, EventEmitter, Input, Output, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
@Component({
  selector: 'app-discard-selection-modal',
  standalone: false,
  templateUrl: './discard-selection-modal.html',
  styleUrl: './discard-selection-modal.css',
})
export class DiscardSelectionModal  implements OnInit, OnDestroy{
  /*Рокіровка */
 @Input() rokirovkaEffect: any = null;
  @Input() filteredDiscardPile: any[] = [];
  @Input() currentHandTokens: any[] = [];
  
  @Output() selectDiscardToken = new EventEmitter<any>();
  @Output() selectHandToken = new EventEmitter<any>();
  @Output() cancelRokirovka = new EventEmitter<void>();


  /*Шпигунська мережа */
  // Додаємо підтримку для Шпигунської мережі
  @Input() spyNetworkEffect: any = null;
  @Input() availableClans: string[] = [];
  @Input() targetPlayerHandTokens: any[] = [];

  // Події для Шпигунської мережі
  @Output() selectSpyClan = new EventEmitter<string>();
  @Output() closeSpyModal = new EventEmitter<void>();

  private componentInterval: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  onDiscardTokenClick(token: any, event: MouseEvent): void {
    event.stopPropagation();
    this.selectDiscardToken.emit(token);
  }
  onCancelClick(event: MouseEvent): void {
    event.stopPropagation();
    this.cancelRokirovka.emit();
  }

  onHandTokenClick(token: any, event: MouseEvent): void {
    event.stopPropagation();
    this.selectHandToken.emit(token);
  }
  onClanSelectClick(clan: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectSpyClan.emit(clan);
  }
  onCloseSpyClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeSpyModal.emit();
  }

  getTokenLabel(token: any): string {
    if (token.type === 'Army') return 'Армія';
    if (token.type === 'Navy') return 'Флот';
    if (token.type === 'Shinobi') return 'Шинобі';
    return token.type;
  }

getTokenLabelFullCart(token: any): string {
    if (token.type === 'Army') return 'Армія';
    if (token.type === 'Navy') return 'Флот';
    if (token.type === 'Shinobi') return 'Шинобі';
    if (token.type === 'Blessing') return 'Благословення';
    if (token.type === 'Raid') return 'Погром';
    if (token.type === 'Diplomacy') return 'Дипломатія';
    if (token.type === 'Blank') return 'Пустий (Блеф)';
    return token.type;
  }

  ngOnInit(): void {
    this.componentInterval = setInterval(() => {
      if (this.rokirovkaEffect) {
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.componentInterval) {
      clearInterval(this.componentInterval);
    }
  }
}
