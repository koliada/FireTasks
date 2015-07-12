/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

if (typeof mocks === 'undefined') {
	mocks = {};
}

mocks.createServer = function(requests, token) {
	"use strict";

	if (!FT.isDefined(requests) || !FT.isDefined(token)) {
		throw new TypeError('requests or token is not defined');
	}

	var responses = {
		tokeninfo: [
			"GET",
			"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + token,
			[200, {"Content-Type": "application/json"}, JSON.stringify(mocks.tokeninfo)]
		],
		userinfo: [
			"GET",
			"https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=" + token,
			[200, {"Content-Type": "application/json"}, JSON.stringify(mocks.userinfo)]
		],
		lists: [
			"GET",
			"https://www.googleapis.com/tasks/v1/users/@me/lists?access_token=" + token,
			[200, {"Content-Type": "application/json"}, JSON.stringify(mocks.lists)]
		],
		tasks: [
			"GET",
			new RegExp('(https://www.googleapis.com/tasks/v1/lists/)(.*)(/tasks\\?access_token=random_string)', 'i'),
			[200, {"Content-Type": "application/json"}, JSON.stringify(mocks.tasks)]
		]
	};

	var server = sinon.fakeServer.create();

	requests.forEach(function(request){
		if (FT.isString(request)) {
			if (responses[request]) {
				server.respondWith.apply(server, responses[request]);
			}
		} else if (FT.isArray(request)) {
			server.respondWith.apply(server, request);
		}
	});

	server.handleRequest = function () {
		sinon.fakeServer.handleRequest.apply(server, arguments);
		server.respond();
	};

	return server;
};
