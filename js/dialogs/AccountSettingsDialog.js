(function () {
    "use strict";

    var _$ = require('../DomHelper');

    var AccountSettingsDialog = function (account, renderer) {
        var _dom = Object.create(null),
            hideFnRef = hide.bind(this, null, null);

        _dom.dialog = _$('#account-settings-layout')[0];
        _dom.settingsList = _dom.dialog.find('article > section[data-type="list"]')[0];
        _dom.btnClose = _$('#btn-account-settings-back')[0];
        _dom.header = _dom.dialog.find('header > h1')[0];

        function show() {
            _dom.settingsList.innerHTML = renderer();
            _dom.dialog.fadeIn();
        }

        function _applyChanges() {
            var settingsItems = _dom.settingsList.find('.setting-item');
            return this.applyCallback(account, settingsItems);
        }

        function hide(doNotApply) {
            var promise;
            if (true === doNotApply) {
                promise = Promise.resolve();
            } else {
                promise = _applyChanges.call(this);
            }
            return promise.then(function () {
                _dom.dialog.fadeOut();
                _dom.btnClose.off('click', hideFnRef);
                return Promise.resolve();
            });
        }

        _dom.header.innerHTML = account.getName();
        _dom.btnClose.on('click', hideFnRef);
        this.show = show;
        this.hide = hide;
    };

    AccountSettingsDialog.prototype.applyCallback = function (account, settingsItems) {};

    module.exports = AccountSettingsDialog;

}());
