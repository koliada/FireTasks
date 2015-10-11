(function () {
    "use strict";

    var Mustache = require('mustache');

    var BasicView = function (instance, getParentEl) {

        /**
         * @type {Object|Account|List|Task} Instance to bind
         */
        this.instance = this.instance || instance;

        /**
         * Parent element getter to bind to
         * @type {Function}
         * @returns Element
         */
        this.getParentEl = this.getParentEl || getParentEl;
        /**
         * Template string
         * @type {string}
         */
        this.template = this.template || '';

        /**
         * Processed template string
         * @type {string}
         */
        this.html = this.html || "";

        /**
         * Document fragment for temporal storage of the not-yet-bound elements
         * @type {DocumentFragment}
         */
        this.documentFragment = this.documentFragment || null;

        /**
         * Array of the elements associated with bound instance
         * @type {Element[]}
         */
        this.domElements = this.domElements || [];

        this.rendered = false;

        return this;
    };

    BasicView.prototype.renderTemplate = function (template, instance) {
        template = template || this.template;
        instance = instance || this.instance;

        if (!template || !instance) {
            throw new Error("Unable to render template since template of instance are not defined");
        }
        this.html = Mustache.render(this.template, this.instance);
        return this;
    };

    BasicView.prototype.createFragment = function (html) {
        html = html || this.html;

        var el = document.createElement('div'),
            fragment = document.createDocumentFragment();
        el.innerHTML = html;

        this.domElements = [];

        while (el.children.length > 0) {
            el.children[0].view = this;
            this.domElements.push(el.children[0]);
            fragment.appendChild(el.children[0]);
        }

        return fragment;
    };

    /**
     * @deprecated
     */
    BasicView.prototype.add = function () {
        if (!this.documentFragment) {
            throw new Error('element is not created by the implementation');
        }
        this.getParentEl().appendChild(this.documentFragment);
    };

    BasicView.prototype.destroy = function () {
        this.domElements.forEach(function (el) {
            el.parentNode.removeChild(el);
        });
        this.rendered = false;
    };

    /**
     * Process template as JS string
     * @deprecated
     * @returns {Object}
     */
    BasicView.prototype.compile = function () {
        var $this = this.instance;

        return eval(this.template);
    };

    module.exports = BasicView;
}());
