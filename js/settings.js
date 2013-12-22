
var Settings = {

	prefix: 'settings',

	setDefaults: function() {

		var defaults = {
			tree_view: false
		};

		$.each(defaults, function(name, value) {
			if( typeof Storage.get(Settings.prefix + '.' + name) === 'undefined' ) {
				Settings.save(name, value);
			}
		});
	},

	save: function(name, value) {

		var data = {};
		data[this.prefix + '.' + name] = String( value );

		return Storage.save(data);
	},

	get: function(name) {
		return Storage.get(this.prefix + '.' + name);
	},

	initSettingsPage: function() {

		var tree_view = ( Settings.get('tree_view') === 'true' );
		$('#settings-tree-view').prop('checked', tree_view);
		/* TODO: other settings here, maybe iterate through saved settings */
	},

	applyChanges: function() {

		/* Reload tasks if view type changed */
		if(
			( Tasks.treeMode() && Settings.get('tree_view') === 'false' )
				||
				( ! Tasks.treeMode() && Settings.get('tree_view') === 'true' )
			) {
			utils.status.show('List view changed', 1000);
			Tasks.getList();
		}
	}
};