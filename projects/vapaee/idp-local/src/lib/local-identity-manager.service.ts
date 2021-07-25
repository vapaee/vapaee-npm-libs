import { Injectable, Injector } from '@angular/core';
import { Transaction, Identity, Account, VapaeeWalletInterface, RPC, EOS, Eosconf, VapaeeIdentityProvider, TransactionResult } from '@vapaee/wallet';

import { Observable, Subject, zip, of, from} from 'rxjs';
import { map, mergeMap, concatMap } from 'rxjs/operators';

import { ILocalStorage, KeyAccountPermission, KeyAccounts, KeyAccountsMap, KeyAccountsChain } from './types-local';
import { LocalEoskey } from './local-eoskey.class';
import { Feedback } from '@vapaee/feedback';

// EOSIO ----------
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';

// import { EosApi } from 'eosjs-api';
import { HttpClient } from '@angular/common/http';


export interface VapaeeIdentityManagerOptions {
    requestPassForLogin: boolean;
}

const IDENTITIES = "identities";
const LOGGED = "logged";

@Injectable({
    providedIn: 'root'
})
export class VapaeeIdentityManagerService {

    LOGIN_TIMEOUT = 10000;

    static injector: Injector | null = null;
    appname:string = "";
    logged:{[blockchain:string]:Identity} = {};
    identities:Identity[]=[];
    keyaccounts: {[pubkey:string]: Account[]} = {};

    private options: VapaeeIdentityManagerOptions  = {
        requestPassForLogin: false
    }

    public accountRequest: string = "";
    public passwordRequest: boolean = false;

    private _connected: boolean = false;
    private wallet: VapaeeWalletInterface | null = null;
    private storage: ILocalStorage | null = null;
    private eoskey: LocalEoskey | null = null;

    public onPasswordRequest: Subject<void> = new Subject<void>();
    public onEnterPassword:Subject<string> = new Subject<string>();

    public onAccountRequest: Subject<string> = new Subject<string>();
    public onSelectAccount:Subject<{name:string, acc:Account} | null> = new Subject<{name:string, acc:Account} | null>();

    public onKeyAccountUpdate:Subject<KeyAccountsMap> = new Subject<KeyAccountsMap>();
    public onLoggedChange:Subject<void> = new Subject<void>();


    public feed: Feedback;


    private setInitReady: () => void = () => {};
    public waitInit: Promise<void> = new Promise((resolve) => {
        this.setInitReady = resolve;
    });
    private setStorageReady: () => void = () => {};
    public waitStorage: Promise<void> = new Promise((resolve) => {
        this.setStorageReady = resolve;
    });

