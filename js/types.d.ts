export declare type AuthenticationMethod = "Password" | "TOTPCode" | "PIN" | "SmartCard" | "Fingerprint" | "IrisScan" | "Voice";
export declare type MFAStack = AuthenticationMethod[];
export declare type TOTPCodeDeliveryMethod = "Email" | "SMS" | "AuthenticatorAppOrToken";
export declare type UserId = string;
export declare type Username = string;
export declare type MFATrackingId = string;
export declare type AppId = string;
export interface AuthenticationOptions {
    Username?: Username;
    PrevMFATrackingId?: MFATrackingId;
    AppId?: AppId;
}
export declare type Password = string;
export declare type TOTPCode = string;
export declare type PIN = string;
export declare type SmartCardKey = string;
export declare type BiometricData = any;
export declare type Fingerprint = BiometricData;
export declare type IrisScan = BiometricData;
export declare type VoiceData = BiometricData;
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
    Username: Username;
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
    verify(PrevMFATrackingId: MFATrackingId): Promise<UserMFAInfo>;
    beginTracking(UserMFAInfo: UserMFAInfo, TimeoutMS: number, AppId?: AppId): Promise<MFAAuthStatus>;
    advanceOneFactor(PrevMFATrackingId: MFATrackingId): Promise<MFAAuthStatus>;
}
export interface AuthenticationProvider {
    readonly Name: string;
    readonly CanStoreCredential: boolean;
}
export interface IAuthenticationProvider<C> extends AuthenticationProvider {
    authenticate(UserMFAInfo: UserMFAInfo, Credential: C): Promise<void>;
    storeCredential(UserIndetifier: UserIndetifier, Credential: C): Promise<void>;
}
export interface ITOTPProvider extends IAuthenticationProvider<TOTPCode> {
    generateCode(UserMFAInfo: UserMFAInfo): Promise<TOTPCode>;
    generateURI(UserMFAInfo: UserMFAInfo, GenQRCode: boolean): Promise<string>;
}
export interface IPasswordProvider extends IAuthenticationProvider<Password> {
}
export interface IPINProvider extends IAuthenticationProvider<PIN> {
}
export interface ISmartCardProvider extends IAuthenticationProvider<SmartCardKey> {
}
export interface IFingerprintProvider extends IAuthenticationProvider<Fingerprint> {
}
export interface IIrisScanProvider extends IAuthenticationProvider<IrisScan> {
}
export interface IVoiceProvider extends IAuthenticationProvider<VoiceData> {
}
export interface NotificationMessage {
    Body: string;
    Subject?: string;
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
    readonly TOTPCodeDeliveryMsgComposer: ITOTPCodeDeliveryMsgComposer;
    readonly PasswordProvider: IPasswordProvider;
    readonly TOTPProvider: ITOTPProvider;
    readonly PINProvider: IPINProvider;
    readonly SmartCardProvider: ISmartCardProvider;
    readonly FingerprintProvider: IFingerprintProvider;
    readonly IrisScanProvider: IIrisScanProvider;
    readonly VoiceProvider: IVoiceProvider;
    lookUpUser(Username: Username): Promise<UserMFAInfo>;
}
export interface IMFAAuthenticationStack {
    automationAuthenticate(Username: Username, Password: Password): Promise<UserIndetifier>;
    authenticatePassword(Options: AuthenticationOptions, Password: Password): Promise<AuthenticationResult>;
    authenticateTOTP(Options: AuthenticationOptions, TOTPCode: TOTPCode): Promise<AuthenticationResult>;
    authenticatePIN(Options: AuthenticationOptions, PIN: PIN): Promise<AuthenticationResult>;
    authenticateSamrtCard(Options: AuthenticationOptions, SmartCardKey: SmartCardKey): Promise<AuthenticationResult>;
    authenticateFingerprint(Options: AuthenticationOptions, Fingerprint: Fingerprint): Promise<AuthenticationResult>;
    authenticateIrisScan(Options: AuthenticationOptions, IrisScan: IrisScan): Promise<AuthenticationResult>;
    authenticateVoice(Options: AuthenticationOptions, VoiceData: VoiceData): Promise<AuthenticationResult>;
}
