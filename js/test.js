"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var authLib = require("./");
var UsersTable = {
    "wchang28@hotmail.com": {
        Id: "854735894564246468",
        Username: "wchang28@hotmail.com",
        VerifiedEmail: "wchang28@hotmail.com",
        VerifiedMobilePhoneNumber: "626-333-7635",
        MFAEnabled: true,
        MFAStack: ["Password", "TOTPCode", "PIN"],
        TOTPSecretHex: "76596465AC8B8756",
        TOTPCodeDeliveryMethods: ["Email", "SMS", "AuthenticatorAppOrToken"],
        Password: "76t324!@78",
        PIN: "7743"
    }
};
var TrackingDB = {};
var MFATrackingImpl = /** @class */ (function () {
    function MFATrackingImpl() {
    }
    MFATrackingImpl.prototype.verify = function (PrevMFATrackingId) {
        var trackingItem = TrackingDB[PrevMFATrackingId];
        if (trackingItem && new Date().getTime() < trackingItem.ExpirationTime)
            return Promise.resolve(trackingItem.UserMFAInfo);
        else
            return Promise.reject({ error: "unauthorized", error_description: "credential expired" });
    };
    MFATrackingImpl.prototype.beginTracking = function (UserMFAInfo, TimeoutMS, AppId) {
        var TrackingId = "zzyzx";
        var TotalFactors = UserMFAInfo.MFAStack.length;
        var CurrAuthFactor = 0;
        TrackingDB[TrackingId] = { UserMFAInfo: UserMFAInfo, TotalFactors: TotalFactors, CurrAuthFactor: CurrAuthFactor, ExpirationTime: new Date().getTime() + TimeoutMS };
        return Promise.resolve({ TrackingId: TrackingId, CurrAuthFactor: CurrAuthFactor, Completed: CurrAuthFactor + 1 >= TotalFactors });
    };
    MFATrackingImpl.prototype.advanceOneFactor = function (PrevMFATrackingId) {
        var trackingItem = TrackingDB[PrevMFATrackingId];
        if (trackingItem && new Date().getTime() < trackingItem.ExpirationTime) {
            trackingItem.CurrAuthFactor += 1;
            var TotalFactors = trackingItem.TotalFactors;
            var CurrAuthFactor = trackingItem.CurrAuthFactor;
            return Promise.resolve({ TrackingId: PrevMFATrackingId, CurrAuthFactor: CurrAuthFactor, Completed: CurrAuthFactor + 1 >= TotalFactors });
        }
        else
            return Promise.reject({ error: "unauthorized", error_description: "credential expired" });
    };
    return MFATrackingImpl;
}());
var MsgComposer = /** @class */ (function () {
    function MsgComposer() {
    }
    MsgComposer.prototype.composeEmailMsg = function (OTPCode) {
        var msg = {
            Subject: "MFA Passcode",
            Body: "Your MFA Passcode is " + OTPCode
        };
        return Promise.resolve(msg);
    };
    MsgComposer.prototype.composeSMSMsg = function (OTPCode) {
        var msg = {
            Subject: "MFA Passcode",
            Body: "Your MFA Passcode is " + OTPCode
        };
        return Promise.resolve(msg);
    };
    return MsgComposer;
}());
var NotificationProvider = /** @class */ (function () {
    function NotificationProvider() {
    }
    NotificationProvider.prototype.sendEmail = function (VerifiedEmail, Message) {
        console.log("Email msg " + JSON.stringify(Message) + " sent to " + VerifiedEmail + ".");
        return Promise.resolve({});
    };
    NotificationProvider.prototype.sendSMS = function (VerifiedMobilePhoneNumber, Message) {
        console.log("SMS msg " + JSON.stringify(Message) + " sent to " + VerifiedMobilePhoneNumber + ".");
        return Promise.resolve({});
    };
    return NotificationProvider;
}());
var PasswordProvider = /** @class */ (function () {
    function PasswordProvider() {
    }
    Object.defineProperty(PasswordProvider.prototype, "Name", {
        get: function () { return "Simple Password Authentication Provider"; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PasswordProvider.prototype, "CanStoreCredential", {
        get: function () { return false; },
        enumerable: true,
        configurable: true
    });
    PasswordProvider.prototype.authenticate = function (UserMFAInfo, Credential) {
        var info = UsersTable[UserMFAInfo.Username];
        return (info && info.Password === Credential ? Promise.resolve() : Promise.reject({ error: "unauthorized", error_description: "invalid or bad password" }));
    };
    PasswordProvider.prototype.storeCredential = function (UserIndetifier, Credential) {
        return Promise.reject({ error: "bad-request", error_description: "credential storage not supported by the provider" });
    };
    return PasswordProvider;
}());
var PINProvider = /** @class */ (function () {
    function PINProvider() {
    }
    Object.defineProperty(PINProvider.prototype, "Name", {
        get: function () { return "Simple PIN Authentication Provider"; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PINProvider.prototype, "CanStoreCredential", {
        get: function () { return true; },
        enumerable: true,
        configurable: true
    });
    PINProvider.prototype.authenticate = function (UserMFAInfo, Credential) {
        var info = UsersTable[UserMFAInfo.Username];
        return (info && info.PIN === Credential ? Promise.resolve() : Promise.reject({ error: "unauthorized", error_description: "invalid or bad PIN" }));
    };
    PINProvider.prototype.storeCredential = function (UserIndetifier, Credential) {
        var info = UsersTable[UserIndetifier.Username];
        if (info) {
            info.PIN = Credential;
            return Promise.resolve();
        }
        else
            return Promise.reject({ error: "not-found", error_description: "user not found" });
    };
    return PINProvider;
}());
var AuthImplementation = /** @class */ (function () {
    function AuthImplementation() {
        this.MFATrackingImpl = new MFATrackingImpl();
        this.MsgComposer = new MsgComposer();
        this.NotificationPrvdr = new NotificationProvider();
        this.PasswordPrvdr = new PasswordProvider();
        this.TOTPPrvdr = authLib.totp({ issuer: "MyCompany" });
        this.PINPrvdr = new PINProvider();
    }
    Object.defineProperty(AuthImplementation.prototype, "MFATracking", {
        get: function () { return this.MFATrackingImpl; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "NotificationProvider", {
        get: function () { return this.NotificationPrvdr; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "TOTPCodeDeliveryMsgComposer", {
        get: function () { return this.MsgComposer; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "PasswordProvider", {
        get: function () { return this.PasswordPrvdr; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "TOTPProvider", {
        get: function () { return this.TOTPPrvdr; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "PINProvider", {
        get: function () { return this.PINPrvdr; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "SmartCardProvider", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "FingerprintProvider", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "IrisScanProvider", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "VoiceProvider", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    AuthImplementation.prototype.lookupUser = function (Username) {
        var info = UsersTable[Username];
        return info ? Promise.resolve(info) : Promise.reject({ error: "not-found", error_description: "user not found" });
    };
    return AuthImplementation;
}());
var authStack = authLib.stack(new AuthImplementation());
var passcode = null;
authStack.on("totp-passcode-generated", function (UserMFAInfo, TOTPCode) {
    console.log("passcode " + TOTPCode + " generated for user " + UserMFAInfo.Username);
    passcode = TOTPCode;
});
authStack.authenticatePassword({ Username: "wchang28@hotmail.com" }, "76t324!@78")
    .then(function (result) {
    console.log("");
    console.log("After factor 1 authentication:");
    console.log(JSON.stringify(result, null, 2));
    return authStack.authenticateTOTP({ PrevMFATrackingId: result.MFAAuthStatus.TrackingId }, passcode);
}).then(function (result) {
    console.log("");
    console.log("After factor 2 authentication:");
    console.log(JSON.stringify(result, null, 2));
    return authStack.authenticatePIN({ PrevMFATrackingId: result.MFAAuthStatus.TrackingId }, "7743");
}).then(function (result) {
    console.log("");
    console.log("After factor 3 authentication:");
    console.log(JSON.stringify(result, null, 2));
    return authStack.AuthenticationImplementation.TOTPProvider.generateURI(UsersTable["wchang28@hotmail.com"], true);
}).then(function (uri) {
    console.log("");
    console.log("TOTP Uri=\n" + uri);
}).catch(function (err) {
    console.error("!!! Error: " + JSON.stringify(err));
});
//# sourceMappingURL=test.js.map