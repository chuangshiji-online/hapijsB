'use strict';

// Load modules

const Bluebird = require('bluebird');
const CatboxMemory = require('catbox-memory');
const Code = require('code');
const Hapi = require('..');
const Lab = require('lab');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;


describe('Methods', function () {

    it('registers a method', function (done) {

        const add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('add', add);

        server.methods.add(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method with leading _', function (done) {

        const _add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('_add', _add);

        server.methods._add(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method with leading $', function (done) {

        const $add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('$add', $add);

        server.methods.$add(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method with _', function (done) {

        const _add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('add_._that', _add);

        server.methods.add_._that(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method with $', function (done) {

        const $add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('add$.$that', $add);

        server.methods.add$.$that(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method (no callback)', function (done) {

        const add = function (a, b) {

            return a + b;
        };

        const server = new Hapi.Server();
        server.method('add', add, { callback: false });

        expect(server.methods.add(1, 5)).to.equal(6);
        done();
    });

    it('registers a method (promise)', function (done) {

        const addAsync = function (a, b, next) {

            return next(null, a + b);
        };

        const add = Bluebird.promisify(addAsync);

        const server = new Hapi.Server();
        server.method('add', add, { callback: false });

        server.methods.add(1, 5).then(function (result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('registers a method with nested name', function (done) {

        const add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('tools.add', add);

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.tools.add(1, 5, function (err, result) {

                expect(result).to.equal(6);
                done();
            });
        });
    });

    it('registers a method with bind and callback', function (done) {

        const server = new Hapi.Server();
        server.connection();

        const context = { name: 'Bob' };
        server.method('user', function (id, next) {

            return next(null, { id: id, name: this.name });
        }, { bind: context });

        server.route({
            method: 'GET',
            path: '/user/{id}',
            config: {
                pre: [
                    'user(params.id)'
                ],
                handler: function (request, reply) {

                    return reply(request.pre.user);
                }
            }
        });

        server.inject('/user/5', function (res) {

            expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
            done();
        });
    });

    it('registers two methods with shared nested name', function (done) {

        const add = function (a, b, next) {

            return next(null, a + b);
        };

        const sub = function (a, b, next) {

            return next(null, a - b);
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('tools.add', add);
        server.method('tools.sub', sub);

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.tools.add(1, 5, function (err, result1) {

                expect(result1).to.equal(6);
                server.methods.tools.sub(1, 5, function (err, result2) {

                    expect(result2).to.equal(-4);
                    done();
                });
            });
        });
    });

    it('throws when registering a method with nested name twice', function (done) {

        const add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('tools.add', add);
        expect(function () {

            server.method('tools.add', add);
        }).to.throw('Server method function name already exists: tools.add');

        done();
    });

    it('throws when registering a method with name nested through a function', function (done) {

        const add = function (a, b, next) {

            return next(null, a + b);
        };

        const server = new Hapi.Server();
        server.method('add', add);
        expect(function () {

            server.method('add.another', add);
        }).to.throw('Invalid segment another in reach path  add.another');

        done();
    });

    it('calls non cached method multiple times', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method);

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(1);
                    done();
                });
            });
        });
    });

    it('caches method value', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(err).to.not.exist();
                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(err).to.not.exist();
                    expect(result2.gen).to.equal(0);
                    done();
                });
            });
        });
    });

    it('caches method value (no callback)', function (done) {

        let gen = 0;
        const method = function (id) {

            return { id: id, gen: gen++ };
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 }, callback: false });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(err).to.not.exist();
                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(err).to.not.exist();
                    expect(result2.gen).to.equal(0);
                    done();
                });
            });
        });
    });

    it('caches method value (promise)', function (done) {

        let gen = 0;
        const methodAsync = function (id, next) {

            if (id === 2) {
                return next(new Error('boom'));
            }

            return next(null, { id: id, gen: gen++ });
        };

        const method = Bluebird.promisify(methodAsync);

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 }, callback: false });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(err).to.not.exist();
                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(err).to.not.exist();
                    expect(result2.gen).to.equal(0);

                    server.methods.test(2, function (err, result3) {

                        expect(err).to.exist();
                        expect(err.message).to.equal('boom');
                        done();
                    });
                });
            });
        });
    });

    it('reuses cached method value with custom key function', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ });
        };

        const server = new Hapi.Server();
        server.connection();

        const generateKey = function (id) {

            return '' + (id + 1);
        };

        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 }, generateKey: generateKey });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(0);
                    done();
                });
            });
        });
    });

    it('errors when custom key function return null', function (done) {

        const method = function (id, next) {

            return next(null, { id: id });
        };

        const server = new Hapi.Server();
        server.connection();

        const generateKey = function (id) {

            return null;
        };

        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 }, generateKey: generateKey });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid method key when invoking: test');
                done();
            });
        });
    });

    it('does not cache when custom key function returns a non-string', function (done) {

        const method = function (id, next) {

            return next(null, { id: id });
        };

        const server = new Hapi.Server();
        server.connection();

        const generateKey = function (id) {

            return 123;
        };

        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 }, generateKey: generateKey });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result) {

                expect(err).to.exist();
                expect(err.message).to.equal('Invalid method key when invoking: test');
                done();
            });
        });
    });

    it('does not cache value when ttl is 0', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ }, 0);
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(0);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(1);
                    done();
                });
            });
        });
    });

    it('generates new value after cache drop', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('dropTest', method, { cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.dropTest(2, function (err, result1) {

                expect(result1.gen).to.equal(0);
                server.methods.dropTest.cache.drop(2, function (err) {

                    expect(err).to.not.exist();

                    server.methods.dropTest(2, function (err, result2) {

                        expect(result2.gen).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('errors on invalid drop key', function (done) {

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('dropErrTest', method, { cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.dropErrTest.cache.drop(function () { }, function (err) {

                expect(err).to.exist();
                done();
            });
        });
    });

    it('reports cache stats for each method', function (done) {

        const method = function (id, next) {

            return next(null, { id: id });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { cache: { generateTimeout: 10 } });
        server.method('test2', method, { cache: { generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err) {

                expect(err).to.not.exist();
                expect(server.methods.test.cache.stats.gets).to.equal(1);
                expect(server.methods.test2.cache.stats.gets).to.equal(0);
                done();
            });
        });
    });

    it('throws an error when name is not a string', function (done) {

        expect(function () {

            const server = new Hapi.Server();
            server.method(0, function () { });
        }).to.throw('name must be a string');
        done();
    });

    it('throws an error when name is invalid', function (done) {

        expect(function () {

            const server = new Hapi.Server();
            server.method('0', function () { });
        }).to.throw('Invalid name: 0');

        expect(function () {

            const server = new Hapi.Server();
            server.method('a..', function () { });
        }).to.throw('Invalid name: a..');

        expect(function () {

            const server = new Hapi.Server();
            server.method('a.0', function () { });
        }).to.throw('Invalid name: a.0');

        expect(function () {

            const server = new Hapi.Server();
            server.method('.a', function () { });
        }).to.throw('Invalid name: .a');

        done();
    });

    it('throws an error when method is not a function', function (done) {

        expect(function () {

            const server = new Hapi.Server();
            server.method('user', 'function');
        }).to.throw('method must be a function');
        done();
    });

    it('throws an error when options is not an object', function (done) {

        expect(function () {

            const server = new Hapi.Server();
            server.method('user', function () { }, 'options');
        }).to.throw(/Invalid method options \(user\)/);
        done();
    });

    it('throws an error when options.generateKey is not a function', function (done) {

        expect(function () {

            const server = new Hapi.Server();
            server.method('user', function () { }, { generateKey: 'function' });
        }).to.throw(/Invalid method options \(user\)/);
        done();
    });

    it('throws an error when options.cache is not valid', function (done) {

        expect(function () {

            const server = new Hapi.Server({ cache: CatboxMemory });
            server.method('user', function () { }, { cache: { x: 'y', generateTimeout: 10 } });
        }).to.throw(/Invalid cache policy configuration/);
        done();
    });

    it('throws an error when generateTimeout is not present', function (done) {

        const server = new Hapi.Server();
        expect(function () {

            server.method('test', function () { }, { cache: {} });
        }).to.throw('Method caching requires a timeout value in generateTimeout: test');

        done();
    });

    it('allows generateTimeout to be false', function (done) {

        const server = new Hapi.Server();
        expect(function () {

            server.method('test', function () { }, { cache: { generateTimeout: false } });
        }).to.not.throw();

        done();
    });

    it('returns a valid result when calling a method without using the cache', function (done) {

        const server = new Hapi.Server();

        const method = function (id, next) {

            return next(null, { id: id });
        };

        server.method('user', method);
        server.methods.user(4, function (err, result) {

            expect(result.id).to.equal(4);
            done();
        });
    });

    it('returns a valid result when calling a method when using the cache', function (done) {

        const server = new Hapi.Server();
        server.connection();
        server.initialize(function (err) {

            expect(err).to.not.exist();

            const method = function (id, str, next) {

                return next(null, { id: id, str: str });
            };

            server.method('user', method, { cache: { expiresIn: 1000, generateTimeout: 10 } });
            server.methods.user(4, 'something', function (err, result) {

                expect(result.id).to.equal(4);
                expect(result.str).to.equal('something');
                done();
            });
        });
    });

    it('returns an error result when calling a method that returns an error', function (done) {

        const server = new Hapi.Server();

        const method = function (id, next) {

            return next(new Error());
        };

        server.method('user', method);
        server.methods.user(4, function (err, result) {

            expect(err).to.exist();
            done();
        });
    });

    it('returns a different result when calling a method without using the cache', function (done) {

        const server = new Hapi.Server();

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: ++gen });
        };

        server.method('user', method);
        server.methods.user(4, function (err, result1) {

            expect(result1.id).to.equal(4);
            expect(result1.gen).to.equal(1);
            server.methods.user(4, function (err, result2) {

                expect(result2.id).to.equal(4);
                expect(result2.gen).to.equal(2);
                done();
            });
        });
    });

    it('returns a valid result when calling a method using the cache', function (done) {

        const server = new Hapi.Server({ cache: CatboxMemory });
        server.connection();

        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: ++gen });
        };

        server.method('user', method, { cache: { expiresIn: 2000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            const id = Math.random();
            server.methods.user(id, function (err, result1) {

                expect(result1.id).to.equal(id);
                expect(result1.gen).to.equal(1);
                server.methods.user(id, function (err, result2) {

                    expect(result2.id).to.equal(id);
                    expect(result2.gen).to.equal(1);
                    done();
                });
            });
        });
    });

    it('returns timeout when method taking too long using the cache', function (done) {

        const server = new Hapi.Server({ cache: CatboxMemory });
        server.connection();

        let gen = 0;
        const method = function (id, next) {

            setTimeout(function () {

                return next(null, { id: id, gen: ++gen });
            }, 5);
        };

        server.method('user', method, { cache: { expiresIn: 2000, generateTimeout: 3 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            const id = Math.random();
            server.methods.user(id, function (err, result1) {

                expect(err.output.statusCode).to.equal(503);

                setTimeout(function () {

                    server.methods.user(id, function (err, result2) {

                        expect(result2.id).to.equal(id);
                        expect(result2.gen).to.equal(1);
                        done();
                    });
                }, 3);
            });
        });
    });

    it('supports empty key method', function (done) {

        const server = new Hapi.Server({ cache: CatboxMemory });
        server.connection();

        let gen = 0;
        const terms = 'I agree to give my house';
        const method = function (next) {

            return next(null, { gen: gen++, terms: terms });
        };

        server.method('tos', method, { cache: { expiresIn: 2000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.tos(function (err, result1) {

                expect(result1.terms).to.equal(terms);
                expect(result1.gen).to.equal(0);
                server.methods.tos(function (err, result2) {

                    expect(result2.terms).to.equal(terms);
                    expect(result2.gen).to.equal(0);
                    done();
                });
            });
        });
    });

    it('returns valid results when calling a method (with different keys) using the cache', function (done) {

        const server = new Hapi.Server({ cache: CatboxMemory });
        server.connection();
        let gen = 0;
        const method = function (id, next) {

            return next(null, { id: id, gen: ++gen });
        };

        server.method('user', method, { cache: { expiresIn: 2000, generateTimeout: 10 } });
        server.initialize(function (err) {

            expect(err).to.not.exist();

            const id1 = Math.random();
            server.methods.user(id1, function (err, result1) {

                expect(result1.id).to.equal(id1);
                expect(result1.gen).to.equal(1);
                const id2 = Math.random();
                server.methods.user(id2, function (err, result2) {

                    expect(result2.id).to.equal(id2);
                    expect(result2.gen).to.equal(2);
                    done();
                });
            });
        });
    });

    it('errors when key generation fails', function (done) {

        const server = new Hapi.Server({ cache: CatboxMemory });
        server.connection();

        const method = function (id, next) {

            return next(null, { id: id });
        };

        server.method([{ name: 'user', method: method, options: { cache: { expiresIn: 2000, generateTimeout: 10 } } }]);

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.user(1, function (err, result1) {

                expect(result1.id).to.equal(1);

                server.methods.user(function () { }, function (err, result2) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('Invalid method key when invoking: user');
                    done();
                });
            });
        });
    });

    it('sets method bind without cache', function (done) {

        const method = function (id, next) {

            return next(null, { id: id, gen: this.gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { bind: { gen: 7 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(7);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(8);
                    done();
                });
            });
        });
    });

    it('sets method bind with cache', function (done) {

        const method = function (id, next) {

            return next(null, { id: id, gen: this.gen++ });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { bind: { gen: 7 }, cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(7);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(7);
                    done();
                });
            });
        });
    });

    it('shallow copies bind config', function (done) {

        const bind = { gen: 7 };
        const method = function (id, next) {

            return next(null, { id: id, gen: this.gen++, bound: (this === bind) });
        };

        const server = new Hapi.Server();
        server.connection();
        server.method('test', method, { bind: bind, cache: { expiresIn: 1000, generateTimeout: 10 } });

        server.initialize(function (err) {

            expect(err).to.not.exist();

            server.methods.test(1, function (err, result1) {

                expect(result1.gen).to.equal(7);
                expect(result1.bound).to.equal(true);

                server.methods.test(1, function (err, result2) {

                    expect(result2.gen).to.equal(7);
                    done();
                });
            });
        });
    });

    describe('_add()', function () {

        it('normalizes no callback into callback (direct)', function (done) {

            const add = function (a, b) {

                return a + b;
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });
            const result = server.methods.add(1, 5);
            expect(result).to.equal(6);
            done();
        });

        it('normalizes no callback into callback (direct error)', function (done) {

            const add = function (a, b) {

                return new Error('boom');
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });
            const result = server.methods.add(1, 5);
            expect(result).to.be.instanceof(Error);
            expect(result.message).to.equal('boom');
            done();
        });

        it('normalizes no callback into callback (direct throw)', function (done) {

            const add = function (a, b) {

                throw new Error('boom');
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });
            expect(function () {

                server.methods.add(1, 5);
            }).to.throw('boom');
            done();
        });

        it('normalizes no callback into callback (normalized)', function (done) {

            const add = function (a, b) {

                return a + b;
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });

            server._methods._normalized.add(1, 5, function (err, result) {

                expect(result).to.equal(6);
                done();
            });
        });

        it('normalizes no callback into callback (normalized error)', function (done) {

            const add = function (a, b) {

                return new Error('boom');
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });

            server._methods._normalized.add(1, 5, function (err, result) {

                expect(err).to.exist();
                expect(err.message).to.equal('boom');
                done();
            });
        });

        it('normalizes no callback into callback (normalized throw)', function (done) {

            const add = function (a, b) {

                throw new Error('boom');
            };

            const server = new Hapi.Server();
            server.method('add', add, { callback: false });

            server._methods._normalized.add(1, 5, function (err, result) {

                expect(err).to.exist();
                expect(err.message).to.equal('boom');
                done();
            });
        });
    });

    it('normalizes no callback into callback (cached)', function (done) {

        const add = function (a, b) {

            return a + b;
        };

        const server = new Hapi.Server();
        server.method('add', add, { cache: { expiresIn: 10, generateTimeout: 10 }, callback: false });

        server._methods._normalized.add(1, 5, function (err, result) {

            expect(result).to.equal(6);
            done();
        });
    });

    it('normalizes no callback into callback (cached error)', function (done) {

        const add = function (a, b) {

            return new Error('boom');
        };

        const server = new Hapi.Server();
        server.method('add', add, { cache: { expiresIn: 10, generateTimeout: 10 }, callback: false });

        server._methods._normalized.add(1, 5, function (err, result) {

            expect(err).to.exist();
            expect(err.message).to.equal('boom');
            done();
        });
    });

    it('normalizes no callback into callback (cached throw)', function (done) {

        const add = function (a, b) {

            throw new Error('boom');
        };

        const server = new Hapi.Server();
        server.method('add', add, { cache: { expiresIn: 10, generateTimeout: 10 }, callback: false });

        server._methods._normalized.add(1, 5, function (err, result) {

            expect(err).to.exist();
            expect(err.message).to.equal('boom');
            done();
        });
    });

    it('throws an error if unknown keys are present when making a server method using an object', function (done) {

        const fn = function () { };
        const server = new Hapi.Server();

        expect(function () {

            server.method({
                name: 'fn',
                method: fn,
                cache: {}
            });
        }).to.throw();

        done();
    });
});
