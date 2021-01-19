import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, Subscriber } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface VpeMenuEntry {
    short:string;
    long:string;
    link?:string;
}

export interface VpeMenuListener {
    onChangeSuscriber: Subscriber<any>;
    update:(any) => void;
}

@Injectable()
export class VpeMainTopSideMenuService {
    
    position: 'start' | 'end' = 'end';
    attr_role : 'dialog' | 'navigation' = 'dialog';
    mode:  'over' | 'push' | 'side' = 'over';
    opened: boolean = false;
    showbtn: boolean = false;
    menu: Array<VpeMenuEntry>;
    logo: string = "#";
    public onDataChange:Subject<any> = new Subject();

    isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
        .pipe(
            map(result => result.matches),
            shareReplay()
        );
         /*
            [attr.role]="(isHandset$ | async) ? 'dialog' : 'navigation'"
            [mode]="(isHandset$ | async) ? 'over' : 'side'"
            [opened]="(isHandset$ | async) === false"
        */

    constructor(
        private breakpointObserver: BreakpointObserver,
        private router: Router
        ) {

            this.router.events.subscribe((event) => {
                /// console.log("this.router.events", event);
                if (event instanceof NavigationEnd) {
                    // console.log("---> this.onDataChange.next({path:this.router.url});");
                    this.onDataChange.next({path:this.router.url});
                }
            });
       
        
        this.isHandset$.subscribe(value => {
            console.log(value);
            this.showbtn = value;
        });
        this.setMenu([{
            "long": "Reference to Link 1",
            "short": "Link 1",
            "link": "#"
        }]);
        this.setLogo("assets/img/Logo.png");
    }
    
    setMenu(menu: Array<VpeMenuEntry>) {
        console.log("VpeMainTopSideMenuService.setMenu()");
        this.menu = menu;
        this.onDataChange.next({menu});
    }

    setLogo(logo:string) {
        this.logo = logo;
        this.onDataChange.next({logo});
    }

    subscribe(listener:VpeMenuListener) {
        listener.onChangeSuscriber = new Subscriber<any>(listener.update.bind(listener));
        this.onDataChange.subscribe(listener.onChangeSuscriber);
        console.log("VpeMainTopSideMenuService.subscribe()");
        listener.update({});
    }

    unsubscribe(listener:VpeMenuListener) {
        listener.onChangeSuscriber.unsubscribe();
        console.log("VpeMainTopSideMenuService.unsubscribe()");
    }
    
}
