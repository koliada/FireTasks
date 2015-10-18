(function () {
    "use strict";

    var utils = require('../utils'),
        BasicStorage = require('./BasicStorage'),
        SettingsStorage = function (settingsManager) {

            BasicStorage.apply(this, arguments);
            this.settingsManager = settingsManager;
            this.tableName = 'settings';
            this.createEngine();
            return this;
        };

    utils.inherits(SettingsStorage, BasicStorage);


    SettingsStorage.prototype.save = function (settingName, data) {
        return this.engine.setItem(settingName, data);
    };

    SettingsStorage.prototype.get = function (settingName) {
        return this.engine.getItem(settingName)
            .then(function (settings) {
                return settings || Object.create(null);
            });
    };
    SettingsStorage.prototype.remove = function (settingName) {
        return this.engine.removeItem(settingName);
    };
    module.exports = SettingsStorage;
}());
