// Load modules

var Cacheable = require('./cacheable');
var Utils = require('../utils');


// Declare internals

var internals = {};


// View response (Generic -> Cacheable -> View)

module.exports = internals.View = function (manager, template, context, options) {

    Cacheable.call(this);
    this.variety = 'view';
    this.varieties.view = true;

    this.view = {
        manager: manager,
        template: template,
        context: context,
        options: options
    };

    return this;
};

Utils.inherits(internals.View, Cacheable);


internals.View.prototype._prepare = function (request, callback) {

    this._wasPrepared = true;

    var rendered = this.view.manager.render(this.view.template, this.view.context, this.view.options);
    if (rendered instanceof Error) {
        return Utils.nextTick(callback)(rendered);
    }

    this._payload = [rendered.result];
    if (rendered.config.contentType) {
        this._headers['Content-Type'] = rendered.config.contentType;
    }

    if (rendered.config.encoding) {
        this._flags.encoding = rendered.config.encoding;
    }

    return Cacheable.prototype._prepare.call(this, request, callback);
};

