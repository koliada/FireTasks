(function () {
    "use strict";

    var SettingsManager = require('./SettingsManager');

    //TODO: migrate to settings API, currently uses old implementation

    var _activeMode = null,
        _modes = {
            myOrder: 'MY-ORDER',
            alphabetical: 'ALPHABETICAL',
            dueDate: 'DUE-DATE'
        },
        _sortModeStorageKey = 'tasksSortMode';

    function _init() {
        return _populateCache().then(_set);
    }

    function _populateCache() {
        return SettingsManager.get(_sortModeStorageKey)
            .then(function (value) {
                _activeMode = value;
                Promise.resolve(_activeMode);
            });
    }

    function _save(value) {
        return SettingsManager.set(_sortModeStorageKey, value).then(function () {
            _activeMode = value;
            console.log('TaskListSortModeManager#set: ' + _activeMode);
            Promise.resolve(_activeMode);
        });
    }

    function _set(value) {
        if (typeof value === 'undefined') {
            value = _get();
            if (value === null || typeof value === 'undefined') {
                return _save(_modes.myOrder);
            }
        } else {
            var present = false;
            for (var mode in _modes) {
                if (!_modes.hasOwnProperty(mode)) continue;
                if (_modes[mode] === value) {
                    present = true;
                    break;
                }
            }
            if (!present) {
                throw "Unrecognized sorting mode passed, expected values: MY-ORDER|ALPHABETICAL|DUE-DATE";
            }
            return _save(value);
        }
    }

    function _get() {
        return _activeMode;
    }

    module.exports = {
        init: _init,
        set: _set,
        get: _get,

        /**
         * Returns object with pre-defined sort types
         * @returns {{myOrder: string, alphabetical: string, dueDate: string}}
         */
        getSortModes: function () {
            return _modes;
        },

        isMyOrder: function () {
            return this.get() === _modes.myOrder;
        },

        isAlphabetical: function () {
            return this.get() === _modes.alphabetical;
        },

        isDueDate: function () {
            return this.get() === _modes.dueDate;
        }
    };
}());
