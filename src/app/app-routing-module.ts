import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClanSelection } from './pages/clan-selection/clan-selection';
import { GameMap } from './components/game-map/game-map';
import { GamePage } from './pages/game-page/game-page';

const routes: Routes = [
  { path: '', redirectTo: 'select', pathMatch: 'full' },
  {path: 'select', component: ClanSelection},
  { path: 'game', component: GamePage },
  { path: '**', redirectTo: 'select' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
