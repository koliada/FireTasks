/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('Account', function () {
	"use strict";

	var account,
		initialToken = mocks.accessToken;

	describe('new()', function () {
		it('should return new Account instance', function () {
			var accountsCollection = new AccountsCollection(FT);
			account = new Account(accountsCollection, FT.apply({}, mocks.userinfo), initialToken);
			return account.should.be.an.instanceOf(Account);
		});
		it('should have properly fulfilled "data" property', function () {
			var data = mocks.userinfo;
			data.token = initialToken;
			return account.data.should.deep.equal(data);
		});
		it('should have "lastStorageAction" property with value of null', function () {
			return should.equal(account.lastStorageAction, null);
		});
		it('should have ListsCollection instance', function () {
			return account.lists.should.be.an.instanceOf(ListsCollection);
		});
		it('should throw an exception when called without parameter', function () {
			return Account.should.throw(TypeError);
		});
	});

	describe('#getToken()', function () {
		it('should return actual access token', function () {
			return account.getToken().should.equal(initialToken);
		});
	});

	describe('#login()', function () {
		var go2_login = GO2.login,
			promise,
			newToken = mocks.newToken;

		before(function () {
			// imitates token retrieving
			GO2.login = function () {
				GO2.onlogin(newToken);
			};
		});
		after(function () {
			GO2.login = go2_login;
		});
		it('should return a promise', function () {
			promise = account.login();
			return promise.should.be.an.instanceOf(Promise);
		});
		it('should re-initialize GO2 with account email', function () {
			var go2Options = GO2._getConfig();
			go2Options.should.be.an('object');
			return go2Options.should.have.property('email', mocks.userinfo.email);
		});
		it('should resolve promise with new access token', function () {
			return promise.should.become(newToken);
		});
	});
});
