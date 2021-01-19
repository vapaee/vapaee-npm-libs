import { Component, OnInit, OnDestroy, HostBinding, ElementRef } from '@angular/core';
import { Subscriber } from 'rxjs';
import { AppService, OnEnterPageHandler, VpeAppPage } from 'src/app/services/common/app.service';
import { LocalStringsService } from 'src/app/services/common/common.services';



@Component({
    selector: 'example-page',
    templateUrl: './example.page.html',
    styleUrls: ['./example.page.scss', '../common.page.scss']
})
export class ExamplePage implements OnInit, OnDestroy, VpeAppPage {
   
    @HostBinding('class') class = 'app-page example';
    timer: number;
    showFiller;
    constructor(
        public app: AppService,
        public local: LocalStringsService,
        public elementRef: ElementRef
    ) {
        
    }

    path: RegExp = /\/example/g;
    page: OnEnterPageHandler;
    onEnterPage() {
        console.debug("ExamplePage.onEnterPage()");
    }

    onResizeSuscriber: Subscriber<any>;
    onResize() {
        console.debug("ExamplePage.onResize()");
    }

    ngOnInit() {
        console.debug("ExamplePage.ngOnInit()");
        this.app.subscribePage(this);
    }
    
    ngOnDestroy() {
        console.debug("ExamplePage.ngOnDestroy()");
        this.app.unsubscribePage(this);
    }
}
