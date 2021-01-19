import { Injectable, Injector } from '@angular/core';
import { Transaction, Identity, Account, VapaeeWalletInterface, RPC, EOS, Eosconf, VapaeeIdentityProvider, TransactionResult } from './extern';

import { AsyncSubject, BehaviorSubject, Observable, ReplaySubject, Subject, zip, of, from, throwError } from 'rxjs';
import { map, mapTo, tap, mergeAll, concatMap } from 'rxjs/operators';

import { ILocalStorage, KeyAccountPermission, KeyAccounts, KeyAccountsMap } from './types-local';
import { LocalEoskey } from './local-eoskey.class';
import { Feedback } from '@vapaee/feedback';

// EOSIO ----------
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';

// import { EosApi } from 'eosjs-api';
import { HttpClient } from '@angular/common/http';


const IDENTITIES = "identities";
const LOGGED = "logged";

@Injectable({
    providedIn: 'root'
})
export class VapaeeIdentityManagerService {

    LOGIN_TIMEOUT = 10000;

    static injector: Injector = null;
    appname:string;
    logged:{[blockchain:string]:Identity} = {};
    identities:Identity[]=[];


    public accountRequest: string = null;
    public passwordRequest: boolean = false;

    private _connected;
    private wallet: VapaeeWalletInterface;
    private storage: ILocalStorage;
    private eoskey: LocalEoskey;

    public onPasswordRequest: Subject<void> = new Subject<void>();
    public onEnterPassword:Subject<string> = new Subject<string>();

    public onAccountRequest: Subject<string> = new Subject<string>();
    public onSelectAccount:Subject<{name:string, acc:Account}> = new Subject<{name:string, acc:Account}>();

    public feed: Feedback;


    private setInitReady: Function;
    public waitInit: Promise<any> = new Promise((resolve) => {
        this.setInitReady = resolve;
    });
    private setStorageReady: Function;
    public waitStorage: Promise<any> = new Promise((resolve) => {
        this.setStorageReady = resolve;
    });

    constructor(
        injector: Injector,
        private http: HttpClient
    ) {
        this.feed = new Feedback();
        VapaeeIdentityManagerService.injector = injector;

        this.onPasswordRequest.subscribe(() => {
            this.passwordRequest = true;
        });
        this.onAccountRequest.subscribe(slug => {
            this.accountRequest = slug;
        });

        this.doSubscribeToEvents();
    }

    doSubscribeToEvents() {
        let style = 'background: #45a7f8; color: #FFF';
        this.waitStorage.then(_ => console.log('%cVapaeeIdentityManager.waitStorage', style));        
        this.waitInit.then(_ => console.log('%cVapaeeIdentityManager.waitInit', style));
    }

    get authentitated() {
        return this.eoskey ? this.eoskey.authentitated : false;
    }

    get connected() {
        return this._connected;
    }

    get registered() {
        if (this.eoskey) {
            return  this.eoskey.registered;
        }
        return false;
    }

    createRPC(slug: string, eosconf: Eosconf): JsonRpc {
        this.eos[slug] = this.eos[slug] || {};
        let fullhost = eosconf.protocol + "://" + eosconf.host + ":" + eosconf.port;
        this.eos[slug].rpc = new JsonRpc(fullhost);
        console.log("VapaeeIdentityManagerService.createRPC("+slug+") --> " , fullhost);
        return this.eos[slug].rpc;
    }

    getRPC(slug:string): RPC {
        if (this.eos[slug]) return <RPC>this.eos[slug].rpc;
        return null;
    }

    async init(wallet: VapaeeWalletInterface, storage: ILocalStorage) {
        console.log("-- VapaeeIdentityManagerService init ---");
        this.wallet = wallet;
        this.storage = storage;
        this.eoskey = new LocalEoskey(this.storage);

        this.setStorageReady();
        await this.loadIdentities();
        await this.loadLogged();
        this.createConnexions();
        this.setInitReady()
    }

    private async loadIdentities(): Promise<void> {
        await this.waitStorage;
        return new Promise<void>(resolve => {
            this.storage.get(IDENTITIES).subscribe(
                identities => {
                    console.debug("this.storage.get(IDENTITIES).subscribe( --->  ", identities);
    
                    if (identities && typeof identities == "string") {
                        try {
                            identities = JSON.parse(identities);
                        } catch(e) {
                            console.log(typeof identities, identities);
                            console.error(e, identities);
                            identities = [];
                        }
                    }
    
                    if (Array.isArray(identities)) {
                        this.identities = identities;
                        console.debug("VapaeeIdentityManagerService. Identities stored: ", this.identities);
                    } else {
                        this.identities = [];
                        if (identities) {
                            console.error("ERROR: This identities are not an Array. This is a ", typeof identities, [identities]);
                        }
                    }
                    this.saveIdentities();
                    resolve();
                }
            );
        })
    }

