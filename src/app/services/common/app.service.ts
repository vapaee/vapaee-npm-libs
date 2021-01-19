import { Injectable, Component, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { DomService } from './dom.service';
import { fromEvent, Subject, Subscriber } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface Device {
    fullhd?:boolean, // >= 1600px
    full?:boolean,   // >= 1200px
    big?:boolean,    // < 1200px
    normal?:boolean, // < 992px
    medium?:boolean, // < 768px
    small?:boolean,  // < 576px
    tiny?:boolean,   // < 420px
    portrait?:boolean,
    wide?:boolean,
    height?:number,
    width?: number,
    class?: string
}

@Injectable({
    providedIn: 'root'
})
export class AppService {
    public path: string;
    public prev_path: string;
    public onStateChange:Subject<string> = new Subject();
    public onWindowResize:Subject<Device> = new Subject();
    // router : Router;
    // route : ActivatedRoute;
    public global: {[key:string]:any} = {};
    state : string;
    prev_state : string = "none";
    device: Device = {};
    loading: boolean;
    countdown: number;
    public history: History;

    constructor(
        private router: Router, 
        private route: ActivatedRoute, 
        private analytics: AnalyticsService,
        private dom: DomService,
        public http: HttpClient
    ) {
        this.history = window.history;
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.prev_state = this.state;
                this.prev_path = this.path;
                this.path = this.router.url;
                this.state = this.getDeepestChild(this.route.root).snapshot.data.state;
                console.debug("AppService.onRoute()", [this.state], [this]);
                this.analytics.sendPageView(window.location.href);
                this.onStateChange.next(this.state);
                if (this.state != this.prev_state) {
                    window.document.body.classList.remove(this.prev_state);
                    window.document.body.classList.add(this.state);
                }
                for (let i in this.pages) {
                    let page = this.pages[i];
                    if (this.path.match(page.path)) {
                        // console.debug("AppService -> page.onEnterPage()", this.state, this.path, [this]);
                        page.onEnterPage();
                        break;
                    }
                }
            }
        });
        window.document.body.removeAttribute("loading");
        // console.error('window.document.body.removeAttribute("loading");');
    }

    get version() {
        return environment.version;
    }

    get name() {
        return environment.name;
    }

    isOpera:boolean;
    isFirefox:boolean;
    isSafari:boolean;
    isIE:boolean;
    isEdge:boolean;
    isChrome:boolean;
    isBlink:boolean;

    detectBrowser() {
        var _window:any = <any>window;
        // Opera 8.0+
        this.isOpera = (!!_window.opr && !!_window.opr.addons) || !!_window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

        // Firefox 1.0+
        this.isFirefox = typeof _window.InstallTrigger !== 'undefined';

        // Safari 3.0+ "[object HTMLElementConstructor]" 
        this.isSafari = /constructor/i.test(_window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!_window['safari'] || _window.safari.pushNotification);

        // Internet Explorer 6-11
        this.isIE = /*@cc_on!@*/false || !!_window.document.documentMode;

        // Edge 20+
        this.isEdge = !_window.isIE && !!_window.StyleMedia;

        // Chrome 1+
        this.isChrome = !!_window.chrome && !!_window.chrome.webstore;

        // Blink engine detection
        this.isBlink = (this.isChrome || this.isOpera) && !!_window.CSS;

        console.debug("isOpera", this.isOpera);
        console.debug("isFirefox", this.isFirefox);
        console.debug("isSafari", this.isSafari);
        console.debug("isIE", this.isIE);
        console.debug("isEdge", this.isEdge);
        console.debug("isChrome", this.isChrome);
        console.debug("isBlink", this.isBlink);
    }

    private triggerOnInit: Function;
    public onInit: Promise<any> = new Promise((resolve) => {
        this.triggerOnInit = resolve;
    });

    // sidemenu -----------------
    public sidemenu: {opened:boolean, skip:boolean} = {opened:false, skip:false};
    private skipSideMenu() {
        var skip = this.sidemenu.skip;
        this.sidemenu.skip = true;
        setTimeout(_ => { this.sidemenu.skip = false; }, 500);
        return skip;
    }
    toggleSideMenu() {
        if (this.skipSideMenu()) return;
        this.sidemenu.opened = !this.sidemenu.opened;
        console.debug("toggleSideMenu()", this.sidemenu.opened);
    }
    openSideMenu() {
        if (this.skipSideMenu()) return;
        this.sidemenu.opened = true;
    }
    closeSideMenu() {
        if (this.skipSideMenu()) return;
        this.sidemenu.opened = false;
    }

    // global variable (ini) ---------
    getGlobal(key, defautl:any = undefined): any {
        if (!this.global) this.global = {};
        if (typeof this.global[key] == "undefined") {
            return defautl;
        }
        return this.global[key];
    }

    setGlobal(key:string, value:any) {
        if (!this.global) this.global = {};
        this.global[key] = value;
    }

    toggleGlobal(key:string) {
        if (!this.global) this.global = {};
        this.global[key] = !this.global[key];
    }

    consumeGlobal(key:string) {
        if (!this.global) this.global = {};
        let aux = this.global[key];
        delete this.global[key];
        return aux;
    }
    // global variables (end) ---------

    init() {
        console.debug("AppService.init()");
        
        this.http.get<any>("assets/app.json?_="+Math.random()).toPromise().then((appjson) => {
            if (this.version != appjson.version) {
                console.error(appjson, "ERROR: version missmatch. Reloading site...");
                alert("load version " + appjson.version);
                window.location.href = 
                    window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/?_="+Math.random();
            } else {
                console.log("APP: ", appjson);
            }
        });        
        
        this.detectBrowser();
        this.dom.appendComponentToBody(LoadingOverall);
        this.triggerOnInit();
    }

    getDeepestChild(node:any):any {
        if (node.firstChild) {
            return this.getDeepestChild(node.firstChild);
        } else {
            return node;
        }
    }

    onWindowsResize() {
        this.device.fullhd = false;
        this.device.full = false;
        this.device.big = false;
        this.device.normal = false;
        this.device.medium = false;
        this.device.small = false;
        this.device.tiny = false;
        this.device.height = window.innerHeight;
        this.device.width = window.innerWidth;
        this.device.class = "";
        var w = this.device.width;
        var h = this.device.height;

        if (w / h > 1) {
            this.device.portrait = false;
            this.device.wide = true;
            this.device.class += "wide ";

            if (1600 <= w) {
                this.device.fullhd = true;
                this.device.class += "fullhd ";
            }

            if (1200 <= w && w < 1600) {
                this.device.full = true;
                this.device.class += "full ";
            }

            if (992 <= w && w < 1200) {
                this.device.big = true;
                this.device.class += "big ";
            }

            if (768 <= w && w < 992) {
                this.device.normal = true;
                this.device.class += "normal ";
            }

            if (576 <= w && w < 768) {
                this.device.medium = true;
                this.device.class += "medium ";
            }

            if (420 <= w && w < 576) {
                this.device.small = true;
                this.device.class += "small ";
            }

            if (w < 420) {
                this.device.tiny = true;
                this.device.class += "tiny ";
            }

        } else {
            this.device.portrait = true;
            this.device.wide = false;
            this.device.class += "portrait ";
        }
        // console.debug("onWindowsResize()", this.device);
        this.device.class = this.device.class.trim();
        this.onWindowResize.next(this.device);
    }

    navigatePrefix(prefix:string){
        var words = this.path.split("/");
        for (var i in words){
            if (words[i])  {
                words[i] = prefix;
                break;
            }
        }
        var path = words.join("/");
        this.navigate(path);
    }

    navigate(path) {
        if (path != this.path) {
            console.debug("AppService.navigate()", path);
            this.router.navigate([path]);
        }
        return path;
    }

    onCardClose() {
        this.router.navigate(['cards']);
    }


    setLoading(turn:boolean = true) {
        this.loading = turn;
    }

    urlStartsWith (str: any) {
        if (typeof str == "number") str = "" + str;
        if (typeof str == "string") {
            return window.location.pathname.indexOf(str) == 0;
        } else {
            return false;
        }
    }
    
    urlEndsWith (str: any) {
        if (typeof str == "number") str = "" + str;                
        if (typeof str == "string") {
            var len = window.location.pathname.length;
            var substr = window.location.pathname.substr(len-str.length, str.length);
            return substr.indexOf(str) == 0;
        } else {
            return false;
        }
    }
    
    stateStartsWith (str: any) {
        if (!this.state) return false;
        if (typeof str == "number") str = "" + str;                
        if (typeof str == "string") {
            return this.state.indexOf(str) == 0;
        } else {
            return false;
        }
    }
    
    prevStateStartsWith (str: any) {
        if (!this.prev_state) return false;
        if (typeof str == "number") str = "" + str;                
        if (typeof str == "string") {
            return this.prev_state.indexOf(str) == 0;
        } else {
            return false;
        }
    }

    getStateData(name?:string) {
        name = name || this.getDeepestChild(this.route.root).snapshot.data.state;
        var data = this.getRouteData(name, this.router.config);
        return data;
    }

    getRouteData(name:string, obj:any[]) {
        var found:any = null;
        for (let i=0; !found && i<obj.length; i++) {
            if (obj[i].data.state === name) {
                found = obj[i].data;
            } else if (obj[i].children) {
                found = this.getRouteData(name, obj[i].children);
            }
        }
        return found;
    }

    // OnResizeHandler onResize solution -----------------------------
    subscribeOnResize(listener:OnResizeHandler) {    
        listener.onResizeSuscriber = new Subscriber<any>(listener.onResize.bind(listener));
        this.onWindowResize.subscribe(listener.onResizeSuscriber);
    }
    unsubscribeOnResize(listener:OnResizeHandler) {
        listener.onResizeSuscriber.unsubscribe();
    }


    // OnEnterPageHandler onEnterPage solution -----------------------------
    pages:{[key:string]:OnEnterPageHandler} = {};
    subscribePage(page:VpeAppPage) {
        page.page = page;
        console.assert(typeof this.pages[page.path.toString()] == "undefined", "ERROR: OnEnterPageHandler already subscribed: " + page.path.toString());
        this.pages[page.path.toString()] = page;
        this.subscribeOnResize(page);
    }
    
    unsubscribePage(page:VpeAppPage) {
        delete this.pages[page.path.toString()];
        this.unsubscribeOnResize(page);
    }


    // wait milisec
    async sleep(milisec: number): Promise<void> {
        console.log("sleep " + milisec + "...");
        return new Promise(r => {
            setTimeout(_ => r(), milisec);
        });
    }

}

export interface OnEnterPageHandler {
    path: RegExp;
    page: OnEnterPageHandler;
    onEnterPage: () => void;
}

export interface OnResizeHandler {
    onResizeSuscriber: Subscriber<any>;
    onResize: () => void;
}

export interface VpeAppPage {
    onResizeSuscriber: Subscriber<any>;
    onResize: () => void;

    path: RegExp;
    page: OnEnterPageHandler;
    elementRef: ElementRef;
    onEnterPage: () => void;    
}















@Component({
    selector: 'loading-overall',
    template: `
    <div [hidden]="!app.loading" class="animated fadeIn" id="loading-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 10000; color: white;">
        <div style="text-align: center; width: 100%; position: absolute; top: 40%; margin-top: -50px;">
            <h1>Proccessing...</h1>
        </div>
    </div>`
})
export class LoadingOverall {
    constructor(public app:AppService) {}
}