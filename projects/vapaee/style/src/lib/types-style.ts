export interface IStorage {
    get: (string) => any;
    set: (string, any) => any;
}

export interface Skin {
    id: string;
    name: string;
    url: string;
}