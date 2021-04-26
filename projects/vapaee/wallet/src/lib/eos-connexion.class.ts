import { Observable, Subject } from 'rxjs';
import { Asset } from './asset.class';
import { Account, AccountData, Endpoint, EndpointState, Eosconf, GetInfoResponse,
        VapaeeWalletConnexion, Transaction, VapaeeIdentityProvider, RPC, Identity, VapaeeWalletInterface, TransactionResult } from './types-wallet';
import { Token } from './token.class';
import { ScatterUtils } from './utils.class';

import { HttpClient } from '@angular/common/http';
import { SmartContract } from './contract.class';

// @vapaee libs 
import { Feedback } from './extern';
import { resourceUsage } from 'process';




export class EOSNetworkConnexion implements VapaeeWalletConnexion { 
    error: string;
    symbol: string;
    feed: Feedback;
    // private lib: Scatter;
    onEndpointChange:Subject<EndpointState> = new Subject<EndpointState>();
    onLogggedStateChange:Subject<boolean> = new Subject<boolean>();
    // _account: Account;
    private setReady: Function;
    public waitReady: Promise<any> = new Promise((resolve) => {
        this.setReady = resolve;
    });
    private setLogged: Function;
    public waitLogged: Promise<any> = new Promise((resolve) => {
        this.setLogged = resolve;
    });
    private setConnected: Function;
    public waitConnected: Promise<any> = new Promise((resolve) => {
        this.setConnected = resolve;
    });
    private setRPC: Function;
    public waitRPC: Promise<any> = new Promise((resolve) => {
        this.setRPC = resolve;
    });
    private setEosconf: Function;
    public waitEosconf: Promise<any> = new Promise((resolve) => {
        this.setEosconf = resolve;
    });

    utils:ScatterUtils;
    get account(): Account { 
        return this.idprovider.account;
    }
    

    networks: string[];

    username: string;
    authorization: {authorization:string[]};
    
    public eosconf: Eosconf;

    // private _network: Network;
    // public eos: EOS = null;
    // public rpc: JsonRpc = null;
    // public _connected: boolean;
    // public scatter_network: ScatterJS.Network;
    public appname:string = null;
    // public ScatterJS: any;
    private _account_queries: {[key:string]:Promise<AccountData>} = {};

    constructor(
        public wallet: VapaeeWalletInterface,
        public slug: string,
        public http: HttpClient,
        public idprovider: VapaeeIdentityProvider
    ) {
        // this.ScatterJS = ScatterJS;
        this.feed = new Feedback();
        this.utils = new ScatterUtils();
        
        // ScatterJS.plugins( new ScatterEOS() );
        this.symbol = this.wallet.getNetwork(slug).symbol; 
        this.subscribeToEvents();

        this.updateInternalState();
        this.idprovider.onLogggedStateChange.subscribe(this.updateInternalState.bind(this));
    }

    async subscribeToEvents() {
        let style = 'background: #a74528; color: #FFF';
        this.waitConnected.then(_ => console.log('%cEOSNetworkConnexion['+this.slug+'].waitConnected', style));
        this.waitEosconf.then(_ => console.log('%cEOSNetworkConnexion['+this.slug+'].waitEosconf', style));
        this.waitLogged.then(_ => console.log('%cEOSNetworkConnexion['+this.slug+'].waitLogged', style));
        this.waitRPC.then(_ => console.log('%cEOSNetworkConnexion['+this.slug+'].waitRPC', style));
        this.waitReady.then(_ => console.log('%cEOSNetworkConnexion['+this.slug+'].waitReady', style));
    } 

    get logged() {
        return !!this.account;
    }   

    get connected() {
        return this.idprovider.connected;
    }

    get rpc(): RPC {
        return this.idprovider.getRPC();
    }

    get guest(): Account {
        return this.wallet.guest;
    }

    getContract(account: string): SmartContract {
        console.debug("EOSNetworkConnexion["+this.slug+"].getContract(",account,")");
        return new SmartContract(account, this);
    }

    getRPC(): RPC {
        if(!this.idprovider) return null;
        return this.idprovider.getRPC();
    }

    getIdentityProvider():VapaeeIdentityProvider {
        return this.idprovider;
    }
    
