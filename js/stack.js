"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events = require("events");
var _ = require("lodash");
var defaultOptions = {
    TimeoutMS: 10 * 60 * 1000 // 10 mminutes
};
var MFAAuthenticationStack = /** @class */ (function (_super) {
    __extends(MFAAuthenticationStack, _super);
    function MFAAuthenticationStack(authImpl, options) {
        var _this = _super.call(this) || this;
        _this.authImpl = authImpl;
        options = options || defaultOptions;
        _this.options = _.assignIn({}, defaultOptions, options);
        return _this;
    }
    MFAAuthenticationStack.prototype.emailOTPCode = function (VerifiedEmail, TOTPCode) {
        var _this = this;
        return this.authImpl.TOTPCodeDeliveryMsgComposer.composeEmailMsg(TOTPCode).then(function (Message) { return _this.authImpl.NotificationProvider.sendEmail(VerifiedEmail, Message); });
    };
    MFAAuthenticationStack.prototype.smsOTPCode = function (VerifiedMobilePhoneNumber, TOTPCode) {
        var _this = this;
        return this.authImpl.TOTPCodeDeliveryMsgComposer.composeSMSMsg(TOTPCode).then(function (Message) { return _this.authImpl.NotificationProvider.sendSMS(VerifiedMobilePhoneNumber, Message); });
    };
    MFAAuthenticationStack.prototype.deliverTOTPCode = function (UserMFAInfo) {
        var _this = this;
        var deliveries = [];
        return (this.authImpl.TOTPProvider ? this.authImpl.TOTPProvider.generateCode(UserMFAInfo)
            .then(function (TOTPCode) {
            _this.emit("totp-passcode-generated", UserMFAInfo, TOTPCode);
            var promises = [];
            for (var i in UserMFAInfo.TOTPCodeDeliveryMethods) {
                var TOTPCodeDeliveryMethod = UserMFAInfo.TOTPCodeDeliveryMethods[i];
                if (TOTPCodeDeliveryMethod === "Email" && UserMFAInfo.VerifiedEmail) {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(_this.emailOTPCode(UserMFAInfo.VerifiedEmail, TOTPCode));
                }
                else if (TOTPCodeDeliveryMethod === "SMS" && UserMFAInfo.VerifiedMobilePhoneNumber) {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(_this.smsOTPCode(UserMFAInfo.VerifiedMobilePhoneNumber, TOTPCode));
                }
                else if (TOTPCodeDeliveryMethod === "AuthenticatorAppOrToken") {
                    deliveries.push(TOTPCodeDeliveryMethod);
                    promises.push(Promise.resolve({}));
                }
            }
            return Promise.all(promises);
        }).then(function (value) {
            return deliveries;
        }) : Promise.reject(MFAAuthenticationStack.ERR_NO_PROVIDER));
    };
    MFAAuthenticationStack.prototype.afterAuthenticated = function (MFAAuthStatus, UserMFAInfo) {
        var ret = { MFAAuthStatus: MFAAuthStatus };
        var p = Promise.resolve([]);
        var NextAuthFactor = MFAAuthStatus.CurrAuthFactor + 1;
        if (UserMFAInfo.MFAEnabled && UserMFAInfo.MFAStack && UserMFAInfo.MFAStack.length > 0 && NextAuthFactor < UserMFAInfo.MFAStack.length) {
            ret.MFANext = {
                AuthFactor: NextAuthFactor,
                AuthMethod: UserMFAInfo.MFAStack[NextAuthFactor]
            };
            if (ret.MFANext.AuthMethod === "TOTPCode" && UserMFAInfo.TOTPSecretHex && UserMFAInfo.TOTPCodeDeliveryMethods && UserMFAInfo.TOTPCodeDeliveryMethods.length > 0) {
                p = this.deliverTOTPCode(UserMFAInfo);
            }
        }
        return p.then(function (TOTPCodeDeliveryMethods) {
            if (TOTPCodeDeliveryMethods && TOTPCodeDeliveryMethods.length > 0)
                ret.MFANext.TOTPCodeDeliveryMethods = TOTPCodeDeliveryMethods;
            return ret;
        });
    };
    MFAAuthenticationStack.prototype.automationAuthenticate = function (Username, Password) {
        var _this = this;
        var UserMFAInfo = null;
        return this.authImpl.lookUpUser(Username)
            .then(function (value) {
            UserMFAInfo = value;
            return _this.authImpl.PasswordProvider.authenticate(UserMFAInfo, Password);
        }).then(function () {
            return { Id: UserMFAInfo.Id, Username: UserMFAInfo.Username };
        });
    };
    MFAAuthenticationStack.prototype.authenticate = function (proc, Options, credential) {
        var _this = this;
        var MFATracking = this.authImpl.MFATracking;
        var UserMFAInfo = null;
        var FirstFactor = (Options.PrevMFATrackingId ? false : true);
        return (FirstFactor ? this.authImpl.lookUpUser(Options.Username) : MFATracking.verify(Options.PrevMFATrackingId))
            .then(function (value) {
            UserMFAInfo = value;
            var getProvider = proc.bind(_this);
            var provider = getProvider();
            return (provider ? provider.authenticate(UserMFAInfo, credential) : Promise.reject(MFAAuthenticationStack.ERR_NO_PROVIDER)); // authenticate the credential
        }).then(function () {
            return (FirstFactor ? MFATracking.beginTracking(UserMFAInfo, _this.options.TimeoutMS, Options.AppId) : MFATracking.advanceOneFactor(Options.PrevMFATrackingId));
        }).then(function (MFAAuthStatus) { return _this.afterAuthenticated(MFAAuthStatus, UserMFAInfo); });
    };
    MFAAuthenticationStack.prototype.authenticatePassword = function (Options, Password) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.PasswordProvider; }, Options, Password);
    };
    MFAAuthenticationStack.prototype.authenticateTOTP = function (Options, TOTPCode) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.TOTPProvider; }, Options, TOTPCode);
    };
    MFAAuthenticationStack.prototype.authenticatePIN = function (Options, PIN) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.PINProvider; }, Options, PIN);
    };
    MFAAuthenticationStack.prototype.authenticateSamrtCard = function (Options, SmartCardKey) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.SmartCardProvider; }, Options, SmartCardKey);
    };
    MFAAuthenticationStack.prototype.authenticateFingerprint = function (Options, Fingerprint) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.FingerprintProvider; }, Options, Fingerprint);
    };
    MFAAuthenticationStack.prototype.authenticateIrisScan = function (Options, IrisScan) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.IrisScanProvider; }, Options, IrisScan);
    };
    MFAAuthenticationStack.prototype.authenticateVoice = function (Options, VoiceData) {
        var _this = this;
        return this.authenticate(function () { return _this.authImpl.VoiceProvider; }, Options, VoiceData);
    };
    MFAAuthenticationStack.ERR_NO_PROVIDER = { error: "bad-request", error_description: "no provider support for the authentication method" };
    return MFAAuthenticationStack;
}(events.EventEmitter));
function get(authImpl, options) { return new MFAAuthenticationStack(authImpl, options); }
exports.get = get;
//# sourceMappingURL=stack.js.map