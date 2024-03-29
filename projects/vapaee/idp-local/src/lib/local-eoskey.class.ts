import { NumberSymbol } from '@angular/common';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'; 

// ReactiveX
import { AsyncSubject, BehaviorSubject, Observable, ReplaySubject, Subject, zip, of, throwError } from 'rxjs';

import * as ecc from 'eosjs-ecc';

// encryption
import * as CryptoJS from 'crypto-js';


// @vapaee libs 
import { ILocalStorage } from './types-local';

// ---
const KEYS = "_k";
const RANDOM = "_r";
const ENCRYPTED = "_e";

export class LocalEoskey  {
    
    public registered: boolean = false;
    public authentitated: boolean = false;
    // public rpc: JsonRpc;

    private conservate_pass: boolean = false;
    private pass: string = "";

    private random: string = "";;
    private encrypted: string = "";;
    private keys: {[pub:string]:string} = {};

    constructor(
        private storage: ILocalStorage
    ) {
        
        zip(this.storage.get(RANDOM), this.storage.get(ENCRYPTED), this.storage.get(KEYS)).subscribe(
            ([r, e, k]) => {
                console.debug("zip(this.storage.get(RANDOM), this.storage.get(ENCRYPTED))", [r,e]);
                this.random = r;
                this.encrypted = e;
                if (k && typeof k == "string") {
                    try {
                        this.keys = JSON.parse(k);
                    } catch (e) {
                        console.error("ERROR: keys json malformed: ", k)
                    }
                }

                if (this.random && this.encrypted) {
                    this.registered = true;
                }
            }
        )
    }

    register(pass: string) {
        console.log("LocalEoskey.register(",pass,")");
        this.random = new Number(Math.random()*1000000).toString();
        this.encrypted = this.encrypt(pass, this.random);
        this.storage.set(RANDOM, this.random);
        this.storage.set(ENCRYPTED, this.encrypted);
        if (this.random && this.encrypted) {
            this.registered = true;
        }
    }

    verify(pass: string): boolean {        
        let random = this.decrypt(pass, this.encrypted);
        // console.debug("random:", random == this.random, "encrypted:", encrypted == this.encrypted, this.encrypted, encrypted);
        this.authentitated = (random == this.random);
        console.log("LocalEoskey.verify(",pass,") -->", this.authentitated);
        return this.authentitated;
    }

    generate():Observable<string> {
        console.log("LocalEoskey.generate()");
        return new Observable<string>(obs => {
            ecc.randomKey().then(privateKey => {
                obs.next(privateKey);
            });
        });          
    }

    addKey(pass: string, privatekey: string): string {
        let pubkey: string = "";
        
        if (this.verify(pass)) {
            console.log("LocalEoskey.addKey(",pass, privatekey,")");
            pubkey = this.getPublicKey(privatekey);
            let encryptr_key = this.encrypt(pass, privatekey);
            this.keys[pubkey] = encryptr_key;
            this.saveKeys();
        }
        return pubkey;
    }

    getKey(pass: string, pubkey:string): string {
        let wif: string = "";
        if (this.verify(pass)) {
            let encryptr_key = this.keys[pubkey];
            wif = this.decrypt(pass, encryptr_key);
        }
        return wif;
    }

    removeKey(pubkey:string) {
        console.log("LocalEoskey.removeKey(",pubkey,")");
        delete this.keys[pubkey];
        this.saveKeys();
    }

    // sign(pass: string, pubkey:string, trx: Transaction): Transaction {
    //     console.error("LocalEoskey.sign(",[trx],")");
    //     // TODO: implement
    //     // https://github.com/EOSIO/eosjs/blob/master/docs/basic-usage/02_es-modules.md
    //     return trx;
    // }

    public getPublicKey(privatekey:string):string {
        return ecc.privateToPublic(privatekey);
    }

    // private ------------------------
    private saveKeys() {
        this.storage.set(KEYS, JSON.stringify(this.keys));
    }

    private encrypt(pass: string, text: string): string {
        // Encrypt
        var ciphertext = CryptoJS.AES.encrypt(text, pass).toString();
        // console.error("LocalEoskey.encrypt(",pass,text,") ---> ", ciphertext, this.decrypt(pass, ciphertext));


        console.assert(this.decrypt(pass, ciphertext) == text, "ERROR: can't be decrypted");

        return ciphertext;
    }

    private decrypt(pass: string, ciphertext: string): string {
        // Decrypt
        console.error("LocalEoskey.decrypt(",pass,ciphertext,")");
        var bytes  = CryptoJS.AES.decrypt(ciphertext, pass);
        var originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    }

    print() {
        console.log("- LocalEoskey -");
        console.log("keys", this.keys);
        console.log("random", this.random);
        console.log("encrypted", this.encrypted);
        console.log("registered", this.registered);
    }
}