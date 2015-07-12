/*
 * Alexei Koliada 2014.
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/deed.en_US
 */

if (typeof mocks === 'undefined') {
	mocks = {};
}

mocks.tokeninfo = {
	access_type: "online",
	audience: "478318582842-6rkd630981kdibb868512f5cll4eg1tj.apps.googleusercontent.com",
	email: "alex.fiator@gmail.com",
	expires_in: 3600,
	issued_to: "478318582842-6rkd630981kdibb868512f5cll4eg1tj.apps.googleusercontent.com",
	scope: "https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/plus.me",
	user_id: "104743623482833722064",
	verified_email: true
};

mocks.tokeninfo_invalid = {
	error: "invalid_token",
	error_description: "Invalid Value"
};
