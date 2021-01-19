import { Component, OnInit, OnDestroy, HostBinding, ElementRef } from '@angular/core';
import { Subscriber } from 'rxjs';
import { AppService, OnEnterPageHandler, VpeAppPage } from 'src/app/services/common/app.service';
import { LocalStringsService } from 'src/app/services/common/common.services';

import { VapaeeWallet, Account } from '@vapaee/wallet';
import { ScatterIdProvider } from '@vapaee/idp-scatter';
import { VapaeeREX } from '@vapaee/rex';
import { VapaeeDEX } from '@vapaee/dex';


import { VapaeeIdentityManagerService, LocalIdProvider, ILocalStorage } from '@vapaee/idp-local';
import { CookieService } from 'ngx-cookie-service';

import { of } from 'rxjs';


@Component({
    selector: 'wallet-page',
    templateUrl: './wallet.page.html',
    styleUrls: ['./wallet.page.scss', '../common.page.scss']
})
export class WalletPage implements OnInit, OnDestroy, VpeAppPage {
   
    @HostBinding('class') class = 'app-page scatter';
    timer: number;
    showFiller;
    appname:string = "@vapaee/scatter";
   
    constructor(
        public app: AppService,
        public local: LocalStringsService,
        public wallet: VapaeeWallet,
        public dex: VapaeeDEX,
        public rex: VapaeeREX,
        public elementRef: ElementRef,
        public keymanager: VapaeeIdentityManagerService,
        public cookies: CookieService
    ) {
        
    }

    async ngOnInit() {
        console.debug("WalletPage.ngOnInit()");
        this.app.subscribePage(this);
        let appname = "Vapaee-App-Template";


        // this.keymanager.init(this.wallet, this.getStorage());
        
        

        //*
        // this.sinmulateVapaeeIO();
        await this.wallet.init("assets/endpoints.json");
        //await this.wallet.createConnexion("telos", LocalIdProvider);
        //this.wallet.connexion.telos.connect(appname);
        // this.wallet.connexion.telos.login();
        //this.wallet.connexion.telos.autologin();        
        /*/
        this.keymanager.init(); 
        await this.wallet.init("assets/endpoints.json");
        await this.wallet.createConnexion("telos", ScatterIdProvider);
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAA", this.wallet.connexion);
        this.wallet.connexion.telos.connect(appname);
        this.wallet.connexion.telos.login();
        //*/
    }

    getStorage(): ILocalStorage {
        return {
            get:    (key: string) =>             of((this.cookies.get(key))),
            set:    (key: string, value: any) => of((this.cookies.set(key, value))),
            remove: (key: string) =>             of((this.cookies.delete(key)))
        } 
    }
    
    ngOnDestroy() {
        console.debug("WalletPage.ngOnDestroy()");
        this.app.unsubscribePage(this);
    }

    async tryToConnect(network_slug:string) {
        console.log("WalletPage.tryToConnect("+network_slug+") ---> createConnexion()");
        let conn = await this.wallet.createConnexion(network_slug, ScatterIdProvider);
        //let conn = await this.wallet.createConnexion(network_slug, LocalIdProvider);
        console.log("WalletPage.tryToConnect("+network_slug+") ---> connect()");
        await conn.connect(this.appname);
        console.log("WalletPage.tryToConnect("+network_slug+") ---> login()");
        await conn.login();
    }

    // disconnectFrom(network_slug:string) {
    //     console.error("NOT IMPLEMENTED");
    // }

    path: RegExp = /\/wallet/g;
    page: OnEnterPageHandler;
    onEnterPage() {
        console.debug("WalletPage.onEnterPage()");
    }

    onResizeSuscriber: Subscriber<any>;
    onResize() {
        console.debug("WalletPage.onResize()");
    }

    aux_transaction(slug:string) {
        console.log("aux_transaction("+slug+")");
        console.assert(typeof this.wallet.connexion[slug] != "undefined", "ERROR: connexion "+slug+" not found");

        let contract = this.wallet.connexion[slug].getContract("eosio.token");
        contract.excecute([
            {
                action: "transfer",
                payload: {
                    from: this.wallet.connexion[slug].account.name,
                    to: 'gqydoobuhege',
                    quantity: '0.0001 ' + this.wallet.connexion[slug].symbol,
                    memo: "testing",
                },
            },
            {
                action: "transfer",
                payload: {
                    from: this.wallet.connexion[slug].account.name,
                    to: 'gqydoobuhege',
                    quantity: '0.0002 ' + this.wallet.connexion[slug].symbol,
                    memo: "testing",
                },
            }
        ]);
    }


    async sinmulateVapaeeIO() {
        console.error("sinmulateVapaeeIO() 1");
        await this.wallet.init("assets/endpoints.json");
        console.error("sinmulateVapaeeIO() 2");
        await this.dex.init(this.appname, {telosbookdex:"vapaeetokens", vapaeetokens:"vapaeetokens"}, ScatterIdProvider);
        console.error("sinmulateVapaeeIO() 3");
        await this.rex.init();
        console.error("sinmulateVapaeeIO() 4");
    }

    debug() {
        console.log("--- Scatter Page ---");
        console.log(this);

        for (let slug in this.wallet.connexion) {
            console.log("--- EOS Connexion["+slug+"] ---");
            this.wallet.connexion[slug].print();
        }

        if (this.keymanager) {
            this.keymanager.print();
        }

    }

    password: string;
    register() {
        console.log("register() ", this.password);
        this.keymanager.registerPassword(this.password);
    }

    verify() {
        this.keymanager.enterPassword(this.password);
    }

    cancel() {
        this.keymanager.enterPassword(null);
    }


    id_name: string;
    createIdentity() {
        this.keymanager.addIdentity(this.id_name);
    }
    
    cancelAccountSelection() {
        this.keymanager.selectAccount(this.id_name, null);
    }

    key: string;
    enterPrivateKey(identity, key) {
        console.log("enterPrivateKey(",identity, key,")");
        this.keymanager.addKey(identity, key);
    }

    generateKey() {
        let sub = this.keymanager.generatePubKey().subscribe(key => {
            this.key = key; // keys.masterPrivateKey;
            sub.unsubscribe();
        });        
    }


    loginAs(name:string, acc: Account) {
        console.log("loginAs("+name+") ", acc);
        let sub = this.keymanager.selectAccount(name, acc);
    }
}
