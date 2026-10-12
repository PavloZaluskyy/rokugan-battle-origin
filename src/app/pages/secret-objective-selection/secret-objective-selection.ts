import { Component, OnInit } from '@angular/core';
import { SecretObjective, SecretObjectiveModel } from '../../services/secret-objective';
import { ActivatedRoute, Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-secret-objective-selection',
  standalone: false,
  templateUrl: './secret-objective-selection.html',
  styleUrl: './secret-objective-selection.css',
})
export class SecretObjectiveSelection implements OnInit {
currentClan: string = '';
  offeredObjectives: SecretObjectiveModel[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectiveService: SecretObjective
  ) {}

  ngOnInit(): void {
    // Отримуємо клан з параметрів роута
    this.currentClan = this.route.snapshot.paramMap.get('clan') || 'Unknown';
    
    // Отримуємо випадкову пару карт таємних цілей з сервісу
    this.offeredObjectives = this.objectiveService.getRandomPair();
  }

  // Вибір однієї з двох цілей
  selectObjective(objective: SecretObjectiveModel): void {
    this.objectiveService.setPlayerObjective(this.currentClan, objective);
    
    // Переходимо до ігрової мапи після вибору
    this.router.navigate(['/game']);
  }

}
