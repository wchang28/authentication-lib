import * as authLib from "./";
import * as _ from "lodash";
const OTPAuth = require('otpauth');

export interface Options {
    issuer?: string;
    algorithm?: string;
    digits?: number; // number of digits in the passcode
    period?: number; // number of seconds until the passcode changed
    window?: number;
}

let defaultOptions: Options = {
    issuer: "ACME"
    ,algorithm: "SHA1"
    ,digits: 6
    ,period: 30
    ,window: 10
};

class TOTPProvider implements authLib.ITOTPProvider {
    private options: Options;
    constructor(options?: Options) {
        options = options || defaultOptions;
        this.options = _.assignIn({}, defaultOptions, options);        
    }
    private factory(label: string, secretHex: string) {
        let totp = new OTPAuth.TOTP({
            issuer: this.options.issuer,
            label,
            algorithm: this.options.algorithm,
            digits: this.options.digits,
            period: this.options.period,
            secret: OTPAuth.Secret.fromHex(secretHex)
        });
        return totp;
    }
    get Name(): string {return "Time-based One-time Password Authentication Provider";}
    get CanStoreCredential(): boolean {return false;}
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.TOTPCode) : Promise<void> {
        let delta = this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).validate({token: Credential, window: this.options.window});
        return delta != null ? Promise.resolve() : Promise.reject({error: "unauthorized", error_description: "invalid or expired passcode"});
    }
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.TOTPCode) : Promise<void> {
        return Promise.reject({error: "bad-request", error_description: "credential storage not supported by the provider"});
    }
    generateCode(UserMFAInfo: authLib.UserMFAInfo): Promise<authLib.TOTPCode> {
        return Promise.resolve<authLib.TOTPCode>(this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).generate());
    }
    generateURI(UserMFAInfo: authLib.UserMFAInfo, GenQRCode: boolean): Promise<string> {
        let uri: string = this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).toString();
        if (GenQRCode) {
            ;   // TODO:
        }
        return Promise.resolve<string>(uri);
    }
}

export function get(options?: Options) : authLib.ITOTPProvider {return new TOTPProvider(options);}