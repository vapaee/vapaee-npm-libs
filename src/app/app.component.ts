import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AppService } from './services/common/app.service';
import { DropdownService, LocalStringsService } from './services/common/common.services';

import { VpeMainTopSideMenuService } from './components/vapaee/vpe-main-top-side-menu/vpe-main-top-side-menu.service';
import { VapaeeStyle } from '@vapaee/style';



@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent {

    constructor(
        public local: LocalStringsService,
        public app: AppService,
        public dropdown: DropdownService,
        public style: VapaeeStyle,
        private platform: Platform,
        private splashScreen: SplashScreen,
        private statusBar: StatusBar,
        private mainmenu: VpeMainTopSideMenuService
    ) {
        this.initializeApp();
    }

    initializeApp() {
        this.platform.ready().then(() => {
            this.statusBar.styleDefault();
            this.splashScreen.hide();
            console.log("this.style.skins: ", this.style.skins);
        });

        this.mainmenu.setMenu([
            {short: "Home", long:"Home Page", link: "/home"},
            {short: "Example", long:"Example Page", link: "/example"},
            {short: "Wallet", long:"Wallet Page", link: "/wallet"},
            // {short: "Scatter", long:"Scatter Page", link: "/scatter"},
            {short: "Angular Material", long:"Angular Material Page", link: "/angular-material"}
        ]);
    }
    
}
