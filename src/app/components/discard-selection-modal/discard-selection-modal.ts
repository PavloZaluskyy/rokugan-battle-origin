import { Component, EventEmitter, Input, Output, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
@Component({
  selector: 'app-discard-selection-modal',
  standalone: false,
  templateUrl: './discard-selection-modal.html',
  styleUrl: './discard-selection-modal.css',
})
export class DiscardSelectionModal  implements OnInit, OnDestroy{
 @Input() rokirovkaEffect: any = null;
  @Input() filteredDiscardPile: any[] = [];
  @Input() currentHandTokens: any[] = [];
  
  @Output() selectDiscardToken = new EventEmitter<any>();
  @Output() selectHandToken = new EventEmitter<any>();
  @Output() cancelRokirovka = new EventEmitter<void>();

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

  getTokenLabel(token: any): string {
    if (token.type === 'Army') return 'Армія';
    if (token.type === 'Navy') return 'Флот';
    if (token.type === 'Shinobi') return 'Шинобі';
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
