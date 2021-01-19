import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { AppService } from 'src/app/services/common/app.service';
import { LocalStringsService } from 'src/app/services/common/common.services';



@Component({
    selector: 'coming-soon-page',
    templateUrl: './coming-soon.page.html',
    styleUrls: ['./coming-soon.page.scss', '../common.page.scss']
})
export class ComingSoonPage implements OnInit, OnDestroy {
   
    constructor(
        public app: AppService,
        public local: LocalStringsService,
        public elementRef: ElementRef
    ) {
    }

    ngOnDestroy() {
    }

    ngOnInit() {
    }
}
