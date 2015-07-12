/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

describe('Proxy', function () {
	"use strict";

	var account,
		proxy,
		promise,
		token = mocks.accessToken,
		newToken = mocks.newToken,
		api = {
			get: {
				method: 'GET',
				url: 'http://api.firetasks.com/get'
			}
		};

	describe('new()', function () {
		it('should return new Proxy instance', function () {
			var accountsCollection = new AccountsCollection(FT);
			account = new Account(accountsCollection, FT.apply({}, mocks.userinfo), token);
			proxy = new Proxy(account, api);
			return proxy.should.be.an.instanceOf(Proxy);
		});
		it('should have link to the account', function () {
			return proxy.account.should.equal(account);
		});
		it('should have link to the actual token', function () {
			return proxy.token.should.equal(mocks.accessToken);
		});
		it('should have api config object', function () {
			return proxy.api.should.be.an('object')
				.and.equal(api);
		});
		it('should throw an exception when called without Account instance as a parameter or without api config object', function () {
			return ListsCollection.should.throw(TypeError);
		});
	});

	describe('#validateToken()', function () {
		describe('valid', function () {
			before(function () {
				this.server = mocks.createServer(['tokeninfo'], token);
			});
			after(function () {
				this.server.restore();
			});
			it('should return a promise', function () {
				promise = proxy.validateToken();
				return promise.should.be.instanceOf(Promise);
			});
			it('should resolve promise with same token', function () {
				return promise.should.eventually.equal(token);
			});
		});

		describe('invalid', function () {
			var tokeninfo = mocks.tokeninfo,
				go2_login = GO2.login;

			before(function () {
				// overriding default answers
				mocks.tokeninfo = mocks.tokeninfo_invalid;
				GO2.login = function () {
					GO2.onlogin(newToken);
				};
				this.server = mocks.createServer(['tokeninfo'], token);
			});
			after(function () {
				// restoring defaults
				GO2.login = go2_login;
				mocks.tokeninfo = tokeninfo;
				this.server.restore();
			});
			it('should return a promise', function () {
				promise = proxy.validateToken();
				return promise.should.be.instanceOf(Promise);
			});
			it('should resolve promise with new token if one has expired', function () {
				return promise.should.eventually.equal(newToken);
			});
			it('should update "token" property with new token', function () {
				return proxy.token.should.equal(newToken);
			});
		});
	});

	describe('#request()', function () {
		var method = Object.keys(api)[0],
			response = {
				test: 'Nope, Half-Life 3 is not out yet :('
			};

		before(function () {
			this.server = mocks.createServer(['tokeninfo', [
					api[method].method,
					api[method].url + "?access_token=" + newToken,
					[200, {"Content-Type": "application/json"}, JSON.stringify(response)]
				]],
				newToken);
		});
		after(function () {
			this.server.restore();
		});

		it('should return a promise', function () {
			promise = proxy.request(method);
			return promise.should.be.instanceOf(Promise);
		});
		it('should resolve promise with new data', function () {
			return promise.should.eventually.deep.equal(response);
		});
	});
});
