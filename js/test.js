"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var authLib = require("./");
var totp = require("./totp-provider");
var Userdb = {
    "wchang28@hotmail.com": {
        Id: "854735894564246468",
        Username: "wchang28@hotmail.com",
        VerifiedEmail: "wchang28@hotmail.com",
        VerifiedMobilePhoneNumber: "",
        MFAEnabled: true,
        MFAStack: ["Password", "TOTPCode"],
        TOTPSecretHex: "76596465AC8B8756",
        TOTPCodeDeliveryMethods: ["Email", "SMS", "AuthenticatorAppOrToken"],
        Password: "76t324!@78"
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
        var info = Userdb[UserMFAInfo.Username];
        return (info && info.Password === Credential ? Promise.resolve() : Promise.reject({ error: "unauthorized", error_description: "invalid ore bad password" }));
    };
    PasswordProvider.prototype.storeCredential = function (UserIndetifier, Credential) {
        return Promise.reject({ error: "bad-request", error_description: "credential storage not supported by the provider" });
    };
    return PasswordProvider;
}());
var AuthImplementation = /** @class */ (function () {
    function AuthImplementation() {
    }
    Object.defineProperty(AuthImplementation.prototype, "MFATracking", {
        get: function () { return new MFATrackingImpl(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "NotificationProvider", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "OTPCodeDeliveryMsgComposer", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "PasswordProvider", {
        get: function () { return new PasswordProvider(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "TOTPProvider", {
        get: function () { return new totp.TOTPProvider(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AuthImplementation.prototype, "PINProvider", {
        get: function () { return null; },
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
    AuthImplementation.prototype.lookUpUser = function (Username) {
        var info = Userdb[Username];
        return info ? Promise.resolve(info) : Promise.reject({ error: "not-found", error_description: "user not found on the system" });
    };
    return AuthImplementation;
}());
var statck = new authLib.MFAAuthenticationStack(new AuthImplementation());
statck.authenticatePassword({ Username: "wchang28@hotmail.com" }, "76t324!@78")
    .then(function (result) {
    console.log(JSON.stringify(result, null, 2));
}).catch(function (err) {
    console.error("!!! Error: " + JSON.stringify(err));
});
//# sourceMappingURL=test.js.map