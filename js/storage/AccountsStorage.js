(function () {
    "use strict";

    var BasicStorage = require('./BasicStorage'),
        utils = require('../utils'),
        logger = utils.logger;

    var AccountsStorage = function (accountsCollection) {
        this.super.apply(this, arguments);
        this.collection = accountsCollection;
        this.tableName = 'accounts';
        this.createEngine();
        return this;
    };

    utils.inherits(AccountsStorage, BasicStorage);

    /**
     * Gets available accounts from storage
     * @returns {Promise}
     */
    AccountsStorage.prototype.getAccounts = function (iterator) {
        return this.engine.iterate(iterator).catch(function (error) {
            logger.error('failed to retrieve accounts from storage', error);
            throw error;
        });
    };

    /**
     * Saves current Account to storage
     * @param account Account instance to save
     * @returns {Promise}
     */
    AccountsStorage.prototype.save = function (account) {
        var userData = account.toStorage(),
            id = userData.id;
        return this.engine.getItem(id)
            .then(function (data) {
                var result = data ? BasicStorage.statuses().updated : BasicStorage.statuses().added;
                return this.engine.setItem(id, userData)
                    .then(function () {
                        account.lastStorageAction = result;
                    });
            }.bind(this));
    };

    AccountsStorage.prototype.remove = function (account) {
        return this.engine.removeItem(account.getId());
    };

    module.exports = AccountsStorage;
}());
