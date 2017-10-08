import * as authLib from "./";
const OTPAuth = require('otpauth');

export interface Options {
    issuer: string;
    algorithm: string;
    digits: number; // number of digits in the passcode
    period: number; // number of seconds until the passcode changed
}
export class TOTPProvider implements authLib.ITOTPProvider {
    constructor() {
        
    }
    private factory(label: string, secretHex: string) {
        let totp = new OTPAuth.TOTP({
                issuer: 'ACME',
                label: 'AzureDiamond',
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: OTPAuth.Secret.fromB32('NB2W45DFOIZA')
        });
        return totp;
    }
    get Name(): string {return "Time-based One-time Password Authentication Provider";}
    get CanStoreCredential(): boolean {return false;}
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.TOTPCode) : Promise<void> {

    }
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.TOTPCode) : Promise<void> {
        return Promise.reject({error: "bad-request", error_description: "credential storage not supported by the provider"});
    }
    generateCode(UserMFAInfo: authLib.UserMFAInfo): Promise<authLib.TOTPCode> {

    }
    generateURI(UserMFAInfo: authLib.UserMFAInfo, GenQRCode: boolean): Promise<string> {

    }
}