    eos:{[slug:string]:{api?:Api, rpc?: JsonRpc, endpoint?:string}} = {}; 

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
        this.waitStorage            .then(_ => console.log('%c VapaeeIdentityManager.waitStorage ',    style));        
        this.waitInit               .then(_ => console.log('%c VapaeeIdentityManager.waitInit ',       style));
        this.onLoggedChange   .subscribe(() => console.log('%c VapaeeIdentityManager.onLoggedChange ', style));
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
        let endpoint: string = eosconf.protocol + "://" + eosconf.host + ":" + eosconf.port;
        let rpc:JsonRpc = new JsonRpc(endpoint);
        this.eos[slug] = this.eos[slug] || {};
        this.eos[slug].endpoint = endpoint;
        this.eos[slug].rpc = rpc;
        console.log("VapaeeIdentityManagerService.createRPC("+slug+") --> " , endpoint);
        return rpc;
    }

    getRPC(slug:string): RPC | null{
        if (this.eos[slug]) return <RPC>this.eos[slug].rpc;
        return null;
    }

    async init(wallet: VapaeeWalletInterface, storage: ILocalStorage, options: VapaeeIdentityManagerOptions|null = null) {
        console.log("-- VapaeeIdentityManagerService init ---");
        this.wallet = wallet;
        this.storage = storage;
        this.eoskey = new LocalEoskey(this.storage);
        this.options = Object.assign(this.options, options);

        this.setStorageReady();
        await this.loadIdentities();
        await this.loadLogged();
        await this.createConnexions();
        this.setInitReady()
    }

    private async loadIdentities(): Promise<void> {
        await this.waitStorage;
        if (!this.storage) return Promise.reject("ERROR: storage is null");
        let storage = this.storage;        
        return new Promise<void>((resolve, reject) => {
           
            storage.get(IDENTITIES).subscribe(
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
                },
                err => {
                    console.error("loadIdentities()", err);
                    reject(err);
                }
            );
        })
    }

    private async loadLogged(): Promise<void> {
        await this.waitStorage;
        if (!this.storage) return Promise.reject("ERROR: storage is null");
        let storage = this.storage;
        return new Promise<void>((resolve, reject) => {
                storage.get(LOGGED).subscribe(
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

                        if (logged && typeof logged == "object") {
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
                    },
                    err => {
                        console.error("loadLogged()", err);
                        reject(err);
                    }
                );
            
        })
    }

    private async createConnexions(): Promise<void> {
        console.log("VapaeeIdentityManagerService.createConnexions()...");
        if (!this.wallet) return Promise.reject("ERROR: wallet is null");
        let wallet = this.wallet;
        await wallet.waitEndpoints;
        return new Promise<void>(resolve => {
            let networks = wallet.getNetworkSugs();
            from(networks).pipe(
                mergeMap( slug => this.createConnexion(slug))
            ).subscribe(slug => {
                console.debug("VapaeeIdentityManagerService.createConnexions() Finished!", slug);
                resolve();
            });    
        });
    }

    private createConnexion(slug:string): Observable<string> {
        console.log("VapaeeIdentityManagerService.createConnexion("+slug+")");
        if (!this.wallet) return new Observable<string>(a => a.error("ERROR: wallet is null"));
        let wallet = this.wallet;
        return new Observable<string>(obs => {
            wallet.createConnexion(slug, LocalIdProvider).then(conn => {
                console.assert(typeof conn.getRPC() == "object", "ERROR: conn.getRPC() -> null");
                /*
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
                */
                obs.next(slug);                          
                
            }).catch(e => {
                obs.next("");
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

    async autologin(network_slug:string):Promise<void> {
        await this.waitInit;
        if (!this.wallet) return Promise.reject("ERROR: wallet is null");
        let wallet = this.wallet;
        console.log("VapaeeIdentityManagerService.autologin()");
        return new Promise((resolve) => {
            if (this.isLogged(network_slug)) {
                wallet.getConnexion(network_slug).then(conn => {
                    conn.getIdentityProvider().setIdentity(this.logged[network_slug]);
                    resolve();
                });
            }
        });
    }
    
    login(network_slug:string): Observable<Identity> {
        console.error("VapaeeIdentityManagerService.login("+network_slug+")");
        if (!this.wallet) return new Observable(obs => obs.error("ERROR: wallet is null"));
        let wallet = this.wallet;
        return new Observable<Identity>((observer => {
            let logged = this.isLogged(network_slug);
            if (logged) {
                observer.next(logged);
                observer.complete();
            } else {
                let subscription = this.onSelectAccount.subscribe(res => {
                    console.log("this.onSelectAccount() ---> ", res);
                    if (res) {
                        wallet.getConnexion(network_slug).then(conn => {

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
        return new Observable<void>((observer => {
            observer.next();
            observer.complete();
        }));
    }


    sendTransaction(network_slug:string, trx: Transaction): Observable<TransactionResult> {
        console.log("VapaeeIdentityManagerService.sendTransaction("+network_slug+")");
        if (!this.eoskey) return new Observable(obs => obs.error("ERROR: eoskey is null"));
        let eoskey = this.eoskey;
        // https://github.com/EOSIO/eosjs#sending-a-transaction
        return new Observable<TransactionResult>((observer => {
            let subscription = this.onEnterPassword.subscribe(pass => {
                console.log("this.onEnterPassword()", pass);
                if (eoskey.verify(pass)) {
                    this.signAndSendTransaction(network_slug, pass, trx).subscribe(r => {
                        observer.next(r);
                        observer.complete();
                    },
                    err => {
                        observer.error(err);
                    });
                } else {
                    this.print();
                    observer.error({
                        message: pass ? "password" : "canceled"
                    });
                }
                subscription.unsubscribe();
            });
            this.onPasswordRequest.next();
        }));

    }

    private signAndSendTransaction(slug: string, pass: string, trx: Transaction): Observable<TransactionResult> {

        // check wallet 
        if (!this.wallet) return new Observable(obs => obs.error("ERROR: wallet is null"));
        let wallet = this.wallet;

        // check eoskey 
        if (!this.eoskey) return new Observable(obs => obs.error("ERROR: eoskey is null"));
        let eoskey = this.eoskey;

        // check eos[slug]
        let eosslug = this.eos[slug];
        if (!eosslug) return new Observable(obs => obs.error("ERROR: this.eos['"+slug+"'] is null"));

        // check eos[slug].rpc
        if (!eosslug.rpc) return new Observable(obs => obs.error("ERROR: this.eos['"+slug+"'].rpc is null"));
        let rpc:JsonRpc = eosslug.rpc;

        
        return new Observable<TransactionResult>(observer => {

            wallet.getConnexion(slug).then(conn => {

                let logged = this.isLogged(slug);
                console.assert(!!logged, "ERROR: not logged");
                let account = logged.accounts[0];
                let pubkey = account.publicKey || ""; // ensure string type
                console.log("-----------------------------------------------");
                console.log("logged", logged);
                console.log("account", account);
                console.log("pass", pass);
                console.log("pubkey", pubkey);
                console.log("-----------------------------------------------");
                let wif = eoskey.getKey(pass, pubkey);
                let signatureProvider = new JsSignatureProvider([wif]);
    
                let api = new Api({
                    rpc: rpc,
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
                        observer.complete();
                    }).catch(e => {
                        observer.error(e);
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
        // check eoskey 
        if (!this.eoskey) return new Observable(obs => obs.error("ERROR: eoskey is null"));
        
        return this.eoskey.generate().pipe( map(x => {
            this.feed.setLoading("generate-keys", false);
            return x;
        }));
    }
    
    scanNetworksForAccounts(identity: string, pubkey: string): Observable<KeyAccountsMap> {
        console.log("VapaeeIdentityManagerService.scanNetworksForAccounts(",identity,pubkey,")");
        // check wallet 
        if (!this.wallet) return new Observable(obs => obs.error("ERROR: wallet is null"));
        
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

        let indexes = [0,1,2,3];

        let data$ = from(endpoints).pipe(
            concatMap(endpoint => this.http.get<KeyAccountsMap>(endpoint + pubkey)),
        );

        if (pubkey == "EOS8RoCAXxWYUW2v4xkG19F57BDVBzpt9NN2iDsD1ouQNyV2BkiNc") {
            // for debugging purpose
            let get_credentials = () => [
                {
                    "perm": "active",
                    "threshold": 1,
                    "auth": {
                        "keys": [
                            {
                                "public_key": "PUB_K1_8MPwGHuGSHSfBp3HAWsrHDotAqp9ZPShBvNcGDpcmNNa2Q6ozK",
                                "weight": 1,
                                "pubkey": "EOS8RoCAXxWYUW2v4xkG19F57BDVBzpt9NN2iDsD1ouQNyV2BkiNc"
                            }
                        ],
                        "accounts": []
                    }
                },
                {
                    "perm": "owner",
                    "threshold": 1,
                    "auth": {
                        "keys": [
                            {
                                "pubkey": "EOS8RoCAXxWYUW2v4xkG19F57BDVBzpt9NN2iDsD1ouQNyV2BkiNc",
                                "weight": 1,
                                "public_key": "PUB_K1_5SicH9s2UGrDFJuM23CpiC9FmpbrBvXrFEYkutucAJnVZDpBRa"
                            }
                        ],
                        "accounts": []
                    }
                }
            ]
            indexes = [0];
            data$ = from([<KeyAccountsMap>{
                "telos": {
                    "chain": <KeyAccountsChain> {
                        chainid: "cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f"
                    },
                    "accounts": {
                        "bob": get_credentials(),
                        "alice": get_credentials(),
                        "tom": get_credentials(),
                        "kate": get_credentials(),
                        "viterbotelos": get_credentials()
                    }
                }
            }]);
        }

        let indexes$ = from(indexes);
        let counter = indexes.length;  

        this.feed.setLoading("scanning");
        for (let i=0; i<indexes.length; i++){
            this.feed.setLoading("scanning-"+i);
        }

        return zip(data$, indexes$).pipe(
            map(([data, index]) => {                
                if (--counter == 0) this.feed.setLoading("scanning", false);
                this.feed.setLoading("scanning-"+index, false);
                return data;
            })                
        );
    }

    
    // private scanNetworkForAccounts(slug: string, identity: string, pubkey: string, wif:string, retry:boolean): Observable<string> {
    //     return new Observable<string>(obs => {
    //         if (this.eos[slug]) {
    //             try{
    //                 console.log(slug,"history_get_key_accounts() ---> ", this.eos[slug].rpc.endpoint);
    //                 this.eos[slug].rpc.history_get_key_accounts(pubkey).then(result => {
    //                     console.log("----------",slug,"----------");
    //                     console.log(this.eos[slug]);
    //                     console.log(result);
    //                     obs.next(slug);
    //                 }).catch(e => {
    //                     console.error(e)
    //                     if (retry) {
    //                         console.error(slug, "retrying...");
    //                         this.wallet.getConnexion(slug).then(conn => {
    //                             conn.autoSelectEndPoint().then(es => {
    //                                 this.createRPC(slug, conn.eosconf);
    //                                 this.scanNetworkForAccounts(slug, identity, pubkey, wif, false);    
    //                             });
    //                         });
    //                     } else {
    //                         obs.next(null);
    //                     }
    //                     
    //                 });
    //             } catch(e) {
    //                 console.error(e);
    //             }                
    //         } else {
    //             obs.next(null);
    //         }
    //     });
    // }

    // .getKeyAccounts(public_key)
 
    addKey(name: string, wif:string): void {
        console.log("VapaeeIdentityManagerService.addKey(",wif,")");

        // check eoskey 
        if (!this.eoskey) return console.error("ERROR: eoskey is null");
        let eoskey = this.eoskey;

        let subscription = this.onEnterPassword.subscribe(pass => {
            // setInterval(() => {
            //     this.eoskey.verify(pass);
            // }, 100);

            if (eoskey.verify(pass)) {
                console.log("this.onEnterPassword() ---> ", pass);
                let pub:string = "";
                try {
                    pub = eoskey.addKey(pass, wif);
                } catch(e) {
                    let err = "ERROR: wrong WIF (Wallet Imput Format): "+ wif;
                    console.error(err,e);
                    throw err;
                }

                this.keyaccounts[pub] = [];
                this.scanNetworksForAccounts(name, pub).subscribe(x => {
                    
                    for (let slug in x) {
                        let response:KeyAccounts = x[slug];
                        for (let account_name in response.accounts) {
                            let permisions:KeyAccountPermission[] = response.accounts[account_name];
                            for(let i in permisions) {
                                let a = permisions[i];
                                if (a.auth.keys[0].pubkey == pub) {
                                    this.keyaccounts[pub].push({
                                        id: account_name + "@" + slug + ":" + a.perm,
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

                    this.keyaccounts[pub].sort( (a,b) => {
                        return a.name.localeCompare(b.name);
                    });

                    this.onKeyAccountUpdate.next(x);
                },
                err => {
                    console.error(err);
                    this.onKeyAccountUpdate.error(err);
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

    getPubkey(wif: string): string {
        // check eoskey 
        if (!this.eoskey) return "";
        return this.eoskey.getPublicKey(wif);
    }

    verifyPassword(pass: string): boolean {
        // check eoskey 
        if (!this.eoskey) return false;
        return this.eoskey.verify(pass);
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

        if (this.identities[index].accounts.map((x:Account) => x.id).indexOf(acc.id) == -1) {
            this.identities[index].accounts.push(acc);
            this.saveIdentities();    
        }

    }
    changeAccount(name:string, aindex: number, acc: Account) {
        console.log("VapaeeIdentityManagerService.changeAccount(",name,aindex,[acc],")");
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        this.identities[index].accounts[aindex] = acc;
        this.saveIdentities();
    }
    removeAccount(name:string, aux: number|Account) {
        console.log("VapaeeIdentityManagerService.removeAccount(",name,",acc)", [aux]);
        let index = this.identities.map((x:Identity) => x.name).indexOf(name);
        let aindex:number = -1;
        let acc:Account = <Account>{};

        if (typeof aux == "object") {
            acc = <Account>aux;
            aindex = this.identities[index].accounts.map((x:Account) => x.id).indexOf(acc.id);
            console.debug("acc:",acc, "aindex: ", aindex);
            if (aindex != -1) {
                console.assert(!!acc.id && this.identities[index].accounts[aindex].name == acc.name, "ERROR: Account id missmatch")    
            }            
        } else {
            aindex = aux;
            acc = this.identities[index].accounts[aindex];
        }
        
        if (aindex != -1) {
            this.identities[index].accounts.splice(aindex,1);
            let slug = acc.slug;
            if (slug) {
                if (this.logged[slug] && this.logged[slug].accounts[0].id == acc.id) {
                    this.logout(slug);
                }
            }
            this.saveIdentities();
        }
    }
    private saveIdentities() {
        if (!this.storage) return console.error("ERROR: storage is null");
        this.storage.set(IDENTITIES, JSON.stringify(this.identities));
    }
    private saveLogged() {
        console.log("VapaeeIdentityManagerService.saveLogged()");
        if (!this.storage) return console.error("ERROR: storage is null");
        this.storage.set(LOGGED, JSON.stringify(this.logged));
        this.onLoggedChange.next();
    }


    // authentication functions ------------------------------------
    registerPassword(pass:string) {
        if (!this.eoskey) return console.error("ERROR: eoskey is null");
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
            if (!this.eoskey) return new Observable(obs => obs.error("ERROR: eoskey is null"));
            let eoskey = this.eoskey;
            return new Observable<void>((observer => {
                let subscription = this.onEnterPassword.subscribe(pass => {
                    if (eoskey.verify(pass)) {
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
        this.accountRequest = "";
        console.error("-- VapaeeIdentityManagerService.selectAccount(",acc,") --");
        if (!acc) { 
            this.onSelectAccount.next(null);
        }
        if (this.options.requestPassForLogin) {
            this.assertAuthenticated().subscribe(x => {
                this.onSelectAccount.next({name, acc});
            });
        } else {
            this.onSelectAccount.next({name, acc});
        }
    }

    // debug --------------------------------------------------------
    print() {
        console.log("- VapaeeIdentityManagerService - ");
        console.log("appname", this.appname);
        console.log("_connected", this._connected);
        console.log("identities", this.identities);
        console.log("logged", this.logged);
        if(this.eoskey) {
            this.eoskey.print();
        } else {
            console.log("eoskey", this.eoskey);
        }
        
    }

}


// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------


export class LocalIdProvider implements VapaeeIdentityProvider {
    
    // common ------------------------
    public eosconf: Eosconf = {blockchain:"", protocol:"", host:"", port:0, chainId:""};
    public eos: EOS | null = null;
    public feed: Feedback;
    get connected(): boolean {
        return this.manager ? this.manager.connected : false;
    }
    get account(): Account | null {
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
        let err = "ERROR: VapaeeIdentityManagerService was not initialized. Execute constructor(public manager: VapaeeIdentityManagerService) { manager.init(); }";
        if (VapaeeIdentityManagerService.injector) {
            this.manager = VapaeeIdentityManagerService.injector.get(VapaeeIdentityManagerService);
        } else {
            throw(err);
        }
    }

    // connexion with id provider
    getEosconf(): Eosconf {
        return this.eosconf;
    }
    getRPC():RPC | null {
        return this.manager.getRPC(this.slug);
    }
    async createRPC(eosconf: Eosconf):Promise<void> {
        console.log("LocalIdProvider["+this.slug+"].createRPC()");
        this.eosconf = eosconf;
        this.manager.createRPC(this.slug, eosconf);
    }
    async connect(appname:string):Promise<void> {
        return this.doConnect(appname);
    }

    // transactions
    async sendTransaction(trx: Transaction):Promise<TransactionResult> {
        console.log("LocalIdProvider["+this.slug+"].sendTransaction()", trx);
        return new Promise<TransactionResult>((resolve, reject) => {
            this.manager.sendTransaction(this.slug, trx).subscribe(
                x => { resolve(x); },
                e => { reject(e); }
            );
        });
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
