import * as types from "./types";
export interface Options {
    TimeoutMS?: number;
}
export declare class MFAAuthenticationStack implements types.IMFAAuthenticationStack {
    private authImpl;
    private static ERR_NO_PROVIDER;
    private options;
    constructor(authImpl: types.IAuthenticationImplementation, options?: Options);
    private emailOTPCode(VerifiedEmail, TOTPCode);
    private smsOTPCode(VerifiedMobilePhoneNumber, TOTPCode);
    private deliverTOTPCode(UserMFAInfo);
    private afterAuthenticated(MFAAuthStatus, UserMFAInfo);
    automationAuthenticate(Username: types.Username, Password: types.Password): Promise<types.UserIndetifier>;
    private authenticate<C>(proc, Options, credential);
    authenticatePassword(Options: types.AuthenticationOptions, Password: types.Password): Promise<types.AuthenticationResult>;
    authenticateTOTP(Options: types.AuthenticationOptions, TOTPCode: types.TOTPCode): Promise<types.AuthenticationResult>;
    authenticatePIN(Options: types.AuthenticationOptions, PIN: types.PIN): Promise<types.AuthenticationResult>;
    authenticateSamrtCard(Options: types.AuthenticationOptions, SmartCardKey: types.SmartCardKey): Promise<types.AuthenticationResult>;
    authenticateFingerprint(Options: types.AuthenticationOptions, Fingerprint: types.Fingerprint): Promise<types.AuthenticationResult>;
    authenticateIrisScan(Options: types.AuthenticationOptions, IrisScan: types.IrisScan): Promise<types.AuthenticationResult>;
    authenticateVoice(Options: types.AuthenticationOptions, VoiceData: types.VoiceData): Promise<types.AuthenticationResult>;
}
