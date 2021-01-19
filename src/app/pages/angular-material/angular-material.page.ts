import { Component, OnInit, OnDestroy, HostBinding, ElementRef } from '@angular/core';
import { Subscriber } from 'rxjs';
import { AppService, OnEnterPageHandler, VpeAppPage } from 'src/app/services/common/app.service';
import { LocalStringsService } from 'src/app/services/common/common.services';



@Component({
    selector: 'angular-material-page',
    templateUrl: './angular-material.page.html',
    styleUrls: ['./angular-material.page.scss', '../common.page.scss']
})
export class AngularMaterialPage implements OnInit, OnDestroy, VpeAppPage {
   
    @HostBinding('class') class = 'app-page angular-material';
    timer: number;
    showFiller;
    constructor(
        public app: AppService,
        public local: LocalStringsService,
        public elementRef: ElementRef
    ) {
        
    }

    path: RegExp = /\/angular-material/g;
    page: OnEnterPageHandler;
    onEnterPage() {
        console.debug("AngularMaterialPage.onEnterPage()");
    }

    onResizeSuscriber: Subscriber<any>;
    onResize() {
        console.debug("AngularMaterialPage.onResize()");
    }

    ngOnInit() {
        console.debug("AngularMaterialPage.ngOnInit()");
        this.app.subscribePage(this);
    }
    
    ngOnDestroy() {
        console.debug("AngularMaterialPage.ngOnDestroy()");
        this.app.unsubscribePage(this);
    }
}
