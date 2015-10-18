(function () {
    "use strict";

    var utils = require('./utils');

    var isOnline = false;

    function init() {
        isOnline = window.navigator.onLine;
        window.addEventListener('online', onOnline, false);
        window.addEventListener('offline', onOffline, false);
    }

    function onOnline() {
        utils.logger.info('Application is ONLINE');
        isOnline = true;
        module.exports.onOnline();
    }

    function onOffline() {
        utils.logger.info('Application gone OFFLINE');
        isOnline = false;
        module.exports.onOffline();
    }

    module.exports = {
        init: init,
        onOnline: function () {},
        onOffline: function () {},
        isOnline: function () {
            return isOnline;
        }
    };

    global.ConnectivityManager = module.exports;
    global.ConnectivityManager.set = function (value) { //TODO: debug
        isOnline = Boolean(value);
        if (isOnline) {
            onOnline();
        } else {
            onOffline();
        }
    };

}());
