import * as _ from "lodash";

export type AuthenticationMethod = "Password" | "TOTPCode" | "PIN" | "SmartCard" | "Fingerprint" | "IrisScan" | "Voice";

export type MFAStack = AuthenticationMethod[];

export type TOTPCodeDeliveryMethod = "Email" | "SMS" | "AuthenticatorAppOrToken";

export type UserId = string;
export type Username = string;
export type MFATrackingId = string;
export type AppId = string;

export interface AuthenticationOptions {
    Username?: Username;
    PrevMFATrackingId?: MFATrackingId;
    AppId?: AppId;
}

export type Password = string;
export type TOTPCode = string;
export type PIN = string;
export type SmartCardKey = string;
export type BiometricData = any;
export type Fingerprint = BiometricData;
export type IrisScan = BiometricData;
export type VoiceData = BiometricData;

export interface MFANextInfo {
    AuthFactor: number;
    AuthMethod: AuthenticationMethod;
    TOTPCodeDeliveryMethods?: TOTPCodeDeliveryMethod[];
}

export interface MFAAuthStatus {
    TrackingId: MFATrackingId;   
    CurrAuthFactor: number;
    Completed: boolean;
}

export interface AuthenticationResult {
    MFAAuthStatus: MFAAuthStatus;
    MFANext?: MFANextInfo;
}

export interface UserIndetifier {
    Id: UserId;
    Name: Username;
}

export interface UserMFAInfo extends UserIndetifier {
    VerifiedEmail?: string;
    VerifiedMobilePhoneNumber?: string;
    MFAEnabled: boolean;
    MFAStack: MFAStack;
    TOTPSecretHex?: string;
    TOTPCodeDeliveryMethods?: TOTPCodeDeliveryMethod[];
}

export interface IMFATrackingImpl {
    verify(PrevMFATrackingId: MFATrackingId) : Promise<UserMFAInfo>;
    beginTracking(UserMFAInfo: UserMFAInfo, TimeoutMS: number, AppId?: AppId) : Promise<MFAAuthStatus>;
    advanceOneFactor(PrevMFATrackingId: MFATrackingId) : Promise<MFAAuthStatus>;
}

export interface AuthenticationProvider {
    readonly Name: string;
    readonly CanStoreCredential: boolean;
}

export interface IAuthenticationProvider<C> extends AuthenticationProvider {
    authenticate(UserMFAInfo: UserMFAInfo, Credential: C) : Promise<void>;
    storeCredential(UserIndetifier: UserIndetifier, Credential: C) : Promise<void>;
}

export interface ITOTPProvider extends IAuthenticationProvider<TOTPCode> {
    generateCode(UserMFAInfo: UserMFAInfo): Promise<TOTPCode>;
    generateURI(UserMFAInfo: UserMFAInfo, GenQRCode: boolean): Promise<string>;
}

export interface IPasswordProvider extends IAuthenticationProvider<Password> {};
export interface IPINProvider extends IAuthenticationProvider<PIN> {};
export interface ISmartCardProvider extends IAuthenticationProvider<SmartCardKey> {};
export interface IFingerprintProvider extends IAuthenticationProvider<Fingerprint> {};
export interface IIrisScanProvider extends IAuthenticationProvider<IrisScan> {};
export interface IVoiceProvider extends IAuthenticationProvider<VoiceData> {};

export interface NotificationMessage {
    Body: string;
    Subject? : string;
}

export interface ISimpleNotificationProvider {
    sendEmail(VerifiedEmail: string, Message: NotificationMessage): Promise<any>;
    sendSMS(VerifiedMobilePhoneNumber: string, Message: NotificationMessage): Promise<any>;
}

export interface ITOTPCodeDeliveryMsgComposer {
    composeEmailMsg(OTPCode: TOTPCode): Promise<NotificationMessage>;
    composeSMSMsg(OTPCode: TOTPCode): Promise<NotificationMessage>;
}

export interface IAuthenticationImplementation {
    readonly MFATracking: IMFATrackingImpl;
    readonly NotificationProvider: ISimpleNotificationProvider;
    readonly OTPCodeDeliveryMsgComposer: ITOTPCodeDeliveryMsgComposer;
    readonly PasswordProvider: IPasswordProvider;
    readonly TOTPProvider: ITOTPProvider;
    readonly PINProvider: IPINProvider;
    readonly SmartCardProvider: ISmartCardProvider;
    readonly FingerprintProvider: IFingerprintProvider;
    readonly IrisScanProvider: IIrisScanProvider;
    readonly VoiceProvider: IVoiceProvider;
    lookUpUser(Username: Username) : Promise<UserMFAInfo>;
}

type GetProviderProc<C> = () => IAuthenticationProvider<C>;



export interface IMFAAuthenticationStack {
    automationAuthenticate(Username: Username, Password: Password) : Promise<UserIndetifier>;
    authenticatePassword(Options: AuthenticationOptions, Password: Password) : Promise<AuthenticationResult>;
    authenticateTOTP(Options: AuthenticationOptions, TOTPCode: TOTPCode) : Promise<AuthenticationResult>;
    authenticatePIN(Options: AuthenticationOptions, PIN: PIN) : Promise<AuthenticationResult>;
    authenticateSamrtCard(Options: AuthenticationOptions, SmartCardKey: SmartCardKey) : Promise<AuthenticationResult>;
    authenticateFingerprint(Options: AuthenticationOptions, Fingerprint: Fingerprint) : Promise<AuthenticationResult>;
    authenticateIrisScan(Options: AuthenticationOptions, IrisScan: IrisScan) : Promise<AuthenticationResult>;
    authenticateVoice(Options: AuthenticationOptions, VoiceData: VoiceData) : Promise<AuthenticationResult>;
}

