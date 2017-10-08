"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OTPAuth = require('otpauth');
var TOTPProvider = /** @class */ (function () {
    function TOTPProvider() {
    }
    TOTPProvider.prototype.factory = function (label, secretHex) {
        var totp = new OTPAuth.TOTP({
            issuer: 'ACME',
            label: 'AzureDiamond',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromB32('NB2W45DFOIZA')
        });
        return totp;
    };
    Object.defineProperty(TOTPProvider.prototype, "Name", {
        get: function () { return "Time-based One-time Password Authentication Provider"; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TOTPProvider.prototype, "CanStoreCredential", {
        get: function () { return false; },
        enumerable: true,
        configurable: true
    });
    TOTPProvider.prototype.authenticate = function (UserMFAInfo, Credential) {
    };
    TOTPProvider.prototype.storeCredential = function (UserIndetifier, Credential) {
        return Promise.reject({ error: "bad-request", error_description: "credential storage not supported by the provider" });
    };
    TOTPProvider.prototype.generateCode = function (UserMFAInfo) {
    };
    TOTPProvider.prototype.generateURI = function (UserMFAInfo, GenQRCode) {
    };
    return TOTPProvider;
}());
exports.TOTPProvider = TOTPProvider;
//# sourceMappingURL=totp-provider.js.map