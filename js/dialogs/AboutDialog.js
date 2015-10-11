(function () {
    "use strict";
    var _dom = Object.create(null),
        _versionSet = false,
        _$ = require('../DomHelper'),
        utils = require('../utils');

    _dom.dialog = _$('#about-layout')[0];
    _dom.btnClose = _$('#btn-about-back')[0];
    _dom.versionLabel = _dom.dialog.find('#app-version .app-version')[0];
    _dom.releaseDateLabel = _dom.dialog.find('#app-version time')[0];

    function show() {
        if (!_versionSet) {
            _dom.versionLabel.innerHTML = utils.version.version;
            _dom.releaseDateLabel.innerHTML = utils.version.releaseDate;
            _versionSet = true;
        }
        _dom.dialog.fadeIn();
    }

    function hide() {
        _dom.dialog.fadeOut();
    }

    _dom.btnClose.on('click', hide);

    module.exports = {
        show: show
    }
}());
