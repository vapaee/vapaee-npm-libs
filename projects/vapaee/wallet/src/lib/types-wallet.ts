import { Observable, Subject } from 'rxjs';
import { Asset } from './asset.class';
import { SmartContract } from './contract.class';
import { Token } from './token.class';
import { ScatterUtils } from './utils.class';

// @vapaee libs 
import { Feedback } from '@vapaee/feedback';

export interface VapaeeIdentityProvider {
    // connexion with id provider
    
    getEosconf(): Eosconf;
    getRPC(): RPC | null;
    createRPC(eosconf: Eosconf):Promise<any>;
    connect(appname:string):Promise<any>;

    // transactions
    sendTransaction(trx: Transaction):Promise<TransactionResult>;

    // identity & authentication
    setIdentity(identity:any):Promise<any>;
    resetIdentity():Promise<any>;
    autologin():Promise<any>;
    login():Promise<Identity>;
    logout():Promise<any>;

    readonly connected: boolean;
    readonly account: Account | null;

    onLogggedStateChange:Subject<boolean>;

    print(): void;
}

export interface VapaeeIdentityProviderClass {
    new (slug: string, wallet: VapaeeWalletInterface): VapaeeIdentityProvider;
}

export interface VapaeeWalletInterface {
    createConnexion: (appname:string, id_provider_class:VapaeeIdentityProviderClass)=> Promise<VapaeeWalletConnexion>;
    getConnexion: (net_slug:string) => Promise<VapaeeWalletConnexion>;
    isNetworkEnabled: (slug: string) => boolean;
    getNetwork: (slug: string) => Network;
    getNetworkSugs:() => string[];
    resetIdentity: () => Promise<void>;
    readonly guest: Account;
    waitEndpoints: Promise<any>;
}

export interface ConnexionMap {
    [key:string]:VapaeeWalletConnexion
};

export interface RPC {
    get_account:(name:string) => Promise<any>;
    get_table_rows:(json:{
        code: any;
        index_position: any;
        json: any;
        key_type: any;
        limit: any;
        lower_bound: any;
        scope: any;
        table: any;
        table_key: any;
    }) => Promise<any>;
}

export interface EOS {
    contracts: Function;
    cachedAbis: Function;
    rpc: Function;
    authorityProvider: Function;
    abiProvider: Function;
    signatureProvider: Function;
    chainId: Function;
    textEncoder: Function;
    textDecoder: Function;
    abiTypes: Function;
    transactionTypes: Function;
    rawAbiToJson: Function;
    getCachedAbi: Function;
    getAbi: Function;
    getTransactionAbis: Function;
    getContract: Function;
    serialize: Function;
    deserialize: Function;
    serializeTransaction: Function;
    deserializeTransaction: Function;
    serializeActions: Function;
    deserializeActions: Function;
    deserializeTransactionWithActions: Function;
    transact: Function;
    pushSignedTransaction: Function;
    hasRequiredTaposFields: Function;    
}

export interface Scatter {
    identity: any,
    eosHook: Function;
    eos:Function | null,
    network: any;
    // -----------------    
    forgotten?:boolean, // was forgetIdentity executed?    
    isExtension: boolean,
    // -----------------
    authenticate: Function,
    connect: Function,
    constructor: Function,
    createTransaction: Function,
    disconnect: Function,
    forgetIdentity: Function,
    getArbitrarySignature: Function,
    getIdentity: Function,
    getIdentityFromPermissions: Function,
    getPublicKey: Function,
    getVersion: Function,
    hasAccountFor: Function,
    isConnected: Function,
    isPaired: Function,
    linkAccount: Function,
    loadPlugin: Function,
    requestSignature: Function,
    requestTransfer: Function,
    suggestNetwork: Function
}

export interface ResourceLimit {
    percent?: number;
    percentStr?: string;
    used?: number;
    available?: number;
    max?: number;
}

export interface AccountData {
    account_name?: string,
    head_block_num?: number,
    head_block_time?: string,
    privileged?: false,
    last_code_update?: string,
    created?: string,
    core_liquid_balance?: string,
    core_liquid_balance_asset?: Asset,
    ram_quota?: number,
    net_weight?: number,
    cpu_weight?: number,
    total_balance: string,
    total_balance_asset: Asset,
    total_staked: string,
    total_staked_asset: Asset,
    ram_limit?: ResourceLimit,
    net_limit?: ResourceLimit,
    cpu_limit?: ResourceLimit,
    ram_usage?: number,
    permissions?: {
        perm_name?: string,
        parent?: string,
        required_auth?: {
            threshold?: 1,
            keys?: {
                key?: string,
                weight?: 1
            }[],
            accounts?: any[],
            waits?: any[]
        }
    }[],
    total_resources?: {
        owner?: string,
        net_weight?: string,
        net_weight_asset?: Asset,
        cpu_weight?: string,
        cpu_weight_asset?: Asset,
        ram_bytes?: number
    },
    self_delegated_bandwidth?: {
        from?: string,
        to?: string,
        total?: string,
        total_asset?: Asset,
        net_weight?: string,
        net_weight_asset?: Asset,
        cpu_weight?: string,
        cpu_weight_asset?: Asset,
    },
    refund_request?: {
        owner?: string,
        request_time?: string,
        total?: string,
        total_asset?: Asset,
        net_amount?: string,
        net_amount_asset?: Asset,
        cpu_amount?: string,
        cpu_amount_asset?: Asset
    },
    voter_info?: {
        owner?: string,
        proxy?: string,
        producers?: string[],
        staked?: number,
        last_vote_weight?: string,
        proxied_vote_weight?: string,
        is_proxy?: number
    },
    returnedFields?: null
}

