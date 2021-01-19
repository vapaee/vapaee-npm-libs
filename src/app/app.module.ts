import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

// import { SidebarModule } from 'ng-sidebar';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { PagesModule } from './pages/pages.module';
import { DirectivesModule } from './directives/directives.module';

import { CommonServicesModule } from './services/common/common.module';
import { VapaeeComponentsModule } from './components/vapaee/vapaee-components.module';
import { AngularMaterialModule } from './components/vapaee/angular.material.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CookieService } from 'ngx-cookie-service';
import { VapaeeStyle } from '@vapaee/style';
import { VapaeeWallet } from '@vapaee/wallet';

import { VapaeeDEX, VapaeeDexModule } from '@vapaee/dex';
import { VapaeeREX, VapaeeRexModule } from '@vapaee/rex';

import { VapaeeIdentityManagerServiceModule } from '@vapaee/rexidp-local';

@NgModule({
    declarations: [AppComponent],
    entryComponents: [],  
    imports: [
        BrowserModule,
        IonicModule.forRoot(),
        AppRoutingModule,
        PagesModule,
        DirectivesModule,
        CommonServicesModule,
        VapaeeComponentsModule,
        AngularMaterialModule,
        NgbModule,
        VapaeeDexModule,
        VapaeeRexModule,
        VapaeeIdentityManagerServiceModule
    ],
    providers: [
      StatusBar,
      SplashScreen,
      VapaeeStyle,      
      VapaeeWallet,
      VapaeeDEX,
      VapaeeREX,
      CookieService,
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
    ],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
