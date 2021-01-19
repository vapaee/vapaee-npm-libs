import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';

import { Router } from '@angular/router';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { VpeMainTopSideMenuService, VpeMenuEntry, VpeMenuListener } from './vpe-main-top-side-menu.service';
import { fromEvent, Subscriber } from 'rxjs';

@Component({
    selector: 'vpe-main-top-side-menu',
    templateUrl: './vpe-main-top-side-menu.component.html',
    styleUrls: ['./vpe-main-top-side-menu.component.css']
})
export class VpeMainTopSideMenuComponent implements OnDestroy, OnInit, VpeMenuListener {
    
    @ViewChild('sidenav') sidenav: MatSidenav;
    @ViewChild("content") content: MatSidenavContent;
    
    constructor(
        public ctrl: VpeMainTopSideMenuService,
        public router: Router
    ) {

    }

    ngOnInit() {
        if (this.content) {
            fromEvent(this.content.getElementRef().nativeElement,'scroll').subscribe(
                (e: Event) => console.log({
                    scrollPosition: e.target['scrollTop']
                })
            );
        }
        this.ctrl.subscribe(this);
    }

    ngOnDestroy() {
        this.ctrl.unsubscribe(this);
    }

    onChangeSuscriber: Subscriber<any>;
    update(e:any) {
        if (this.content) {
            this.content.getElementRef().nativeElement.scrollTo( 0, 0 );
        }        
    }

    onEntryClicked(entry: VpeMenuEntry) {
        if (entry.link) {
            this.router.navigate([entry.link]); 
            this.sidenav.close();
        } 
    }

}
