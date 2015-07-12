/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

var AccountsStorage = function (accountsCollection) {
	"use strict";

	if (!AccountsCollection.prototype.isPrototypeOf(accountsCollection)) {
		throw new TypeError('AccountsStorage must be created with AccountsCollection instance as a parameter');
	}

	BasicStorage.apply(this, arguments);
	this.collection = accountsCollection;
	this.tableName = 'accounts';
	this.createEngine();

	return this;
};

AccountsStorage.prototype = Object.create(BasicStorage.prototype);
AccountsStorage.prototype.constructor = AccountsStorage;

/**
 * Gets available accounts from storage
 * @returns {Promise}
 */
AccountsStorage.prototype.getAccounts = function () {
	"use strict";

	var self = this;
	//self.collection.empty();
	return new Promise(function (resolve, reject) {
		self.engine.iterate(function (value, key) {
			self.collection.data.push(new Account(self.collection, value));
		}).then(function () {
			resolve(self.collection.data);
		}).catch(function (error) {
			Logger.error('failed to retrieve accounts from storage', error);
			reject(error);
		});
	});
};

/**
 * Saves current Account to storage
 * @param account Account instance to save
 * @returns {Promise}
 */
AccountsStorage.prototype.save = function (account) {
	"use strict";

	if (!Account.prototype.isPrototypeOf(account)) {
		throw new TypeError('account is not an Account instance');
	}

	var userData = account.toStorage(),
		id = userData.id,
		self = this;
	return new Promise(function (resolve, reject) {
		self.engine.getItem(id).then(function (data) {
			var result = data ? BasicStorage.statuses().updated : BasicStorage.statuses().added;
			self.engine.setItem(id, userData).then(function (data) {
				account.lastStorageAction = result;
				resolve(data);
			}).catch(reject);
		}).catch(reject);
	});
};

AccountsStorage.prototype.remove = function (account) {
	"use strict";

	if (!Account.prototype.isPrototypeOf(account)) {
		throw new TypeError('account is not an Account instance');
	}

	var id = account.data.id,
		self = this;
	return new Promise(function (resolve, reject) {
		self.engine.removeItem(id).then(resolve).catch(reject);
	});
};