    async createRPC(): Promise<RPC> {
        console.debug("EOSNetworkConnexion["+this.slug+"].createRPC()");

        if (this.getRPC()) return Promise.resolve(this.getRPC());
        
        return new Promise<RPC>(async (resolve, reject) => {
            try {
                await this.waitEosconf;
                await this.idprovider.createRPC(this.eosconf);
                this.setRPC();
                resolve(this.getRPC());    
            } catch(e) {
                console.error(e);
                reject(e);
            }
        });
    }

    private async assertConnected(func:string) {
        console.debug("EOSNetworkConnexion["+this.slug+"].assertConnected()");
        if (!this.connected) {
            if (!this.appname) throw "ERROR: You have to connect to @vapaee/scatter before calling " + func + "()";
            try {
                await this.idprovider.connect(this.appname);
            } catch (e) {
                console.error(e);
                return e;
            }
            
        }
        return this.waitConnected;
    }
    
    private async connectToIdProvider(appname: string) {
        console.log("EOSNetworkConnexion["+this.slug+"].connectToIdProvider("+appname+")");
        this.feed.setLoading("connecting", true);
        return new Promise<void>(async (resolve, reject) => {
            this.idprovider.connect(appname).then(async _ => {
                this.setConnected();
                resolve();
                this.feed.setLoading("connecting", false);
            }).catch(e => {
                console.debug("EOSNetworkConnexion["+this.slug+"].connectToIdProvider("+appname+") failed", e);
                reject(e);
                this.feed.setLoading("connecting", false);
            });
        });
    }
    
    async connect(appname:string) {
        this.appname = appname;
        
        console.log("EOSNetworkConnexion["+this.slug+"].connect("+appname+")");
        console.debug(this);

        this.feed.setLoading("connecting");

        return this.createRPC().then(_ => {
            return this.connectToIdProvider(appname);
        });
    }

    async sendTransaction(trx: Transaction): Promise<TransactionResult> {
        console.log("EOSNetworkConnexion["+this.slug+"].sendTransaction()", trx);
        this.feed.setLoading("transaction");
        return new Promise<TransactionResult>(async (resolve, reject) => {
            await this.waitLogged;
            console.error("EOSNetworkConnexion["+this.slug+"].sendTransaction() waitLogged CHECKPOINT");

            this.idprovider.sendTransaction(trx).then(res => {
                console.debug('sent: ', res);
                console.debug("https://telos.bloks.io/transaction/" + res.transaction_id);
                this.feed.setLoading("transaction", false);
                resolve(res);
            }).catch(err => {
                this.feed.setLoading("transaction", false);
                this.feed.setError("transaction", err.message);
                reject(err);
            });
        });        
    }
    
    private async delay(milisec:number) {
        console.log("sleep...");
        return new Promise<void>(r => {
            setTimeout(() => r(), milisec);
        });
    };

    print() {
        console.log("Connexion: ", this);
        this.idprovider.print();
    }

    // Acount, Identity and authentication -----------------

    private async updateInternalState() {
        console.log("EOSNetworkConnexion["+this.slug+"].updateInternalState()", [this.logged]);
        if (this.logged) {
            this.setLogged();
        }
        this.updateAccountData();
    }

    resetIdentity() {
        console.log("EOSNetworkConnexion["+this.slug+"].resetIdentity()");
        this.idprovider.resetIdentity();
    }

    updateAccountData() {
        console.log("EOSNetworkConnexion["+this.slug+"].updateAccountData()");
        if (this.logged) {
            this.queryAccountData(this.account.name).then(data => {
                this.account.data = data;
                console.debug("this.onLogggedStateChange.next(true); EVENT");
                this.onLogggedStateChange.next(true);
            }).catch(_ => {
                this.account.data = this.guest.data;
                console.debug("this.onLogggedStateChange.next(true); EVENT");
                this.onLogggedStateChange.next(true);
            });
        } else {
            this.onLogggedStateChange.next(false);
        }
    };

