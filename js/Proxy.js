/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

/**
 *
 * @param account
 * @param api
 * @returns {Proxy}
 * @constructor
 */
var Proxy = function (account, api) {
    "use strict";

    if (!Account.prototype.isPrototypeOf(account)) {
        throw new TypeError('Proxy must be created with Account instance as first parameter');
    }

    if (!FT.isObject(api)) {
        throw new TypeError('Proxy must be created with API configuration object as second parameter');
    }

    this.account = account;
    this.token = this.account.getToken();
    this.api = api;

    return this;
};

Proxy.prototype.validateToken = function () {
    "use strict";

    var TOKEN_EXPIRATION_LIMIT = 10,
        TIMEOUT = 10 * 3, // 30 seconds
        INVALID_TOKEN_ERROR = 'invalid_token',
        request = new XMLHttpRequest({mozSystem: true, cache: false}),
        token = this.token,
        self = this;

    request.timeout = Math.pow(TIMEOUT, 4);
    request.open('get', 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token, true);
    request.responseType = 'json';
    request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');

    Logger.info('Proxy for the account id=' + this.account.getId() + ' is going to validate token ' + token);

    return new Promise(function (resolve, reject) {
        request.onload = function () {

            var response = request.response || JSON.parse(request.responseText);

            // TOKEN WAS REVOKED OR EXPIRED. REFRESHING
            if (FT.isDefined(response.error) && response.error === INVALID_TOKEN_ERROR
            /*|| response.expires_in < TOKEN_EXPIRATION_LIMIT*/) {

                Logger.info('Proxy for the account id=' + self.account.getId() + ': token ' + token + ' is invalid. Refreshing...');

                self.account.login(false, true).then(function (accessToken) {
                    Logger.info('Proxy for the account id=' + self.account.getId() + ': token refreshed -> ' + accessToken);
                    self.token = accessToken;
                    resolve(accessToken);
                }).catch(function (e) {
                    Logger.error(e);
                });
                return;
            }
            // WRONG TOKEN
            if (response.audience !== FT.options.client_id) {
                Logger.error('validateToken(): token audience does not match client_id');
                reject(request);
                return;
            }

            Logger.info('Proxy for the account id=' + self.account.getId() + ': token is valid', response);

            resolve(token);
        };
        request.onerror = function () {
            utils.status.show('An error has occurred while validating the token');
            reject(request);
        };
        request.send();
        return request;
    });
};

Proxy.prototype.request = function (method, urlParams, data, responseParser, timeout) {
    "use strict";

    if (!this.api[method]) {
        throw new ReferenceError('Proxy: no API defined for the method: ' + method);
    }

    var _api = this.api[method],
        _reqMethod = _api.method,
        _reqUrl = _api.url,
        _request = new XMLHttpRequest({mozSystem: true, cache: false}),
        _TIMEOUT = timeout || 10,
        _self = this;

    _request.timeout = Math.pow(_TIMEOUT, 4);

    return new Promise(function (resolve, reject) {
        if (!FT.isObject(_api)) {
            throw new Error('Method ' + method + ' is not registered in this proxy.');
        }

        if (!FT.isDefined(_reqMethod) || !FT.isDefined(_reqUrl)) {
            throw new Error('One of the mandatory parameters ("method", "url") is not defined');
        }

        if (FT.isArray(urlParams) && urlParams.length > 0) {
            _reqUrl = _reqUrl.replace(/(\${\d})/gi, function (match) {
                var idx = /\d/gi.exec(match)[0];
                if (FT.isDefined(urlParams[idx])) {
                    return urlParams[idx];
                } else {
                    throw new ReferenceError('Proxy URL parameters replacer: wrong urlParams length or string format');
                }
            });
        }

        _self.validateToken().then(function () {
            _request.open(_reqMethod.toUpperCase(), _reqUrl + '?access_token=' + _self.account.getToken(), true);
            _request.responseType = 'json';
            _request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
            _request.setRequestHeader('Accept', 'application/json, text/javascript, */*');
            _request.onload = function () {
                if (_request.status === 200) {
                    if (FT.isFunction(responseParser)) {
                        resolve(responseParser(_request));
                    }
                    resolve(_request.response || JSON.parse(_request.responseText));
                } else if (_request.status === 204) {
                    resolve(_request);
                } else {
                    reject(_request);
                }
            };
            _request.onerror = function () {
                reject(_request);
            };
            _request.onabort = function () {
                reject(_request);
            };
            _request.send(JSON.stringify(data));
        });
    });
};
