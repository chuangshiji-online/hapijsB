// Declare internals

var internals = {};


// Plugin registration

exports.register = function (pack, options, next) {

    pack.select({ label: 'b' }).ext('onRequest', function (request, cont) {
        
        request.plugins.deps = request.plugins.deps || '|';
        request.plugins.deps += '2|'
        cont();
    });

    return next();
};
