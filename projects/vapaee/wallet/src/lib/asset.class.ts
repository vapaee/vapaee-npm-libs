import BigNumber from "bignumber.js";
import { Token } from "./token.class";

export class Asset {
    amount:BigNumber = new BigNumber(0);
    protected _token: Token = new Token();
    
    constructor(a: any = null, b: any = null) {
        if (a == null && b == null) {
            this.amount = new BigNumber(0);
            this._token = new Token();
            return;
        }

        if (a instanceof BigNumber) {
            this.amount = a;
            this.resolveToken(b);
            return;
        }

        if (a instanceof Asset) {
            this.amount = a.amount;
            this.resolveToken(b || a);
            return;
        }

        if (typeof a == "number") {
            this.amount = new BigNumber(a);
            this.resolveToken(b);
            return;
        }

        if (typeof a == "string") {
            if (typeof b == "number") {
                this.parse(a, b);
            } else {
                this.parse(a);
                if (b) this.resolveToken(b);
            }            
            console.assert(this.amount instanceof BigNumber, "ERROR: Asset string malformed: '"+a+"'");
            return;
        }
    }
    
    public get token(): Token {
        if (!this._token) this._token = new Token();
        return this._token;
    }
    
    resolveToken(t:any) {
        if (t instanceof Token) {
            this._token = t;
            return;
        }
        if (t instanceof Asset) {
            this._token = (<Asset>t).token;
            return;
        }
        if (typeof t == "string") {
            this._token = new Token(t); // Symbol
            return;
        }
    }

    plus(b:Asset|null|undefined) {
        if (b instanceof Asset) {
            console.assert(!!b, "ERROR: b is not an Asset", b, this.str);
            console.assert(!!b.token, "ERROR: b has no token", b, this.str);
            console.assert(!!this.token, "ERROR: this has no token", b, this);
            console.assert(b.token.symbol == this.token.symbol, "ERROR: trying to sum assets with different tokens: " + this.str + " and " + b.str);
            let amount = this.amount.plus(b.amount);
            return new Asset(amount, this.token);    
        }
        return this;
    }

    minus(b:Asset|null|undefined) {
        if (b instanceof Asset) {
            console.assert(!!b, "ERROR: b is not an Asset", b, this.str);
            console.assert(!!b.token, "ERROR: b has no token", b, this.str);
            console.assert(!!this.token, "ERROR: this has no token", b, this);
            console.assert(b.token.symbol == this.token.symbol, "ERROR: trying to substract assets with different tokens: " + this.str + " and " + b.str);
            let amount = this.amount.minus(b.amount);
            return new Asset(amount, this.token);
        }
        return this;
    }

    clone<T extends Asset>(): T {
        return <T>this.do_clone();
    }

    protected do_clone(): any {
        return new Asset(this.amount, this.token);
    }

    parse(text: string, precision:number = 0) {
        if (text == "") return;
        let sym = text.split(" ")[1];
        let amount_str = text.split(" ")[0];
        this.amount = new BigNumber(amount_str);

        if (precision == 0) {
            if (amount_str.split(".").length == 2) {
                precision = amount_str.split(".")[1].length;
            } else if (amount_str.split(".").length == 1) {
                if (isNaN(parseInt(amount_str))) {
                    console.error("ERROR: Asset malformed string: '"+text+"'");
                }
            }    
        }
        
        this.resolveToken(new Token({
            symbol: sym,
            precision: precision
        }));
    }

    valueToString(decimals:number = -1, total:boolean = false): string {
        if (!this.token) return "0";
        let parts = this.amount.toFixed().split(".");
        let integer = parts[0];
        let precision = this.token.precision || 0;
        let decimal = (parts.length==2 ? parts[1] : "");
        if (decimals != -1) {
            precision = decimals;
        }
        if (total) {
            precision -= parts[0].length-1;
            precision = precision > 0 ? precision : 0;
        }
        for (let i=decimal.length; i<precision; i++) {
            decimal += "0";
        }
        if (decimal.length > precision) {
            decimal = decimal.substr(0, precision);
        }

        if (precision == 0) {
            return integer;
        } else {
            return integer + "." + decimal;
        }
    }

    toNumber() {
        if (!this.token) return 0;
        return parseFloat(this.valueToString(8));
    }

    get str () {
        return this.toString();
    }

    toString(decimals:number = -1): string {
        if (!this.token) return "0.0000";
        return this.valueToString(decimals) + " " + this.token.symbol.toUpperCase();
    }

    inverse(token: Token): Asset {
        let result = new BigNumber(1).dividedBy(this.amount);
        let asset =  new Asset(result, token);
        return asset;
    }
}