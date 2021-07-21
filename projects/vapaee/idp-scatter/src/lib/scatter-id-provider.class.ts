import ScatterJS from '@scatterjs/core';
import ScatterEOS from '@scatterjs/eosjs2';
import { JsonRpc, Api } from 'eosjs';

import { Subject } from 'rxjs';

// @vapaee libs 
import { VapaeeIdentityProvider, Transaction, VapaeeWalletInterface, Eosconf, Network, EOS, Scatter, Account, RPC, Identity, TransactionResult } from '@vapaee/wallet';
import { Feedback } from '@vapaee/feedback';
import { ScatterIdentity } from './types-scatter';

export class ScatterIdProvider implements VapaeeIdentityProvider {
    
    public feed: Feedback;
    public ScatterJS: any;
    public scatter_network: ScatterJS.Network;
    public rpc: JsonRpc = null;
    public eosconf: Eosconf;
    public eos: EOS = null;
    public lib: Scatter;
    
    private _network: Network;
    private _connected: boolean;
    get connected(): boolean {
        return this._connected;
    }
    private _account: Account;
    get account(): Account {
        return this._account;
    }


    onLogggedStateChange:Subject<boolean> = new Subject<boolean>();

    constructor(
        public slug: string,
        public wallet: VapaeeWalletInterface
    ) {
        this.feed = new Feedback();

        this.ScatterJS = ScatterJS;       
        ScatterJS.plugins( new ScatterEOS() );      
    }

    // connexion with id provider
    getEosconf(): Eosconf { return this.eosconf; }
    getRPC():RPC { return this.rpc; }
    async createRPC(eosconf: Eosconf):Promise<void> { return this.doCreateRPC(eosconf); }    
    async connect(appname:string):Promise<void> { return this.doConnect(appname); }

    // transactions
    async sendTransaction(trx: Transaction):Promise<TransactionResult> { return this.doSendTransaction(trx); }

    // identity & authentication
    async setIdentity(identity:Identity):Promise<void> { return this.doSetIdentity(identity); }
    async resetIdentity():Promise<void> { return this.doResetIdentity(); }
    async autologin():Promise<void> { return this.doAutologin(); }
    async login():Promise<Identity> { return this.doLogin(); }
    async logout():Promise<void> { return this.doLogout(); }

    // debugginh
    print() {
        console.log("IdProvider:", this);
        console.log("ScatterJS.scatter.identity: ", ScatterJS.scatter.identity);
        console.log("ScatterJS.scatter.network: ", ScatterJS.scatter.network);
        console.log("ScatterJS: ", ScatterJS);
    }

    // ----------------------------------------------------------------

    private async doAssertContext():Promise<void> {
        return new Promise(r => {
            if (ScatterJS.scatter.network && ScatterJS.scatter.network.chainId != this.wallet.getNetwork(this.slug).chainId) {
                console.error("ScatterJS changning context to " + this.wallet.getNetwork(this.slug).slug );
                this.wallet.resetIdentity();
                setTimeout(() => r(), 1500);
            } else {
                r();
            }    
        });
    } 

    private async doCreateRPC(eosconf: Eosconf):Promise<void> {
        console.debug("ScatterIdProvider.doCreateRPC()");
        
        return new Promise(async (resolve, reject) => {
            setTimeout(() => {
                try {
                    this.scatter_network = ScatterJS.Network.fromJson(eosconf);
                    this.rpc = new JsonRpc(this.scatter_network.fullhost()); 
                    this.eosconf = eosconf;
                } catch (e) {
                    reject(e)
                }
                console.debug("this.scatter_network",this.scatter_network);
                console.debug("rpc", this.rpc);
                console.debug("ScatterJS",ScatterJS);
                resolve();    
            }, 1000);
        });
    } 