    private async loadLogged(): Promise<void> {
        await this.waitStorage;
        return new Promise<void>(resolve => {
            this.storage.get(LOGGED).subscribe(
                logged => {
                    console.debug("this.storage.get(LOGGED).subscribe( --->  ", logged);

                    if (logged && typeof logged == "string") {
                        try {
                            logged = JSON.parse(logged);
                        } catch(e) {
                            console.log(typeof logged, logged);
                            console.error(e, logged);
                            logged = {};
                        }
                    }

                    if (typeof logged == "object") {
                        this.logged = logged;
                        console.debug("VapaeeIdentityManagerService. Logged stored: ", this.logged);
                    } else {
                        this.logged = {}
                        if (logged) {
                            console.error("ERROR: couldn't load logged. typeof logged ", typeof logged, [logged]);
                        }
                    }
                    this.saveLogged();
                    resolve();
                }
            );
        })
    }


    private async createConnexions() {
        await this.wallet.waitEndpoints;
   
        let networks = this.wallet.getNetworkSugs();
        for (let i=0; i<networks.length; i++) {
            let slug = networks[i];
            let sub = this.createConnexion(slug).subscribe(slug => {
                sub.unsubscribe();
            });
        }    
    }

    private createConnexion(slug:string) {
        return new Observable<string>(obs => {
            this.wallet.createConnexion(slug, LocalIdProvider).then(conn => {
                conn.createRPC().then(rpc => {
                    try {
                        let httpEndpoint: string = conn.eosconf.protocol + "://" + conn.eosconf.host + ":" + conn.eosconf.port;
                        this.eos[slug] = this.eos[slug] || {};
                        this.eos[slug].rpc = <JsonRpc>conn.getRPC();
                        this.eos[slug].endpoint = httpEndpoint;
                        console.log("----------",slug,"----------");
                        console.log(this.eos[slug]);
                    } catch(e) {
                        console.error(e);
                    }
                    obs.next(slug);                            
                });
            }).catch(e => {
                obs.next(null);
            });
        });        
    }

    connect(appname:string) {
        this.appname = appname;
        this._connected = true;
        console.log("VapaeeIdentityManagerService.connect("+appname+")");
    }

    isLogged(network_slug:string): Identity {
        return this.logged[network_slug];
    }

    async autologin(network_slug:string) {
        await this.waitInit;
        console.log("VapaeeIdentityManagerService.autologin()");
        if (this.isLogged(network_slug)) {
            this.wallet.getConnexion(network_slug).then(conn => {
                conn.getIdentityProvider().setIdentity(this.logged[network_slug]);
            });
        }        
    }
    
    login(network_slug:string): Observable<Identity> {
        console.error("VapaeeIdentityManagerService.login("+network_slug+")");
        return new Observable<Identity>((observer => {
            let logged = this.isLogged(network_slug);
            if (logged) {
                observer.next(logged);
                observer.complete();
            } else {
                let subscription = this.onSelectAccount.subscribe(res => {
                    console.log("this.onSelectAccount() ---> ", res);
                    if (res) {
                        this.wallet.getConnexion(network_slug).then(conn => {

                            this.logged[network_slug] = {
                                name: res.name,
                                accounts: [res.acc]
                            };
                            this.saveLogged();
                            conn.getIdentityProvider().setIdentity(this.logged[network_slug]);

                            logged = this.isLogged(network_slug);
                            console.log("this.isLogged(network_slug) ---> ", logged);
                            observer.next(logged);
                            observer.complete();
                            
                        });
                    } else {
                        observer.error("canceled");
                        observer.complete();
                    }
                    subscription.unsubscribe();
                });
                this.onAccountRequest.next(network_slug);
            }
        }));
    }

    logout(network_slug:string):Observable<void> {
        console.log("VapaeeIdentityManagerService.logout("+network_slug+")");
        delete this.logged[network_slug];
        this.saveLogged();
        return new Observable<void>((observer => {}));
    }


