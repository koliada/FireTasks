(function () {
    "use strict";

    var utils = require('./utils'),
        Logger = utils.logger,
        options = require('./options');

    /**
     *
     * @param account
     * @param api
     * @returns {Proxy}
     * @constructor
     */
    var Proxy = function (account, api) {

        if (!utils.isObject(api)) {
            throw new TypeError('Proxy must be created with API configuration object as second parameter');
        }

        this.account = account;
        this.token = this.account.getToken();
        this.api = api;

        return this;
    };

    Proxy.prototype.validateToken = function () {
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

        //Logger.info('Proxy for the account id=' + this.account.getId() + ' is going to validate token ' + token);

        return new Promise(function (resolve, reject) {
            request.onload = function () {

                var response = request.response || JSON.parse(request.responseText);

                // TOKEN WAS REVOKED OR EXPIRED. REFRESHING
                if (utils.isDefined(response.error) && response.error === INVALID_TOKEN_ERROR
                /*|| response.expires_in < TOKEN_EXPIRATION_LIMIT*/) {

                    //Logger.info('Proxy for the account id=' + self.account.getId() + ': token ' + token + ' is invalid. Refreshing...');

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
                if (response.audience !== options.client_id) {
                    Logger.error('validateToken(): token audience does not match client_id');
                    reject(request);
                    return;
                }

                //Logger.info('Proxy for the account id=' + self.account.getId() + ': token is valid', response);

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

    /**
     * @returns {Promise}
     */
    Proxy.prototype.request = function (method, urlParams, data, responseParser, timeout) {
        if (!this.api[method]) {
            throw new ReferenceError('Proxy: no API defined for the method: ' + method);
        }

        var _api = this.api[method],
            _reqMethod = _api.method,
            _reqUrl = _api.url,
            _request = new XMLHttpRequest({mozSystem: true, cache: false}),
            _TIMEOUT = timeout || 30,
            _self = this;

        _request.timeout = Math.pow(_TIMEOUT, 4);

        return new Promise(function (resolve, reject) {
            if (!utils.isObject(_api)) {
                throw new Error('Method ' + method + ' is not registered in this proxy.');
            }

            if (!utils.isDefined(_reqMethod) || !utils.isDefined(_reqUrl)) {
                throw new Error('One of the mandatory parameters ("method", "url") is not defined');
            }

            if (utils.isArray(urlParams) && urlParams.length > 0) {
                _reqUrl = _reqUrl.replace(/(\{\d})/gi, function (match) {
                    var idx = /\d/gi.exec(match)[0];
                    if (utils.isDefined(urlParams[idx])) {
                        return urlParams[idx] || '';
                    } else {
                        throw new ReferenceError('Proxy URL parameters replacer: wrong urlParams length or string format');
                    }
                });
            }

            _self.validateToken().then(function () {
                _request.open(_reqMethod.toUpperCase(), _reqUrl, true); //TODO more intellectual arguments appending
                _request.responseType = 'json';
                _request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
                _request.setRequestHeader('Accept', 'application/json, text/javascript, */*');
                _request.setRequestHeader('Authorization', 'Bearer ' + _self.account.getToken());
                _request.onload = function () {
                    if (_request.status === 200) {
                        if (utils.isFunction(responseParser)) {
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

    /**
     * This method was meant to revoke permissions given to the app.
     * It works, but not for Firefox OS certified app because of JSON-P ({@link https://developer.mozilla.org/en-US/Apps/Build/Building_apps_for_Firefox_OS/CSP}).
     * @see 'Revoking a token' @ {@link https://developers.google.com/identity/protocols/OAuth2WebServer?hl=en}
     * @returns {Promise}
     */
    Proxy.prototype.revokeToken = function () {

        return Promise.resolve();

        return new Promise(function (resolve, reject) {

            var PROXY_URL = 'https://cors.5apps.com/?uri=',
                ENDPOINT = 'https://accounts.google.com/o/oauth2/revoke?token=';

            //if (utils.isFFOS) {
            //    resolve();
            //    return;
            //}

            this.validateToken()
                .then(function () {

                    var TIMEOUT = 10 * 3, // 30 seconds
                        request = new XMLHttpRequest({mozSystem: true, cache: false});

                    request.timeout = Math.pow(TIMEOUT, 4);
                    request.open('get', PROXY_URL + ENDPOINT + this.account.getToken(), true);
                    request.responseType = 'json';
                    //request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
                    //request.setRequestHeader('Authorization', 'Bearer ' + this.account.getToken());
                    request.onload = function (data) {
                        resolve(data);
                    };
                    request.onerror = function (e) {
                        console.error('JSONP failed', e);
                        reject(request);
                    };
                    request.send();
                    return request;

                    // JSONP implementation, 'cause we're here for reinventing the wheel, you know
                    //var cbName = utils.generateID();
                    //window[cbName] = function (data) {
                    //    resolve(data);
                    //    delete window[cbName];
                    //};
                    //
                    //function removeEl() {
                    //    if (scriptEl && scriptEl.parentNode) {
                    //        scriptEl.parentNode.removeChild(scriptEl);
                    //    }
                    //}
                    //
                    //var scriptEl = document.createElement('script');
                    //scriptEl.async = true;
                    //scriptEl.onerror = function (ex) {
                    //    console.error('JSONP failed', ex);
                    //    removeEl();
                    //    reject(ex);
                    //};
                    //scriptEl.onload = removeEl;
                    //scriptEl.setAttribute('src', PROXY_URL + ENDPOINT + this.account.getToken() + '&callback=' + cbName);
                    //document.body.appendChild(scriptEl);
                }.bind(this));
        }.bind(this));
    };

    /**
     * @static
     * @param {String} accessToken
     * @returns {Promise<Object>}
     */
    Proxy.getUserInfo = function (accessToken) {
        var TIMEOUT = 10;

        // We can't use Proxy here because we don't have account on this point yet
        // It should retry login with 'immediate' flag if userinfo request fails
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest({mozSystem: true, cache: false});
            request.timeout = Math.pow(TIMEOUT, 4);
            request.open('get', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken, true);
            request.responseType = 'json';
            request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
            request.onload = function () {
                resolve(request.response || JSON.parse(request.responseText));
            };
            request.onerror = reject;
            request.send();
            return request;
        });
    };

    module.exports = Proxy;
}());
