
var Storage = {

	prefix: 'firetasks',

	supportsHTML5storage: function() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	},

	save: function( data ) {
		if ( ! this.supportsHTML5storage() ) { return false; }
		for( var param in data  ) {
			localStorage[this.prefix + '.' + param] = data[param];
		}
		return true;
	},

	get: function( param ) {
		if ( ! this.supportsHTML5storage() ) { return false; }
		return localStorage[this.prefix + '.' + param];
	},

	remove: function( param ) {
		if ( ! this.supportsHTML5storage() ) { return false; }
		//for( var param in data  ) {
		localStorage.removeItem(this.prefix + '.' + param);
		//}
		return true;
	}
};