    sendTransaction(network_slug:string, trx: Transaction): Observable<TransactionResult> {
        console.log("VapaeeIdentityManagerService.sendTransaction("+network_slug+")");
        // https://github.com/EOSIO/eosjs#sending-a-transaction
        return new Observable<TransactionResult>((observer => {
            let subscription = this.onEnterPassword.subscribe(pass => {
                if (this.eoskey.verify(pass)) {
                    console.log("this.onEnterPassword()", pass);
                    this.signAndSendTransaction(network_slug, pass, trx).subscribe(r => {
                        observer.next(r);
                        observer.complete();
                    });
                } else {
                    console.error("this.authentitated", this.authentitated);
                    this.print();
                    observer.error("canceled");
                    observer.complete();
                }
                subscription.unsubscribe();
            });
            this.onPasswordRequest.next();
        }));

    }

    private signAndSendTransaction(slug: string, pass: string, trx: Transaction) {
        return new Observable<TransactionResult>(observer => {

            this.wallet.getConnexion(slug).then(conn => {

                let logged = this.isLogged(slug);
                console.log(logged, "ERROR: not logged");
                let account = logged.accounts[0]; 
                let pubkey = account.publicKey;
                let wif = this.eoskey.getKey(pass, pubkey);
                let signatureProvider = new JsSignatureProvider([wif]);
    
                let api = new Api({
                    rpc:this.eos[slug].rpc,
                    signatureProvider,
                    textDecoder: new TextDecoder(),
                    textEncoder: new TextEncoder()
                });


                // https://github.com/EOSIO/eosjs#sending-a-transaction
                let actions = [];
    
                for (let i=0; i<trx.length; i++) {
                    let action = trx[i];
                    actions.push({
                        account: action.contract,
                        name: action.action,
                        authorization: [{
                            actor: account.name,
                            permission: account.authority,
                        }],
                        data: action.payload
                    });
                }

                try {
                    api.transact({
                        actions: actions
                    }, {
                        blocksBehind: 3,
                        expireSeconds: 30,
                    }).then(r => {
                        let result: TransactionResult = r;
                        observer.next(result);
                    }).catch(e => {
                        console.error(e);
                        observer.error(e);
                    }).finally(() => {
                        observer.complete();
                    });
                } catch (e) {
                    console.log('\nCaught exception: ' + e);
                    if (e instanceof RpcError) {
                        let err = JSON.stringify(e.json, null, 2);
                        console.log(err);
                        console.error(err);
                    }                      
                }
    
            });
            
        });
    }
    
    generatePubKey(): Observable<any> {
        this.feed.setLoading("generate-keys");
        return this.eoskey.generate().pipe( map(x => {
            this.feed.setLoading("generate-keys", false);
            return x;
        }));
    }
    
    scanNetworksForAccounts(identity: string, pubkey: string, wif: string) {
        console.log("VapaeeIdentityManagerService.scanNetworksForAccounts(",identity,pubkey,")");
        let networks = this.wallet.getNetworkSugs();

        // TEMP --------------------------------------------------------------------------------
        let endpoints:string[] = [];
        // eos / telos
        endpoints.push("https://api.light.xeos.me/api/key/");
        // jungle
        endpoints.push("https://lightapi.eosgeneva.io/api/key/");
        // bos / wax / proton
        endpoints.push("https://lightapi.eosamsterdam.net/api/key/");
        // ¿?¿??
        endpoints.push("https://hyperion.coffe.io/api/key/");
        


        return from(endpoints)
        .pipe(
            concatMap(endpoint => this.http.get<KeyAccountsMap>(endpoint + pubkey))
        );        
    }

    eos:{[slug:string]:{api?:Api, rpc?: JsonRpc, endpoint?:string}} = {}; 
    private scanNetworkForAccounts(slug: string, identity: string, pubkey: string, wif:string, retry:boolean): Observable<string> {
        return new Observable<string>(obs => {
            if (this.eos[slug]) {
                try{
                    console.log(slug,"history_get_key_accounts() ---> ", this.eos[slug].rpc.endpoint);
                    this.eos[slug].rpc.history_get_key_accounts(pubkey).then(result => {
                        console.log("----------",slug,"----------");
                        console.log(this.eos[slug]);
                        console.log(result);
                        obs.next(slug);
                    }).catch(e => {
                        console.error(e)
                        if (retry) {
                            console.error(slug, "retrying...");
                            this.wallet.getConnexion(slug).then(conn => {
                                conn.autoSelectEndPoint().then(es => {
                                    this.createRPC(slug, conn.eosconf);
                                    this.scanNetworkForAccounts(slug, identity, pubkey, wif, false);    
                                });
                            });
                        } else {
                            obs.next(null);
                        }
                        
                    });
                } catch(e) {
                    console.error(e);
                }                
            } else {
                obs.next(null);
            }
        });
    }

