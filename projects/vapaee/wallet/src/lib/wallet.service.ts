import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// @vapaee/wallet

import { EOSNetworkConnexion } from './eos-connexion.class';
import { VapaeeWalletInterface, VapaeeWalletConnexion, Network, Account, ConnexionMap,
    NetworkMap, VapaeeIdentityProviderClass } from './types-wallet';

// @vapaee libs 
import { Feedback } from './extern';


@Injectable({
    providedIn: 'root'
})
export class VapaeeWallet implements VapaeeWalletInterface {

    public feed: Feedback;
    public connexion: ConnexionMap = {};
    public timeout_sec: number = 10;

    private setEndpointsReady: Function;
    public waitEndpoints: Promise<any> = new Promise((resolve) => {
        this.setEndpointsReady = resolve;
    });    

    constructor(
        private http: HttpClient,
    ) {
        this.feed = new Feedback();
    }

    // VapaeeWalletInterface API -------------
    get guest(): Account {
        let guest = { name: "guest" };
        return <Account>guest;
    }
    async init(path:string) {
        console.log("-- VapaeeWallet.init() --");
        this.doInit(path);
    }    
    async createConnexion(slug:string, id_provider_class: VapaeeIdentityProviderClass): Promise<VapaeeWalletConnexion> {
        return this.doCreateConnexion(slug, id_provider_class);
    }
    async getConnexion (net_slug:string): Promise<VapaeeWalletConnexion> {
        return this.doGetConnexion(net_slug);
    }
    async resetIdentity (): Promise<void> {
        return this.doResetIdentity();
    }
    getNetwork (slug: string): Network {
        return this.doGetNetwork(slug);
    }
    getNetworkSugs() {
        return this._networks_slugs.map(x => x);
    }
    // VapaeeWalletInterface API -------------


    // Private ---------------------------------
    private _networks: NetworkMap = {};
    private _networks_slugs: string[] = [];


    private async doInit(path:string) {
        this.doSubscribeToEvents();
        let endpoints = await this.doFetchEndpoints(path);
        this.doSetEndpoints(endpoints);
    }

    private async doSubscribeToEvents() {
        let style = 'background: #28a745; color: #FFF';
        this.waitEndpoints.then(_ => console.log('%cVapaeeWallet.waitEndpoints', style));
    }

    private async doFetchEndpoints(url:string): Promise<NetworkMap> {
        this.feed.setLoading("endpoints");
        return this.http.get<NetworkMap>(url).toPromise().then((response) => {
            console.debug("VapaeeWallet.fetchEndpoints()", response);
            this.feed.setLoading("endpoints", false);
            return response;
        }).catch(e => {
            console.warn("WARNING: endpoint not responding", e);
            this.feed.setLoading("endpoints", false);
            throw e;
        });
    }

    private async doCreateConnexion(slug:string, id_provider_class: VapaeeIdentityProviderClass): Promise<VapaeeWalletConnexion> {
        console.log("VapaeeWallet.doCreateConnexion("+slug+")");
        var id_provider = new id_provider_class(slug, this);
        this.feed.setLoading("connexion");
        return new Promise<VapaeeWalletConnexion>(async (resolve, reject) => {
            setTimeout(_ => {
                if (this.feed.loading("connexion")) {
                    this.feed.setLoading("connexion", false);
                    this.feed.setLoading("set-network", false);
                    reject("VapaeeWallet.doCreateConnexion() TIME OUT");    
                }
            }, this.timeout_sec * 1000);
            await this.waitEndpoints;

            // console.assert(typeof this.connexion[slug] != "object", "ERROR: Connexion for " + slug + " does already exist. Overwritting!");
            this.connexion[slug] = this.connexion[slug] || new EOSNetworkConnexion(this, slug, this.http, id_provider);
            await this.connexion[slug].autoSelectEndPoint();

            this.feed.setLoading("connexion", false);
            resolve(this.connexion[slug]);
        });
    }

    private doSetEndpoints(endpoints: NetworkMap) {
        console.log("ScatterService.setEndpoints()", [endpoints]);
        this._networks = endpoints || this._networks;
        for (let slug in this._networks) {
            this._networks_slugs.push(slug);
            // this.connexion[slug] = new EOSNetworkConnexion(this, slug, this.http);
        }
        this.setEndpointsReady();
    }    

        
    private async doGetConnexion (slug:string): Promise<VapaeeWalletConnexion> {
        console.log("VapaeeWallet.getConnexion(",slug,")");
        return new Promise<VapaeeWalletConnexion>(async (resolve, reject) => {
            await this.waitEndpoints;
            let con = null;
            if (slug) {
                con = this.connexion[slug];
                console.assert(typeof con == "object", "ERROR: inconsistency error. Connexion for " + slug + " does not exist");
            } else {
                for (let i in this.connexion) { 
                    con = this.connexion[i];
                    break;
                }
            }
            
            if (typeof con == "object") {
                resolve(con);
            } else {
                reject();
            }
        });
    }

    private async doResetIdentity (): Promise<void> {
        for (let i in this.connexion) {
            this.connexion[i].resetIdentity();
        }
    }

    private doGetNetwork (slug: string): Network {
        return this._networks[slug];
    }


}