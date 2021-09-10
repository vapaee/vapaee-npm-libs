import { ProviderMeta } from '@angular/compiler';
import { Injectable } from '@angular/core';
import { Asset, SmartContract, VapaeeWallet, VapaeeWalletConnexion } from './extern';
import { Feedback } from './extern';


export interface REXdata {
    "total": Asset,                // TLOS
    "deposits": Asset,             // TLOS
    "balance": Asset,              // TLOS
    "profits": Asset,              // TLOS
    "tables": {
        "rexfund": REXdeposits,
        "rexbal": REXbalance
    }
}

export interface REXdeposits {
    "version": 0,
    "owner": string,
    "balance": Asset,              // TLOS
}

export interface REXbalance {
    "version": number,
    "owner": string,
    "vote_stake": Asset,           // TLOS
    "rex_balance": Asset,          // REX
    "matured_rex": number,
    "rex_maturities": {
        "first": Date,
        "second": number
    }[]
}

export interface REXpool {
    "version": number,
    "total_lent": Asset,           // TLOS - total amount of CORE_SYMBOL in open rex_loans
    "total_unlent": Asset,         // TLOS - total amount of CORE_SYMBOL available to be lent (connector),
    "total_rent": Asset,           // TLOS - fees received in exchange for lent  (connector),
    "total_lendable": Asset,       // TLOS - total amount of CORE_SYMBOL that have been lent (total_unlent + total_lent),
    "total_rex": Asset,            // REX - total number of REX shares allocated to contributors to total_lendable,
    "namebid_proceeds": Asset,     // TLOS - the amount of CORE_SYMBOL to be transferred from namebids to REX pool,
    "loan_num": number             // increments with each new loan.
}

@Injectable({
    providedIn: "root"
})
export class VapaeeREX {

    public contract: SmartContract | null = null;
    public contract_name: string;
    public feed: Feedback;
    public pool: REXpool;
    
    public balances: {[account:string]:REXbalance};
    public deposits: {[account:string]:REXdeposits};

    connexion: VapaeeWalletConnexion | null = null;


    private setInit: () => void = () => {};
    public waitInit: Promise<void> = new Promise((resolve) => {
        this.setInit = resolve;
    });
    
    constructor(
        private wallet: VapaeeWallet
    ) {
        this.contract_name = "eosio";
        this.feed = new Feedback();
        this.balances = {};
        this.deposits = {};
        this.pool = {
            version: 0,
            loan_num:0,
            namebid_proceeds:new Asset(),
            total_lendable:new Asset(),
            total_lent: new Asset(),
            total_unlent: new Asset(),
            total_rent: new Asset(),
            total_rex: new Asset()
        };
    }

    public get default(): REXdata {
        let sym, user;
        if (this.contract && this.connexion) {
            sym = this.connexion.symbol;
            user = this.connexion.username;
        } else {
            sym = "SYS";
            user = "guest";
        }
        return {
            "total": new Asset("0.0000 " + sym),
            "deposits": new Asset("0.0000 " + sym),
            "balance": new Asset("0.0000 " + sym),
            "profits": new Asset("0.0000 " + sym),
            "tables": {
                "rexfund": {
                    "version": 0,
                    "owner": user,
                    "balance": new Asset("0.0000 " + sym),
                },
                "rexbal": {
                    "version": 0,
                    "owner": user,
                    "vote_stake": new Asset("0.0000 " + sym),
                    "rex_balance": new Asset("0.0000 REX"),
                    "matured_rex": 0,
                    "rex_maturities": []
                }
            }
        };
    }

    async init(): Promise<void> {
        console.log("--- VapaeeREX.init() ---");
        this.subscribeToEvents();
        this.wallet.getConnexion(null).then(_connexion => {
            this.connexion = _connexion;
            if (this.connexion) {
                this.contract = this.connexion.getContract(this.contract_name);
                this.setInit();    
            } else {
                console.error("ERROR: could not init because default connexion returned null: this.wallet.getConnexion(null) -> null");
            }
        }).catch(err => {
            console.error("ERROR: ", err);
        });        
    }

    async subscribeToEvents(): Promise<void> {
        let style = 'background: #6f4de4; color: #FFF';
        this.waitInit.then(_ => console.log('%c VapaeeREX.waitInit ', style));
    }

    async updatePoolState(): Promise<void> {
        console.log("VapaeeREX.updatePoolState()");
        return new Promise<void>(resolve => {
            this.waitInit.then(() => {
                this.feed.setLoading("REXpool", true);
                if (this.contract && this.connexion) {
                    this.contract.getTable("rexpool").then(result => {
                        console.debug("VapaeeREX.updatePoolState() rexpool:", result);
                        console.assert(result.rows.length == 1, "ERROR: contract is returning more than one pool state");
                        var _pool = result.rows[0];
                        this.pool.loan_num = _pool.loan_num;
                        this.pool.namebid_proceeds = new Asset(_pool.namebid_proceeds);
                        this.pool.total_lendable = new Asset(_pool.total_lendable);
                        this.pool.total_lent = new Asset(_pool.total_lent);
                        this.pool.total_unlent = new Asset(_pool.total_unlent);
                        this.pool.total_rent = new Asset(_pool.total_rent);
                        this.pool.total_rex = new Asset(_pool.total_rex);
                        this.feed.setLoading("REXpool", false);
                    });
                } else {
                    console.error("ERROR: connexion o contract es null", this.connexion, this.contract);
                }
            });
        });
    }

