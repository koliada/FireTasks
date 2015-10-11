(function () {
    "use strict";

    var BasicEntity = require('./BasicEntity'),
        BasicStorage = require('../storage/BasicStorage'),
        ListsCollection = require('../collections/ListsCollection'),
        AccountView = require('../views/AccountView'),
        ActiveListManager = require('../ActiveListManager'),
        utils = require('../utils'),
        options = require('../options');

    var Account = function (collection, userData, accessToken) {
        if (!utils.isDefined(userData) || !utils.isDefined(userData.id)) {
            throw new TypeError('userData or user id is not defined');
        }

        if (!userData.token) {
            userData.token = accessToken;
        }

        this.super.apply(this, arguments);

        this.lastStorageAction = null;
        this.lists = new ListsCollection(this);
        this.view = new AccountView(this);
    };

    utils.inherits(Account, BasicEntity);

    Account.prototype.getName = function () {
        return this.get('email');
    };

    /**
     * Checks whether last storage action is "added"
     * @returns {boolean}
     */
    Account.prototype.added = function () {
        return this.lastStorageAction === BasicStorage.statuses().added;
    };

    /**
     * Checks whether last storage action is "updated"
     * @returns {boolean}
     */
    Account.prototype.updated = function () {
        return this.lastStorageAction === BasicStorage.statuses().updated;
    };

    /**
     * Checks whether last storage action is "deleted"
     * @returns {boolean}
     */
    Account.prototype.deleted = function () {
        return this.lastStorageAction === BasicStorage.statuses().deleted;
    };

    Account.prototype.getToken = function () {
        return this.get('token');
    };

    // TODO: set token refresh timeout
    Account.prototype.login = function (forceApprovalPrompt, immediate) {
        var self = this;
        GO2.init(utils.apply(options, {
            email: this.data.email
        }));
        GO2.logout();

        return new Promise(function (resolve, reject) {
            GO2.onlogin = function (accessToken, expiresIn) {
                if (accessToken) {
                    self.data.token = accessToken;
                    self.collection.storage.save(self).then(function () {
                        resolve(accessToken);
                    }).catch(function (e) {
                        reject(e);
                    });
                } else {
                    reject(new Error('login failed'));
                }
            };
            GO2.onImmediateFail = function () {
                GO2.login(false, false);
            };
            GO2.login(forceApprovalPrompt, immediate);
        });
    };

    Account.prototype.toStorage = function () {
        var data = {};
        utils.iterate(this.data, function (value, key) {
            data[key] = value;
        });
        return data;
    };

    Account.prototype.refresh = function () {
        return this.lists.load();
    };

    Account.prototype.remove = function () {
        return this.lists.proxy.revokeToken()
            .then(this.collection.storage.remove.bind(this.collection.storage, this))
            .then(this.lists.storage.destroy.bind(this.lists.storage))
            .then(this.collection.remove.bind(this.collection, this))
            .then(ActiveListManager.list)
            .then(function (list) {
                this.view.destroy();
                if (list.collection === this.lists) {
                    var index = this.getIndex(),
                        account = this.collection.getAt(index - 1) || this.collection.getAt(index + 1);
                    if (account) {
                        return ActiveListManager.list(account.lists.getAt(0));
                    }
                    return Promise.resolve();
                }
            }.bind(this))
            .catch(function (e) {
                console.error('Failed to remove account', arguments);
                throw e;
            });
    };

    module.exports = Account;

}());
