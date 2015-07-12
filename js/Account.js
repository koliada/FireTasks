/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

(function (scope) {
    "use strict";

    var Account = function (collection, userData, accessToken) {

        if (!AccountsCollection.prototype.isPrototypeOf(collection)) {
            throw new TypeError('Account must be created with AccountsCollection instance as first parameter');
        }

        if (!FT.isDefined(userData) || !FT.isDefined(userData.id)) {
            throw new TypeError('userData or user id is not defined');
        }

        if (!userData.token) {
            userData.token = accessToken;
        }

        BasicEntity.apply(this, arguments);

        this.lastStorageAction = null;
        this.lists = new ListsCollection(this);
        this.view = new AccountView(this/*, ViewManager.getListsContainer()*/);

        //this.view.add();

        return this;
    };

    Account.prototype = Object.create(BasicEntity.prototype);
    Account.prototype.constructor = Account;

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
        GO2.init(FT.apply(FT.options, {
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
        FT.iterate(this.data, function (value, key) {
            //data[key] = ko.unwrap(value);
            data[key] = value;
        });
        return data;
    };

    Account.prototype.refresh = function () {
        return this.lists.load()
            .then(this.lists.loadTasks.bind(this.lists));
    };

    scope.Account = Account;

}(window));
