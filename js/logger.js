(function () {
    "use strict";


    var l = 0,
        f = function () {};

    function setLevel(level) {
        if (['ERROR', 'WARN', 'INFO'].indexOf(level) === -1) {
            throw ('Logger.setLevel(): wrong logging level, expected values: ERROR|WARNING|INFO');
        }
        switch (level) {
            case 'ERROR':
                l = 1;
                break;
            case 'WARN':
                l = 2;
                break;
            case 'INFO':
                l = 3;
                break;
            default:
                l = 0;
        }
        return l;
    }

    module.exports = {
        log: function () {
            console.log.apply(console, arguments);
        },
        info: function () {
            (l >= 3) ? console.info.apply(console, arguments) : f();
        },
        warn: function () {
            (l >= 2) ? console.warn.apply(console, arguments) : f();
        },
        error: function () {
            var args = arguments[0].stack ? ([arguments, arguments[0].stack]) : arguments;
            (l >= 0) ? console.error.apply(console, args) : f();
        },
        /**
         * Optionally pass string to set logger level: 'ERROR | 'WARN' | 'INFO'
         * @returns {window.console|Number}
         */
        level: function () {
            if (arguments.length > 0) {
                setLevel(arguments[0]);
            } else {
                return l;
            }
        }
    };
}());
