

export class Token {
    private _str: string = "";
    protected _symbol: string = "";
    protected _precision: number = 0;
    protected _contract: string = "";
    protected _chain: string = "";
    protected _id: string = "";

    public static getSymbol(id: string)    { return  id.split(":")[0];                 }
    public static getContract(id: string)  { return  id.split(":")[1].split("@")[0];   }
    public static getChain(id: string)     { return  id.split("@")[1];                 }
    public static getId(obj: Object)       { return  (new Token(obj)).id;              }

    constructor(obj:any = null) {
        this._symbol = "$";
        this._precision = 0;
        this._contract = "";
        this._chain = "telos";
    
        if (typeof obj == "string") {
            this._symbol = obj;
            console.assert(this.symbol.length > 0, "ERROR: symbol not valid for token: ", this._symbol);
            console.assert(this.symbol.length < 9, "ERROR: symbol not valid for token: ", this._symbol);
        }
        
        if (obj) {
            if (obj instanceof Token) {
                this._symbol = obj._symbol;
                this._precision = obj._precision;
                this._contract = obj._contract;
                this._chain = obj._chain;
            } else if (typeof obj == "object") {
                this._symbol = obj.symbol || this._symbol;
                this._precision = obj.precision || this._precision;
                this._contract = obj.contract || this._contract;
                this._chain = obj.chain || this._chain;
            }
        }

        this.updateId();
        this.updateStr();
    }

    get symbol() { return this._symbol; }
    get precision() { return this._precision; }
    get contract() { return this._contract; }
    get chain() { return this._chain; }

    get str() {
        if (this._str) return this._str;
        this.updateStr();
        return this._str;
    }

    get id() {
        if (this._id) return this._id;
        this.updateId();
        return this._id;
    }

    private updateStr() {
        this._str = this.symbol;
        if (this._precision != null || this._contract != null) {
            if (this._precision && this._contract) {
                this._str += " (" + this._precision + ", " + this._contract + ")";
            } else {
                if (this._precision) {
                    this._str += " (" + this._precision + ")";
                }
                if (this._contract) {
                    this._str += " (" + this._contract + ")";
                }  
            }
        }
    }

    private updateId() {
        if (this._contract) {
            this._id = this.symbol + ":" + this.contract + "@" + this.chain;
        } else {
            this._id = this.symbol;
        }
    }

    clear() {
        delete this._str;
    }

    toString() {
        return this.str;
    }

    basecopy(): Token {
        let cp = new Token(this);
        cp._symbol = this._symbol;
        cp._precision = this._precision;
        cp._contract = this._contract;
        cp.clear();
        cp.toString();
        return cp;
    }

}