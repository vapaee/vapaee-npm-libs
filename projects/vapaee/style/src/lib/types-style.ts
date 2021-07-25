export interface IStorage {
    get: (key: string) => any;
    set: (key: string, value:any) => any;
}

export interface Skin {
    id: string;
    name: string;
    url: string;
}