    // .getKeyAccounts(public_key)
 
    addKey(name: string, key:string) {
        console.log("VapaeeIdentityManagerService.addKey(",key,")");
        let subscription = this.onEnterPassword.subscribe(pass => {
            // setInterval(() => {
            //     this.eoskey.verify(pass);
            // }, 100);

            if (this.eoskey.verify(pass)) {
                console.log("this.onEnterPassword() ---> ", pass);
                let pub = this.eoskey.addKey(pass, key);

                this.scanNetworksForAccounts(name, pub, key).subscribe(x => {
                    let identity = this.getIdentityByName(name);
                    for (let slug in x) {
                        let response:KeyAccounts = x[slug];
                        for (let account_name in response.accounts) {
                            let permisions:KeyAccountPermission[] = response.accounts[account_name];
                            for(let i in permisions) {
                                let a = permisions[i];
                                let found = identity.accounts.find(
                                    x => x.name == account_name &&
                                    x.authority == a.perm &&
                                    x.blockchain == response.chain.chainid);
                                if (!found) {
                                    // not included ---
                                    identity.accounts.push({
                                        name: account_name,
                                        slug: slug,
                                        authority: a.perm,
                                        publicKey: a.auth.keys[0].pubkey,
                                        blockchain: response.chain.chainid
                                    });
                                }
                            }
                        }
                    }
                },
                err => console.error(err), 
                () => {
                    this.saveIdentities();
                });

            } else {
                let e = "ERROR: password not verified";
                console.error(e);
                this.print();
            }
            subscription.unsubscribe();
        });
        this.onPasswordRequest.next();
    }

    getIdentityByName(name:string) {
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        console.assert(index != -1, "ERROR: getIdentityByName("+name+") NOT FOUND: " + JSON.stringify(this.identities))
        return this.identities[index];
    }

    removeKey(pubkey:string) {
        console.error("VapaeeIdentityManagerService.removeKey(",pubkey,") NOT IMPLEMENTED");
    }

