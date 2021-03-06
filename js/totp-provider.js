"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var OTPAuth = require('otpauth');
var QRCode = require("qrcode");
var defaultOptions = {
    issuer: "ACME",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    window: 10
};
var TOTPProvider = /** @class */ (function () {
    function TOTPProvider(options) {
        options = options || defaultOptions;
        this.options = _.assignIn({}, defaultOptions, options);
    }
    TOTPProvider.prototype.factory = function (label, secretHex) {
        var totp = new OTPAuth.TOTP({
            issuer: this.options.issuer,
            label: label,
            algorithm: this.options.algorithm,
            digits: this.options.digits,
            period: this.options.period,
            secret: OTPAuth.Secret.fromHex(secretHex)
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
        var delta = this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).validate({ token: Credential, window: this.options.window });
        return delta != null ? Promise.resolve() : Promise.reject({ error: "unauthorized", error_description: "invalid or expired passcode" });
    };
    TOTPProvider.prototype.storeCredential = function (UserIndetifier, Credential) {
        return Promise.reject({ error: "bad-request", error_description: "credential storage not supported by the provider" });
    };
    TOTPProvider.prototype.generateCode = function (UserMFAInfo) {
        return Promise.resolve(this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).generate());
    };
    TOTPProvider.prototype.toQRUri = function (text) {
        return new Promise(function (resolve, reject) {
            QRCode.toDataURL(text, function (err, url) {
                if (err)
                    reject(err);
                else
                    resolve(url);
            });
        });
    };
    TOTPProvider.prototype.generateURI = function (UserMFAInfo, GenQRCode) {
        var uri = this.factory(UserMFAInfo.Username, UserMFAInfo.TOTPSecretHex).toString();
        return (GenQRCode ? this.toQRUri(uri) : Promise.resolve(uri));
    };
    TOTPProvider.prototype.toJSON = function () {
        return {
            Name: this.Name,
            CanStoreCredential: this.CanStoreCredential,
            Options: this.options
        };
    };
    return TOTPProvider;
}());
function get(options) { return new TOTPProvider(options); }
exports.get = get;
//# sourceMappingURL=totp-provider.js.map