import * as authLib from "./";

interface UserRSRow extends authLib.UserMFAInfo {
    Password: authLib.Password;
    PIN: authLib.PIN;
}

let UsersTable: {[Username: string]: UserRSRow} = {
    "wchang28@hotmail.com": {
        Id: "854735894564246468"
        ,Username: "wchang28@hotmail.com"
        ,VerifiedEmail: "wchang28@hotmail.com"
        ,VerifiedMobilePhoneNumber: "626-333-7635"
        ,MFAEnabled: true
        ,MFAStack: ["Password", "TOTPCode", "PIN"]
        ,TOTPSecretHex: "76596465AC8B8756"
        ,TOTPCodeDeliveryMethods: ["Email", "SMS", "AuthenticatorAppOrToken"]
        ,Password: "76t324!@78"
        ,PIN: "7743"
    }
};

interface TrackingItem {
    UserMFAInfo: authLib.UserMFAInfo;
    TotalFactors: number;
    CurrAuthFactor: number;
    ExpirationTime: number;
}

let TrackingDB: {[TrackingId: string]: TrackingItem} = {};

class MFATrackingImpl implements authLib.IMFATrackingImpl {
    verify(PrevMFATrackingId: authLib.MFATrackingId) : Promise<authLib.UserMFAInfo> {
        let trackingItem = TrackingDB[PrevMFATrackingId];
        if (trackingItem && new Date().getTime() < trackingItem.ExpirationTime)
            return Promise.resolve<authLib.UserMFAInfo>(trackingItem.UserMFAInfo);
        else
            return Promise.reject({error: "unauthorized", error_description: "credential expired"});
    }
    beginTracking(UserMFAInfo: authLib.UserMFAInfo, TimeoutMS: number, AppId?: authLib.AppId) : Promise<authLib.MFAAuthStatus> { 
        let TrackingId: authLib.MFATrackingId = "zzyzx";
        let TotalFactors = UserMFAInfo.MFAStack.length;
        let CurrAuthFactor = 0;
        TrackingDB[TrackingId] = {UserMFAInfo, TotalFactors, CurrAuthFactor, ExpirationTime: new Date().getTime() + TimeoutMS};
        return Promise.resolve<authLib.MFAAuthStatus>({TrackingId, CurrAuthFactor, Completed: CurrAuthFactor + 1 >= TotalFactors});
    }
    advanceOneFactor(PrevMFATrackingId: authLib.MFATrackingId) : Promise<authLib.MFAAuthStatus> {
        let trackingItem = TrackingDB[PrevMFATrackingId];
        if (trackingItem && new Date().getTime() < trackingItem.ExpirationTime) {
            trackingItem.CurrAuthFactor += 1;
            let TotalFactors = trackingItem.TotalFactors;
            let CurrAuthFactor = trackingItem.CurrAuthFactor;
            return Promise.resolve<authLib.MFAAuthStatus>({TrackingId: PrevMFATrackingId, CurrAuthFactor, Completed: CurrAuthFactor + 1 >= TotalFactors});
        } else
            return Promise.reject({error: "unauthorized", error_description: "credential expired"});
    }
}

class MsgComposer implements authLib.ITOTPCodeDeliveryMsgComposer {
    composeEmailMsg(OTPCode: authLib.TOTPCode): Promise<authLib.NotificationMessage> {
        let msg : authLib.NotificationMessage = {
            Subject: "MFA Passcode"
            ,Body: "Your MFA Passcode is " + OTPCode
        };
        return Promise.resolve(msg);
    }
    composeSMSMsg(OTPCode: authLib.TOTPCode): Promise<authLib.NotificationMessage> {
        let msg : authLib.NotificationMessage = {
            Subject: "MFA Passcode"
            ,Body: "Your MFA Passcode is " + OTPCode     
        };
        return Promise.resolve(msg);
    }
}

class NotificationProvider implements authLib.ISimpleNotificationProvider {
    sendEmail(VerifiedEmail: string, Message: authLib.NotificationMessage): Promise<any> {
        console.log("Email msg " + JSON.stringify(Message) + " sent to " + VerifiedEmail + ".");
        return Promise.resolve({});
    }
    sendSMS(VerifiedMobilePhoneNumber: string, Message: authLib.NotificationMessage): Promise<any> {
        console.log("SMS msg " + JSON.stringify(Message) + " sent to " + VerifiedMobilePhoneNumber + ".");
        return Promise.resolve({});
    }
}

