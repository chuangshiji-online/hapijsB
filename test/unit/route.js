// Load modules

var Chai = require('chai');
var Hapi = process.env.TEST_COV ? require('../../lib-cov/hapi') : require('../../lib/hapi');
var Route = process.env.TEST_COV ? require('../../lib-cov/route') : require('../../lib/route');
var Defaults = process.env.TEST_COV ? require('../../lib-cov/defaults') : require('../../lib/defaults');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Route', function () {

    var server = { settings: Defaults.server };

    var _handler = function (request) {

        request.reply('ok');
    };

    it('throws an error if constructed without new', function (done) {

        var fn = function () {

            Route({}, server);
        };
        expect(fn).throws(Error, 'Route must be instantiated using new');
        done();
    });

    it('throws an error if the path is missing', function (done) {

        var fn = function () {

            var route = new Route({ method: 'get', handler: _handler }, server);
        };
        expect(fn).throws(Error);
        done();
    });

    it('throws an error if the method is missing', function (done) {

        var fn = function () {

            var route = new Route({ path: '/test', handler: _handler }, server);
        };
        expect(fn).throws(Error, 'Route options missing method');
        done();
    });

    it('doesn\'t throw an error when a method is present', function (done) {

        var fn = function () {

            var route = new Route({ path: '/test', method: 'get', handler: _handler }, server);
        };
        expect(fn).to.not.throw(Error);
        done();
    });

    it('throws an error if the handler is missing', function (done) {

        var fn = function () {

            var route = new Route({ path: '/test', method: 'get', handler: null }, server);
        };
        expect(fn).throws(Error, 'Handler must appear once and only once');
        done();
    });

    describe('#validatePathRegex', function () {

        var testPaths = function () {

            var paths = {
                '/': true,
                '/path': true,
                '/path/': true,
                '/path/to/somewhere': true,
                '/{param}': true,
                '/{param?}': true,
                '/{param*}': true,
                '/{param*5}': true,
                '/path/{param}': true,
                '/path/{param}/to': true,
                '/path/{param?}': true,
                '/path/{param}/to/{some}': true,
                '/path/{param}/to/{some?}': true,
                '/path/{param*2}/to': true,
                '/path/{param*27}/to': true,
                '/path/{param*2}': true,
                '/path/{param*27}': true,
                '/%20path/': true,
                'path': false,
                '/%path/': false,
                '/path/{param*}/to': false,
                '/path/{param*0}/to': false,
                '/path/{param*0}': false,
                '/path/{param*01}/to': false,
                '/path/{param*01}': false,
                '/{param?}/something': false,
                '/{param*03}': false,
                '/{param*3?}': false,
                '/{param*?}': false,
                '/{param*}/': false
            };

            var test = function (path, isValid) {

                it('validates the path \'' + path + '\' as ' + (isValid ? 'well-formed' : 'malformed'), function (done) {

                    expect(!!(path.match(Route.validatePathRegex))).to.equal(isValid);
                    done();
                });
            };

            var keys = Object.keys(paths);
            for (var i = 0, il = keys.length; i < il; ++i) {
                test(keys[i], paths[keys[i]]);
            }
        }();
    });

    describe('#_generateRegex', function () {

        var testFingerprints = function () {

            var paths = {
                '/': '/',
                '/path': '/path',
                '/path/': '/path/',
                '/path/to/somewhere': '/path/to/somewhere',
                '/{param}': '/?',
                '/{param?}': '/?',
                '/{param*}': '/?*',
                '/{param*5}': '/?/?/?/?/?',
                '/path/{param}': '/path/?',
                '/path/{param}/to': '/path/?/to',
                '/path/{param?}': '/path/?',
                '/path/{param}/to/{some}': '/path/?/to/?',
                '/path/{param}/to/{some?}': '/path/?/to/?',
                '/path/{param*2}/to': '/path/?/?/to',
                '/path/{param*10}/to': '/path/?/?/?/?/?/?/?/?/?/?/to',
                '/path/{param*2}': '/path/?/?',
                '/%20path/': '/%20path/'
            };

            var test = function (path, fingerprint) {

                it('process the path \'' + path + '\' as ' + fingerprint, function (done) {

                    var route = new Route({ path: path, method: 'get', handler: function () { } }, { settings: { router: { isTrailingSlashSensitive: false, isCaseSensitive: true } } });
                    expect(route.fingerprint).to.equal(fingerprint);
                    done();
                });
            };

            var keys = Object.keys(paths);
            for (var i = 0, il = keys.length; i < il; ++i) {
                test(keys[i], paths[keys[i]]);
            }
        }();

        var testMatch = function () {

            var paths = {
                '/path/to/|false|true': {
                    '/path/to': true,
                    '/Path/to': false,
                    '/path/to/': true,
                    '/Path/to/': false
                },
                '/path/to/|false|false': {
                    '/path/to': true,
                    '/Path/to': true,
                    '/path/to/': true,
                    '/Path/to/': true
                },
                '/path/to/|true|false': {
                    '/path/to': false,
                    '/Path/to': false,
                    '/path/to/': true,
                    '/Path/to/': true
                },
                '/path/to/|true|true': {
                    '/path/to': false,
                    '/Path/to': false,
                    '/path/to/': true,
                    '/Path/to/': false
                },
                '/path/{param*2}/to': {
                    '/a/b/c/d': false,
                    '/path/a/b/to': {
                        param: '/a/b'
                    }
                },
                '/path/{p1}/{p2?}': {
                    '/path/a/c/d': false,
                    '/Path/a/c/d': false,
                    '/path/a/b': {
                        p1: 'a',
                        p2: 'b'
                    },
                    '/path/a': {
                        p1: 'a',
                        p2: undefined
                    },
                    '/path/a/': {
                        p1: 'a',
                        p2: undefined
                    }
                },
                '/path/{p1}/{p2?}|true|false': {
                    '/path/a/c/d': false,
                    '/Path/a/c': {
                        p1: 'a',
                        p2: 'c'
                    },
                    '/path/a/b': {
                        p1: 'a',
                        p2: 'b'
                    },
                    '/path/a': false,
                    '/path/a/': {
                        p1: 'a',
                        p2: undefined
                    }
                }
            };

            var keys = Object.keys(paths);
            for (var i = 0, il = keys.length; i < il; ++i) {

                function test(path, matches, isTrailingSlashSensitive, isCaseSensitive) {

                    var route = new Route({ path: path, method: 'get', handler: function () { } }, { settings: { router: { isTrailingSlashSensitive: isTrailingSlashSensitive, isCaseSensitive: isCaseSensitive } } });
                    var mkeys = Object.keys(matches);
                    for (var m = 0, ml = mkeys.length; m < ml; ++m) {
                        function match(route, match, result) {

                            it((result ? 'matches' : 'unmatches') + ' the path \'' + path + '\' with ' + match + ' (' + (isTrailingSlashSensitive ? 'slash-sensitive' : 'slash-insensitive') + ', ' + (isCaseSensitive ? 'case-sensitive' : 'case-insensitive') + ')', function (done) {

                                var request = { path: match };
                                var isMatch = route.match(request);

                                expect(isMatch).to.equal(!!result);
                                if (typeof result === 'object') {
                                    var ps = Object.keys(result);
                                    for (var p = 0, pl = ps.length; p < pl; ++p) {
                                        if (result[ps[p]]) {
                                            expect(request.params[ps[p]]).to.equal(result[ps[p]]);
                                        }
                                        else {
                                            expect(request.params[ps[p]]).to.be.undefined;
                                        }
                                    }
                                }

                                done();
                            });
                        }
                        match(route, mkeys[m], matches[mkeys[m]]);
                    }
                }

                var pathParts = keys[i].split('|');
                var isTrailingSlashSensitive = (pathParts[1] ? pathParts[1] === 'true' : false);
                var isCaseSensitive = (pathParts[2] ? pathParts[2] === 'true' : true);

                test(pathParts[0], paths[keys[i]], isTrailingSlashSensitive, isCaseSensitive);
            }
        }();
    });

    describe('#match', function () {

        it('returns true when called with a matching path', function (done) {

            var route = new Route({ path: '/test', method: 'get', handler: _handler }, server);
            var request = {
                path: '/test',
                method: 'get'
            };

            expect(route.match(request)).to.be.true;
            done();
        });

        it('returns false when called with a non-matching path', function (done) {

            var route = new Route({ path: '/test', method: 'get', handler: _handler }, server);
            var request = {
                path: '/test2',
                method: 'get'
            };

            expect(route.match(request)).to.be.false;
            done();
        });

        it('returns false when called with an invalid path', function (done) {

            var route = new Route({ path: '/{test}', method: 'get', handler: _handler }, server);
            var request = {
                path: '/test%l',
                method: 'get'
            };

            expect(route.match(request)).to.be.false;
            done();
        });
    });

    describe('#test', function () {

        it('returns true when called with a matching path', function (done) {

            var route = new Route({ path: '/test', method: 'get', handler: _handler }, server);

            expect(route.test('/test')).to.be.true;
            done();
        });

        it('returns false when called with a non-matching path', function (done) {

            var route = new Route({ path: '/test', method: 'get', handler: _handler }, server);

            expect(route.test('/test2')).to.be.false;
            done();
        });
    });
});