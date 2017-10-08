import * as authLib from "./";
export interface Options {
    issuer: string;
    algorithm: string;
    digits: number;
    period: number;
}
export declare class TOTPProvider implements authLib.ITOTPProvider {
    constructor();
    private factory(label, secretHex);
    readonly Name: string;
    readonly CanStoreCredential: boolean;
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.TOTPCode): Promise<void>;
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.TOTPCode): Promise<void>;
    generateCode(UserMFAInfo: authLib.UserMFAInfo): Promise<authLib.TOTPCode>;
    generateURI(UserMFAInfo: authLib.UserMFAInfo, GenQRCode: boolean): Promise<string>;
}
