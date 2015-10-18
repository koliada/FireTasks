(function () {
    "use strict";

    var utils = require('../utils');

    /**
     * Basic form dialog
     * @constructor
     */
    var BasicFormDialog = function (entity) {

        this.dom = this.dom || {
                dialog: null
            };
        this.visible = false;
        this.entity = entity || null;
        this.fieldToFocus = this.fieldToFocus || null;

        this.onHideRef = this.hide.bind(this);
        this.onOkRef = this.onOk.bind(this);
        this.dom.btnClose.on('click', this.onHideRef);
        this.dom.btnOk.on('click', this.onOkRef);
    };

    //noinspection JSUnusedLocalSymbols
    BasicFormDialog.prototype.setValues = function (entity) {
        throw new ReferenceError('BasicFormDialog: setValues() method is not implemented');
    };

    BasicFormDialog.prototype.onOk = function () {
        throw new ReferenceError('BasicFormDialog: onOk() method is not implemented');
    };

    BasicFormDialog.prototype.afterHide = function () {
        // to be overridden
    };

    BasicFormDialog.prototype.show = function (entity) {
        if (this.visible) {
            return;
        }
        this.setValues(entity).then(function () {
            this.dom.dialog.fadeIn();
            this.visible = true;
            if (this.fieldToFocus && utils.isFunction(this.fieldToFocus.focus)) {
                this.fieldToFocus.focus();
            }
        }.bind(this));
    };

    BasicFormDialog.prototype.hide = function () {
        if (this.visible) {
            this.dom.dialog.fadeOut();
            this.dom.btnClose.off('click', this.onHideRef);
            this.dom.btnOk.off('click', this.onOkRef);
            this.visible = false;
            this.afterHide();
        }
    };

    module.exports = BasicFormDialog;
}());