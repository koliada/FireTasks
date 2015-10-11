/**
 * Interfaces to common actions for testing purposes
 * @type {Object}
 */
var utils = {

    logger: require('./logger'),

    isDefined: function (value) {
        return typeof value !== 'undefined';
    },

    isObject: function (value) {
        return utils.isDefined(value) && Object.prototype.toString.call(value) === "[object Object]";
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
        return !(utils.isObject(obj) && Object.getOwnPropertyNames(obj).length > 0);
    },

    isPlainObject: function (value) {
        return utils.isObject(value) && value.constructor === Object;
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
        if (utils.isObject(object)) {
            for (var key in object) {
                //if (object.hasOwnProperty(key)) {
                //noinspection JSUnfilteredForInLoop
                if (false === callback(object[key], key)) {
                    break;
                }
                //}
            }
        }
    },

    apply: function (target, source, defaults) {
        if (defaults) {
            utils.apply(source, defaults);
        }
        if ((utils.isObject(target) || utils.isElement(target)) && utils.isObject(source)) {
            utils.iterate(source, function (value, key) {
                target[key] = utils.clone(source[key]);
            });
        }
        return target;
    },

    clone: function (v) {
        if (utils.isPlainObject(v)) {
            return utils.apply(Object.create(null), v);
        }
        if (utils.isArray(v)) {
            return v.map(function (item) {
                return utils.clone(item);
            });
        }
        return v;
    },

    generateID: function () {
        // Math.random should be unique because of its seeding algorithm.
        // Convert it to base 36 (numbers + letters), and grab the first 9 characters
        // after the decimal.
        return '_' + Math.random().toString(36).substr(2, 9);
    },

    // update with deep equal
    plainObjectsEqual: function (obj1, obj2) {
        var obj1Keys = Object.keys(obj1),
            obj2Keys = Object.keys(obj2);
        return (obj1Keys.length === obj2Keys.length && Object.keys(obj1).every(function (key) {
            return obj1[key] === obj2[key];
        }));
    },

    //TODO: Clean-up
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
            accounts[id].lists.load().then(function (lists) {
                lists.forEach(function (list) {
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
                return task ? true : false;
            });
        });
        return task;
    },

    inherits: function (obj, prototype) {
        obj.prototype = Object.create(prototype.prototype);
        obj.prototype.constructor = obj;
        obj.prototype.super = prototype;
        obj.prototype.superclass = prototype;
        return this;
    },

    /**
     * @param {Array} promises
     * @returns {Promise<Array>}
     */
    waterfall: function (promises) {
        return new Promise(function (resolve, reject) {
            var results = [];

            function iterator() {
                var promise = promises.shift();
                if (!promise) {
                    resolve(results);
                }
                promise.then(function (data) {
                    results.push(data);
                    return iterator();
                }).catch(reject);
            }

            iterator();
        });
    },

    showInDevelopmentTooltip: function (timeout) {
        timeout = timeout || 1000;
        require('./lib/status').status.show('This feature is in development', timeout);
    },

    vibrate: function () {
        return require('./SettingsManager').get('vibrateOnLongPress')
            .then(function (value) {
                if (window.navigator.vibrate && value) {
                    //noinspection MagicNumberJS,JSCheckFunctionSignatures
                    window.navigator.vibrate(80);
                }
                return Promise.resolve();
            });
    },

    switchCheckbox: function (input) {
        var checked = input.prop('checked');
        input.prop('checked', (checked === false));
        input.change();	// to fire onchange listeners
    },

    isMozActivityAvailable: typeof MozActivity !== 'undefined',

    isFFOS: ("mozApps" in navigator && navigator.userAgent.search("Mobile") != -1),

    version: JSON.parse(require('fs').readFileSync('version.json'))
};

module.exports = utils;
