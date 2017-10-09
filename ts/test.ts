import * as authLib from "./";

interface UserInfoDBRow extends authLib.UserMFAInfo {
    Password: string;
}

let Userdb: {[Username: string]: UserInfoDBRow} = {
    "wchang28@hotmail.com": {
        Id: "854735894564246468"
        ,Username: "wchang28@hotmail.com"
        ,VerifiedEmail: "wchang28@hotmail.com"
        ,VerifiedMobilePhoneNumber: "626-333-7635"
        ,MFAEnabled: true
        ,MFAStack: ["Password", "TOTPCode"]
        ,TOTPSecretHex: "76596465AC8B8756"
        ,TOTPCodeDeliveryMethods: ["Email", "SMS", "AuthenticatorAppOrToken"]
        ,Password: "76t324!@78"
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
        console.log(JSON.stringify(Message) + " sent to " + VerifiedEmail + ".");
        return Promise.resolve({});
    }
    sendSMS(VerifiedMobilePhoneNumber: string, Message: authLib.NotificationMessage): Promise<any> {
        console.log(JSON.stringify(Message) + " sent to " + VerifiedMobilePhoneNumber + ".");
        return Promise.resolve({});
    }
}

class PasswordProvider implements authLib.IPasswordProvider {
    get Name(): string {return "Simple Password Authentication Provider";}
    get CanStoreCredential(): boolean {return false;}
    authenticate(UserMFAInfo: authLib.UserMFAInfo, Credential: authLib.Password) : Promise<void> {
        let info = Userdb[UserMFAInfo.Username];
        return (info && info.Password === Credential ? Promise.resolve() : Promise.reject({error: "unauthorized", error_description: "invalid or bad password"}));
    }
    storeCredential(UserIndetifier: authLib.UserIndetifier, Credential: authLib.Password) : Promise<void> {
        return Promise.reject({error: "bad-request", error_description: "credential storage not supported by the provider"});
    }
}

class AuthImplementation implements authLib.IAuthenticationImplementation {
    private MFATrackingImpl: authLib.IMFATrackingImpl;
    private MsgComposer: authLib.ITOTPCodeDeliveryMsgComposer;
    private NotificationPrvdr: authLib.ISimpleNotificationProvider;
    private PasswordPrvdr: authLib.IPasswordProvider;
    private TOTPPrvdr: authLib.ITOTPProvider;

    constructor() {
        this.MFATrackingImpl = new MFATrackingImpl();
        this.MsgComposer = new MsgComposer();
        this.NotificationPrvdr = new NotificationProvider();
        this.PasswordPrvdr = new PasswordProvider();
        this.TOTPPrvdr = authLib.totp({issuer: "MyCompany"});
    }

    get MFATracking(): authLib.IMFATrackingImpl {return this.MFATrackingImpl;}
    get NotificationProvider() : authLib.ISimpleNotificationProvider {return this.NotificationPrvdr;}
    get TOTPCodeDeliveryMsgComposer(): authLib.ITOTPCodeDeliveryMsgComposer {return this.MsgComposer;}
    get PasswordProvider(): authLib.IPasswordProvider {return this.PasswordPrvdr;}
    get TOTPProvider(): authLib.ITOTPProvider {return this.TOTPPrvdr;}
    get PINProvider(): authLib.IPINProvider {return null;}
    get SmartCardProvider(): authLib.ISmartCardProvider {return null;}
    get FingerprintProvider(): authLib.IFingerprintProvider {return null;}
    get IrisScanProvider(): authLib.IIrisScanProvider {return null;}
    get VoiceProvider(): authLib.IVoiceProvider {return null;}
    lookUpUser(Username: authLib.Username) : Promise<authLib.UserMFAInfo> {
        let info = Userdb[Username];
        return info ? Promise.resolve<authLib.UserMFAInfo>(info) : Promise.reject({error: "not-found", error_description: "user not found"});
    }
}

let authStack = authLib.stack(new AuthImplementation());

authStack.authenticatePassword({Username: "wchang28@hotmail.com"}, "76t324!@78")
.then((result: authLib.AuthenticationResult) => {
    console.log(JSON.stringify(result, null, 2));
}).catch((err: any) => {
    console.error("!!! Error: "  + JSON.stringify(err));
});