    async queryAccountREXBalance(account: string): Promise<REXbalance> {
        console.log("VapaeeREX.queryAccountREXBalance()", account);
        await this.waitInit;
        this.feed.setLoading("REXbalance", true);
        // var encodedName = this.connexion.utils.encodeName(account);
        console.error("// var encodedName = this.connexion.utils.encodeName(account);");

        return new Promise<REXbalance>((resolve, reject) => {
            let connexion: VapaeeWalletConnexion = <VapaeeWalletConnexion>this.connexion;
            let contract: SmartContract = <SmartContract>this.contract;
            contract.getTable("rexbal", {
                lower_bound: account, 
                upper_bound: account, 
                limit: 1
            }).then(result => {
                console.debug("VapaeeREX.queryAccountREXBalance() rexbal:", result);
                let _row = result.rows[0];
                let _rexbal:REXbalance = {
                    version: 0,
                    owner: connexion.guest.name,
                    vote_stake: new Asset("0.0000 " + connexion.symbol),
                    rex_balance: new Asset("0.0000 REX"),
                    matured_rex: 0,
                    rex_maturities: []
                }            
                if (_row) {
                    _rexbal = {
                        version: _row.version,
                        owner: _row.owner,
                        vote_stake: new Asset(_row.vote_stake),
                        rex_balance: new Asset(_row.rex_balance),
                        matured_rex: _row.matured_rex,
                        rex_maturities: _row.rex_maturities
                    }
                }
                this.balances[account] = _rexbal;
                this.feed.setLoading("REXbalance", false);
                resolve(_rexbal);
            }).catch(e => {
                console.error("ERROR: ", e);
                this.feed.setLoading("REXbalance", false);
                reject(e);
            });
            
        });
        
    }


    async queryAccountREXDeposits(account: string): Promise<REXdeposits> {
        console.log("VapaeeREX.queryAccountREXDeposits()", account);
        await this.waitInit;
        this.feed.setLoading("REXDeposits", true);
        // var encodedName = this.connexion.utils.encodeName(account);
        console.error("// var encodedName = this.connexion.utils.encodeName(account);");
        return new Promise<REXdeposits>((resolve, reject) => {
            let connexion: VapaeeWalletConnexion = <VapaeeWalletConnexion>this.connexion;
            let contract: SmartContract = <SmartContract>this.contract;
            contract.getTable("rexfund", {
                lower_bound: account.toString(), 
                upper_bound: account.toString(), 
                limit: 1
            }).then(result => {
                console.debug("VapaeeREX.queryAccountREXDeposits() rexfund:", result);
                let _row = result.rows[0];
                let _rexfund:REXdeposits = {
                    version: 0,
                    owner: connexion.guest.name,
                    balance: new Asset("0.0000 " + connexion.symbol)
                }            
                if (_row) {
                    _rexfund = {
                        version: _row.version,
                        owner: _row.owner,
                        balance: new Asset(_row.balance)
                    }

                }
                this.deposits[account] = _rexfund;
                this.feed.setLoading("REXDeposits", false);
                resolve(_rexfund) ;
            }).catch(e => {
                console.error("ERROR: ", e);
                this.feed.setLoading("REXDeposits", false);
                reject(e);
            });        
        });
    }


    async getAccountREXData(account: string): Promise<REXdata> {
        console.log("VapaeeREX.getAccountREXData()", account);
        await this.waitInit;
        this.feed.setLoading("REXData", false);
        delete this.balances[account];
        delete this.deposits[account];
        // console.log("---------- REX (ini) --------------------------");
        return new Promise<REXdata>((resolve, reject) => {
            return Promise.all([
                this.updatePoolState(),
                this.queryAccountREXBalance(account),
                this.queryAccountREXDeposits(account)
            ]).then(result => {
                let _rexbal: REXbalance = this.balances[account];
                let _rexfund: REXdeposits = this.deposits[account];
    
                let ratio = this.pool.total_lendable.amount.dividedBy(this.pool.total_rex.amount);
                let balance_ammount = _rexbal.rex_balance.amount.multipliedBy(ratio);
    
    
                // console.log("------------------------------------");
                // console.log("balance_ammount: ", balance_ammount);
    
                let balance: Asset = new Asset(balance_ammount.toString() + " TLOS", 4);
                // console.log("balance.toString(): ", balance.toString());
                // console.log("------------------------------------");
    
                let deposits: Asset = _rexfund.balance;
                let profits: Asset = new Asset(balance.amount.minus(_rexbal.vote_stake.amount), balance.token);
    
                let total: Asset = balance.plus(deposits);
    
                let data:REXdata = {
                    total: total,
                    deposits: deposits,
                    balance: balance,
                    profits: profits,
                    tables: {
                        rexbal: _rexbal,
                        rexfund: _rexfund
                    }
                }
                this.feed.setLoading("REXData", false);
                // console.log("---------- REX (fin) --------------------------");
                resolve(data);
            }).catch(e => {
                console.error("ERROR: ", e);
                this.feed.setLoading("REXData", false);
                reject(e);
            });
        });
    }

}
