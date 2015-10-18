(function () {
    "use strict";

    var ConnectivityManager = require('./ConnectivityManager'),
        utils = require('./utils'),
        Logger = utils.logger,
        options = require('./options');

    var retriesCount = 0;
    var MAX_RETRIES_COUNT = 3;
    var runningRequest = null;
    var timeoutMap = [5, 10, 30];

    function getTimeout() {
        return timeoutMap[retriesCount];
    }

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
    };

    Proxy.prototype.validateToken = function () {
        var TOKEN_EXPIRATION_LIMIT = 10,
            TIMEOUT = getTimeout(),
            INVALID_TOKEN_ERROR = 'invalid_token',
            request = new XMLHttpRequest({mozSystem: true, cache: false}),
            token = this.token;

        retriesCount = 0;

        request.timeout = TIMEOUT * 1000;
        request.open('get', 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token, true);
        request.responseType = 'json';
        request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');

        return new Promise(function (resolve, reject) {
            request.onload = function () {

                var response = request.response || JSON.parse(request.responseText);

                // TOKEN WAS REVOKED OR EXPIRED. REFRESHING
                if (utils.isDefined(response.error) && response.error === INVALID_TOKEN_ERROR
                /*|| response.expires_in < TOKEN_EXPIRATION_LIMIT*/) {

                    //Logger.info('Proxy for the account id=' + self.account.getId() + ': token ' + token + ' is invalid. Refreshing...');

                    this.account.login(false, true).then(function (accessToken) {
                        Logger.info('Proxy for the account id=' + this.account.getId() + ': token refreshed -> ' + accessToken);
                        this.token = accessToken;
                        resolve(accessToken);
                    }.bind(this)).catch(function (e) {
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
            }.bind(this);
            request.onerror = function () {
                utils.status.show('An error has occurred while validating the token');
                reject(request);
            };
            request.ontimeout = function () {
                if (retriesCount === MAX_RETRIES_COUNT - 1) {
                    retriesCount = 0;
                    reject('Token validation failed. Request timed out and ' + MAX_RETRIES_COUNT + ' retries didn\'t help');
                    return;
                }
                retriesCount++;
                resolve(this.validateToken.call(this));
            }.bind(this);
            request.send();
            runningRequest = request;
        }.bind(this));
    };

    /**
     * @returns {Promise}
     */
    Proxy.prototype.request = function (method, urlParams, data, responseParser) {
        if (!this.api[method]) {
            throw new ReferenceError('Proxy: no API defined for the method: ' + method);
        }

        var api = this.api[method],
            reqMethod = api.method,
            reqUrl = api.url,
            request = new XMLHttpRequest({mozSystem: true, cache: false}),
            TIMEOUT = getTimeout();

        request.timeout = TIMEOUT * 1000;
        retriesCount = 0;

        if (!utils.isObject(api)) {
            throw new Error('Method ' + method + ' is not registered in this proxy.');
        }

        if (!utils.isDefined(reqMethod) || !utils.isDefined(reqUrl)) {
            throw new Error('One of the mandatory parameters ("method", "url") is not defined');
        }

        if (utils.isArray(urlParams) && urlParams.length > 0) {
            reqUrl = reqUrl.replace(/(\{\d})/gi, function (match) {
                var idx = /\d/gi.exec(match)[0];
                if (utils.isDefined(urlParams[idx])) {
                    return urlParams[idx] || '';
                } else {
                    throw new ReferenceError('Proxy URL parameters replacer: wrong urlParams length or string format');
                }
            });
        }

        return new Promise(function (resolve, reject) {
            this.validateToken().then(function () {
                request.open(reqMethod.toUpperCase(), reqUrl, true); //TODO more intellectual arguments appending
                request.responseType = 'json';
                request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
                request.setRequestHeader('Accept', 'application/json, text/javascript, */*');
                request.setRequestHeader('Authorization', 'Bearer ' + this.account.getToken());
                request.onload = function () {
                    switch (request.status) {
                        case 200:
                            if (utils.isFunction(responseParser)) {
                                resolve(responseParser(request));
                            }
                            resolve(request.response || JSON.parse(request.responseText));
                            break;
                        case 204:
                            resolve(request);
                            break;
                        case 404:
                            reject(new Proxy.RequestError(Proxy.ERROR_CODES.NOT_FOUND, request.response.error));
                            break;
                        default:
                            reject(request);
                    }
                };
                request.onerror = function () {
                    reject(request);
                };
                request.onabort = function () {
                    reject(request);
                };
                request.ontimeout = function () {
                    if (retriesCount === MAX_RETRIES_COUNT - 1) {
                        retriesCount = 0;
                        reject('Request timed out and ' + MAX_RETRIES_COUNT + ' retries didn\'t help');
                        return;
                    }
                    retriesCount++;
                    resolve(this.request(method, urlParams, data, responseParser));
                }.bind(this);
                request.send(JSON.stringify(data));
                runningRequest = request;
            }.bind(this));
        }.bind(this));
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

    //TODO: try to move to #request
    /**
     * @static
     * @param {String} accessToken
     * @returns {Promise<Object>}
     */
    Proxy.getUserInfo = function (accessToken) {
        var TIMEOUT = getTimeout();

        // We can't use Proxy here because we don't have account on this point yet
        // It should retry login with 'immediate' flag if userinfo request fails
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest({mozSystem: true, cache: false});
            request.timeout = TIMEOUT * 1000;
            request.open('get', 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + accessToken, true);
            request.responseType = 'json';
            request.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
            request.onload = function () {
                resolve(request.response || JSON.parse(request.responseText));
            };
            request.onerror = reject;
            request.ontimeout = function () {
                if (retriesCount === MAX_RETRIES_COUNT - 1) {
                    retriesCount = 0;
                    reject('User info retrieving failed. Request timed out and ' + MAX_RETRIES_COUNT + ' retries didn\'t help');
                    return;
                }
                retriesCount++;
                resolve(Proxy.getUserInfo(accessToken));
            };
            request.send();
            runningRequest = request;
        });
    };

    Proxy.RequestError = function (code, message) {
        this.name = 'RequestError';
        this.code = code;
        this.message = message;
    };

    utils.inherits(Proxy.RequestError, Error);

    Proxy.ERROR_CODES = {
        NOT_FOUND: '404'
    };
    Object.freeze(Proxy.ERROR_CODES);

    ConnectivityManager.onOffline = function () {
        runningRequest && runningRequest.readyState !== 4 && runningRequest.abort();
    };

    module.exports = Proxy;
}());