    // Networks (eosio blockchains) & Endpoints -----------------
    autoSelectEndPoint (): Promise<EndpointState> {
        console.log("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()");

        return new Promise((resolve, reject) => {
            let promises:Promise<EndpointState>[] = [];

            console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  ENTRANDO ------");

            // Iterate over endponits and get the first one responding
            if (this.wallet.getNetwork(this.slug)) {
                let endpoints: Endpoint[] = this.wallet.getNetwork(this.slug).endpoints;
                for (let i=0; i<endpoints.length; i++) {
                    let endpoint: Endpoint = endpoints[i];

                    // discarding the same host
                    if (this.eosconf && this.eosconf.host == endpoint.host) {
                        endpoint.disabled = true;
                        continue;
                    }

                    if (endpoint.disabled) continue; 

                    if (endpoint.ping_get_info == -1) continue;

                    promises.push(this.testEndpoint(endpoint));                  
                }

                if (promises.length == 0) {
                    console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  TODOS DISABLED ?? ------");
                    for (let i=0; i<endpoints.length; i++) {
                        let endpoint: Endpoint = endpoints[i];
                        console.error("endpoint["+endpoint.host+"].disabled: ", endpoint.disabled);
                        endpoint.disabled = false;
                        promises.push(this.testEndpoint(endpoint));
                    }                    
                }
            }

            console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  PINGS ENVIADOS ------");

            Promise.all(promises).then(_ => {
                console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  FINALIZARON TODOS (then) ------");
                this.wallet.getNetwork(this.slug);
            }).catch(err => {
                console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  FINALIZARON TODOS (catch) ------");
                this.wallet.getNetwork(this.slug);
            }).finally(() => {
                console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  FINALIZARON TODOS (finally) ------");
                this.wallet.getNetwork(this.slug);
            })

            return Promise.race(promises).then(result => {
                console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint() Promise.race(promises) -> ", [result]);
                let eosconf = this.extractEosconfig(result.endpoint);

                console.debug("EOSNetworkConnexion["+this.slug+"].autoSelectEndPoint()  RACE!!! ", result.endpoint.host, result.endpoint.ping_get_info, " ------ ");

                if (eosconf) {
                    if (!this.eosconf || this.eosconf.host != eosconf.host) {
                        this.eosconf = eosconf;
                        if (this.getRPC()) {
                            // we already have a RPC so we must create another with the new eosconf
                            this.idprovider.createRPC(this.eosconf)
                        }
                        this.setEosconf();
                        // console.log("Selected Endpoint: ", this.eosconf.host);
                        // this.resetIdentity();
                        // this.initScatter();
                        this.onEndpointChange.next(result);
                    }
                    resolve(result);
                } else {
                    console.error("ERROR: can't resolve endpoint", result);
                }
                
            });
        });

    }
    private testEndpoint(endpoint: Endpoint) {
        console.log("EOSNetworkConnexion["+this.slug+"].testEndpoint()", endpoint.host);
        // extra data to determine performance
        endpoint.ping_get_info = 0;

        return new Promise<EndpointState>((resolve) => {
            let _then = new Date();
            let url = endpoint.protocol + "://" + endpoint.host + ":" + endpoint.port + "/v1/chain/get_info";
            this.http.get<GetInfoResponse>(url).toPromise().then((response) => {
                console.debug("EOSNetworkConnexion["+this.slug+"].testEndpoint() -> ", endpoint.host);
                let _now = new Date();
                let ping = _now.getTime() - _then.getTime();
                endpoint.ping_get_info = ping;
                resolve({endpoint, response});
            }).catch(e => {
                endpoint.ping_get_info = -1;
                console.warn("WARNING: endpoint not responding", e);
            });
        });
    }

    

    private extractEosconfig(endpoint: Endpoint): Eosconf {
        if (!endpoint) return null;
        console.log("EOSNetworkConnexion["+this.slug+"].extractEosconfig()", endpoint.host);
        let eosconf = {
            blockchain: "eos",
            chainId: this.wallet.getNetwork(this.slug).chainId,
            host: endpoint.host,
            port: endpoint.port || 443,
            protocol: endpoint.protocol || "https",
        }
        return eosconf;
    }

    
    // initialization and AppConnection -----------------
    async connectApp(appTitle:string = "") {
        console.log("EOSNetworkConnexion["+this.slug+"].connectApp("+appTitle+")");
        this.feed.setLoading("connect-app");
        return new Promise<void>(async (res, rej) => {
            try {
                await this.connect(appTitle);
                await this.login();
                res();
            } catch(e) {
                console.error("ERROR: connect()", e);
                rej(e);
            }
    
            this.feed.setLoading("connect-app", false);    
        });
    }
    

    // AccountData and Balances ---------------------------------
    calculateTotalBalance(account:AccountData): Asset {
        console.log("EOSNetworkConnexion["+this.slug+"].calculateTotalBalance("+account+")");
        return new Asset("0.0000 " + this.symbol)
            .plus(account.core_liquid_balance_asset)
            .plus(this.calculateTotalStaked(account));
    }

