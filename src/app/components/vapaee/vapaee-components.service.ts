import { Injectable, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';


// esto sirve para poder injectar una referencia al componente desde la directiva
export abstract class VpeAbstractComponent {
    
}


interface Device {};

@Injectable()
export class VapaeeComponentsService {

    public onResize:Subject<Device> = new Subject();
    public device:Device;

    constructor(
        public cookie: CookieService,
    ) {
        this.device = {};
    }

    // enter events ------------------------------
    public windowHasResized(e:Device) {
        this.device = e;
        this.onResize.next(e);
    }
    
}