    // Identity and accounts ABM ------------------------------------
    addIdentity(name:string) {
        console.log("VapaeeIdentityManagerService.addIdentity(",name,")");

        this.identities.push({
            name: name,
            accounts: []
        });

        this.saveIdentities();
    }
    changeIdentity(name:string, newname:string) {
        console.log("VapaeeIdentityManagerService.changeIdentity(",name,newname,")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        this.identities[index].name = newname;
        this.saveIdentities();
    }
    removeIdentity(name:string) {
        console.log("VapaeeIdentityManagerService.removeIdentity(",name,")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        delete this.identities[index];
        this.saveIdentities();
    }
    addAccount(name:string, acc: Account) {
        console.log("VapaeeIdentityManagerService.addAccount(",name,[acc],")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        this.identities[index].accounts.push(acc);
        this.saveIdentities();
    }
    changeAccount(name:string, aindex: number, acc: Account) {
        console.log("VapaeeIdentityManagerService.changeAccount(",name,aindex,[acc],")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        this.identities[index].accounts[aindex] = acc;
        this.saveIdentities();
    }
    removeAccount(name:string, aindex: number) {
        console.log("VapaeeIdentityManagerService.removeAccount(",name,aindex,")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        this.identities[index].accounts.splice(aindex,1);
        this.saveIdentities();
    }
    private saveIdentities() {
        this.storage.set(IDENTITIES, JSON.stringify(this.identities));
    }
    private saveLogged() {
        this.storage.set(LOGGED, JSON.stringify(this.logged));
    }


    // authentication functions ------------------------------------
    registerPassword(pass:string) {
        this.eoskey.register(pass);
    }

    enterPassword(pass:string) {
        console.error("-- VapaeeIdentityManagerService.enterPassword(",pass,") --");
        this.passwordRequest = false;
        this.onEnterPassword.next(pass);
    }

    assertAuthenticated(): Observable<void> {
        if (this.authentitated) {
            console.log("VapaeeIdentityManagerService.assertAuthenticated() -> true");
            return new Observable<void>(o => o.next());
        } else {
            console.log("VapaeeIdentityManagerService.assertAuthenticated() false! ");
            return new Observable<void>((observer => {
                let subscription = this.onEnterPassword.subscribe(pass => {
                    if (this.eoskey.verify(pass)) {
                        console.log("this.onEnterPassword() ---> ", pass);
                        observer.next();
                        observer.complete();
                    } else {
                        console.error("(this.authentitated", this.authentitated);
                        this.print();
                        observer.error("canceled");
                        observer.complete();
                    }
                    subscription.unsubscribe();
                });
                console.log("VapaeeIdentityManagerService.assertAuthenticated() -> this.onPasswordRequest.next() ");
                this.onPasswordRequest.next();
            }));
        }
    }

    // login // account selection ------------------------------------
    selectAccount(name: string, acc:Account) {
        this.accountRequest = null;
        console.error("-- VapaeeIdentityManagerService.selectAccount(",acc,") --");
        if (!acc) { 
            this.onSelectAccount.next(null);
            return of(null);
        }
        this.assertAuthenticated().subscribe(x => {
            this.onSelectAccount.next({name, acc});
        });
    }

    // debug --------------------------------------------------------
    print() {
        console.log("- VapaeeIdentityManagerService - ");
        console.log("appname", this.appname);
        console.log("_connected", this._connected);
        console.log("identities", this.identities);
        console.log("logged", this.logged);
        this.eoskey.print();
    }

}


// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------


export class LocalIdProvider implements VapaeeIdentityProvider {
    
    // common ------------------------
    public eosconf: Eosconf;
    
    public eos: EOS = null;
    public feed: Feedback;
    get connected(): boolean {
        return this.manager ? this.manager.connected : false;
    }
    get account(): Account {
        if (this.manager) {
            if (this.manager.isLogged(this.slug)) {
                return this.manager.isLogged(this.slug).accounts[0];
            }
        };        

        return null;
    }


    onLogggedStateChange:Subject<boolean> = new Subject<boolean>();

    manager: VapaeeIdentityManagerService;
    constructor(
        public slug: string,
        public wallet: VapaeeWalletInterface
    ) {
        this.feed = new Feedback();
        console.assert(typeof VapaeeIdentityManagerService.injector == "object", "ERROR: VapaeeIdentityManagerService was not initialized. Execute constructor(public manager: VapaeeIdentityManagerService) { manager.init(); }");
        this.manager = VapaeeIdentityManagerService.injector.get(VapaeeIdentityManagerService);
    }

    // connexion with id provider
    getRPC():RPC {
        return this.manager.getRPC(this.slug);
    }
    async createRPC(eosconf: Eosconf):Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].createRPC()");
        this.manager.createRPC(this.slug, eosconf);
    }
    async connect(appname:string):Promise<void> {
        return this.doConnect(appname);
    }

    // transactions
    async sendTransaction(trx: Transaction):Promise<TransactionResult> {
        console.log("LocalIdProvider["+this.slug+"].sendTransaction()", trx);
        return this.manager.sendTransaction(this.slug, trx).toPromise();
    }

    // identity & authentication
    async setIdentity(identity:Identity):Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].setIdentity()");
        this.onLogggedStateChange.next(true);
    }
    async resetIdentity():Promise<void> {
        console.error("LocalIdProvider["+this.slug+"].resetIdentity()  NOT IMPLEMENTED");
    }
    async autologin():Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].autologin()");
        return this.manager.autologin(this.slug);
    }
    async login():Promise<Identity> {
        console.log("LocalIdProvider["+this.slug+"].login()");
        return this.manager.login(this.slug).toPromise();
    }
    async logout():Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].logout()");
        return this.manager.logout(this.slug).toPromise();
    }

    // debugginh
    print() {
        console.log("IdProvider:", this);
    }

    // ----------------------------------------------------------------
    private async doAssertContext():Promise<void> {
        return Promise.resolve();
    }

    private async doConnect(appname:string):Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].doConnect("+appname+")");
        
        this.feed.setLoading("connecting");
        return new Promise(async (resolve, reject) => {
            try {
                await this.doAssertContext();
                await this.manager.connect(appname);
                this.feed.setLoading("connecting", false);
                resolve();        
            } catch (e) {
                this.feed.setLoading("connecting", false);
                reject(e);
            }
        });
    }

    // ---------------------------

}