    calculateTotalStaked(account:AccountData): Asset {
        console.log("EOSNetworkConnexion["+this.slug+"].calculateTotalStaked("+account+")");
        return new Asset("0.0000 " + this.symbol)
            .plus(account.refund_request.net_amount_asset)
            .plus(account.refund_request.cpu_amount_asset)
            .plus(account.self_delegated_bandwidth.cpu_weight_asset)
            .plus(account.self_delegated_bandwidth.net_weight_asset);
    }

    calculateResourceLimit(limit) {
        console.log("EOSNetworkConnexion["+this.slug+"].calculateResourceLimit()");
        limit = Object.assign({
            max: 0, used: 0
        }, limit);
        
        if (limit.max != 0) {
            limit.percent = 1 - (Math.min(limit.used, limit.max) / limit.max);
        } else {
            limit.percent = 0;
        }
        limit.percentStr = Math.round(limit.percent*100) + "%";
        return limit;
    }

    async queryAccountData(name:string): Promise<AccountData> {
        console.log("EOSNetworkConnexion["+this.slug+"].queryAccountData("+name+") ");
        this._account_queries[name] = this._account_queries[name] || new Promise<AccountData>((resolve, reject) => {
            // console.log("PASO 1 ------", [this._account_queries])
            this.waitRPC.then(() => {
                this.rpc.get_account(name).then((response) => {
                    // console.error("--------------- EOSNetworkConnexion.queryAccountData() CHECK POINT ----------------------");
                    let account_data: AccountData = <AccountData>response;

                    if (account_data.core_liquid_balance) {
                        if (this.symbol != account_data.core_liquid_balance.split(" ")[1]) {
                            console.error("endpoint has native token", this.symbol, "but account data saids", account_data.core_liquid_balance.split(" ")[1]);
                        }
                        this.symbol = account_data.core_liquid_balance.split(" ")[1];
                    } else {
                        account_data.core_liquid_balance = "0.0000 " + this.symbol;
                    }
                    account_data.core_liquid_balance_asset = new Asset(account_data.core_liquid_balance);
                    

                    // ----- refund_request -----
                    account_data.refund_request = account_data.refund_request || {
                        total: "0.0000 " + this.symbol,
                        net_amount: "0.0000 " + this.symbol,
                        cpu_amount: "0.0000 " + this.symbol,
                        request_time: "2018-11-18T18:09:53"
                    }
                    account_data.refund_request.cpu_amount_asset = new Asset(account_data.refund_request.cpu_amount);
                    account_data.refund_request.net_amount_asset = new Asset(account_data.refund_request.net_amount);
                    account_data.refund_request.total_asset = 
                        account_data.refund_request.cpu_amount_asset.plus(account_data.refund_request.net_amount_asset)
                    account_data.refund_request.total = account_data.refund_request.total_asset.toString();
                        
                    // ----- self_delegated_bandwidth ----
                    account_data.self_delegated_bandwidth = account_data.self_delegated_bandwidth || {
                        total: "0.0000 " + this.symbol,
                        net_weight: "0.0000 " + this.symbol,
                        cpu_weight: "0.0000 " + this.symbol
                    }                    
                    account_data.self_delegated_bandwidth.net_weight_asset = new Asset(account_data.self_delegated_bandwidth.net_weight);
                    account_data.self_delegated_bandwidth.cpu_weight_asset = new Asset(account_data.self_delegated_bandwidth.cpu_weight);
                    account_data.self_delegated_bandwidth.total_asset = 
                        account_data.self_delegated_bandwidth.cpu_weight_asset.plus(account_data.self_delegated_bandwidth.net_weight_asset);
                    account_data.self_delegated_bandwidth.total = account_data.self_delegated_bandwidth.total_asset.toString();
                    

                    // ----- total_resources -----
                    account_data.total_resources = account_data.total_resources || {
                        net_weight: "0.0000 " + this.symbol,
                        cpu_weight: "0.0000 " + this.symbol
                    }
                    account_data.total_resources.net_weight_asset = new Asset(account_data.total_resources.net_weight);
                    account_data.total_resources.cpu_weight_asset = new Asset(account_data.total_resources.cpu_weight);

                    account_data.total_balance_asset = this.calculateTotalBalance(account_data);
                    account_data.total_balance = account_data.total_balance_asset.toString();

                    account_data.total_staked_asset = this.calculateTotalStaked(account_data);
                    account_data.total_staked = account_data.total_staked_asset.toString();

                    account_data.cpu_limit = this.calculateResourceLimit(account_data.cpu_limit);
                    account_data.net_limit = this.calculateResourceLimit(account_data.net_limit);
                    account_data.ram_limit = this.calculateResourceLimit({
                        max: account_data.ram_quota, used: account_data.ram_usage
                    });
                    
                    resolve(account_data);
                }).catch((err) => {
                    console.error("EOSNetworkConnexion["+this.slug+"].queryAccountData() ERROR", err);
                    reject(err);
                });
                
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        });

        let promise = this._account_queries[name];
        promise.then((r) => {
            // console.error("EOSNetworkConnexion["+this.slug+"].queryAccountData() CHECK POINT 3", [r]);
            setTimeout(() => {
                delete this._account_queries[r.account_name];
            });
        });
        
        return promise;
    }
    
    // loginTimer;
    async autologin():Promise<any> {
        await this.waitConnected;
        this.idprovider.autologin();
    }

    async login():Promise<any> {
        console.log("EOSNetworkConnexion["+this.slug+"].login()");
        this.feed.setLoading("login");
        
        return new Promise<any>(async (resolve, reject) => {
            console.debug("EOSNetworkConnexion["+this.slug+"].login() await this.waitConnected;");
            await this.assertConnected("login");
            this.idprovider.login().then(id => {
                this.feed.setLoading("login", false);
                console.debug("EOSNetworkConnexion["+this.slug+"].login() --> ", this.account);
                resolve(this.account);
            }).catch(e => {
                // {"type":"identity_rejected","message":"User rejected the provision of an Identity","code":402,"isError":true}
                console.error("EOSNetworkConnexion["+this.slug+"].login() --> ", JSON.stringify(e));
                reject(e);
                this.feed.setLoading("login", false);
            });
        });
    }

    async logout():Promise<any> {
        console.log("EOSNetworkConnexion["+this.slug+"].logout()");    
        this.waitLogged = new Promise((resolve) => {
            this.setLogged = resolve;
        });        
        this.idprovider.logout();
    }

    async getTableRows(contract: string, scope: string, table: string, tkey: string, lowerb: string, upperb: string, limit: number, ktype: string, ipos: string): Promise<any> {
        console.debug("EOSNetworkConnexion["+this.slug+"].getTableRows(",contract, scope, table, tkey, lowerb, upperb, limit, ktype, ipos,")");
        
        console.assert(!!contract, "ERROR: contract is null");
        console.assert(!!scope, "ERROR: scope is null");
        console.assert(!!table, "ERROR: table is null");
        console.assert(!!tkey, "ERROR: tkey is null");
        console.assert(!!lowerb, "ERROR: lowerb is null");
        console.assert(!!upperb, "ERROR: upperb is null");
        console.assert(!!limit, "ERROR: limit is null");
        console.assert(!!ktype, "ERROR: ktype is null");
        console.assert(!!ipos, "ERROR: ipos is null"); 

        return new Promise<any>((resolve, reject) => {
            this.waitRPC.then(() => {
                let json = {
                    code: contract,
                    index_position: ipos,
                    json: true,
                    key_type: ktype,
                    limit: limit,
                    lower_bound: lowerb,
                    scope: scope,
                    table: table,
                    table_key: tkey,
                    upper_bound: upperb
                }
                
                this.rpc.get_table_rows(json).then(_data => {
                    console.debug("EOSNetworkConnexion["+this.slug+"].getTableRows(",contract, scope, table, tkey, lowerb, upperb, limit, ktype, ipos,") -> ", _data);
                    resolve(_data);
                }).catch(error => {
                    console.error(error);
                });

                
            }).catch((error) => {
                console.error(error);
                reject(error);
            });   
        });
    }

    isNative(thing: Asset | Token) {
        if (thing instanceof Asset) {
            return (<Asset>thing).token.symbol == this.symbol;
        }
        if (thing instanceof Token) {
            return (<Token>thing).symbol == this.symbol;
        }
        if (typeof thing == "string") {
            return this.isNative(new Asset((<string>thing)));
        }
        return false;
    }
}