export interface Options {
    TimeoutMS?: number;
}

let defaultOptions: Options = {
    TimeoutMS: 10 * 60 * 1000   // 10 mminutes
}

export class MFAAuthenticationStack implements IMFAAuthenticationStack {
    private static ERR_NO_PROVIDER: any = {error: "bad-request", error_description: "no provider support for the authentication method"};
    private options: Options;
    constructor(private authImpl: IAuthenticationImplementation, options?: Options) {
        options = options || defaultOptions;
        this.options = _.assignIn({}, defaultOptions, options);
    }

    private emailOTPCode(VerifiedEmail: string, TOTPCode: TOTPCode) : Promise<any> {
        return this.authImpl.OTPCodeDeliveryMsgComposer.composeEmailMsg(TOTPCode).then((Message: NotificationMessage) => this.authImpl.NotificationProvider.sendEmail(VerifiedEmail, Message));
    }

    private smsOTPCode(VerifiedMobilePhoneNumber: string, TOTPCode: TOTPCode) : Promise<any> {
        return this.authImpl.OTPCodeDeliveryMsgComposer.composeSMSMsg(TOTPCode).then((Message: NotificationMessage) => this.authImpl.NotificationProvider.sendSMS(VerifiedMobilePhoneNumber, Message));
    }

    private deliverTOTPCode(UserMFAInfo: UserMFAInfo) : Promise<TOTPCodeDeliveryMethod[]> {
        let deliveries: TOTPCodeDeliveryMethod[] = [];
        return (this.authImpl.TOTPProvider ? this.authImpl.TOTPProvider.generateCode(UserMFAInfo)
        .then((TOTPCode: TOTPCode) => {
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

    private afterAuthenticated(MFAAuthStatus: MFAAuthStatus, UserMFAInfo : UserMFAInfo) : Promise<AuthenticationResult> {
        let ret: AuthenticationResult = {MFAAuthStatus};
        let p: Promise<TOTPCodeDeliveryMethod[]> = Promise.resolve([]);
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
        return p.then((TOTPCodeDeliveryMethods: TOTPCodeDeliveryMethod[]) => {
            if (TOTPCodeDeliveryMethods && TOTPCodeDeliveryMethods.length > 0) ret.MFANext.TOTPCodeDeliveryMethods = TOTPCodeDeliveryMethods;
            return ret;
        });
    }

    automationAuthenticate(Username: Username, Password: Password) : Promise<UserIndetifier> {
        let UserMFAInfo: UserMFAInfo = null;
        return this.authImpl.lookUpUser(Username)
        .then((value: UserMFAInfo) => {
            UserMFAInfo = value;
            return this.authImpl.PasswordProvider.authenticate(UserMFAInfo, Password);
        }).then(() => {
            return {Id: UserMFAInfo.Id, Name: UserMFAInfo.Name};
        });
    }

    private authenticate<C>(proc: GetProviderProc<C>, Options: AuthenticationOptions, credential: C) : Promise<AuthenticationResult> {
        let MFATracking = this.authImpl.MFATracking;
        let UserMFAInfo: UserMFAInfo = null;
        let FirstFactor = (Options.PrevMFATrackingId ? false : true);
        return (FirstFactor ? this.authImpl.lookUpUser(Options.Username) : MFATracking.verify(Options.PrevMFATrackingId))
        .then((value: UserMFAInfo) => {
            UserMFAInfo = value;
            let getProvider: GetProviderProc<C> = proc.bind(this);
            let provider = getProvider();
            return (provider ? provider.authenticate(UserMFAInfo, credential) : Promise.reject(MFAAuthenticationStack.ERR_NO_PROVIDER));    // authenticate the credential
        }).then(() => {
            return (FirstFactor ? MFATracking.beginTracking(UserMFAInfo, this.options.TimeoutMS, Options.AppId) : MFATracking.advanceOneFactor(Options.PrevMFATrackingId));
        }).then((MFAAuthStatus: MFAAuthStatus) => this.afterAuthenticated(MFAAuthStatus, UserMFAInfo));
    }

    authenticatePassword(Options: AuthenticationOptions, Password: Password) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.PasswordProvider, Options, Password);
    }

    authenticateTOTP(Options: AuthenticationOptions, TOTPCode: TOTPCode) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.TOTPProvider, Options, TOTPCode);
    }

    authenticatePIN(Options: AuthenticationOptions, PIN: PIN) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.PINProvider, Options, PIN);
    }

    authenticateSamrtCard(Options: AuthenticationOptions, SmartCardKey: SmartCardKey) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.SmartCardProvider, Options, SmartCardKey);
    }

    authenticateFingerprint(Options: AuthenticationOptions, Fingerprint: Fingerprint) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.FingerprintProvider, Options, Fingerprint);
    }

    authenticateIrisScan(Options: AuthenticationOptions, IrisScan: IrisScan) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.IrisScanProvider, Options, IrisScan);
    }

    authenticateVoice(Options: AuthenticationOptions, VoiceData: VoiceData) : Promise<AuthenticationResult> {
        return this.authenticate(() => this.authImpl.VoiceProvider, Options, VoiceData);
    }
}