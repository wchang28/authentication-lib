import * as authLib from "./";
export interface Options {
    issuer?: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    window?: number;
}
export declare function get(options?: Options): authLib.ITOTPProvider;
