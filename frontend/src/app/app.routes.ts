import { Routes } from '@angular/router';
import { ProfilePickerComponent } from './features/profile-picker/profile-picker.component';
import { HomeComponent } from './features/home/home.component';
import { MediaDetailComponent } from './features/media-detail/media-detail.component';
import { PlayerComponent } from './features/player/player.component';

export const routes: Routes = [
  { path: '', component: ProfilePickerComponent },
  { path: 'home', component: HomeComponent },
  { path: 'content/:tmdbId', component: MediaDetailComponent },
  { path: 'watch/:tmdbId', component: PlayerComponent },
];
