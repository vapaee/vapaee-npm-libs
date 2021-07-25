import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from "@angular/common";
import { IStorage, Skin } from './types-style';


@Injectable({
    providedIn: 'root'
})
export class VapaeeStyle {

    private storage: IStorage = <IStorage>{};
    private link: HTMLLinkElement = this.doc.createElement('link');
    public skins: Skin[];
    private _current: Skin = {id:"", name:"", url:""};

    constructor(
        @Inject(DOCUMENT) private doc: any
    ) {
        this.skins = [];
        this.createLinkForStylesheetURL(""); // creates the stylesheet link tag
    }

    init(skins: Skin[], storage: IStorage) {
        this.skins = skins;
        this.storage = storage;
        this.setSkin(this.storage.get("skin") || "skin-jungle");
    }

    get current() { return this._current; }

    setSkin(skinid:string) {
        if (this._current.id != skinid) {
            for (let i in this.skins) {
                let skin: Skin = this.skins[i];
                if (skin.id == skinid) {
                    this.applySking(skin);
                    break;
                }
            }
        }
    }

    private createLinkForStylesheetURL(url:string) {
        console.log("VapaeeStyle.createLinkForStylesheetURL()");
        this.link = this.doc.createElement('link');
        this.link.setAttribute('rel', 'stylesheet');
        this.doc.head.appendChild(this.link);
        this.link.setAttribute('href', url);
    }

    private async applySking(skin:Skin) {
        this._current = skin;
        this.storage.set("skin", skin.id);
        console.log("VapaeeStyle.applySking()",skin);
        await this.takeOutCurrentStyle();
        await this.applyStyle(skin);
    }

    private async takeOutCurrentStyle() {
        console.log("VapaeeStyle.applyStyle()",this.current);
    }

    private async applyStyle(skin:Skin) {
        console.log("VapaeeStyle.applyStyle()",skin);
        this.link.setAttribute('href', skin.url);
    }
}
