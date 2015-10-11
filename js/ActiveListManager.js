var ActiveListManager = (function () {
    "use strict";

    var localforage = require('localforage'),
        AccountsCollection = require('./collections/AccountsCollection'),
        constants = require('./constants');

    /**
     * Stores active list
     * Must not be modified directly, use {@link _updateActiveList} instead
     * @type {List|null}
     * @private
     */
    var _activeList = null,
        _STORAGE_KEY = 'lastActiveList';

    /**
     * Toggles active list to the new one
     * @param {List} list
     * @returns {List|null}
     * @private
     */
    function _updateActiveList(list) {
        console.time('updateActiveList');
        if (_activeList) {
            _activeList.selected(false);
        }
        _activeList = list;
        _activeList.selected(true);
        _activeList.view.renderTasks();
        constants.ACTIVE_LIST_TITLE_ELEMENT.innerHTML = _activeList.getName();
        console.timeEnd('updateActiveList');
        return _activeList;
    }

    /**
     * Can consume pure list data as well as List instance
     * @param {Object|List} list
     * @returns {Promise.<List>}
     */
    function setActiveList(list) {
        return new Promise(function (resolve, reject) {
            localforage.setItem(_STORAGE_KEY, list.toStorage(true)).then(function (list) {
                resolve(_updateActiveList(AccountsCollection.findList(list)));
            }).catch(function (e) {
                reject(e);
            })
        });
    }

    function _getLastActiveList() {
        return new Promise(function (resolve, reject) {
            localforage.getItem(_STORAGE_KEY).then(function (list) {
                list = AccountsCollection.findList(list);
                if (!list) {
                    setActiveList(AccountsCollection.getFirstList()).then(resolve, reject);
                } else {
                    resolve(_updateActiveList(list));
                }
            });
        });
    }

    function _findNearestList(list) {
        var index = list.getIndex();
        return list.collection.getAt(index - 1) || list.collection.getAt(index + 1);
    }

    function _checkDestroyedList(list) {
        if (list === _activeList) {
            return setActiveList(_findNearestList(list));
        }
        return Promise.resolve();
    }

    function _init() {
        return _getLastActiveList();
    }

    module.exports = {
        init: _init,

        /**
         * Get/set active list
         * @param {List} [list]
         * @returns {Promise.<List>}
         */
        list: function (list) {
            if (list) {
                //if (!List.prototype.isPrototypeOf(list)) {
                //    throw new TypeError('ActiveListManager: given argument is not a List instance');
                //}
                return setActiveList(list);
            } else {
                return Promise.resolve(_activeList);
            }
        },

        checkDestroyedList: _checkDestroyedList
    };

}());
