import * as types from "./types";
import * as _ from "lodash";

export interface Options {
    TimeoutMS?: number;
}

type GetProviderProc<C> = () => types.IAuthenticationProvider<C>;

let defaultOptions: Options = {
    TimeoutMS: 10 * 60 * 1000   // 10 mminutes
}

class MFAAuthenticationStack implements types.IMFAAuthenticationStack {
    private static ERR_NO_PROVIDER: any = {error: "bad-request", error_description: "no provider support for the authentication method"};
    private options: Options;
    constructor(private authImpl: types.IAuthenticationImplementation, options?: Options) {
        options = options || defaultOptions;
        this.options = _.assignIn({}, defaultOptions, options);
    }

    private emailOTPCode(VerifiedEmail: string, TOTPCode: types.TOTPCode) : Promise<any> {
        return this.authImpl.TOTPCodeDeliveryMsgComposer.composeEmailMsg(TOTPCode).then((Message: types.NotificationMessage) => this.authImpl.NotificationProvider.sendEmail(VerifiedEmail, Message));
    }

    private smsOTPCode(VerifiedMobilePhoneNumber: string, TOTPCode: types.TOTPCode) : Promise<any> {
        return this.authImpl.TOTPCodeDeliveryMsgComposer.composeSMSMsg(TOTPCode).then((Message: types.NotificationMessage) => this.authImpl.NotificationProvider.sendSMS(VerifiedMobilePhoneNumber, Message));
    }

    private deliverTOTPCode(UserMFAInfo: types.UserMFAInfo) : Promise<types.TOTPCodeDeliveryMethod[]> {
        let deliveries: types.TOTPCodeDeliveryMethod[] = [];
        return (this.authImpl.TOTPProvider ? this.authImpl.TOTPProvider.generateCode(UserMFAInfo)
        .then((TOTPCode: types.TOTPCode) => {
            let promises: Promise<any>[] = [];
            for (let i in UserMFAInfo.TOTPCodeDeliveryMethods) {
                let TOTPCodeDeliveryMethod = UserMFAInfo.TOTPCodeDeliveryMethods[i];
                if (TOTPCodeDeliveryMethod === "Email" && UserMFAInfo.VerifiedEmail) {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(this.emailOTPCode(UserMFAInfo.VerifiedEmail, TOTPCode));
                } else if (TOTPCodeDeliveryMethod === "SMS" && UserMFAInfo.VerifiedMobilePhoneNumber) {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(this.smsOTPCode(UserMFAInfo.VerifiedMobilePhoneNumber, TOTPCode));
                } else if (TOTPCodeDeliveryMethod === "AuthenticatorAppOrToken") {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(Promise.resolve<any>({}));
                }
            }
            return Promise.all(promises);
        }).then((value: any[]) => {
            return deliveries;
        }) : Promise.reject(MFAAuthenticationStack.ERR_NO_PROVIDER));
    }

    private afterAuthenticated(MFAAuthStatus: types.MFAAuthStatus, UserMFAInfo : types.UserMFAInfo) : Promise<types.AuthenticationResult> {
        let ret: types.AuthenticationResult = {MFAAuthStatus};
        let p: Promise<types.TOTPCodeDeliveryMethod[]> = Promise.resolve([]);
        let NextAuthFactor = MFAAuthStatus.CurrAuthFactor + 1;
        if (UserMFAInfo.MFAEnabled && UserMFAInfo.MFAStack && UserMFAInfo.MFAStack.length > 0 && NextAuthFactor < UserMFAInfo.MFAStack.length) {
            ret.MFANext = {
                AuthFactor: NextAuthFactor
                ,AuthMethod: UserMFAInfo.MFAStack[NextAuthFactor]
            };
            if (ret.MFANext.AuthMethod === "TOTPCode" && UserMFAInfo.TOTPSecretHex && UserMFAInfo.TOTPCodeDeliveryMethods && UserMFAInfo.TOTPCodeDeliveryMethods.length > 0) {
                p = this.deliverTOTPCode(UserMFAInfo);
            }
        }
        return p.then((TOTPCodeDeliveryMethods: types.TOTPCodeDeliveryMethod[]) => {
            if (TOTPCodeDeliveryMethods && TOTPCodeDeliveryMethods.length > 0) ret.MFANext.TOTPCodeDeliveryMethods = TOTPCodeDeliveryMethods;
            return ret;
        });
    }

    automationAuthenticate(Username: types.Username, Password: types.Password) : Promise<types.UserIndetifier> {
        let UserMFAInfo: types.UserMFAInfo = null;
        return this.authImpl.lookUpUser(Username)
        .then((value: types.UserMFAInfo) => {
            UserMFAInfo = value;
            return this.authImpl.PasswordProvider.authenticate(UserMFAInfo, Password);
        }).then(() => {
            return {Id: UserMFAInfo.Id, Username: UserMFAInfo.Username};
        });
    }

    private authenticate<C>(proc: GetProviderProc<C>, Options: types.AuthenticationOptions, credential: C) : Promise<types.AuthenticationResult> {
        let MFATracking = this.authImpl.MFATracking;
        let UserMFAInfo: types.UserMFAInfo = null;
        let FirstFactor = (Options.PrevMFATrackingId ? false : true);
        return (FirstFactor ? this.authImpl.lookUpUser(Options.Username) : MFATracking.verify(Options.PrevMFATrackingId))
        .then((value: types.UserMFAInfo) => {
            UserMFAInfo = value;
            let getProvider: GetProviderProc<C> = proc.bind(this);
            let provider = getProvider();
            return (provider ? provider.authenticate(UserMFAInfo, credential) : Promise.reject(MFAAuthenticationStack.ERR_NO_PROVIDER));    // authenticate the credential
        }).then(() => {
            return (FirstFactor ? MFATracking.beginTracking(UserMFAInfo, this.options.TimeoutMS, Options.AppId) : MFATracking.advanceOneFactor(Options.PrevMFATrackingId));
        }).then((MFAAuthStatus: types.MFAAuthStatus) => this.afterAuthenticated(MFAAuthStatus, UserMFAInfo));
    }

    authenticatePassword(Options: types.AuthenticationOptions, Password: types.Password) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.PasswordProvider, Options, Password);
    }

    authenticateTOTP(Options: types.AuthenticationOptions, TOTPCode: types.TOTPCode) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.TOTPProvider, Options, TOTPCode);
    }

    authenticatePIN(Options: types.AuthenticationOptions, PIN: types.PIN) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.PINProvider, Options, PIN);
    }

    authenticateSamrtCard(Options: types.AuthenticationOptions, SmartCardKey: types.SmartCardKey) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.SmartCardProvider, Options, SmartCardKey);
    }

    authenticateFingerprint(Options: types.AuthenticationOptions, Fingerprint: types.Fingerprint) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.FingerprintProvider, Options, Fingerprint);
    }

    authenticateIrisScan(Options: types.AuthenticationOptions, IrisScan: types.IrisScan) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.IrisScanProvider, Options, IrisScan);
    }

    authenticateVoice(Options: types.AuthenticationOptions, VoiceData: types.VoiceData) : Promise<types.AuthenticationResult> {
        return this.authenticate(() => this.authImpl.VoiceProvider, Options, VoiceData);
    }
}

export function get(authImpl: types.IAuthenticationImplementation, options?: Options) : types.IMFAAuthenticationStack {return new MFAAuthenticationStack(authImpl, options);}