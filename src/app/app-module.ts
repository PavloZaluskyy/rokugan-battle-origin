import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { PlayerScreen } from './components/player-screen/player-screen';
import { GameMap } from './components/game-map/game-map';
import { ClanSelection } from './pages/clan-selection/clan-selection';
import { GamePage } from './pages/game-page/game-page';
import { GameHud } from './components/game-hud/game-hud';
import { SecretObjectiveSelection } from './pages/secret-objective-selection/secret-objective-selection';

@NgModule({
  declarations: [
    App,
    PlayerScreen,
    GameMap,
    ClanSelection,
    GamePage,
    GameHud,
    SecretObjectiveSelection
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection()
  ],
  bootstrap: [App]
})
export class AppModule { }
