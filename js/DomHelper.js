(function () {
    "use strict";

    var utils = require('./utils'),
        _CLASSES = {
            fadeOut: 'fade-out',
            fadeIn: 'fade-in'
        },
        eventRegistry = {};

    function createDelegate(selector, handler) {
        return function (ev) {

            var currentTarget = ev.currentTarget, node;

            for (node = ev.target; node && node !== currentTarget; node = node.parentNode) {
                if (node.matches(selector)) {
                    handler(ev, node);
                    return true;
                }
            }

            //var nodes = this.querySelectorAll(selector);
            //for (var i = 0; i < nodes.length; i++) {
            //    if (nodes[i] === ev.target) {
            //        handler(ev);
            //        return true;
            //    }
            //}
            return false;
        }
    }

    /**
     * The last output point before calling actual handler
     * TODO: do we still need this?
     * @param handler
     * @returns {Function}
     */
    function wrapHandler(handler) {
        return function (ev, node) {
            handler(ev, node || ev.target);
        }
    }

    function bindCustomEvent(element, eventName, handler) {
        if (eventRegistry[eventName]) {
            eventRegistry[eventName](element, handler);
        }
    }

    function rememberEventListener(eventName, handler, userHandler) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push({
            handler: handler,
            userHandler: userHandler
        });
    }

    function removeEventListeners(handlers, eventName, userHandler) {
        for (var i = 0; i < handlers.length; i++) {
            if (userHandler) {
                if (userHandler === handlers[i].userHandler) {
                    this.removeEventListener(eventName, handlers[i].handler);
                    this.eventListeners[eventName].splice(i, 1);
                }
            } else {
                this.removeEventListener(eventName, handlers[i].handler);
                this.eventListeners[eventName].splice(i, 1);
            }
        }
    }

    HTMLCollection.prototype.forEach = NodeList.prototype.forEach = function (callback) {
        for (var i = 0; i < this.length; i++) {
            callback(this[i]);
        }
    };

    HTMLCollection.prototype.clone = function () {
        var result = [];
        this.forEach(function (node) {
            result.push(node);
        });
        return result;
    };

    // polyfill
    if (!Element.prototype.matches) {
        Element.prototype.matches = function (selector) {
            var element = this;
            var matches = (element.document || element.ownerDocument).querySelectorAll(selector);
            var i = 0;

            while (matches[i] && matches[i] !== element) {
                i++;
            }

            return matches[i] ? true : false;
        };
    }

    Element.prototype.createEventListenersProp = function () {
        if (!this.eventListeners) {
            this.eventListeners = Object.create(null);
        }
    };

    /**
     * @this {Element} element
     * @returns {Function|document.querySelectorAll|*}
     */
    Element.prototype.find = function (selector) {
        if (!_$.isElement(this)) {
            throw new Error('not a single element');
        }
        return _$(selector, this);
    };

    Element.prototype.hasEvent = function (eventName) {
        return ('on' + eventName.toLowerCase()) in this;
    };

    Element.prototype.on = function () {
        if (arguments.length < 2) {
            throw new Error('insufficient arguments, minimum 2');
        }
        if (!utils.isString(arguments[0])) {
            throw new TypeError('event name must be a string');
        }
        var handler,
            userHandler,
            eventName = arguments[0];

        if (arguments.length === 2 && utils.isFunction(arguments[1])) {
            userHandler = arguments[1];
            handler = wrapHandler(userHandler);
        }
        if (arguments.length === 3 && utils.isString(arguments[1]) && utils.isFunction(arguments[2])) {
            userHandler = arguments[2];
            handler = createDelegate(arguments[1], wrapHandler(userHandler));
        }
        this.createEventListenersProp();
        rememberEventListener.apply(this, [eventName, handler, userHandler]);
        if (this.hasEvent(arguments[0])) {
            this.addEventListener(arguments[0], handler, false);
        } else {
            bindCustomEvent(this, arguments[0], handler);
        }
        return this;
    };

    Element.prototype.off = function (eventName, userHandler) {
        this.createEventListenersProp();
        if (arguments.length === 0) {
            var self = this;
            utils.iterate(this.eventListeners, function (handlers, eventName) {
                removeEventListeners.apply(self, [handlers, eventName]);
            });
        }
        if (arguments.length === 1 && utils.isString(eventName)) {
            removeEventListeners.apply(this, [this.eventListeners[eventName], eventName]);
        }
        if (arguments.length === 2 && utils.isString(eventName) && utils.isFunction(userHandler)) {
            removeEventListeners.apply(this, [this.eventListeners[eventName], eventName, userHandler]);
        }
        return this;
    };

    Element.prototype.fadeIn = function () {
        this.classList.remove(_CLASSES.fadeOut);
        this.classList.add(_CLASSES.fadeIn);
        return this;
    };

    Element.prototype.fadeOut = function () {
        this.classList.remove(_CLASSES.fadeIn);
        this.classList.add(_CLASSES.fadeOut);
        return this;
    };

    Element.prototype.setStyle = function (styleProp, value) {
        this.style[styleProp] = (!utils.isDefined(value) || value === null) ? null : value;
        return this;
    };

    Element.prototype.show = function (displayType) {
        this.style.display = displayType || null;
    };

    Element.prototype.hide = function () {
        this.style.display = 'none';
    };

    // Extending Element with custom methods
    //utils.apply(Element, extensionMethods);

    function toArray(obj) {
        return [].map.call(obj, function (element) {
            return element;
        });
    }

    var _$ = (function () {
        return function (selector, startFrom) {
            if (!utils.isString(selector) || !selector.length) {
                throw new TypeError('selector must be a non-empty string');
            }
            try {
                var nodeList = ((_$.isElement(startFrom) || _$.isDocumentElement(startFrom)) ? startFrom : document).querySelectorAll(selector);
            } catch (e) {
                console.log(selector);
                throw e;
            }
            nodeList = toArray(nodeList); //TODO: I want to return one element if selected by ID
            //nodeList = nodeList.concat(searchThroughImportedContents(selector, startFrom));
            //return (selector.split(' ').length === 1 && /^#{1}[a-zA-Z0-9_\-\.\[\]\"\=\']+$/.test(selector)) ? toArray(nodeList)[0] : toArray(nodeList);
            return nodeList;
        };
    }());

    _$.isElement = function (element) {
        return Element.prototype.isPrototypeOf(element);
    };

    _$.isDocumentElement = function (element) {
        return Boolean(element && element.documentElement);
    };

    /**
     * Indicates whether we are running in UI or not. UI absence means unit testing environment
     * @type {boolean}
     */
    _$.noUI = _$('#firetasks').length === 0;

    // TODO: describe
    _$.registerCustomEvent = function (eventName, processingFn) {
        eventRegistry[eventName] = processingFn;
    };

    module.exports = _$;

}());
