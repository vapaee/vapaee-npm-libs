import { Component, OnInit, OnDestroy, HostBinding, ElementRef } from '@angular/core';
import { Subscriber } from 'rxjs';
import { AppService, OnEnterPageHandler, VpeAppPage } from 'src/app/services/common/app.service';
import { LocalStringsService } from 'src/app/services/common/common.services';



@Component({
    selector: 'home-page',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss', '../common.page.scss']
})
export class HomePage implements OnInit, OnDestroy, VpeAppPage {
   
    @HostBinding('class') class = 'app-page home';
    timer: number;
    showFiller;
    constructor(
        public app: AppService,
        public local: LocalStringsService,
        public elementRef: ElementRef
    ) {
        
    }

    path: RegExp = /\/home/g;
    page: OnEnterPageHandler;
    onEnterPage() {
        console.debug("HomePage.onEnterPage()");
    }

    onResizeSuscriber: Subscriber<any>;
    onResize() {
        console.debug("HomePage.onResize()");
    }

    ngOnInit() {
        console.debug("HomePage.ngOnInit()");
        this.app.subscribePage(this);
    }
    
    ngOnDestroy() {
        console.debug("HomePage.ngOnDestroy()");
        this.app.unsubscribePage(this);
    }
}
