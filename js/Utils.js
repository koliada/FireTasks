/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var Logger = (function() {
    "use strict";

    var l = 0,
        f = function(){};

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

    return {
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
    }
}());

var FT = {
    isDefined: function (value) {
        return typeof value !== 'undefined';
    },

    isObject: function (value) {
        return FT.isDefined(value) && Object.prototype.toString.call(value) === "[object Object]";
    },

    isString: function (value) {
        return typeof value === 'string';
    },

    isArray: function (value) {
        return Array.isArray(value);
    },

    isFunction: function (value) {
        return typeof value === 'function';
    },

    isNumber: function (value) {
        return typeof value === 'number';
    },

    isEmptyObject: function (obj) {
        return !(FT.isObject(obj) && Object.getOwnPropertyNames(obj).length > 0);
    },

    isEmptyString: function (value) {
        return typeof value === 'string' && value.trim() === '';
    },

    isElement: function (value) {
        return value ? value.nodeType === 1 : false;
    },

    isBoolean: function (value) {
        return typeof value === 'boolean';
    },

    iterate: function (object, callback) {
        if (FT.isObject(object)) {
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    if (false === callback(object[key], key)) {
                        break;
                    }
                }
            }
        }
    },

    apply: function (target, source, defaults) {
        if (defaults) {
            FT.apply(source, defaults);
        }
        if ((FT.isObject(target) || FT.isElement(target)) && FT.isObject(source)) {
            FT.iterate(source, function (value, key) {
                target[key] = source[key];
            });
        }
        return target;
    },

    generateID: function () {
        // Math.random should be unique because of its seeding algorithm.
        // Convert it to base 36 (numbers + letters), and grab the first 9 characters
        // after the decimal.
        return '_' + Math.random().toString(36).substr(2, 9);
    }
};

/**
 * Interfaces to common actions for testing purposes
 * @type {Object}
 */
FT.utils = {

    clearAccounts: function () {
        "use strict";
        FT.accounts.storage.createEngine();
        return FT.accounts.storage.engine.clear();
    },

    removeDataBases: function (value) {
        "use strict";
        if (value) {
            indexedDB.deleteDatabase(value);
        }
        indexedDB.deleteDatabase('accounts');
        indexedDB.deleteDatabase('lists');
        indexedDB.deleteDatabase('104743623482833722064');
        indexedDB.deleteDatabase('106868997309245631965');
    },

    getAccounts: function () {
        "use strict";
        return FT.accounts.getAccounts();
    },

    loadLists: function () {
        "use strict";
        return FT.accounts.storage.getAccounts().then(function (accounts) {
            var id = Object.keys(accounts)[0];
            accounts[id].lists.load();
        });
    },

    removeList: function (listId) {
        "use strict";
        return FT.accounts.storage.getAccounts().then(function (accounts) {
            var id = Object.keys(accounts)[0];
            return accounts[id].lists.storage.remove(listId);
        });
    },

    loadTasks: function () {
        "use strict";
        return FT.accounts.storage.getAccounts().then(function (accounts) {
            var id = Object.keys(accounts)[0];
            accounts[id].lists.load().then(function(lists){
                lists.forEach(function(list) {
                    list.tasks.load();
                });
            });
        });
    },

    getTask: function (id) {
        "use strict";
        var task = null;
        FT.accounts.data.some(function (account) {
            return account.lists.data.some(function (list) {
                task = list.tasks.findById(id);
                return task ? true: false;
            });
        });
        return task;
    }
};
