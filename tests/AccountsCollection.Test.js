/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('AccountsCollection', function () {
	"use strict";

	var app = FT;

	describe('new()', function () {
		it('should return new AccountCollection instance', function () {
			app.accounts = new AccountsCollection(app);
			return app.accounts.should.be.instanceOf(AccountsCollection);
		});
		it('should have link to the app', function () {
			return app.accounts.app.should.equal(app);
		});
		it('should have empty "data" object', function () {
			app.accounts.data.should.be.an('object');
			return app.accounts.data.should.be.empty;
		});
		it('should have AccountsStorage instance', function () {
			return app.accounts.storage.should.be.instanceOf(AccountsStorage);
		});
		it('should initialize GO2 for initial login', function () {
			return app.accounts.go2Initialized.should.be.true;
		});
		it('should throw an exception when called without parameter', function () {
			return AccountsCollection.should.throw(TypeError);
		});
	});

	//describe('#getAccounts', function () {
	//	var promise;
	//	it('should return a promise', function () {
	//		promise = app.accounts.storage.getAccounts();
	//		return promise.should.be.instanceOf(Promise);
	//	});
	//	it('should resolve promise with Account instances (empty)', function () {
	//		return promise.should.eventually.be.an('object');
	//	});
	//});

	describe('#add()', function () {
		var promise,
			go2_login = GO2.login,
			mock = mocks.userinfo,
			id = mock.id,
			token = mocks.accessToken,
			account;

		before(function () {
			// imitates token retrieving
			GO2.login = function () {
				GO2.onlogin(mocks.accessToken);
			};
			// Fake server
			this.server = mocks.createServer(['tokeninfo', 'userinfo', 'lists', 'tasks'], token);
		});
		it('should return a promise', function () {
			promise = app.accounts.add();
			return promise.should.be.instanceOf(Promise);
		});
		it('should resolve promise with new Account instance', function () {
			return promise.should.eventually.be.instanceOf(Account);
		});
		it('should add new account to the AccountsCollection', function () {
			account = app.accounts.data[id];
			return account.should.be.instanceOf(Account);
		});
		after(function (done) {
			GO2.login = go2_login;
			this.server.restore();
			return app.accounts.storage.remove(account).then(done);
		});
	});
});
