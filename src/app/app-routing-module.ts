import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClanSelection } from './pages/clan-selection/clan-selection';
import { GamePage } from './pages/game-page/game-page';
import { SecretObjectiveSelection } from './pages/secret-objective-selection/secret-objective-selection';

const routes: Routes = [
  { path: '', redirectTo: 'select', pathMatch: 'full' },
  {path: 'select', component: ClanSelection},
  { path: 'select-objective/:clan', component: SecretObjectiveSelection },
  { path: 'game', component: GamePage },
  { path: '**', redirectTo: 'select' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
