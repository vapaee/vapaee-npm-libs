import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AngularMaterialPage } from './pages/angular-material/angular-material.page';
import { ComingSoonPage } from './pages/coming-soon/coming-soon.page';
import { ExamplePage } from './pages/example/example.page';
import { HomePage } from './pages/home/home.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { WalletPage } from './pages/wallet/wallet.page';

const routes: Routes = [
  { path: '',                        data: { state: "root" }, redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',                    data: { state: "home" }, component: HomePage },
  { path: 'example',                 data: { state: "example" }, component: ExamplePage },
  { path: 'angular-material',        data: { state: "angular-material" }, component: AngularMaterialPage },
  { path: 'wallet',                  data: { state: "wallet" }, component: WalletPage },
  { path: 'soon',                    data: { state: "home" }, component: ComingSoonPage },
  { path: '**',                      data: { state: "404" }, component: NotFoundPage }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