class PasswordProvider implements authLib.IPasswordProvider {
    get Name(): string {return "Simple Password Authentication Provider";}
    get CanStoreCredential(): boolean {return false;}
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.Password) : Promise<void> {
        let info = UsersTable[UserMFAInfo.Username];
        return (info && info.Password === Credential ? Promise.resolve() : Promise.reject({error: "unauthorized", error_description: "invalid or bad password"}));
    }
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.Password) : Promise<void> {
        return Promise.reject({error: "bad-request", error_description: "credential storage not supported by the provider"});
    }
}

class PINProvider implements authLib.IPINProvider {
    get Name(): string {return "Simple PIN Authentication Provider";}
    get CanStoreCredential(): boolean {return true;}
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.PIN) : Promise<void> {
        let info = UsersTable[UserMFAInfo.Username];
        return (info && info.PIN === Credential ? Promise.resolve() : Promise.reject({error: "unauthorized", error_description: "invalid or bad PIN"}));
    }
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.PIN) : Promise<void> {
        let info = UsersTable[UserIndetifier.Username];
        if (info) {
            info.PIN = Credential;
            return Promise.resolve();
        } else
            return Promise.reject({error: "not-found", error_description: "user not found"});
    }
}

class AuthImplementation implements authLib.IAuthenticationImplementation {
    private MFATrackingImpl: authLib.IMFATrackingImpl;
    private MsgComposer: authLib.ITOTPCodeDeliveryMsgComposer;
    private NotificationPrvdr: authLib.ISimpleNotificationProvider;
    private PasswordPrvdr: authLib.IPasswordProvider;
    private TOTPPrvdr: authLib.ITOTPProvider;
    private PINPrvdr: authLib.IPINProvider;

    constructor() {
        this.MFATrackingImpl = new MFATrackingImpl();
        this.MsgComposer = new MsgComposer();
        this.NotificationPrvdr = new NotificationProvider();
        this.PasswordPrvdr = new PasswordProvider();
        this.TOTPPrvdr = authLib.totp({issuer: "MyCompany"});
        this.PINPrvdr = new PINProvider();
    }

    get MFATracking(): authLib.IMFATrackingImpl {return this.MFATrackingImpl;}
    get NotificationProvider() : authLib.ISimpleNotificationProvider {return this.NotificationPrvdr;}
    get TOTPCodeDeliveryMsgComposer(): authLib.ITOTPCodeDeliveryMsgComposer {return this.MsgComposer;}
    get PasswordProvider(): authLib.IPasswordProvider {return this.PasswordPrvdr;}
    get TOTPProvider(): authLib.ITOTPProvider {return this.TOTPPrvdr;}
    get PINProvider(): authLib.IPINProvider {return this.PINPrvdr;}
    get SmartCardProvider(): authLib.ISmartCardProvider {return null;}
    get FingerprintProvider(): authLib.IFingerprintProvider {return null;}
    get IrisScanProvider(): authLib.IIrisScanProvider {return null;}
    get VoiceProvider(): authLib.IVoiceProvider {return null;}

    lookUpUser(Username: authLib.Username) : Promise<authLib.UserMFAInfo> {
        let info = UsersTable[Username];
        return info ? Promise.resolve<authLib.UserMFAInfo>(info) : Promise.reject({error: "not-found", error_description: "user not found"});
    }
}

let authStack = authLib.stack(new AuthImplementation());

let passcode:  authLib.TOTPCode = null;
authStack.on("totp-passcode-generated", (UserMFAInfo: authLib.UserMFAInfo, TOTPCode: authLib.TOTPCode) => {
    console.log("passcode " + TOTPCode + " generated for user " + UserMFAInfo.Username);
    passcode = TOTPCode;
});

authStack.authenticatePassword({Username: "wchang28@hotmail.com"}, "76t324!@78")
.then((result: authLib.AuthenticationResult) => {
    console.log("");
    console.log("After factor 1 authentication:");
    console.log(JSON.stringify(result, null, 2));
    return authStack.authenticateTOTP({PrevMFATrackingId: result.MFAAuthStatus.TrackingId}, passcode);
}).then((result: authLib.AuthenticationResult) => {
    console.log("");
    console.log("After factor 2 authentication:");
    console.log(JSON.stringify(result, null, 2));
    return authStack.authenticatePIN({PrevMFATrackingId: result.MFAAuthStatus.TrackingId}, "7743");
}).then((result: authLib.AuthenticationResult) => {
    console.log("");
    console.log("After factor 3 authentication:");
    console.log(JSON.stringify(result, null, 2));
}).catch((err: any) => {
    console.error("!!! Error: "  + JSON.stringify(err));
});