export interface Account {
    authority: string,
    blockchain: string,
    chainId: string;
    slug: string,
    name: string,
    publicKey: string,
    data: AccountData  | null,
    id: string,
}

export interface Identity {
    accounts: Account[],
    name?: string,
}

export interface Endpoint {
    host:string,
    protocol?:string,
    port?:number,
    ping_get_info: number,
    disabled?: boolean
}

export interface Eosconf {
    blockchain:string,
    protocol:string,
    host:string,
    port:number,
    chainId:string
}

export interface  ScatterNetwork {
    blockchain: string,
    chainId:string,
    host:string,
    name:string,
    port: number
    protocol:string,
    token: string
}

export interface  ScatterIdentity {
    accounts: Account[],
    hash: string,
    name: string,
    publicKey: string,
}

export interface Network {
    slug: string,
    disabled: boolean,
    explorer: string,
    symbol: string,
    name: string,
    chainId:string,
    endpoints: Endpoint[]
}

export interface NetworkMap {
    [key:string]:Network
};

export interface ScatterJSDef {
    plugins:any,
    scatter:any
}

export interface GetInfoResponse {
    block_cpu_limit: number;
    block_net_limit: number;
    chain_id: string;
    fork_db_head_block_id: string;
    fork_db_head_block_num: number;
    head_block_id: string;
    head_block_num: number;
    head_block_producer: string;
    head_block_time: string;
    last_irreversible_block_id: string;
    last_irreversible_block_num: number;
    server_version: string;
    server_version_string: string;
    virtual_block_cpu_limit: number;
    virtual_block_net_limit: number;
}

export interface EndpointState {
    index?:number;
    endpoint: Endpoint;
    response: GetInfoResponse;
}


export interface VapaeeWalletConnexion {
    eosconf: Eosconf;
    feed: Feedback;
    onEndpointChange:Subject<EndpointState>;
    onLogggedStateChange:Subject<boolean>;
    // _account: Account;
    waitReady: Promise<void>;
    waitLogged: Promise<void>;
    waitConnected: Promise<void>;
    waitRPC: Promise<void>;
    // waitEndpoints: Promise<any>; no porque esto es global y lo debe de llevar el service

    utils:ScatterUtils;
    account: Account | null;
    guest: Account
    symbol: string;
    appname: string;

    // print (debug) -------------------------------------
    print: () => void;

    getContract:(account_name:string) => SmartContract;

    // Connexion ------------------------------------------
    connect(appname:string): Promise<any>;

    // Acount, Identity and authentication -----------------
    resetIdentity: () => void;
    updateAccountData: () => void;

    // Networks (eosio blockchains) & Endpoints -----------------
    autoSelectEndPoint: () => Promise<EndpointState>;

    networks: string[];
    // network: Network;
    slug: string;

    
    // Scatter initialization and AppConnection -----------------
    connectApp: (appTitle:string) => Promise<any>;
    

    // AccountData and Balances ---------------------------------
    calculateTotalBalance: (account:AccountData) => Asset;
    calculateTotalStaked: (account:AccountData) => Asset;

    calculateResourceLimit(limit:ResourceLimit|undefined): ResourceLimit;

    queryAccountData: (name:string) => Promise<AccountData>;
    
    // loginTimer;
    autologin:() => Promise<any>;
    login:() => Promise<any>;
    logout:() => Promise<any>;

    logged: boolean;
    username: string;
    authorization: {authorization:string[]};
    connected: boolean;

    getTableRows: (contract: string, scope: string, table: string, tkey: string, lowerb: string, upperb: string, limit: number, ktype: string, ipos: string) => Promise<any>;
    isNative: (thing: Asset | Token) => boolean;

    getRPC(): RPC | null;
    createRPC(): Promise<RPC>
    getIdentityProvider():VapaeeIdentityProvider;
}


export interface TableParams {
    contract?:string, 
    scope?:string, 
    table_key?:string, 
    lower_bound?:string, 
    upper_bound?:string, 
    limit?:number, 
    key_type?:string, 
    index_position?:string
}

export interface TableResult {
    more: boolean;
    rows: any[];
}

export interface Action {
    blockchain?: string, // blockchain slug: "eos" | "telos" | "wax" | "boss", etc
    contract?: string, // contract account name
    action: string,
    payload: any // string-map-object action params
}

export type Transaction = Array<Action>;

export interface TransactionResult {
    processed: {
      account_ram_delta: any;                // null
      action_traces: any[];                  // VERY COMPLEX
      block_num: number;                     // 132249655
      block_time: Date;                      // "2021-01-18T23:38:39.000"
      elapsed: number;                       // 957
      error_code: any;                       // null
      except: any;                           // null
      id: string;                            // "b6bd3633e323d6b033e22cdce3f9c06611bd7f36ee6677d14e6ef9bf902d068b"
      net_usage: number;                     // 208
      producer_block_id: any;                // null
      receipt: {
          status: string;                    // "executed"
          cpu_usage_us: number;              // 957
          net_usage_words: number;           // 26
      },
      scheduled: boolean;                    // false
    },
    transaction_id: string;                  // "b6bd3633e323d6b033e22cdce3f9c06611bd7f36ee6677d14e6ef9bf902d068b"
  }