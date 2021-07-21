import { Observable } from "rxjs";

export interface ILocalStorage {
    get: (string: any) => Observable<any>;
    set: (string: any, any: any) => Observable<any>;
    remove: (string: any) => Observable<any>;
}

export interface KeyAccountsChain {
    block_num: number,    // 46651966
    block_time: string,   // "2021-01-17 22:44:47"
    chainid: string,      // "384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0"
    decimals: number,     // 4
    description: string,  // "Proton"
    network: string,      // "proton"
    production: number,   // 1
    rex_enabled: number,  // 0
    sync: number,         // 0
    systoken: string,     // "SYS"
}

export interface WeightPubKey {
    pubkey: string;       // "EOS7x3ntVTMphpByv4pvU7kjmsvo3dJi4KkMQaexnGfSYQbPFMzVz"
    public_key: string;   // "PUB_K1_7x3ntVTMphpByv4pvU7kjmsvo3dJi4KkMQaexnGfSYQbQVezSD"
    weight: number;       // 1
  }

export interface KeyAccountPermission {
    auth: {
      accounts: any[];
      keys: WeightPubKey[];
    };
    perm: string;          // "active" | "owner"
    threshold: number;     // 1
}


export interface KeyAccounts {
    accounts: {[account:string]:KeyAccountPermission[]},
    chain: KeyAccountsChain
}

export interface KeyAccountsMap {
    [slug:string]:KeyAccounts
}
/*
let ka: KeyAccounts = {
    accounts: {
        viterbotelos: [{
            auth: {
                accounts:[],
                keys:
            }
        }]
    }, 
    chain: {
        block_num: 46651966, 
        block_time: "2021-01-17 22:44:47", 
        chainid: "384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0",      // 
        decimals: 4,   
        description: "Telos", 
        network: "Telos",   
        production:  1,
        rex_enabled: 0,
        sync: 0, 
        systoken: "TLOS",
    }
}*/