    private async doConnect(appname:string):Promise<void> {
        console.log("ScatterIdProvider.doConnect("+appname+")");
        const connectionOptions = {initTimeout:1800, network:this.scatter_network};
        return new Promise(async (resolve, reject) => {
            await this.doAssertContext();

            // try to connect
            console.debug("ScatterJS.connect('"+appname+"', connectionOptions)...");
            ScatterJS.connect(appname, connectionOptions).then(async connected => {
                console.debug("ScatterJS.connect("+appname+", connectionOptions) -> ", connected);
                this._connected = connected;
                if(!this._connected) {
                    let error = "ScatterJS.connect("+appname+",{this.scatter_network}) -> connected: false ";
                    console.error('No scatter :(');
                    reject(error);
                    this.feed.setLoading("connecting", false);
                    return;
                }
            
                this.eos = <EOS>ScatterJS.eos(this.scatter_network, Api, {rpc:this.rpc});            
                this.lib = ScatterJS.scatter;
                console.debug("ScatterJS.eos()", this.eos);
                console.debug("ScatterJS.scatter", this.lib);
                setTimeout(() => {
                    this.feed.setLoading("connecting", false);
                    resolve();
                }, 2000);                
            }).catch(e => {
                console.error("ERROR: ScatterJS.connect("+appname+", connectionOptions) failed", e);
                reject(e);
                this.feed.setLoading("connecting", false);
            })
        });
    } 

    private async doSendTransaction(trx: Transaction):Promise<TransactionResult> {
        console.log("ScatterIdProvider.doSendTransaction()", trx);
        return new Promise<TransactionResult>(async (resolve, reject) => {

            let actions = [];

            for (let i=0; i<trx.length; i++) {
                let action = trx[i];
                actions.push({
                    account: action.contract,
                    name: action.action,
                    authorization: [{
                        actor: this.account.name,
                        permission: this.account.authority,
                    }],
                    data: action.payload
                });
            }

            console.debug("ScatterIdProvider.doSendTransaction() actions: ", actions);
            
            this.eos.transact({
                actions: actions
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            }).then(resolve).catch(reject)
        });            
    } 

    private async doSetIdentity(identity:Identity):Promise<void> {
        console.log("ScatterIdProvider.doSetIdentity()", [identity]);
        console.assert(typeof this.lib == "object", "ERROR: no instance of ScatterJS.scatter found");

        this.lib.identity = identity;
        this.lib.forgotten = false;
        let network:Network = this.wallet.getNetwork(this.slug);
        this._account = this.lib.identity.accounts.find(x => x.chainId === network.chainId);
        this.onLogggedStateChange.next(true);
    } 

    private async doResetIdentity():Promise<void> {
        console.log("ScatterIdProvider.doResetIdentity()");
        ScatterJS.forgetIdentity();
        delete this._account;
        this.onLogggedStateChange.next(false);
    } 

    private async doAutologin():Promise<void> {
        console.log("ScatterIdProvider.doAutologin()");
        console.debug(ScatterJS.scatter.identity);
        if (!ScatterJS.scatter.identity) return null;
        this.setIdentity(ScatterJS.scatter.identity);
    } 

    private async doLogin():Promise<Identity> {
        console.log("ScatterIdProvider.doLogin()");
        
        return new Promise<Identity>(async (resolve, reject) => {
            let param = {accounts:[this.scatter_network]};
            ScatterJS.login(param).then((id:ScatterIdentity) => {
                console.debug("ScatterIdProvider.login() ScatterJS.login(param) -> id:", id);
                if(!id)  {
                    console.error('ScatterJS.login(param) returned no identity. param=', param);
                    return reject(false);
                }
                this.setIdentity(<Identity>id);
                resolve(<Identity>id);
            }).catch(e => {
                // {"type":"identity_rejected","message":"User rejected the provision of an Identity","code":402,"isError":true}
                console.error("ScatterIdProvider.login() --> ", JSON.stringify(e));
                reject(e);
            });
        });
    } 

    private async doLogout():Promise<void> {
        console.log("ScatterIdProvider.doLogout()");
        return this.doResetIdentity();
    }


















}