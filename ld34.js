(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2015 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.0.6
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e));
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    if (schedule.isStatic) {
        schedule = function(fn) { setTimeout(fn, 0); };
    }
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise.isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent.isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this.isCancellable()) return;

    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this.isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));
var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));
var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      2097152);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 2097152) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        config.warnings = !!opts.warnings;
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
};

Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this.isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise) {
    if (returnValue === undefined &&
        promiseCreated !== null &&
        config.longStackTraces &&
        config.warnings) {
        var msg = "a promise was created in a " + name +
            " handler but was not returned from it";
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    formatAndLogError(warning, "", true);
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        formatAndLogError(reason, "Unhandled rejection ");
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return this.mapSeries(fn)
            ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseMapSeries(promises, fn)
            ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};

},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.type === 0
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret !== undefined) {
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise.isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success, fail, undefined, {
        promise: this,
        handler: handler,
        called: false,
        cancelPromise: null,
        type: type
    }, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};

Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

return finallyHandler;
};

},{"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    promise._setOnCancel(this);
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this.promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
        if (result === errorObj && result.e === reason) {
            result = null;
        }
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    var promise = this._promise;
    this._cleanup();
    if (result === errorObj) {
        promise._rejectCallback(result.e, false);
    } else {
        promise.cancel();
    }
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        return promise._rejectCallback(result.e, false);
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        return promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            this._promiseFulfilled(maybePromise._value());
        } else if (((bitField & 16777216) !== 0)) {
            this._promiseRejected(maybePromise._reason());
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise) {           \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.now = 0;                                                \n\
            }                                                                \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    promise._pushContext();                                  \n\
                    var callback = this.fn;                                  \n\
                    var ret = tryCatch(callback)([ThePassedArguments]);      \n\
                    promise._popContext();                                   \n\
                    if (ret === errorObj) {                                  \n\
                        promise._rejectCallback(ret.e, false);               \n\
                    } else {                                                 \n\
                        promise._resolveCallback(ret);                       \n\
                    }                                                        \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise);                                      \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", code)
                           (tryCatch, errorObj, Promise);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                if (!ret._isFateSealed()) {
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    this._init$(undefined, -2);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var finallyHandler = _dereq_("./finally")(Promise, tryConvertToPromise);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }
    if (self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
}

function Promise(executor) {
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    if (executor !== INTERNAL) {
        check(this, executor);
        this._resolveFromExecutor(executor);
    }
    this._promiseCreated();
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" && domain.bind(handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
};

Promise.prototype._setAsyncGuaranteed = function() {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : domain.bind(reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : domain.bind(reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();
    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj || x === promise) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (handler === finallyHandler) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, debug);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise.isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : domain.bind(fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    this._eachValues = _each === INTERNAL ? [] : undefined;
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    this._eachValues.push(value);
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.standalone)) {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled =
Promise.prototype._isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype.isCancelled = function() {
    return this._target()._isCancelled();
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message, parent) {
    if (!promise.isPending()) return;
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);
    parent.cancel();
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
    } else {
        ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, +ms);
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var parent = this.then();
    var ret = parent.then();
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message, parent);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

function env(key, def) {
    return isNode ? process.env[key] : def;
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    env: env
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":6}],2:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":3,"ieee754":4,"isarray":5}],3:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
// Copyright 2014 Thom Chiovoloni, released under the MIT license.

/// A random number generator based on the basic implementation of the PCG algorithm,
/// as described here: http://www.pcg-random.org/
var PcgRandom = (function() {
	'use strict';

	var defaultIncHi = 0x14057b7e;
	var defaultIncLo = 0xf767814f;

	/// Construct a random number generator.
	function PcgRandom(seedHi, seedLo, incHi, incLo) {
		this.setSeed(seedHi, seedLo, incHi, incLo)
	}

	/// Set the seed and incrementer.
	PcgRandom.prototype.setSeed = function(seedHi, seedLo, incHi, incLo) {
		if (seedLo == null && seedHi == null) {
			seedLo = (Math.random() * 0xffffffff) >>> 0;
			seedHi = 0;
		}
		else if (seedLo == null) {
			seedLo = seedHi;
			seedHi = 0;
		}
		if (incLo == null && incHi == null) {
			incLo = this.state_ ? this.state_[3] : defaultIncLo;
			incHi = this.state_ ? this.state_[2] : defaultIncHi;
		}
		else if (incLo == null) {
			incLo = incHi;
			incHi = 0;
		}

		this.state_ = new Int32Array([ 0, 0, incHi >>> 0, (incLo|1) >>> 0 ]);
		this.next_();
		add64_(this.state_, this.state_[0], this.state_[1], seedHi>>>0, seedLo>>>0);
		this.next_();
		return this;
	};

	/// Return a copy of the internal state of this random number generator as a JavaScript Array.
	PcgRandom.prototype.getState = function() {
		return [this.state_[0], this.state_[1], this.state_[2], this.state_[3]];
	};

	/// Set the state of the random number generator.
	PcgRandom.prototype.setState = function(state) {
		this.state_[0] = state[0];
		this.state_[1] = state[1];
		this.state_[2] = state[2];
		this.state_[3] = state[3]|1;
	};

	// shim for Math.imul.
	var imul = Math.imul;
	if (!imul) {
		imul = function(a, b) {
			var ah = (a >>> 16) & 0xffff, al = a & 0xffff;
			var bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
			return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
		};
	}

	// multiply two 64 bit numbers (given in parts), and store the result in `out`.
	function mul64_(out, aHi, aLo, bHi, bLo) {
		var c1 = (aLo >>> 16) * (bLo & 0xffff) >>> 0;
		var c0 = (aLo & 0xffff) * (bLo >>> 16) >>> 0;

		var lo = ((aLo & 0xffff) * (bLo & 0xffff)) >>> 0;
		var hi = ((aLo >>> 16) * (bLo >>> 16)) + ((c0 >>> 16) + (c1 >>> 16)) >>> 0;

		c0 = (c0 << 16) >>> 0;
		lo = (lo + c0) >>> 0;
		if ((lo >>> 0) < (c0 >>> 0)) {
			hi = (hi + 1) >>> 0;
		}

		c1 = (c1 << 16) >>> 0;
		lo = (lo + c1) >>> 0;
		if ((lo >>> 0) < (c1 >>> 0)) {
			hi = (hi + 1) >>> 0;
		}

		hi = (hi + imul(aLo, bHi)) >>> 0;
		hi = (hi + imul(aHi, bLo)) >>> 0;

		out[0] = hi;
		out[1] = lo;
	}

	// add two 64 bit numbers (given in parts), and store the result in `out`.
	function add64_(out, aHi, aLo, bHi, bLo) {
		var hi = (aHi + bHi) >>> 0;
		var lo = (aLo + bLo) >>> 0;
		if ((lo >>> 0) < (aLo >>> 0)) {
			hi = (hi + 1) | 0;
		}
		out[0] = hi;
		out[1] = lo;
	}

	var MUL_HI = 0x5851f42d >>> 0;
	var MUL_LO = 0x4c957f2d >>> 0;

	/// Generate a random 32 bit integer. This uses the PCG algorithm, described
	/// here: http://www.pcg-random.org/
	PcgRandom.prototype.next_ = function() {
		// save current state (what we'll use for this number)
		var oldHi = this.state_[0] >>> 0;
		var oldLo = this.state_[1] >>> 0;

		// churn LCG.
		mul64_(this.state_, oldHi, oldLo, MUL_HI, MUL_LO);
		add64_(this.state_, this.state_[0], this.state_[1], this.state_[2], this.state_[3]);

		// get least sig. 32 bits of ((oldstate >> 18) ^ oldstate) >> 27
		var xsHi = oldHi >>> 18;
		var xsLo = ((oldLo >>> 18) | (oldHi << 14)) >>> 0;
		xsHi = (xsHi ^ oldHi) >>> 0;
		xsLo = (xsLo ^ oldLo) >>> 0;
		var xorshifted = ((xsLo >>> 27) | (xsHi << 5)) >>> 0;
		// rotate xorshifted right a random amount, based on the most sig. 5 bits
		// bits of the old state.
		var rot = oldHi >>> 27;
		var rot2 = ((-rot >>> 0) & 31) >>> 0;
		return ((xorshifted >>> rot) | (xorshifted << rot2)) >>> 0;
	};

	/// Get a uniformly distributed 32 bit integer between [0, max).
	PcgRandom.prototype.integer = function(max) {
		if (!max) {
			return this.next_();
		}
		max = max >>> 0;
		if ((max & (max - 1)) === 0) {
			return this.next_() & (max - 1); // fast path for power of 2
		}

		var num = 0;
		var skew = ((-max >>> 0) % max) >>> 0;
		for (num = this.next_(); num < skew; num = this.next_()) {
			// this loop will rarely execute more than twice,
			// and is intentionally empty
		}
		return num % max;
	};

	var BIT_53 = 9007199254740992.0;
	var BIT_27 = 134217728.0;

	/// Get a uniformly distributed IEEE-754 double between 0.0 and 1.0, with
	/// 53 bits of precision (every bit of the mantissa is randomized).
	PcgRandom.prototype.number = function() {
		var hi = (this.next_() & 0x03ffffff) * 1.0;
		var lo = (this.next_() & 0x07ffffff) * 1.0;
		return ((hi * BIT_27) + lo) / BIT_53;
	};

	return PcgRandom;
}());

if (typeof module !== 'undefined' && module.exports) {
	module.exports = PcgRandom;
}


},{}],8:[function(require,module,exports){
'use strict'

module.exports = polyBool

var pslg2poly = require('pslg-to-poly')
var poly2pslg = require('poly-to-pslg')
var overlay   = require('overlay-pslg')

function polyBool(a, b, op) {
  var apsl = poly2pslg(a)
  var bpsl = poly2pslg(b)
  var result = overlay(
    apsl.points, apsl.edges,
    bpsl.points, bpsl.edges,
    op)
  return pslg2poly(result.points, result.red.concat(result.blue))
}

},{"overlay-pslg":79,"poly-to-pslg":126,"pslg-to-poly":151}],9:[function(require,module,exports){
"use strict"

function compileSearch(funcName, predicate, reversed, extraArgs, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a[m]"]
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){")
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
    }
  } else {
    code.push(";if(", predicate, "){i=m;")
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}")
  } else {
    code.push("h=m-1}else{l=m+1}")
  }
  code.push("}")
  if(earlyOut) {
    code.push("return -1};")
  } else {
    code.push("return i};")
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(typeof(c)==='function'){\
return P(a,(l===void 0)?0:l|0,(h===void 0)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===void 0)?0:c|0,(l===void 0)?a.length-1:l|0,y)\
}}\
return dispatchBsearch", suffix].join(""))
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
}

},{}],10:[function(require,module,exports){
'use strict'

var monotoneTriangulate = require('./lib/monotone')
var makeIndex = require('./lib/triangulation')
var delaunayFlip = require('./lib/delaunay')
var filterTriangulation = require('./lib/filter')

module.exports = cdt2d

function canonicalizeEdge(e) {
  return [Math.min(e[0], e[1]), Math.max(e[0], e[1])]
}

function compareEdge(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  return edges.map(canonicalizeEdge).sort(compareEdge)
}

function getDefault(options, property, dflt) {
  if(property in options) {
    return options[property]
  }
  return dflt
}

function cdt2d(points, edges, options) {

  if(!Array.isArray(edges)) {
    options = edges || {}
    edges = []
  } else {
    options = options || {}
    edges = edges || []
  }

  //Parse out options
  var delaunay = !!getDefault(options, 'delaunay', true)
  var interior = !!getDefault(options, 'interior', true)
  var exterior = !!getDefault(options, 'exterior', true)
  var infinity = !!getDefault(options, 'infinity', false)

  //Handle trivial case
  if((!interior && !exterior) || points.length === 0) {
    return []
  }

  //Construct initial triangulation
  var cells = monotoneTriangulate(points, edges)

  //If delaunay refinement needed, then improve quality by edge flipping
  if(delaunay || interior !== exterior || infinity) {

    //Index all of the cells to support fast neighborhood queries
    var triangulation = makeIndex(points.length, canonicalizeEdges(edges))
    for(var i=0; i<cells.length; ++i) {
      var f = cells[i]
      triangulation.addTriangle(f[0], f[1], f[2])
    }

    //Run edge flipping
    if(delaunay) {
      delaunayFlip(points, triangulation)
    }

    //Filter points
    if(!exterior) {
      return filterTriangulation(triangulation, -1)
    } else if(!interior) {
      return filterTriangulation(triangulation,  1, infinity)
    } else if(infinity) {
      return filterTriangulation(triangulation, 0, infinity)
    } else {
      return triangulation.cells()
    }
    
  } else {
    return cells
  }
}

},{"./lib/delaunay":11,"./lib/filter":12,"./lib/monotone":13,"./lib/triangulation":14}],11:[function(require,module,exports){
'use strict'

var inCircle = require('robust-in-sphere')[4]
var bsearch = require('binary-search-bounds')

module.exports = delaunayRefine

function testFlip(points, triangulation, stack, a, b, x) {
  var y = triangulation.opposite(a, b)

  //Test boundary edge
  if(y < 0) {
    return
  }

  //Swap edge if order flipped
  if(b < a) {
    var tmp = a
    a = b
    b = tmp
    tmp = x
    x = y
    y = tmp
  }

  //Test if edge is constrained
  if(triangulation.isConstraint(a, b)) {
    return
  }

  //Test if edge is delaunay
  if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
    stack.push(a, b)
  }
}

//Assume edges are sorted lexicographically
function delaunayRefine(points, triangulation) {
  var stack = []

  var numPoints = points.length
  var stars = triangulation.stars
  for(var a=0; a<numPoints; ++a) {
    var star = stars[a]
    for(var j=1; j<star.length; j+=2) {
      var b = star[j]

      //If order is not consistent, then skip edge
      if(b < a) {
        continue
      }

      //Check if edge is constrained
      if(triangulation.isConstraint(a, b)) {
        continue
      }

      //Find opposite edge
      var x = star[j-1], y = -1
      for(var k=1; k<star.length; k+=2) {
        if(star[k-1] === b) {
          y = star[k]
          break
        }
      }

      //If this is a boundary edge, don't flip it
      if(y < 0) {
        continue
      }

      //If edge is in circle, flip it
      if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
        stack.push(a, b)
      }
    }
  }

  while(stack.length > 0) {
    var b = stack.pop()
    var a = stack.pop()

    //Find opposite pairs
    var x = -1, y = -1
    var star = stars[a]
    for(var i=1; i<star.length; i+=2) {
      var s = star[i-1]
      var t = star[i]
      if(s === b) {
        y = t
      } else if(t === b) {
        x = s
      }
    }

    //If x/y are both valid then skip edge
    if(x < 0 || y < 0) {
      continue
    }

    //If edge is now delaunay, then don't flip it
    if(inCircle(points[a], points[b], points[x], points[y]) >= 0) {
      continue
    }

    //Flip the edge
    triangulation.flip(a, b)

    //Test flipping neighboring edges
    testFlip(points, triangulation, stack, x, a, y)
    testFlip(points, triangulation, stack, a, y, x)
    testFlip(points, triangulation, stack, y, b, x)
    testFlip(points, triangulation, stack, b, x, y)
  }
}

},{"binary-search-bounds":9,"robust-in-sphere":15}],12:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = classifyFaces

function FaceIndex(cells, neighbor, constraint, flags, active, next, boundary) {
  this.cells       = cells
  this.neighbor    = neighbor
  this.flags       = flags
  this.constraint  = constraint
  this.active      = active
  this.next        = next
  this.boundary    = boundary
}

var proto = FaceIndex.prototype

function compareCell(a, b) {
  return a[0] - b[0] ||
         a[1] - b[1] ||
         a[2] - b[2]
}

proto.locate = (function() {
  var key = [0,0,0]
  return function(a, b, c) {
    var x = a, y = b, z = c
    if(b < c) {
      if(b < a) {
        x = b
        y = c
        z = a
      }
    } else if(c < a) {
      x = c
      y = a
      z = b
    }
    if(x < 0) {
      return -1
    }
    key[0] = x
    key[1] = y
    key[2] = z
    return bsearch.eq(this.cells, key, compareCell)
  }
})()

function indexCells(triangulation, infinity) {
  //First get cells and canonicalize
  var cells = triangulation.cells()
  var nc = cells.length
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    var x = c[0], y = c[1], z = c[2]
    if(y < z) {
      if(y < x) {
        c[0] = y
        c[1] = z
        c[2] = x
      }
    } else if(z < x) {
      c[0] = z
      c[1] = x
      c[2] = y
    }
  }
  cells.sort(compareCell)

  //Initialize flag array
  var flags = new Array(nc)
  for(var i=0; i<flags.length; ++i) {
    flags[i] = 0
  }

  //Build neighbor index, initialize queues
  var active = []
  var next   = []
  var neighbor = new Array(3*nc)
  var constraint = new Array(3*nc)
  var boundary = null
  if(infinity) {
    boundary = []
  }
  var index = new FaceIndex(
    cells,
    neighbor,
    constraint,
    flags,
    active,
    next,
    boundary)
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    for(var j=0; j<3; ++j) {
      var x = c[j], y = c[(j+1)%3]
      var a = neighbor[3*i+j] = index.locate(y, x, triangulation.opposite(y, x))
      var b = constraint[3*i+j] = triangulation.isConstraint(x, y)
      if(a < 0) {
        if(b) {
          next.push(i)
        } else {
          active.push(i)
          flags[i] = 1
        }
        if(infinity) {
          boundary.push([y, x, -1])
        }
      }
    }
  }
  return index
}

function filterCells(cells, flags, target) {
  var ptr = 0
  for(var i=0; i<cells.length; ++i) {
    if(flags[i] === target) {
      cells[ptr++] = cells[i]
    }
  }
  cells.length = ptr
  return cells
}

function classifyFaces(triangulation, target, infinity) {
  var index = indexCells(triangulation, infinity)

  if(target === 0) {
    if(infinity) {
      return index.cells.concat(index.boundary)
    } else {
      return index.cells
    }
  }

  var side = 1
  var active = index.active
  var next = index.next
  var flags = index.flags
  var cells = index.cells
  var constraint = index.constraint
  var neighbor = index.neighbor

  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop()
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side
      var c = cells[t]
      for(var j=0; j<3; ++j) {
        var f = neighbor[3*t+j]
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f)
          } else {
            active.push(f)
            flags[f] = side
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next
    next = active
    active = tmp
    next.length = 0
    side = -side
  }

  var result = filterCells(cells, flags, target)
  if(infinity) {
    return result.concat(index.boundary)
  }
  return result
}

},{"binary-search-bounds":9}],13:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')
var orient = require('robust-orientation')[3]

var EVENT_POINT = 0
var EVENT_END   = 1
var EVENT_START = 2

module.exports = monotoneTriangulate

//A partial convex hull fragment, made of two unimonotone polygons
function PartialHull(a, b, idx, lowerIds, upperIds) {
  this.a = a
  this.b = b
  this.idx = idx
  this.lowerIds = lowerIds
  this.upperIds = upperIds
}

//An event in the sweep line procedure
function Event(a, b, type, idx) {
  this.a    = a
  this.b    = b
  this.type = type
  this.idx  = idx
}

//This is used to compare events for the sweep line procedure
// Points are:
//  1. sorted lexicographically
//  2. sorted by type  (point < end < start)
//  3. segments sorted by winding order
//  4. sorted by index
function compareEvent(a, b) {
  var d =
    (a.a[0] - b.a[0]) ||
    (a.a[1] - b.a[1]) ||
    (a.type - b.type)
  if(d) { return d }
  if(a.type !== EVENT_POINT) {
    d = orient(a.a, a.b, b.b)
    if(d) { return d }
  }
  return a.idx - b.idx
}

function testPoint(hull, p) {
  return orient(hull.a, hull.b, p)
}

function addPoint(cells, hulls, points, p, idx) {
  var lo = bsearch.lt(hulls, p, testPoint)
  var hi = bsearch.gt(hulls, p, testPoint)
  for(var i=lo; i<hi; ++i) {
    var hull = hulls[i]

    //Insert p into lower hull
    var lowerIds = hull.lowerIds
    var m = lowerIds.length
    while(m > 1 && orient(
        points[lowerIds[m-2]],
        points[lowerIds[m-1]],
        p) > 0) {
      cells.push(
        [lowerIds[m-1],
         lowerIds[m-2],
         idx])
      m -= 1
    }
    lowerIds.length = m
    lowerIds.push(idx)

    //Insert p into upper hull
    var upperIds = hull.upperIds
    var m = upperIds.length
    while(m > 1 && orient(
        points[upperIds[m-2]],
        points[upperIds[m-1]],
        p) < 0) {
      cells.push(
        [upperIds[m-2],
         upperIds[m-1],
         idx])
      m -= 1
    }
    upperIds.length = m
    upperIds.push(idx)
  }
}

function findSplit(hull, edge) {
  var d
  if(hull.a[0] < edge.a[0]) {
    d = orient(hull.a, hull.b, edge.a)
  } else {
    d = orient(edge.b, edge.a, hull.a)
  }
  if(d) { return d }
  if(edge.b[0] < hull.b[0]) {
    d = orient(hull.a, hull.b, edge.b)
  } else {
    d = orient(edge.b, edge.a, hull.b)
  }
  return d || hull.idx - edge.idx
}

function splitHulls(hulls, points, event) {
  var splitIdx = bsearch.le(hulls, event, findSplit)
  var hull = hulls[splitIdx]
  var upperIds = hull.upperIds
  var x = upperIds[upperIds.length-1]
  hull.upperIds = [x]
  hulls.splice(splitIdx+1, 0,
    new PartialHull(event.a, event.b, event.idx, [x], upperIds))
}


function mergeHulls(hulls, points, event) {
  //Swap pointers for merge search
  var tmp = event.a
  event.a = event.b
  event.b = tmp
  var mergeIdx = bsearch.eq(hulls, event, findSplit)
  var upper = hulls[mergeIdx]
  var lower = hulls[mergeIdx-1]
  lower.upperIds = upper.upperIds
  hulls.splice(mergeIdx, 1)
}


function monotoneTriangulate(points, edges) {

  var numPoints = points.length
  var numEdges = edges.length

  var events = []

  //Create point events
  for(var i=0; i<numPoints; ++i) {
    events.push(new Event(
      points[i],
      null,
      EVENT_POINT,
      i))
  }

  //Create edge events
  for(var i=0; i<numEdges; ++i) {
    var e = edges[i]
    var a = points[e[0]]
    var b = points[e[1]]
    if(a[0] < b[0]) {
      events.push(
        new Event(a, b, EVENT_START, i),
        new Event(b, a, EVENT_END, i))
    } else if(a[0] > b[0]) {
      events.push(
        new Event(b, a, EVENT_START, i),
        new Event(a, b, EVENT_END, i))
    }
  }

  //Sort events
  events.sort(compareEvent)

  //Initialize hull
  var minX = events[0].a[0] - (1 + Math.abs(events[0].a[0])) * Math.pow(2, -52)
  var hull = [ new PartialHull([minX, 1], [minX, 0], -1, [], [], [], []) ]

  //Process events in order
  var cells = []
  for(var i=0, numEvents=events.length; i<numEvents; ++i) {
    var event = events[i]
    var type = event.type
    if(type === EVENT_POINT) {
      addPoint(cells, hull, points, event.a, event.idx)
    } else if(type === EVENT_START) {
      splitHulls(hull, points, event)
    } else {
      mergeHulls(hull, points, event)
    }
  }

  //Return triangulation
  return cells
}

},{"binary-search-bounds":9,"robust-orientation":26}],14:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = createTriangulation

function Triangulation(stars, edges) {
  this.stars = stars
  this.edges = edges
}

var proto = Triangulation.prototype

function removePair(list, j, k) {
  for(var i=1, n=list.length; i<n; i+=2) {
    if(list[i-1] === j && list[i] === k) {
      list[i-1] = list[n-2]
      list[i] = list[n-1]
      list.length = n - 2
      return
    }
  }
}

proto.isConstraint = (function() {
  var e = [0,0]
  function compareLex(a, b) {
    return a[0] - b[0] || a[1] - b[1]
  }
  return function(i, j) {
    e[0] = Math.min(i,j)
    e[1] = Math.max(i,j)
    return bsearch.eq(this.edges, e, compareLex) >= 0
  }
})()

proto.removeTriangle = function(i, j, k) {
  var stars = this.stars
  removePair(stars[i], j, k)
  removePair(stars[j], k, i)
  removePair(stars[k], i, j)
}

proto.addTriangle = function(i, j, k) {
  var stars = this.stars
  stars[i].push(j, k)
  stars[j].push(k, i)
  stars[k].push(i, j)
}

proto.opposite = function(j, i) {
  var list = this.stars[i]
  for(var k=1, n=list.length; k<n; k+=2) {
    if(list[k] === j) {
      return list[k-1]
    }
  }
  return -1
}

proto.flip = function(i, j) {
  var a = this.opposite(i, j)
  var b = this.opposite(j, i)
  this.removeTriangle(i, j, a)
  this.removeTriangle(j, i, b)
  this.addTriangle(i, b, a)
  this.addTriangle(j, a, b)
}

proto.edges = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      result.push([list[j], list[j+1]])
    }
  }
  return result
}

proto.cells = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      var s = list[j]
      var t = list[j+1]
      if(i < Math.min(s, t)) {
        result.push([i, s, t])
      }
    }
  }
  return result
}

function createTriangulation(numVerts, edges) {
  var stars = new Array(numVerts)
  for(var i=0; i<numVerts; ++i) {
    stars[i] = []
  }
  return new Triangulation(stars, edges)
}

},{"binary-search-bounds":9}],15:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustDiff = require("robust-subtract")
var robustScale = require("robust-scale")

var NUM_EXPAND = 6

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-2), "]"].join("")
    }
  }
  return result
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function makeProduct(a, b) {
  if(a.charAt(0) === "m") {
    if(b.charAt(0) === "w") {
      var toks = a.split("[")
      return ["w", b.substr(1), "m", toks[0].substr(1)].join("")
    } else {
      return ["prod(", a, ",", b, ")"].join("")
    }
  } else {
    return makeProduct(b, a)
  }
}

function sign(s) {
  if(s & 1 !== 0) {
    return "-"
  }
  return ""
}

function determinant(m) {
  if(m.length === 2) {
    return [["diff(", makeProduct(m[0][0], m[1][1]), ",", makeProduct(m[1][0], m[0][1]), ")"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function makeSquare(d, n) {
  var terms = []
  for(var i=0; i<n-2; ++i) {
    terms.push(["prod(m", d, "[", i, "],m", d, "[", i, "])"].join(""))
  }
  return generateSum(terms)
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  for(var i=0; i<n; ++i) {
    m[0][i] = "1"
    m[n-1][i] = "w"+i
  } 
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos,determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg,determinant(cofactor(m, i)))
    }
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "exactInSphere" + n
  var funcArgs = []
  for(var i=0; i<n; ++i) {
    funcArgs.push("m" + i)
  }
  var code = ["function ", funcName, "(", funcArgs.join(), "){"]
  for(var i=0; i<n; ++i) {
    code.push("var w",i,"=",makeSquare(i,n),";")
    for(var j=0; j<n; ++j) {
      if(j !== i) {
        code.push("var w",i,"m",j,"=scale(w",i,",m",j,"[0]);")
      }
    }
  }
  code.push("var p=", posExpr, ",n=", negExpr, ",d=diff(p,n);return d[d.length-1];}return ", funcName)
  var proc = new Function("sum", "diff", "prod", "scale", code.join(""))
  return proc(robustSum, robustDiff, twoProduct, robustScale)
}

function inSphere0() { return 0 }
function inSphere1() { return 0 }
function inSphere2() { return 0 }

var CACHED = [
  inSphere0,
  inSphere1,
  inSphere2
]

function slowInSphere(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateInSphereTest() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function testInSphere(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return testInSphere")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)

  module.exports = proc.apply(undefined, [slowInSphere].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateInSphereTest()
},{"robust-scale":17,"robust-subtract":18,"robust-sum":19,"two-product":20}],16:[function(require,module,exports){
"use strict"

module.exports = fastTwoSum

function fastTwoSum(a, b, result) {
	var x = a + b
	var bv = x - a
	var av = x - bv
	var br = b - bv
	var ar = a - av
	if(result) {
		result[0] = ar + br
		result[1] = x
		return result
	}
	return [ar+br, x]
}
},{}],17:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var twoSum = require("two-sum")

module.exports = scaleLinearExpansion

function scaleLinearExpansion(e, scale) {
  var n = e.length
  if(n === 1) {
    var ts = twoProduct(e[0], scale)
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n)
  var q = [0.1, 0.1]
  var t = [0.1, 0.1]
  var count = 0
  twoProduct(e[0], scale, q)
  if(q[0]) {
    g[count++] = q[0]
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t)
    var pq = q[1]
    twoSum(pq, t[0], q)
    if(q[0]) {
      g[count++] = q[0]
    }
    var a = t[1]
    var b = q[1]
    var x = a + b
    var bv = x - a
    var y = b - bv
    q[1] = x
    if(y) {
      g[count++] = y
    }
  }
  if(q[1]) {
    g[count++] = q[1]
  }
  if(count === 0) {
    g[count++] = 0.0
  }
  g.length = count
  return g
}
},{"two-product":20,"two-sum":16}],18:[function(require,module,exports){
"use strict"

module.exports = robustSubtract

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = -f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = -f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],19:[function(require,module,exports){
"use strict"

module.exports = linearExpansionSum

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],20:[function(require,module,exports){
"use strict"

module.exports = twoProduct

var SPLITTER = +(Math.pow(2, 27) + 1.0)

function twoProduct(a, b, result) {
  var x = a * b

  var c = SPLITTER * a
  var abig = c - a
  var ahi = c - abig
  var alo = a - ahi

  var d = SPLITTER * b
  var bbig = d - b
  var bhi = d - bbig
  var blo = b - bhi

  var err1 = x - (ahi * bhi)
  var err2 = err1 - (alo * bhi)
  var err3 = err2 - (ahi * blo)

  var y = alo * blo - err3

  if(result) {
    result[0] = y
    result[1] = x
    return result
  }

  return [ y, x ]
}
},{}],21:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],22:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"two-product":25,"two-sum":21}],23:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],24:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],25:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],26:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustScale = require("robust-scale")
var robustSubtract = require("robust-subtract")

var NUM_EXPAND = 5

var EPSILON     = 1.1102230246251565e-16
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("")
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  var args = []
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)))
    }
    args.push("m" + i)
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "orientation" + n + "Exact"
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("")
  var proc = new Function("sum", "prod", "scale", "sub", code)
  return proc(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3)
var orientation4Exact = orientation(4)

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0])
    var r = (a[0] - c[0]) * (b[1] - c[1])
    var det = l - r
    var s
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r)
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0]
    var bdx = b[0] - d[0]
    var cdx = c[0] - d[0]
    var ady = a[1] - d[1]
    var bdy = b[1] - d[1]
    var cdy = c[1] - d[1]
    var adz = a[2] - d[2]
    var bdz = b[2] - d[2]
    var cdz = c[2] - d[2]
    var bdxcdy = bdx * cdy
    var cdxbdy = cdx * bdy
    var cdxady = cdx * ady
    var adxcdy = adx * cdy
    var adxbdy = adx * bdy
    var bdxady = bdx * ady
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady)
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    var tol = ERRBOUND4 * permanent
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
]

function slowOrient(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateOrientationProc()
},{"robust-scale":22,"robust-subtract":23,"robust-sum":24,"two-product":25}],27:[function(require,module,exports){
'use strict'

module.exports = cleanPSLG

var UnionFind = require('union-find')
var boxIntersect = require('box-intersect')
var compareCell = require('compare-cell')
var segseg = require('robust-segment-intersect')
var rat = require('big-rat')
var ratCmp = require('big-rat/cmp')
var ratToFloat = require('big-rat/to-float')
var ratVec = require('rat-vec')
var nextafter = require('nextafter')

var solveIntersection = require('./lib/rat-seg-intersect')

//Bounds on a rational number when rounded to a float
function boundRat(r) {
  var f = ratToFloat(r)
  var cmp = ratCmp(rat(f), r)
  if(cmp < 0) {
    return [f, nextafter(f, Infinity)]
  } else if(cmp > 0) {
    return [nextafter(f, -Infinity), f]
  } else {
    return [f, f]
  }
}

//Convert a list of edges in a pslg to bounding boxes
function boundEdges(points, edges) {
  var bounds = new Array(edges.length)
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    var a = points[e[0]]
    var b = points[e[1]]
    bounds[i] = [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.max(a[0], b[0]),
      Math.max(a[1], b[1]) ]
  }
  return bounds
}

//Convert a list of points into bounding boxes by duplicating coords
function boundPoints(points) {
  var bounds = new Array(points.length)
  for(var i=0; i<points.length; ++i) {
    var p = points[i]
    bounds[i] = [ p[0], p[1], p[0], p[1] ]
  }
  return bounds
}

//Find all pairs of crossing edges in a pslg (given edge bounds)
function getCrossings(points, edges, edgeBounds) {
  var result = []
  boxIntersect(edgeBounds, function(i, j) {
    var e = edges[i]
    var f = edges[j]
    if(e[0] === f[0] || e[0] === f[1] ||
       e[1] === f[0] || e[1] === f[1]) {
         return
    }
    var a = points[e[0]]
    var b = points[e[1]]
    var c = points[f[0]]
    var d = points[f[1]]
    if(segseg(a, b, c, d)) {
      result.push([i, j])
    }
  })
  return result
}

//Find all pairs of crossing vertices in a pslg (given edge/vert bounds)
function getTJunctions(points, edges, edgeBounds, vertBounds) {
  var result = []
  boxIntersect(edgeBounds, vertBounds, function(i, v) {
    var e = edges[i]
    if(e[0] === v || e[1] === v) {
      return
    }
    var p = points[v]
    var a = points[e[0]]
    var b = points[e[1]]
    if(segseg(a, b, p, p)) {
      result.push([i, v])
    }
  })
  return result
}


//Cut edges along crossings/tjunctions
function cutEdges(floatPoints, edges, crossings, junctions, useColor) {

  //Convert crossings into tjunctions by constructing rational points
  var ratPoints = []
  for(var i=0; i<crossings.length; ++i) {
    var crossing = crossings[i]
    var e = crossing[0]
    var f = crossing[1]
    var ee = edges[e]
    var ef = edges[f]
    var x = solveIntersection(
      ratVec(floatPoints[ee[0]]),
      ratVec(floatPoints[ee[1]]),
      ratVec(floatPoints[ef[0]]),
      ratVec(floatPoints[ef[1]]))
    if(!x) {
      //Segments are parallel, should already be handled by t-junctions
      continue
    }
    var idx = ratPoints.length + floatPoints.length
    ratPoints.push(x)
    junctions.push([e, idx], [f, idx])
  }

  //Sort tjunctions
  function getPoint(idx) {
    if(idx >= floatPoints.length) {
      return ratPoints[idx-floatPoints.length]
    }
    var p = floatPoints[idx]
    return [ rat(p[0]), rat(p[1]) ]
  }
  junctions.sort(function(a, b) {
    if(a[0] !== b[0]) {
      return a[0] - b[0]
    }
    var u = getPoint(a[1])
    var v = getPoint(b[1])
    return ratCmp(u[0], v[0]) || ratCmp(u[1], v[1])
  })

  //Split edges along junctions
  for(var i=junctions.length-1; i>=0; --i) {
    var junction = junctions[i]
    var e = junction[0]

    var edge = edges[e]
    var s = edge[0]
    var t = edge[1]

    //Check if edge is not lexicographically sorted
    var a = floatPoints[s]
    var b = floatPoints[t]
    if(((a[0] - b[0]) || (a[1] - b[1])) < 0) {
      var tmp = s
      s = t
      t = tmp
    }

    //Split leading edge
    edge[0] = s
    var last = edge[1] = junction[1]

    //If we are grouping edges by color, remember to track data
    var color
    if(useColor) {
      color = edge[2]
    }

    //Split other edges
    while(i > 0 && junctions[i-1][0] === e) {
      var junction = junctions[--i]
      var next = junction[1]
      if(useColor) {
        edges.push([last, next, color])
      } else {
        edges.push([last, next])
      }
      last = next
    }

    //Add final edge
    if(useColor) {
      edges.push([last, t, color])
    } else {
      edges.push([last, t])
    }
  }

  //Return constructed rational points
  return ratPoints
}

//Merge overlapping points
function dedupPoints(floatPoints, ratPoints, floatBounds) {
  var numPoints = floatPoints.length + ratPoints.length
  var uf        = new UnionFind(numPoints)

  //Compute rational bounds
  var bounds = floatBounds
  for(var i=0; i<ratPoints.length; ++i) {
    var p = ratPoints[i]
    var xb = boundRat(p[0])
    var yb = boundRat(p[1])
    bounds.push([ xb[0], yb[0], xb[1], yb[1] ])
    floatPoints.push([ ratToFloat(p[0]), ratToFloat(p[1]) ])
  }

  //Link all points with over lapping boxes
  boxIntersect(bounds, function(i, j) {
    uf.link(i, j)
  })

  //Call find on each point to get a relabeling
  var ptr = 0
  var noDupes = true
  var labels = new Array(numPoints)
  for(var i=0; i<numPoints; ++i) {
    var j = uf.find(i)
    if(j === i) {
      //If not a duplicate, then don't bother
      labels[i] = ptr
      floatPoints[ptr++] = floatPoints[i]
    } else {
      //Clear no-dupes flag, zero out label
      noDupes = false
      labels[i] = -1
    }
  }
  floatPoints.length = ptr

  //If no duplicates, return null to signal termination
  if(noDupes) {
    return null
  }

  //Do a second pass to fix up missing labels
  for(var i=0; i<numPoints; ++i) {
    if(labels[i] < 0) {
      labels[i] = labels[uf.find(i)]
    }
  }

  //Return resulting union-find data structure
  return labels
}

function compareLex2(a,b) { return (a[0]-b[0]) || (a[1]-b[1]) }
function compareLex3(a,b) {
  var d = (a[0] - b[0]) || (a[1] - b[1])
  if(d) {
    return d
  }
  if(a[2] < b[2]) {
    return -1
  } else if(a[2] > b[2]) {
    return 1
  }
  return 0
}

//Remove duplicate edge labels
function dedupEdges(edges, labels, useColor) {
  if(edges.length === 0) {
    return
  }
  if(labels) {
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      var a = labels[e[0]]
      var b = labels[e[1]]
      e[0] = Math.min(a, b)
      e[1] = Math.max(a, b)
    }
  } else {
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      var a = e[0]
      var b = e[1]
      e[0] = Math.min(a, b)
      e[1] = Math.max(a, b)
    }
  }
  if(useColor) {
    edges.sort(compareLex3)
  } else {
    edges.sort(compareLex2)
  }
  var ptr = 1
  for(var i=1; i<edges.length; ++i) {
    var prev = edges[i-1]
    var next = edges[i]
    if(next[0] === prev[0] && next[1] === prev[1] &&
      (!useColor || next[2] === prev[2])) {
      continue
    }
    edges[ptr++] = next
  }
  edges.length = ptr
}

//Repeat until convergence
function snapRound(points, edges, useColor) {

  // 1. find edge crossings
  var edgeBounds = boundEdges(points, edges)
  var crossings  = getCrossings(points, edges, edgeBounds)

  // 2. find t-junctions
  var vertBounds = boundPoints(points)
  var tjunctions = getTJunctions(points, edges, edgeBounds, vertBounds)

  // 3. cut edges, construct rational points
  var ratPoints  = cutEdges(points, edges, crossings, tjunctions, useColor)

  // 4. dedupe verts
  var labels     = dedupPoints(points, ratPoints, vertBounds)

  // 6. dedupe edges
  dedupEdges(edges, labels, useColor)

  // 5. check termination
  if(!labels) {
    return (crossings.length > 0 || tjunctions.length > 0)
  }

  // More iterations necessary
  return true
}

//Main loop, runs PSLG clean up until completion
function cleanPSLG(points, edges, colors) {
  var modified = false

  //If using colors, augment edges with color data
  var prevEdges
  if(colors) {
    prevEdges = edges
    var augEdges = new Array(edges.length)
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      augEdges[i] = [e[0], e[1], colors[i]]
    }
    edges = augEdges
  }

  //Run snap rounding until convergence
  while(snapRound(points, edges, !!colors)) {
    modified = true
  }

  //Strip color tags
  if(!!colors && modified) {
    prevEdges.length = 0
    colors.length = 0
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      prevEdges.push([e[0], e[1]])
      colors.push(e[2])
    }
  }

  return modified
}

},{"./lib/rat-seg-intersect":28,"big-rat":32,"big-rat/cmp":30,"big-rat/to-float":47,"box-intersect":48,"compare-cell":58,"nextafter":59,"rat-vec":62,"robust-segment-intersect":71,"union-find":72}],28:[function(require,module,exports){
'use strict'

//TODO: Move this to a separate module

module.exports = solveIntersection

var ratMul = require('big-rat/mul')
var ratDiv = require('big-rat/div')
var ratSub = require('big-rat/sub')
var ratSign = require('big-rat/sign')
var rvSub = require('rat-vec/sub')
var rvAdd = require('rat-vec/add')
var rvMuls = require('rat-vec/muls')

var toFloat = require('big-rat/to-float')

function ratPerp(a, b) {
  return ratSub(ratMul(a[0], b[1]), ratMul(a[1], b[0]))
}

//Solve for intersection
//  x = a + t (b-a)
//  (x - c) ^ (d-c) = 0
//  (t * (b-a) + (a-c) ) ^ (d-c) = 0
//  t * (b-a)^(d-c) = (d-c)^(a-c)
//  t = (d-c)^(a-c) / (b-a)^(d-c)

function solveIntersection(a, b, c, d) {
  var ba = rvSub(b, a)
  var dc = rvSub(d, c)

  var baXdc = ratPerp(ba, dc)

  if(ratSign(baXdc) === 0) {
    return null
  }

  var ac = rvSub(a, c)
  var dcXac = ratPerp(dc, ac)

  var t = ratDiv(dcXac, baXdc)

  return rvAdd(a, rvMuls(ba, t))
}

},{"big-rat/div":31,"big-rat/mul":41,"big-rat/sign":45,"big-rat/sub":46,"big-rat/to-float":47,"rat-vec/add":61,"rat-vec/muls":63,"rat-vec/sub":64}],29:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = add

function add(a, b) {
  return rationalize(
    a[0].mul(b[1]).add(b[0].mul(a[1])),
    a[1].mul(b[1]))
}

},{"./lib/rationalize":39}],30:[function(require,module,exports){
'use strict'

module.exports = cmp

function cmp(a, b) {
    return a[0].mul(b[1]).cmp(b[0].mul(a[1]))
}

},{}],31:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = div

function div(a, b) {
  return rationalize(a[0].mul(b[1]), a[1].mul(b[0]))
}

},{"./lib/rationalize":39}],32:[function(require,module,exports){
'use strict'

var isRat = require('./is-rat')
var isBN = require('./lib/is-bn')
var num2bn = require('./lib/num-to-bn')
var str2bn = require('./lib/str-to-bn')
var rationalize = require('./lib/rationalize')
var div = require('./div')

module.exports = makeRational

function makeRational(numer, denom) {
  if(isRat(numer)) {
    if(denom) {
      return div(numer, makeRational(denom))
    }
    return [numer[0].clone(), numer[1].clone()]
  }
  var shift = 0
  var a, b
  if(isBN(numer)) {
    a = numer.clone()
  } else if(typeof numer === 'string') {
    a = str2bn(numer)
  } else if(numer === 0) {
    return [num2bn(0), num2bn(1)]
  } else if(numer === Math.floor(numer)) {
    a = num2bn(numer)
  } else {
    while(numer !== Math.floor(numer)) {
      numer = numer * Math.pow(2, 256)
      shift -= 256
    }
    a = num2bn(numer)
  }
  if(isRat(denom)) {
    a.mul(denom[1])
    b = denom[0].clone()
  } else if(isBN(denom)) {
    b = denom.clone()
  } else if(typeof denom === 'string') {
    b = str2bn(denom)
  } else if(!denom) {
    b = num2bn(1)
  } else if(denom === Math.floor(denom)) {
    b = num2bn(denom)
  } else {
    while(denom !== Math.floor(denom)) {
      denom = denom * Math.pow(2, 256)
      shift += 256
    }
    b = num2bn(denom)
  }
  if(shift > 0) {
    a = a.shln(shift)
  } else if(shift < 0) {
    b = b.shln(-shift)
  }
  return rationalize(a, b)
}

},{"./div":31,"./is-rat":33,"./lib/is-bn":37,"./lib/num-to-bn":38,"./lib/rationalize":39,"./lib/str-to-bn":40}],33:[function(require,module,exports){
'use strict'

var isBN = require('./lib/is-bn')

module.exports = isRat

function isRat(x) {
  return Array.isArray(x) && x.length === 2 && isBN(x[0]) && isBN(x[1])
}

},{"./lib/is-bn":37}],34:[function(require,module,exports){
'use strict'

var bn = require('bn.js')

module.exports = sign

function sign(x) {
  return x.cmp(new bn(0))
}

},{"bn.js":43}],35:[function(require,module,exports){
'use strict'

module.exports = bn2num

//TODO: Make this better
function bn2num(b) {
  var l = b.length
  var words = b.words
  var out = 0
  if (l === 1) {
    out = words[0]
  } else if (l === 2) {
    out = words[0] + (words[1] * 0x4000000)
  } else {
    var out = 0
    for (var i = 0; i < l; i++) {
      var w = words[i]
      out += w * Math.pow(0x4000000, i)
    }
  }
  return b.sign ? -out : out
}

},{}],36:[function(require,module,exports){
'use strict'

var db = require('double-bits')
var ctz = require('bit-twiddle').countTrailingZeros

module.exports = ctzNumber

//Counts the number of trailing zeros
function ctzNumber(x) {
  var l = ctz(db.lo(x))
  if(l < 32) {
    return l
  }
  var h = ctz(db.hi(x))
  if(h > 20) {
    return 52
  }
  return h + 32
}

},{"bit-twiddle":42,"double-bits":44}],37:[function(require,module,exports){
'use strict'

var BN = require('bn.js')

module.exports = isBN

//Test if x is a bignumber
//FIXME: obviously this is the wrong way to do it
function isBN(x) {
  return x && typeof x === 'object' && Boolean(x.words)
}

},{"bn.js":43}],38:[function(require,module,exports){
'use strict'

var BN = require('bn.js')
var db = require('double-bits')

module.exports = num2bn

function num2bn(x) {
  var e = db.exponent(x)
  if(e < 52) {
    return new BN(x)
  } else {
    return (new BN(x * Math.pow(2, 52-e))).shln(e-52)
  }
}

},{"bn.js":43,"double-bits":44}],39:[function(require,module,exports){
'use strict'

var num2bn = require('./num-to-bn')
var sign = require('./bn-sign')

module.exports = rationalize

function rationalize(numer, denom) {
  var snumer = sign(numer)
  var sdenom = sign(denom)
  if(snumer === 0) {
    return [num2bn(0), num2bn(1)]
  }
  if(sdenom === 0) {
    return [num2bn(0), num2bn(0)]
  }
  if(sdenom < 0) {
    numer = numer.neg()
    denom = denom.neg()
  }
  var d = numer.gcd(denom)
  if(d.cmpn(1)) {
    return [ numer.div(d), denom.div(d) ]
  }
  return [ numer, denom ]
}

},{"./bn-sign":34,"./num-to-bn":38}],40:[function(require,module,exports){
'use strict'

var BN = require('bn.js')

module.exports = str2BN

function str2BN(x) {
  return new BN(x)
}

},{"bn.js":43}],41:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = mul

function mul(a, b) {
  return rationalize(a[0].mul(b[0]), a[1].mul(b[1]))
}

},{"./lib/rationalize":39}],42:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],43:[function(require,module,exports){
(function (module, exports) {

'use strict';

// Utils

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

// Could use `inherits` module, but don't want to move from single file
// architecture yet.
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  var TempCtor = function () {};
  TempCtor.prototype = superCtor.prototype;
  ctor.prototype = new TempCtor();
  ctor.prototype.constructor = ctor;
}

// BN

function BN(number, base, endian) {
  // May be `new BN(bn)` ?
  if (number !== null &&
      typeof number === 'object' &&
      Array.isArray(number.words)) {
    return number;
  }

  this.sign = false;
  this.words = null;
  this.length = 0;

  // Reduction context
  this.red = null;

  if (base === 'le' || base === 'be') {
    endian = base;
    base = 10;
  }

  if (number !== null)
    this._init(number || 0, base || 10, endian || 'be');
}
if (typeof module === 'object')
  module.exports = BN;
else
  exports.BN = BN;

BN.BN = BN;
BN.wordSize = 26;

BN.prototype._init = function init(number, base, endian) {
  if (typeof number === 'number') {
    return this._initNumber(number, base, endian);
  } else if (typeof number === 'object') {
    return this._initArray(number, base, endian);
  }
  if (base === 'hex')
    base = 16;
  assert(base === (base | 0) && base >= 2 && base <= 36);

  number = number.toString().replace(/\s+/g, '');
  var start = 0;
  if (number[0] === '-')
    start++;

  if (base === 16)
    this._parseHex(number, start);
  else
    this._parseBase(number, base, start);

  if (number[0] === '-')
    this.sign = true;

  this.strip();

  if (endian !== 'le')
    return;

  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initNumber = function _initNumber(number, base, endian) {
  if (number < 0) {
    this.sign = true;
    number = -number;
  }
  if (number < 0x4000000) {
    this.words = [ number & 0x3ffffff ];
    this.length = 1;
  } else if (number < 0x10000000000000) {
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff
    ];
    this.length = 2;
  } else {
    assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff,
      1
    ];
    this.length = 3;
  }

  if (endian !== 'le')
    return;

  // Reverse the bytes
  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initArray = function _initArray(number, base, endian) {
  // Perhaps a Uint8Array
  assert(typeof number.length === 'number');
  if (number.length <= 0) {
    this.words = [ 0 ];
    this.length = 1;
    return this;
  }

  this.length = Math.ceil(number.length / 3);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  var off = 0;
  if (endian === 'be') {
    for (var i = number.length - 1, j = 0; i >= 0; i -= 3) {
      var w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  } else if (endian === 'le') {
    for (var i = 0, j = 0; i < number.length; i += 3) {
      var w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  }
  return this.strip();
};

function parseHex(str, start, end) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r <<= 4;

    // 'a' - 'f'
    if (c >= 49 && c <= 54)
      r |= c - 49 + 0xa;

    // 'A' - 'F'
    else if (c >= 17 && c <= 22)
      r |= c - 17 + 0xa;

    // '0' - '9'
    else
      r |= c & 0xf;
  }
  return r;
}

BN.prototype._parseHex = function _parseHex(number, start) {
  // Create possibly bigger array to ensure that it fits the number
  this.length = Math.ceil((number.length - start) / 6);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  // Scan 24-bit chunks and add them to the number
  var off = 0;
  for (var i = number.length - 6, j = 0; i >= start; i -= 6) {
    var w = parseHex(number, i, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    off += 24;
    if (off >= 26) {
      off -= 26;
      j++;
    }
  }
  if (i + 6 !== start) {
    var w = parseHex(number, start, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
  }
  this.strip();
};

function parseBase(str, start, end, mul) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r *= mul;

    // 'a'
    if (c >= 49)
      r += c - 49 + 0xa;

    // 'A'
    else if (c >= 17)
      r += c - 17 + 0xa;

    // '0' - '9'
    else
      r += c;
  }
  return r;
}

BN.prototype._parseBase = function _parseBase(number, base, start) {
  // Initialize as zero
  this.words = [ 0 ];
  this.length = 1;

  // Find length of limb in base
  for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base)
    limbLen++;
  limbLen--;
  limbPow = (limbPow / base) | 0;

  var total = number.length - start;
  var mod = total % limbLen;
  var end = Math.min(total, total - mod) + start;

  var word = 0;
  for (var i = start; i < end; i += limbLen) {
    word = parseBase(number, i, i + limbLen, base);

    this.imuln(limbPow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }

  if (mod !== 0) {
    var pow = 1;
    var word = parseBase(number, i, number.length, base);

    for (var i = 0; i < mod; i++)
      pow *= base;
    this.imuln(pow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }
};

BN.prototype.copy = function copy(dest) {
  dest.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    dest.words[i] = this.words[i];
  dest.length = this.length;
  dest.sign = this.sign;
  dest.red = this.red;
};

BN.prototype.clone = function clone() {
  var r = new BN(null);
  this.copy(r);
  return r;
};

// Remove leading `0` from `this`
BN.prototype.strip = function strip() {
  while (this.length > 1 && this.words[this.length - 1] === 0)
    this.length--;
  return this._normSign();
};

BN.prototype._normSign = function _normSign() {
  // -0 = 0
  if (this.length === 1 && this.words[0] === 0)
    this.sign = false;
  return this;
};

BN.prototype.inspect = function inspect() {
  return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
};

/*

var zeros = [];
var groupSizes = [];
var groupBases = [];

var s = '';
var i = -1;
while (++i < BN.wordSize) {
  zeros[i] = s;
  s += '0';
}
groupSizes[0] = 0;
groupSizes[1] = 0;
groupBases[0] = 0;
groupBases[1] = 0;
var base = 2 - 1;
while (++base < 36 + 1) {
  var groupSize = 0;
  var groupBase = 1;
  while (groupBase < (1 << BN.wordSize) / base) {
    groupBase *= base;
    groupSize += 1;
  }
  groupSizes[base] = groupSize;
  groupBases[base] = groupBase;
}

*/

var zeros = [
  '',
  '0',
  '00',
  '000',
  '0000',
  '00000',
  '000000',
  '0000000',
  '00000000',
  '000000000',
  '0000000000',
  '00000000000',
  '000000000000',
  '0000000000000',
  '00000000000000',
  '000000000000000',
  '0000000000000000',
  '00000000000000000',
  '000000000000000000',
  '0000000000000000000',
  '00000000000000000000',
  '000000000000000000000',
  '0000000000000000000000',
  '00000000000000000000000',
  '000000000000000000000000',
  '0000000000000000000000000'
];

var groupSizes = [
  0, 0,
  25, 16, 12, 11, 10, 9, 8,
  8, 7, 7, 7, 7, 6, 6,
  6, 6, 6, 6, 6, 5, 5,
  5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5
];

var groupBases = [
  0, 0,
  33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
  43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
  16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
  6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
  24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
];

BN.prototype.toString = function toString(base, padding) {
  base = base || 10;
  if (base === 16 || base === 'hex') {
    var out = '';
    var off = 0;
    var padding = padding | 0 || 1;
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = this.words[i];
      var word = (((w << off) | carry) & 0xffffff).toString(16);
      carry = (w >>> (24 - off)) & 0xffffff;
      if (carry !== 0 || i !== this.length - 1)
        out = zeros[6 - word.length] + word + out;
      else
        out = word + out;
      off += 2;
      if (off >= 26) {
        off -= 26;
        i--;
      }
    }
    if (carry !== 0)
      out = carry.toString(16) + out;
    while (out.length % padding !== 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else if (base === (base | 0) && base >= 2 && base <= 36) {
    // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
    var groupSize = groupSizes[base];
    // var groupBase = Math.pow(base, groupSize);
    var groupBase = groupBases[base];
    var out = '';
    var c = this.clone();
    c.sign = false;
    while (c.cmpn(0) !== 0) {
      var r = c.modn(groupBase).toString(base);
      c = c.idivn(groupBase);

      if (c.cmpn(0) !== 0)
        out = zeros[groupSize - r.length] + r + out;
      else
        out = r + out;
    }
    if (this.cmpn(0) === 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else {
    assert(false, 'Base should be between 2 and 36');
  }
};

BN.prototype.toJSON = function toJSON() {
  return this.toString(16);
};

BN.prototype.toArray = function toArray(endian) {
  this.strip();
  var res = new Array(this.byteLength());
  res[0] = 0;

  var q = this.clone();
  if (endian !== 'le') {
    // Assume big-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[res.length - i - 1] = b;
    }
  } else {
    // Assume little-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[i] = b;
    }
  }

  return res;
};

if (Math.clz32) {
  BN.prototype._countBits = function _countBits(w) {
    return 32 - Math.clz32(w);
  };
} else {
  BN.prototype._countBits = function _countBits(w) {
    var t = w;
    var r = 0;
    if (t >= 0x1000) {
      r += 13;
      t >>>= 13;
    }
    if (t >= 0x40) {
      r += 7;
      t >>>= 7;
    }
    if (t >= 0x8) {
      r += 4;
      t >>>= 4;
    }
    if (t >= 0x02) {
      r += 2;
      t >>>= 2;
    }
    return r + t;
  };
}

BN.prototype._zeroBits = function _zeroBits(w) {
  // Short-cut
  if (w === 0)
    return 26;

  var t = w;
  var r = 0;
  if ((t & 0x1fff) === 0) {
    r += 13;
    t >>>= 13;
  }
  if ((t & 0x7f) === 0) {
    r += 7;
    t >>>= 7;
  }
  if ((t & 0xf) === 0) {
    r += 4;
    t >>>= 4;
  }
  if ((t & 0x3) === 0) {
    r += 2;
    t >>>= 2;
  }
  if ((t & 0x1) === 0)
    r++;
  return r;
};

// Return number of used bits in a BN
BN.prototype.bitLength = function bitLength() {
  var hi = 0;
  var w = this.words[this.length - 1];
  var hi = this._countBits(w);
  return (this.length - 1) * 26 + hi;
};

// Number of trailing zero bits
BN.prototype.zeroBits = function zeroBits() {
  if (this.cmpn(0) === 0)
    return 0;

  var r = 0;
  for (var i = 0; i < this.length; i++) {
    var b = this._zeroBits(this.words[i]);
    r += b;
    if (b !== 26)
      break;
  }
  return r;
};

BN.prototype.byteLength = function byteLength() {
  return Math.ceil(this.bitLength() / 8);
};

// Return negative clone of `this`
BN.prototype.neg = function neg() {
  if (this.cmpn(0) === 0)
    return this.clone();

  var r = this.clone();
  r.sign = !this.sign;
  return r;
};


// Or `num` with `this` in-place
BN.prototype.ior = function ior(num) {
  this.sign = this.sign || num.sign;

  while (this.length < num.length)
    this.words[this.length++] = 0;

  for (var i = 0; i < num.length; i++)
    this.words[i] = this.words[i] | num.words[i];

  return this.strip();
};


// Or `num` with `this`
BN.prototype.or = function or(num) {
  if (this.length > num.length)
    return this.clone().ior(num);
  else
    return num.clone().ior(this);
};


// And `num` with `this` in-place
BN.prototype.iand = function iand(num) {
  this.sign = this.sign && num.sign;

  // b = min-length(num, this)
  var b;
  if (this.length > num.length)
    b = num;
  else
    b = this;

  for (var i = 0; i < b.length; i++)
    this.words[i] = this.words[i] & num.words[i];

  this.length = b.length;

  return this.strip();
};


// And `num` with `this`
BN.prototype.and = function and(num) {
  if (this.length > num.length)
    return this.clone().iand(num);
  else
    return num.clone().iand(this);
};


// Xor `num` with `this` in-place
BN.prototype.ixor = function ixor(num) {
  this.sign = this.sign || num.sign;

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  for (var i = 0; i < b.length; i++)
    this.words[i] = a.words[i] ^ b.words[i];

  if (this !== a)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];

  this.length = a.length;

  return this.strip();
};


// Xor `num` with `this`
BN.prototype.xor = function xor(num) {
  if (this.length > num.length)
    return this.clone().ixor(num);
  else
    return num.clone().ixor(this);
};


// Set `bit` of `this`
BN.prototype.setn = function setn(bit, val) {
  assert(typeof bit === 'number' && bit >= 0);

  var off = (bit / 26) | 0;
  var wbit = bit % 26;

  while (this.length <= off)
    this.words[this.length++] = 0;

  if (val)
    this.words[off] = this.words[off] | (1 << wbit);
  else
    this.words[off] = this.words[off] & ~(1 << wbit);

  return this.strip();
};


// Add `num` to `this` in-place
BN.prototype.iadd = function iadd(num) {
  // negative + positive
  if (this.sign && !num.sign) {
    this.sign = false;
    var r = this.isub(num);
    this.sign = !this.sign;
    return this._normSign();

  // positive + negative
  } else if (!this.sign && num.sign) {
    num.sign = false;
    var r = this.isub(num);
    num.sign = true;
    return r._normSign();
  }

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] + b.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }

  this.length = a.length;
  if (carry !== 0) {
    this.words[this.length] = carry;
    this.length++;
  // Copy the rest of the words
  } else if (a !== this) {
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  }

  return this;
};

// Add `num` to `this`
BN.prototype.add = function add(num) {
  if (num.sign && !this.sign) {
    num.sign = false;
    var res = this.sub(num);
    num.sign = true;
    return res;
  } else if (!num.sign && this.sign) {
    this.sign = false;
    var res = num.sub(this);
    this.sign = true;
    return res;
  }

  if (this.length > num.length)
    return this.clone().iadd(num);
  else
    return num.clone().iadd(this);
};

// Subtract `num` from `this` in-place
BN.prototype.isub = function isub(num) {
  // this - (-num) = this + num
  if (num.sign) {
    num.sign = false;
    var r = this.iadd(num);
    num.sign = true;
    return r._normSign();

  // -this - num = -(this + num)
  } else if (this.sign) {
    this.sign = false;
    this.iadd(num);
    this.sign = true;
    return this._normSign();
  }

  // At this point both numbers are positive
  var cmp = this.cmp(num);

  // Optimization - zeroify
  if (cmp === 0) {
    this.sign = false;
    this.length = 1;
    this.words[0] = 0;
    return this;
  }

  // a > b
  var a;
  var b;
  if (cmp > 0) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] - b.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }

  // Copy rest of the words
  if (carry === 0 && i < a.length && a !== this)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  this.length = Math.max(this.length, i);

  if (a !== this)
    this.sign = true;

  return this.strip();
};

// Subtract `num` from `this`
BN.prototype.sub = function sub(num) {
  return this.clone().isub(num);
};

/*
// NOTE: This could be potentionally used to generate loop-less multiplications
function _genCombMulTo(alen, blen) {
  var len = alen + blen - 1;
  var src = [
    'var a = this.words, b = num.words, o = out.words, c = 0, w, ' +
        'mask = 0x3ffffff, shift = 0x4000000;',
    'out.length = ' + len + ';'
  ];
  for (var k = 0; k < len; k++) {
    var minJ = Math.max(0, k - alen + 1);
    var maxJ = Math.min(k, blen - 1);

    for (var j = minJ; j <= maxJ; j++) {
      var i = k - j;
      var mul = 'a[' + i + '] * b[' + j + ']';

      if (j === minJ) {
        src.push('w = ' + mul + ' + c;');
        src.push('c = (w / shift) | 0;');
      } else {
        src.push('w += ' + mul + ';');
        src.push('c += (w / shift) | 0;');
      }
      src.push('w &= mask;');
    }
    src.push('o[' + k + '] = w;');
  }
  src.push('if (c !== 0) {',
           '  o[' + k + '] = c;',
           '  out.length++;',
           '}',
           'return out;');

  return src.join('\n');
}
*/

BN.prototype._smallMulTo = function _smallMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = carry >>> 26;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;
    }
    out.words[k] = rword;
    carry = ncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype._bigMulTo = function _bigMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  var hncarry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = hncarry;
    hncarry = 0;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;

      hncarry += ncarry >>> 26;
      ncarry &= 0x3ffffff;
    }
    out.words[k] = rword;
    carry = ncarry;
    ncarry = hncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype.mulTo = function mulTo(num, out) {
  var res;
  if (this.length + num.length < 63)
    res = this._smallMulTo(num, out);
  else
    res = this._bigMulTo(num, out);
  return res;
};

// Multiply `this` by `num`
BN.prototype.mul = function mul(num) {
  var out = new BN(null);
  out.words = new Array(this.length + num.length);
  return this.mulTo(num, out);
};

// In-place Multiplication
BN.prototype.imul = function imul(num) {
  if (this.cmpn(0) === 0 || num.cmpn(0) === 0) {
    this.words[0] = 0;
    this.length = 1;
    return this;
  }

  var tlen = this.length;
  var nlen = num.length;

  this.sign = num.sign !== this.sign;
  this.length = this.length + num.length;
  this.words[this.length - 1] = 0;

  for (var k = this.length - 2; k >= 0; k--) {
    // Sum all words with the same `i + j = k` and accumulate `carry`,
    // note that carry could be >= 0x3ffffff
    var carry = 0;
    var rword = 0;
    var maxJ = Math.min(k, nlen - 1);
    for (var j = Math.max(0, k - tlen + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i];
      var b = num.words[j];
      var r = a * b;

      var lo = r & 0x3ffffff;
      carry += (r / 0x4000000) | 0;
      lo += rword;
      rword = lo & 0x3ffffff;
      carry += lo >>> 26;
    }
    this.words[k] = rword;
    this.words[k + 1] += carry;
    carry = 0;
  }

  // Propagate overflows
  var carry = 0;
  for (var i = 1; i < this.length; i++) {
    var w = this.words[i] + carry;
    this.words[i] = w & 0x3ffffff;
    carry = w >>> 26;
  }

  return this.strip();
};

BN.prototype.imuln = function imuln(num) {
  assert(typeof num === 'number');

  // Carry
  var carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = this.words[i] * num;
    var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
    carry >>= 26;
    carry += (w / 0x4000000) | 0;
    // NOTE: lo is 27bit maximum
    carry += lo >>> 26;
    this.words[i] = lo & 0x3ffffff;
  }

  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }

  return this;
};

BN.prototype.muln = function muln(num) {
  return this.clone().imuln(num);
};

// `this` * `this`
BN.prototype.sqr = function sqr() {
  return this.mul(this);
};

// `this` * `this` in-place
BN.prototype.isqr = function isqr() {
  return this.mul(this);
};

// Shift-left in-place
BN.prototype.ishln = function ishln(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;
  var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);

  if (r !== 0) {
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var newCarry = this.words[i] & carryMask;
      var c = (this.words[i] - newCarry) << r;
      this.words[i] = c | carry;
      carry = newCarry >>> (26 - r);
    }
    if (carry) {
      this.words[i] = carry;
      this.length++;
    }
  }

  if (s !== 0) {
    for (var i = this.length - 1; i >= 0; i--)
      this.words[i + s] = this.words[i];
    for (var i = 0; i < s; i++)
      this.words[i] = 0;
    this.length += s;
  }

  return this.strip();
};

// Shift-right in-place
// NOTE: `hint` is a lowest bit before trailing zeroes
// NOTE: if `extended` is present - it will be filled with destroyed bits
BN.prototype.ishrn = function ishrn(bits, hint, extended) {
  assert(typeof bits === 'number' && bits >= 0);
  var h;
  if (hint)
    h = (hint - (hint % 26)) / 26;
  else
    h = 0;

  var r = bits % 26;
  var s = Math.min((bits - r) / 26, this.length);
  var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
  var maskedWords = extended;

  h -= s;
  h = Math.max(0, h);

  // Extended mode, copy masked part
  if (maskedWords) {
    for (var i = 0; i < s; i++)
      maskedWords.words[i] = this.words[i];
    maskedWords.length = s;
  }

  if (s === 0) {
    // No-op, we should not move anything at all
  } else if (this.length > s) {
    this.length -= s;
    for (var i = 0; i < this.length; i++)
      this.words[i] = this.words[i + s];
  } else {
    this.words[0] = 0;
    this.length = 1;
  }

  var carry = 0;
  for (var i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
    var word = this.words[i];
    this.words[i] = (carry << (26 - r)) | (word >>> r);
    carry = word & mask;
  }

  // Push carried bits as a mask
  if (maskedWords && carry !== 0)
    maskedWords.words[maskedWords.length++] = carry;

  if (this.length === 0) {
    this.words[0] = 0;
    this.length = 1;
  }

  this.strip();

  return this;
};

// Shift-left
BN.prototype.shln = function shln(bits) {
  return this.clone().ishln(bits);
};

// Shift-right
BN.prototype.shrn = function shrn(bits) {
  return this.clone().ishrn(bits);
};

// Test if n bit is set
BN.prototype.testn = function testn(bit) {
  assert(typeof bit === 'number' && bit >= 0);
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    return false;
  }

  // Check bit and return
  var w = this.words[s];

  return !!(w & q);
};

// Return only lowers bits of number (in-place)
BN.prototype.imaskn = function imaskn(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;

  assert(!this.sign, 'imaskn works only with positive numbers');

  if (r !== 0)
    s++;
  this.length = Math.min(s, this.length);

  if (r !== 0) {
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    this.words[this.length - 1] &= mask;
  }

  return this.strip();
};

// Return only lowers bits of number
BN.prototype.maskn = function maskn(bits) {
  return this.clone().imaskn(bits);
};

// Add plain number `num` to `this`
BN.prototype.iaddn = function iaddn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.isubn(-num);

  // Possible sign change
  if (this.sign) {
    if (this.length === 1 && this.words[0] < num) {
      this.words[0] = num - this.words[0];
      this.sign = false;
      return this;
    }

    this.sign = false;
    this.isubn(num);
    this.sign = true;
    return this;
  }

  // Add without checks
  return this._iaddn(num);
};

BN.prototype._iaddn = function _iaddn(num) {
  this.words[0] += num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
    this.words[i] -= 0x4000000;
    if (i === this.length - 1)
      this.words[i + 1] = 1;
    else
      this.words[i + 1]++;
  }
  this.length = Math.max(this.length, i + 1);

  return this;
};

// Subtract plain number `num` from `this`
BN.prototype.isubn = function isubn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.iaddn(-num);

  if (this.sign) {
    this.sign = false;
    this.iaddn(num);
    this.sign = true;
    return this;
  }

  this.words[0] -= num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] < 0; i++) {
    this.words[i] += 0x4000000;
    this.words[i + 1] -= 1;
  }

  return this.strip();
};

BN.prototype.addn = function addn(num) {
  return this.clone().iaddn(num);
};

BN.prototype.subn = function subn(num) {
  return this.clone().isubn(num);
};

BN.prototype.iabs = function iabs() {
  this.sign = false;

  return this;
};

BN.prototype.abs = function abs() {
  return this.clone().iabs();
};

BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
  // Bigger storage is needed
  var len = num.length + shift;
  var i;
  if (this.words.length < len) {
    var t = new Array(len);
    for (var i = 0; i < this.length; i++)
      t[i] = this.words[i];
    this.words = t;
  } else {
    i = this.length;
  }

  // Zeroify rest
  this.length = Math.max(this.length, len);
  for (; i < this.length; i++)
    this.words[i] = 0;

  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var w = this.words[i + shift] + carry;
    var right = num.words[i] * mul;
    w -= right & 0x3ffffff;
    carry = (w >> 26) - ((right / 0x4000000) | 0);
    this.words[i + shift] = w & 0x3ffffff;
  }
  for (; i < this.length - shift; i++) {
    var w = this.words[i + shift] + carry;
    carry = w >> 26;
    this.words[i + shift] = w & 0x3ffffff;
  }

  if (carry === 0)
    return this.strip();

  // Subtraction overflow
  assert(carry === -1);
  carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = -this.words[i] + carry;
    carry = w >> 26;
    this.words[i] = w & 0x3ffffff;
  }
  this.sign = true;

  return this.strip();
};

BN.prototype._wordDiv = function _wordDiv(num, mode) {
  var shift = this.length - num.length;

  var a = this.clone();
  var b = num;

  // Normalize
  var bhi = b.words[b.length - 1];
  var bhiBits = this._countBits(bhi);
  shift = 26 - bhiBits;
  if (shift !== 0) {
    b = b.shln(shift);
    a.ishln(shift);
    bhi = b.words[b.length - 1];
  }

  // Initialize quotient
  var m = a.length - b.length;
  var q;

  if (mode !== 'mod') {
    q = new BN(null);
    q.length = m + 1;
    q.words = new Array(q.length);
    for (var i = 0; i < q.length; i++)
      q.words[i] = 0;
  }

  var diff = a.clone()._ishlnsubmul(b, 1, m);
  if (!diff.sign) {
    a = diff;
    if (q)
      q.words[m] = 1;
  }

  for (var j = m - 1; j >= 0; j--) {
    var qj = a.words[b.length + j] * 0x4000000 + a.words[b.length + j - 1];

    // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
    // (0x7ffffff)
    qj = Math.min((qj / bhi) | 0, 0x3ffffff);

    a._ishlnsubmul(b, qj, j);
    while (a.sign) {
      qj--;
      a.sign = false;
      a._ishlnsubmul(b, 1, j);
      if (a.cmpn(0) !== 0)
        a.sign = !a.sign;
    }
    if (q)
      q.words[j] = qj;
  }
  if (q)
    q.strip();
  a.strip();

  // Denormalize
  if (mode !== 'div' && shift !== 0)
    a.ishrn(shift);
  return { div: q ? q : null, mod: a };
};

BN.prototype.divmod = function divmod(num, mode) {
  assert(num.cmpn(0) !== 0);

  if (this.sign && !num.sign) {
    var res = this.neg().divmod(num, mode);
    var div;
    var mod;
    if (mode !== 'mod')
      div = res.div.neg();
    if (mode !== 'div')
      mod = res.mod.cmpn(0) === 0 ? res.mod : num.sub(res.mod);
    return {
      div: div,
      mod: mod
    };
  } else if (!this.sign && num.sign) {
    var res = this.divmod(num.neg(), mode);
    var div;
    if (mode !== 'mod')
      div = res.div.neg();
    return { div: div, mod: res.mod };
  } else if (this.sign && num.sign) {
    return this.neg().divmod(num.neg(), mode);
  }

  // Both numbers are positive at this point

  // Strip both numbers to approximate shift value
  if (num.length > this.length || this.cmp(num) < 0)
    return { div: new BN(0), mod: this };

  // Very short reduction
  if (num.length === 1) {
    if (mode === 'div')
      return { div: this.divn(num.words[0]), mod: null };
    else if (mode === 'mod')
      return { div: null, mod: new BN(this.modn(num.words[0])) };
    return {
      div: this.divn(num.words[0]),
      mod: new BN(this.modn(num.words[0]))
    };
  }

  return this._wordDiv(num, mode);
};

// Find `this` / `num`
BN.prototype.div = function div(num) {
  return this.divmod(num, 'div').div;
};

// Find `this` % `num`
BN.prototype.mod = function mod(num) {
  return this.divmod(num, 'mod').mod;
};

// Find Round(`this` / `num`)
BN.prototype.divRound = function divRound(num) {
  var dm = this.divmod(num);

  // Fast case - exact division
  if (dm.mod.cmpn(0) === 0)
    return dm.div;

  var mod = dm.div.sign ? dm.mod.isub(num) : dm.mod;

  var half = num.shrn(1);
  var r2 = num.andln(1);
  var cmp = mod.cmp(half);

  // Round down
  if (cmp < 0 || r2 === 1 && cmp === 0)
    return dm.div;

  // Round up
  return dm.div.sign ? dm.div.isubn(1) : dm.div.iaddn(1);
};

BN.prototype.modn = function modn(num) {
  assert(num <= 0x3ffffff);
  var p = (1 << 26) % num;

  var acc = 0;
  for (var i = this.length - 1; i >= 0; i--)
    acc = (p * acc + this.words[i]) % num;

  return acc;
};

// In-place division by number
BN.prototype.idivn = function idivn(num) {
  assert(num <= 0x3ffffff);

  var carry = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var w = this.words[i] + carry * 0x4000000;
    this.words[i] = (w / num) | 0;
    carry = w % num;
  }

  return this.strip();
};

BN.prototype.divn = function divn(num) {
  return this.clone().idivn(num);
};

BN.prototype.egcd = function egcd(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var x = this;
  var y = p.clone();

  if (x.sign)
    x = x.mod(p);
  else
    x = x.clone();

  // A * x + B * y = x
  var A = new BN(1);
  var B = new BN(0);

  // C * x + D * y = y
  var C = new BN(0);
  var D = new BN(1);

  var g = 0;

  while (x.isEven() && y.isEven()) {
    x.ishrn(1);
    y.ishrn(1);
    ++g;
  }

  var yp = y.clone();
  var xp = x.clone();

  while (x.cmpn(0) !== 0) {
    while (x.isEven()) {
      x.ishrn(1);
      if (A.isEven() && B.isEven()) {
        A.ishrn(1);
        B.ishrn(1);
      } else {
        A.iadd(yp).ishrn(1);
        B.isub(xp).ishrn(1);
      }
    }

    while (y.isEven()) {
      y.ishrn(1);
      if (C.isEven() && D.isEven()) {
        C.ishrn(1);
        D.ishrn(1);
      } else {
        C.iadd(yp).ishrn(1);
        D.isub(xp).ishrn(1);
      }
    }

    if (x.cmp(y) >= 0) {
      x.isub(y);
      A.isub(C);
      B.isub(D);
    } else {
      y.isub(x);
      C.isub(A);
      D.isub(B);
    }
  }

  return {
    a: C,
    b: D,
    gcd: y.ishln(g)
  };
};

// This is reduced incarnation of the binary EEA
// above, designated to invert members of the
// _prime_ fields F(p) at a maximal speed
BN.prototype._invmp = function _invmp(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var a = this;
  var b = p.clone();

  if (a.sign)
    a = a.mod(p);
  else
    a = a.clone();

  var x1 = new BN(1);
  var x2 = new BN(0);

  var delta = b.clone();

  while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
    while (a.isEven()) {
      a.ishrn(1);
      if (x1.isEven())
        x1.ishrn(1);
      else
        x1.iadd(delta).ishrn(1);
    }
    while (b.isEven()) {
      b.ishrn(1);
      if (x2.isEven())
        x2.ishrn(1);
      else
        x2.iadd(delta).ishrn(1);
    }
    if (a.cmp(b) >= 0) {
      a.isub(b);
      x1.isub(x2);
    } else {
      b.isub(a);
      x2.isub(x1);
    }
  }
  if (a.cmpn(1) === 0)
    return x1;
  else
    return x2;
};

BN.prototype.gcd = function gcd(num) {
  if (this.cmpn(0) === 0)
    return num.clone();
  if (num.cmpn(0) === 0)
    return this.clone();

  var a = this.clone();
  var b = num.clone();
  a.sign = false;
  b.sign = false;

  // Remove common factor of two
  for (var shift = 0; a.isEven() && b.isEven(); shift++) {
    a.ishrn(1);
    b.ishrn(1);
  }

  do {
    while (a.isEven())
      a.ishrn(1);
    while (b.isEven())
      b.ishrn(1);

    var r = a.cmp(b);
    if (r < 0) {
      // Swap `a` and `b` to make `a` always bigger than `b`
      var t = a;
      a = b;
      b = t;
    } else if (r === 0 || b.cmpn(1) === 0) {
      break;
    }

    a.isub(b);
  } while (true);

  return b.ishln(shift);
};

// Invert number in the field F(num)
BN.prototype.invm = function invm(num) {
  return this.egcd(num).a.mod(num);
};

BN.prototype.isEven = function isEven() {
  return (this.words[0] & 1) === 0;
};

BN.prototype.isOdd = function isOdd() {
  return (this.words[0] & 1) === 1;
};

// And first word and num
BN.prototype.andln = function andln(num) {
  return this.words[0] & num;
};

// Increment at the bit position in-line
BN.prototype.bincn = function bincn(bit) {
  assert(typeof bit === 'number');
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    for (var i = this.length; i < s + 1; i++)
      this.words[i] = 0;
    this.words[s] |= q;
    this.length = s + 1;
    return this;
  }

  // Add bit and propagate, if needed
  var carry = q;
  for (var i = s; carry !== 0 && i < this.length; i++) {
    var w = this.words[i];
    w += carry;
    carry = w >>> 26;
    w &= 0x3ffffff;
    this.words[i] = w;
  }
  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }
  return this;
};

BN.prototype.cmpn = function cmpn(num) {
  var sign = num < 0;
  if (sign)
    num = -num;

  if (this.sign && !sign)
    return -1;
  else if (!this.sign && sign)
    return 1;

  num &= 0x3ffffff;
  this.strip();

  var res;
  if (this.length > 1) {
    res = 1;
  } else {
    var w = this.words[0];
    res = w === num ? 0 : w < num ? -1 : 1;
  }
  if (this.sign)
    res = -res;
  return res;
};

// Compare two numbers and return:
// 1 - if `this` > `num`
// 0 - if `this` == `num`
// -1 - if `this` < `num`
BN.prototype.cmp = function cmp(num) {
  if (this.sign && !num.sign)
    return -1;
  else if (!this.sign && num.sign)
    return 1;

  var res = this.ucmp(num);
  if (this.sign)
    return -res;
  else
    return res;
};

// Unsigned comparison
BN.prototype.ucmp = function ucmp(num) {
  // At this point both numbers have the same sign
  if (this.length > num.length)
    return 1;
  else if (this.length < num.length)
    return -1;

  var res = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var a = this.words[i];
    var b = num.words[i];

    if (a === b)
      continue;
    if (a < b)
      res = -1;
    else if (a > b)
      res = 1;
    break;
  }
  return res;
};

//
// A reduce context, could be using montgomery or something better, depending
// on the `m` itself.
//
BN.red = function red(num) {
  return new Red(num);
};

BN.prototype.toRed = function toRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  assert(!this.sign, 'red works only with positives');
  return ctx.convertTo(this)._forceRed(ctx);
};

BN.prototype.fromRed = function fromRed() {
  assert(this.red, 'fromRed works only with numbers in reduction context');
  return this.red.convertFrom(this);
};

BN.prototype._forceRed = function _forceRed(ctx) {
  this.red = ctx;
  return this;
};

BN.prototype.forceRed = function forceRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  return this._forceRed(ctx);
};

BN.prototype.redAdd = function redAdd(num) {
  assert(this.red, 'redAdd works only with red numbers');
  return this.red.add(this, num);
};

BN.prototype.redIAdd = function redIAdd(num) {
  assert(this.red, 'redIAdd works only with red numbers');
  return this.red.iadd(this, num);
};

BN.prototype.redSub = function redSub(num) {
  assert(this.red, 'redSub works only with red numbers');
  return this.red.sub(this, num);
};

BN.prototype.redISub = function redISub(num) {
  assert(this.red, 'redISub works only with red numbers');
  return this.red.isub(this, num);
};

BN.prototype.redShl = function redShl(num) {
  assert(this.red, 'redShl works only with red numbers');
  return this.red.shl(this, num);
};

BN.prototype.redMul = function redMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.mul(this, num);
};

BN.prototype.redIMul = function redIMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.imul(this, num);
};

BN.prototype.redSqr = function redSqr() {
  assert(this.red, 'redSqr works only with red numbers');
  this.red._verify1(this);
  return this.red.sqr(this);
};

BN.prototype.redISqr = function redISqr() {
  assert(this.red, 'redISqr works only with red numbers');
  this.red._verify1(this);
  return this.red.isqr(this);
};

// Square root over p
BN.prototype.redSqrt = function redSqrt() {
  assert(this.red, 'redSqrt works only with red numbers');
  this.red._verify1(this);
  return this.red.sqrt(this);
};

BN.prototype.redInvm = function redInvm() {
  assert(this.red, 'redInvm works only with red numbers');
  this.red._verify1(this);
  return this.red.invm(this);
};

// Return negative clone of `this` % `red modulo`
BN.prototype.redNeg = function redNeg() {
  assert(this.red, 'redNeg works only with red numbers');
  this.red._verify1(this);
  return this.red.neg(this);
};

BN.prototype.redPow = function redPow(num) {
  assert(this.red && !num.red, 'redPow(normalNum)');
  this.red._verify1(this);
  return this.red.pow(this, num);
};

// Prime numbers with efficient reduction
var primes = {
  k256: null,
  p224: null,
  p192: null,
  p25519: null
};

// Pseudo-Mersenne prime
function MPrime(name, p) {
  // P = 2 ^ N - K
  this.name = name;
  this.p = new BN(p, 16);
  this.n = this.p.bitLength();
  this.k = new BN(1).ishln(this.n).isub(this.p);

  this.tmp = this._tmp();
}

MPrime.prototype._tmp = function _tmp() {
  var tmp = new BN(null);
  tmp.words = new Array(Math.ceil(this.n / 13));
  return tmp;
};

MPrime.prototype.ireduce = function ireduce(num) {
  // Assumes that `num` is less than `P^2`
  // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
  var r = num;
  var rlen;

  do {
    this.split(r, this.tmp);
    r = this.imulK(r);
    r = r.iadd(this.tmp);
    rlen = r.bitLength();
  } while (rlen > this.n);

  var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
  if (cmp === 0) {
    r.words[0] = 0;
    r.length = 1;
  } else if (cmp > 0) {
    r.isub(this.p);
  } else {
    r.strip();
  }

  return r;
};

MPrime.prototype.split = function split(input, out) {
  input.ishrn(this.n, 0, out);
};

MPrime.prototype.imulK = function imulK(num) {
  return num.imul(this.k);
};

function K256() {
  MPrime.call(
    this,
    'k256',
    'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
}
inherits(K256, MPrime);

K256.prototype.split = function split(input, output) {
  // 256 = 9 * 26 + 22
  var mask = 0x3fffff;

  var outLen = Math.min(input.length, 9);
  for (var i = 0; i < outLen; i++)
    output.words[i] = input.words[i];
  output.length = outLen;

  if (input.length <= 9) {
    input.words[0] = 0;
    input.length = 1;
    return;
  }

  // Shift by 9 limbs
  var prev = input.words[9];
  output.words[output.length++] = prev & mask;

  for (var i = 10; i < input.length; i++) {
    var next = input.words[i];
    input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
    prev = next;
  }
  input.words[i - 10] = prev >>> 22;
  input.length -= 9;
};

K256.prototype.imulK = function imulK(num) {
  // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
  num.words[num.length] = 0;
  num.words[num.length + 1] = 0;
  num.length += 2;

  // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
  var hi;
  var lo = 0;
  for (var i = 0; i < num.length; i++) {
    var w = num.words[i];
    hi = w * 0x40;
    lo += w * 0x3d1;
    hi += (lo / 0x4000000) | 0;
    lo &= 0x3ffffff;

    num.words[i] = lo;

    lo = hi;
  }

  // Fast length reduction
  if (num.words[num.length - 1] === 0) {
    num.length--;
    if (num.words[num.length - 1] === 0)
      num.length--;
  }
  return num;
};

function P224() {
  MPrime.call(
    this,
    'p224',
    'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
}
inherits(P224, MPrime);

function P192() {
  MPrime.call(
    this,
    'p192',
    'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
}
inherits(P192, MPrime);

function P25519() {
  // 2 ^ 255 - 19
  MPrime.call(
    this,
    '25519',
    '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
}
inherits(P25519, MPrime);

P25519.prototype.imulK = function imulK(num) {
  // K = 0x13
  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var hi = num.words[i] * 0x13 + carry;
    var lo = hi & 0x3ffffff;
    hi >>>= 26;

    num.words[i] = lo;
    carry = hi;
  }
  if (carry !== 0)
    num.words[num.length++] = carry;
  return num;
};

// Exported mostly for testing purposes, use plain name instead
BN._prime = function prime(name) {
  // Cached version of prime
  if (primes[name])
    return primes[name];

  var prime;
  if (name === 'k256')
    prime = new K256();
  else if (name === 'p224')
    prime = new P224();
  else if (name === 'p192')
    prime = new P192();
  else if (name === 'p25519')
    prime = new P25519();
  else
    throw new Error('Unknown prime ' + name);
  primes[name] = prime;

  return prime;
};

//
// Base reduction engine
//
function Red(m) {
  if (typeof m === 'string') {
    var prime = BN._prime(m);
    this.m = prime.p;
    this.prime = prime;
  } else {
    this.m = m;
    this.prime = null;
  }
}

Red.prototype._verify1 = function _verify1(a) {
  assert(!a.sign, 'red works only with positives');
  assert(a.red, 'red works only with red numbers');
};

Red.prototype._verify2 = function _verify2(a, b) {
  assert(!a.sign && !b.sign, 'red works only with positives');
  assert(a.red && a.red === b.red,
         'red works only with red numbers');
};

Red.prototype.imod = function imod(a) {
  if (this.prime)
    return this.prime.ireduce(a)._forceRed(this);
  return a.mod(this.m)._forceRed(this);
};

Red.prototype.neg = function neg(a) {
  var r = a.clone();
  r.sign = !r.sign;
  return r.iadd(this.m)._forceRed(this);
};

Red.prototype.add = function add(a, b) {
  this._verify2(a, b);

  var res = a.add(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res._forceRed(this);
};

Red.prototype.iadd = function iadd(a, b) {
  this._verify2(a, b);

  var res = a.iadd(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res;
};

Red.prototype.sub = function sub(a, b) {
  this._verify2(a, b);

  var res = a.sub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res._forceRed(this);
};

Red.prototype.isub = function isub(a, b) {
  this._verify2(a, b);

  var res = a.isub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res;
};

Red.prototype.shl = function shl(a, num) {
  this._verify1(a);
  return this.imod(a.shln(num));
};

Red.prototype.imul = function imul(a, b) {
  this._verify2(a, b);
  return this.imod(a.imul(b));
};

Red.prototype.mul = function mul(a, b) {
  this._verify2(a, b);
  return this.imod(a.mul(b));
};

Red.prototype.isqr = function isqr(a) {
  return this.imul(a, a);
};

Red.prototype.sqr = function sqr(a) {
  return this.mul(a, a);
};

Red.prototype.sqrt = function sqrt(a) {
  if (a.cmpn(0) === 0)
    return a.clone();

  var mod3 = this.m.andln(3);
  assert(mod3 % 2 === 1);

  // Fast case
  if (mod3 === 3) {
    var pow = this.m.add(new BN(1)).ishrn(2);
    var r = this.pow(a, pow);
    return r;
  }

  // Tonelli-Shanks algorithm (Totally unoptimized and slow)
  //
  // Find Q and S, that Q * 2 ^ S = (P - 1)
  var q = this.m.subn(1);
  var s = 0;
  while (q.cmpn(0) !== 0 && q.andln(1) === 0) {
    s++;
    q.ishrn(1);
  }
  assert(q.cmpn(0) !== 0);

  var one = new BN(1).toRed(this);
  var nOne = one.redNeg();

  // Find quadratic non-residue
  // NOTE: Max is such because of generalized Riemann hypothesis.
  var lpow = this.m.subn(1).ishrn(1);
  var z = this.m.bitLength();
  z = new BN(2 * z * z).toRed(this);
  while (this.pow(z, lpow).cmp(nOne) !== 0)
    z.redIAdd(nOne);

  var c = this.pow(z, q);
  var r = this.pow(a, q.addn(1).ishrn(1));
  var t = this.pow(a, q);
  var m = s;
  while (t.cmp(one) !== 0) {
    var tmp = t;
    for (var i = 0; tmp.cmp(one) !== 0; i++)
      tmp = tmp.redSqr();
    assert(i < m);
    var b = this.pow(c, new BN(1).ishln(m - i - 1));

    r = r.redMul(b);
    c = b.redSqr();
    t = t.redMul(c);
    m = i;
  }

  return r;
};

Red.prototype.invm = function invm(a) {
  var inv = a._invmp(this.m);
  if (inv.sign) {
    inv.sign = false;
    return this.imod(inv).redNeg();
  } else {
    return this.imod(inv);
  }
};

Red.prototype.pow = function pow(a, num) {
  var w = [];

  if (num.cmpn(0) === 0)
    return new BN(1);

  var q = num.clone();

  while (q.cmpn(0) !== 0) {
    w.push(q.andln(1));
    q.ishrn(1);
  }

  // Skip leading zeroes
  var res = a;
  for (var i = 0; i < w.length; i++, res = this.sqr(res))
    if (w[i] !== 0)
      break;

  if (++i < w.length) {
    for (var q = this.sqr(res); i < w.length; i++, q = this.sqr(q)) {
      if (w[i] === 0)
        continue;
      res = this.mul(res, q);
    }
  }

  return res;
};

Red.prototype.convertTo = function convertTo(num) {
  var r = num.mod(this.m);
  if (r === num)
    return r.clone();
  else
    return r;
};

Red.prototype.convertFrom = function convertFrom(num) {
  var res = num.clone();
  res.red = null;
  return res;
};

//
// Montgomery method engine
//

BN.mont = function mont(num) {
  return new Mont(num);
};

function Mont(m) {
  Red.call(this, m);

  this.shift = this.m.bitLength();
  if (this.shift % 26 !== 0)
    this.shift += 26 - (this.shift % 26);
  this.r = new BN(1).ishln(this.shift);
  this.r2 = this.imod(this.r.sqr());
  this.rinv = this.r._invmp(this.m);

  this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
  this.minv.sign = true;
  this.minv = this.minv.mod(this.r);
}
inherits(Mont, Red);

Mont.prototype.convertTo = function convertTo(num) {
  return this.imod(num.shln(this.shift));
};

Mont.prototype.convertFrom = function convertFrom(num) {
  var r = this.imod(num.mul(this.rinv));
  r.red = null;
  return r;
};

Mont.prototype.imul = function imul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0) {
    a.words[0] = 0;
    a.length = 1;
    return a;
  }

  var t = a.imul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.mul = function mul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0)
    return new BN(0)._forceRed(this);

  var t = a.mul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.invm = function invm(a) {
  // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
  var res = this.imod(a._invmp(this.m).mul(this.r2));
  return res._forceRed(this);
};

})(typeof module === 'undefined' || module, this);

},{}],44:[function(require,module,exports){
(function (Buffer){
var hasTypedArrays = false
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer)
  DOUBLE_VIEW[0] = 1.0
  hasTypedArrays = true
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    }
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo
      UINT_VIEW[1] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    }
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo
      UINT_VIEW[0] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE
  } else {
    hasTypedArrays = false
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8)
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true)
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  }
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true)
    buffer.writeUInt32LE(hi, 4, true)
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
}

module.exports.exponent = function(n) {
  var b = module.exports.hi(n)
  return ((b<<1) >>> 21) - 1023
}

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n)
  var hi = module.exports.hi(n)
  var b = hi & ((1<<20) - 1)
  if(hi & 0x7ff00000) {
    b += (1<<20)
  }
  return [lo, b]
}

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n)
  return !(hi & 0x7ff00000)
}
}).call(this,require("buffer").Buffer)

},{"buffer":2}],45:[function(require,module,exports){
'use strict'

var bnsign = require('./lib/bn-sign')

module.exports = sign

function sign(x) {
  return bnsign(x[0]) * bnsign(x[1])
}

},{"./lib/bn-sign":34}],46:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = sub

function sub(a, b) {
  return rationalize(a[0].mul(b[1]).sub(a[1].mul(b[0])), a[1].mul(b[1]))
}

},{"./lib/rationalize":39}],47:[function(require,module,exports){
'use strict'

var bn2num = require('./lib/bn-to-num')
var ctz = require('./lib/ctz')

module.exports = roundRat

//Round a rational to the closest float
function roundRat(f) {
  var a = f[0]
  var b = f[1]
  if(a.cmpn(0) === 0) {
    return 0
  }
  var h = a.divmod(b)
  var iv = h.div
  var x = bn2num(iv)
  var ir = h.mod
  if(ir.cmpn(0) === 0) {
    return x
  }
  if(x) {
    var s = ctz(x) + 4
    var y = bn2num(ir.shln(s).divRound(b))

    // flip the sign of y if x is negative
    if (x<0) {
      y = -y;
    }

    return x + y * Math.pow(2, -s)
  } else {
    var ybits = b.bitLength() - ir.bitLength() + 53
    var y = bn2num(ir.shln(ybits).divRound(b))
    if(ybits < 1023) {
      return y * Math.pow(2, -ybits)
    }
    y *= Math.pow(2, -1023)
    return y * Math.pow(2, 1023-ybits)
  }
}

},{"./lib/bn-to-num":35,"./lib/ctz":36}],48:[function(require,module,exports){
'use strict'

module.exports = boxIntersectWrapper

var pool = require('typedarray-pool')
var sweep = require('./lib/sweep')
var boxIntersectIter = require('./lib/intersect')

function boxEmpty(d, box) {
  for(var j=0; j<d; ++j) {
    if(!(box[j] <= box[j+d])) {
      return true
    }
  }
  return false
}

//Unpack boxes into a flat typed array, remove empty boxes
function convertBoxes(boxes, d, data, ids) {
  var ptr = 0
  var count = 0
  for(var i=0, n=boxes.length; i<n; ++i) {
    var b = boxes[i]
    if(boxEmpty(d, b)) {
      continue
    }
    for(var j=0; j<2*d; ++j) {
      data[ptr++] = b[j]
    }
    ids[count++] = i
  }
  return count
}

//Perform type conversions, check bounds
function boxIntersect(red, blue, visit, full) {
  var n = red.length
  var m = blue.length

  //If either array is empty, then we can skip this whole thing
  if(n <= 0 || m <= 0) {
    return
  }

  //Compute dimension, if it is 0 then we skip
  var d = (red[0].length)>>>1
  if(d <= 0) {
    return
  }

  var retval

  //Convert red boxes
  var redList  = pool.mallocDouble(2*d*n)
  var redIds   = pool.mallocInt32(n)
  n = convertBoxes(red, d, redList, redIds)

  if(n > 0) {
    if(d === 1 && full) {
      //Special case: 1d complete
      sweep.init(n)
      retval = sweep.sweepComplete(
        d, visit, 
        0, n, redList, redIds,
        0, n, redList, redIds)
    } else {

      //Convert blue boxes
      var blueList = pool.mallocDouble(2*d*m)
      var blueIds  = pool.mallocInt32(m)
      m = convertBoxes(blue, d, blueList, blueIds)

      if(m > 0) {
        sweep.init(n+m)

        if(d === 1) {
          //Special case: 1d bipartite
          retval = sweep.sweepBipartite(
            d, visit, 
            0, n, redList,  redIds,
            0, m, blueList, blueIds)
        } else {
          //General case:  d>1
          retval = boxIntersectIter(
            d, visit,    full,
            n, redList,  redIds,
            m, blueList, blueIds)
        }

        pool.free(blueList)
        pool.free(blueIds)
      }
    }

    pool.free(redList)
    pool.free(redIds)
  }

  return retval
}


var RESULT

function appendItem(i,j) {
  RESULT.push([i,j])
}

function intersectFullArray(x) {
  RESULT = []
  boxIntersect(x, x, appendItem, true)
  return RESULT
}

function intersectBipartiteArray(x, y) {
  RESULT = []
  boxIntersect(x, y, appendItem, false)
  return RESULT
}

//User-friendly wrapper, handle full input and no-visitor cases
function boxIntersectWrapper(arg0, arg1, arg2) {
  var result
  switch(arguments.length) {
    case 1:
      return intersectFullArray(arg0)
    case 2:
      if(typeof arg1 === 'function') {
        return boxIntersect(arg0, arg0, arg1, true)
      } else {
        return intersectBipartiteArray(arg0, arg1)
      }
    case 3:
      return boxIntersect(arg0, arg1, arg2, false)
    default:
      throw new Error('box-intersect: Invalid arguments')
  }
}
},{"./lib/intersect":50,"./lib/sweep":54,"typedarray-pool":57}],49:[function(require,module,exports){
'use strict'

var DIMENSION   = 'd'
var AXIS        = 'ax'
var VISIT       = 'vv'
var FLIP        = 'fp'

var ELEM_SIZE   = 'es'

var RED_START   = 'rs'
var RED_END     = 're'
var RED_BOXES   = 'rb'
var RED_INDEX   = 'ri'
var RED_PTR     = 'rp'

var BLUE_START  = 'bs'
var BLUE_END    = 'be'
var BLUE_BOXES  = 'bb'
var BLUE_INDEX  = 'bi'
var BLUE_PTR    = 'bp'

var RETVAL      = 'rv'

var INNER_LABEL = 'Q'

var ARGS = [
  DIMENSION,
  AXIS,
  VISIT,
  RED_START,
  RED_END,
  RED_BOXES,
  RED_INDEX,
  BLUE_START,
  BLUE_END,
  BLUE_BOXES,
  BLUE_INDEX
]

function generateBruteForce(redMajor, flip, full) {
  var funcName = 'bruteForce' + 
    (redMajor ? 'Red' : 'Blue') + 
    (flip ? 'Flip' : '') +
    (full ? 'Full' : '')

  var code = ['function ', funcName, '(', ARGS.join(), '){',
    'var ', ELEM_SIZE, '=2*', DIMENSION, ';']

  var redLoop = 
    'for(var i=' + RED_START + ',' + RED_PTR + '=' + ELEM_SIZE + '*' + RED_START + ';' +
        'i<' + RED_END +';' +
        '++i,' + RED_PTR + '+=' + ELEM_SIZE + '){' +
        'var x0=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '],' +
            'x1=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '+' + DIMENSION + '],' +
            'xi=' + RED_INDEX + '[i];'

  var blueLoop = 
    'for(var j=' + BLUE_START + ',' + BLUE_PTR + '=' + ELEM_SIZE + '*' + BLUE_START + ';' +
        'j<' + BLUE_END + ';' +
        '++j,' + BLUE_PTR + '+=' + ELEM_SIZE + '){' +
        'var y0=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '],' +
            (full ? 'y1=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '+' + DIMENSION + '],' : '') +
            'yi=' + BLUE_INDEX + '[j];'

  if(redMajor) {
    code.push(redLoop, INNER_LABEL, ':', blueLoop)
  } else {
    code.push(blueLoop, INNER_LABEL, ':', redLoop)
  }

  if(full) {
    code.push('if(y1<x0||x1<y0)continue;')
  } else if(flip) {
    code.push('if(y0<=x0||x1<y0)continue;')
  } else {
    code.push('if(y0<x0||x1<y0)continue;')
  }

  code.push('for(var k='+AXIS+'+1;k<'+DIMENSION+';++k){'+
    'var r0='+RED_BOXES+'[k+'+RED_PTR+'],'+
        'r1='+RED_BOXES+'[k+'+DIMENSION+'+'+RED_PTR+'],'+
        'b0='+BLUE_BOXES+'[k+'+BLUE_PTR+'],'+
        'b1='+BLUE_BOXES+'[k+'+DIMENSION+'+'+BLUE_PTR+'];'+
      'if(r1<b0||b1<r0)continue ' + INNER_LABEL + ';}' +
      'var ' + RETVAL + '=' + VISIT + '(')

  if(flip) {
    code.push('yi,xi')
  } else {
    code.push('xi,yi')
  }

  code.push(');if(' + RETVAL + '!==void 0)return ' + RETVAL + ';}}}')

  return {
    name: funcName, 
    code: code.join('')
  }
}

function bruteForcePlanner(full) {
  var funcName = 'bruteForce' + (full ? 'Full' : 'Partial')
  var prefix = []
  var fargs = ARGS.slice()
  if(!full) {
    fargs.splice(3, 0, FLIP)
  }

  var code = ['function ' + funcName + '(' + fargs.join() + '){']

  function invoke(redMajor, flip) {
    var res = generateBruteForce(redMajor, flip, full)
    prefix.push(res.code)
    code.push('return ' + res.name + '(' + ARGS.join() + ');')
  }

  code.push('if(' + RED_END + '-' + RED_START + '>' +
                    BLUE_END + '-' + BLUE_START + '){')

  if(full) {
    invoke(true, false)
    code.push('}else{')
    invoke(false, false)
  } else {
    code.push('if(' + FLIP + '){')
    invoke(true, true)
    code.push('}else{')
    invoke(true, false)
    code.push('}}else{if(' + FLIP + '){')
    invoke(false, true)
    code.push('}else{')
    invoke(false, false)
    code.push('}')
  }
  code.push('}}return ' + funcName)

  var codeStr = prefix.join('') + code.join('')
  var proc = new Function(codeStr)
  return proc()
}


exports.partial = bruteForcePlanner(false)
exports.full    = bruteForcePlanner(true)
},{}],50:[function(require,module,exports){
'use strict'

module.exports = boxIntersectIter

var pool = require('typedarray-pool')
var bits = require('bit-twiddle')
var bruteForce = require('./brute')
var bruteForcePartial = bruteForce.partial
var bruteForceFull = bruteForce.full
var sweep = require('./sweep')
var findMedian = require('./median')
var genPartition = require('./partition')

//Twiddle parameters
var BRUTE_FORCE_CUTOFF    = 128       //Cut off for brute force search
var SCAN_CUTOFF           = (1<<22)   //Cut off for two way scan
var SCAN_COMPLETE_CUTOFF  = (1<<22)  

//Partition functions
var partitionInteriorContainsInterval = genPartition(
  '!(lo>=p0)&&!(p1>=hi)', 
  ['p0', 'p1'])

var partitionStartEqual = genPartition(
  'lo===p0',
  ['p0'])

var partitionStartLessThan = genPartition(
  'lo<p0',
  ['p0'])

var partitionEndLessThanEqual = genPartition(
  'hi<=p0',
  ['p0'])

var partitionContainsPoint = genPartition(
  'lo<=p0&&p0<=hi',
  ['p0'])

var partitionContainsPointProper = genPartition(
  'lo<p0&&p0<=hi',
  ['p0'])

//Frame size for iterative loop
var IFRAME_SIZE = 6
var DFRAME_SIZE = 2

//Data for box statck
var INIT_CAPACITY = 1024
var BOX_ISTACK  = pool.mallocInt32(INIT_CAPACITY)
var BOX_DSTACK  = pool.mallocDouble(INIT_CAPACITY)

//Initialize iterative loop queue
function iterInit(d, count) {
  var levels = (8 * bits.log2(count+1) * (d+1))|0
  var maxInts = bits.nextPow2(IFRAME_SIZE*levels)
  if(BOX_ISTACK.length < maxInts) {
    pool.free(BOX_ISTACK)
    BOX_ISTACK = pool.mallocInt32(maxInts)
  }
  var maxDoubles = bits.nextPow2(DFRAME_SIZE*levels)
  if(BOX_DSTACK < maxDoubles) {
    pool.free(BOX_DSTACK)
    BOX_DSTACK = pool.mallocDouble(maxDoubles)
  }
}

//Append item to queue
function iterPush(ptr,
  axis, 
  redStart, redEnd, 
  blueStart, blueEnd, 
  state, 
  lo, hi) {

  var iptr = IFRAME_SIZE * ptr
  BOX_ISTACK[iptr]   = axis
  BOX_ISTACK[iptr+1] = redStart
  BOX_ISTACK[iptr+2] = redEnd
  BOX_ISTACK[iptr+3] = blueStart
  BOX_ISTACK[iptr+4] = blueEnd
  BOX_ISTACK[iptr+5] = state

  var dptr = DFRAME_SIZE * ptr
  BOX_DSTACK[dptr]   = lo
  BOX_DSTACK[dptr+1] = hi
}

//Special case:  Intersect single point with list of intervals
function onePointPartial(
  d, axis, visit, flip,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    if(flip && blueX === r0) {
      continue
    }
    var redId = redIndex[i]
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval
    if(flip) {
      retval = visit(blueId, redId)
    } else {
      retval = visit(redId, blueId)
    }
    if(retval !== void 0) {
      return retval
    }
  }
}

//Special case:  Intersect one point with list of intervals
function onePointFull(
  d, axis, visit,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var redId = redIndex[i]
    if(redId === blueId) {
      continue
    }
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval = visit(redId, blueId)
    if(retval !== void 0) {
      return retval
    }
  }
}

//The main box intersection routine
function boxIntersectIter(
  d, visit, initFull,
  xSize, xBoxes, xIndex,
  ySize, yBoxes, yIndex) {

  //Reserve memory for stack
  iterInit(d, xSize + ySize)

  var top  = 0
  var elemSize = 2 * d
  var retval

  iterPush(top++,
      0,
      0, xSize,
      0, ySize,
      initFull ? 16 : 0, 
      -Infinity, Infinity)
  if(!initFull) {
    iterPush(top++,
      0,
      0, ySize,
      0, xSize,
      1, 
      -Infinity, Infinity)
  }

  while(top > 0) {
    top  -= 1

    var iptr = top * IFRAME_SIZE
    var axis      = BOX_ISTACK[iptr]
    var redStart  = BOX_ISTACK[iptr+1]
    var redEnd    = BOX_ISTACK[iptr+2]
    var blueStart = BOX_ISTACK[iptr+3]
    var blueEnd   = BOX_ISTACK[iptr+4]
    var state     = BOX_ISTACK[iptr+5]

    var dptr = top * DFRAME_SIZE
    var lo        = BOX_DSTACK[dptr]
    var hi        = BOX_DSTACK[dptr+1]

    //Unpack state info
    var flip      = (state & 1)
    var full      = !!(state & 16)

    //Unpack indices
    var red       = xBoxes
    var redIndex  = xIndex
    var blue      = yBoxes
    var blueIndex = yIndex
    if(flip) {
      red         = yBoxes
      redIndex    = yIndex
      blue        = xBoxes
      blueIndex   = xIndex
    }

    if(state & 2) {
      redEnd = partitionStartLessThan(
        d, axis,
        redStart, redEnd, red, redIndex,
        hi)
      if(redStart >= redEnd) {
        continue
      }
    }
    if(state & 4) {
      redStart = partitionEndLessThanEqual(
        d, axis,
        redStart, redEnd, red, redIndex,
        lo)
      if(redStart >= redEnd) {
        continue
      }
    }
    
    var redCount  = redEnd  - redStart
    var blueCount = blueEnd - blueStart

    if(full) {
      if(d * redCount * (redCount + blueCount) < SCAN_COMPLETE_CUTOFF) {
        retval = sweep.scanComplete(
          d, axis, visit, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    } else {
      if(d * Math.min(redCount, blueCount) < BRUTE_FORCE_CUTOFF) {
        //If input small, then use brute force
        retval = bruteForcePartial(
            d, axis, visit, flip,
            redStart,  redEnd,  red,  redIndex,
            blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      } else if(d * redCount * blueCount < SCAN_CUTOFF) {
        //If input medium sized, then use sweep and prune
        retval = sweep.scanBipartite(
          d, axis, visit, flip, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    }
    
    //First, find all red intervals whose interior contains (lo,hi)
    var red0 = partitionInteriorContainsInterval(
      d, axis, 
      redStart, redEnd, red, redIndex,
      lo, hi)

    //Lower dimensional case
    if(redStart < red0) {

      if(d * (red0 - redStart) < BRUTE_FORCE_CUTOFF) {
        //Special case for small inputs: use brute force
        retval = bruteForceFull(
          d, axis+1, visit,
          redStart, red0, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
      } else if(axis === d-2) {
        if(flip) {
          retval = sweep.sweepBipartite(
            d, visit,
            blueStart, blueEnd, blue, blueIndex,
            redStart, red0, red, redIndex)
        } else {
          retval = sweep.sweepBipartite(
            d, visit,
            redStart, red0, red, redIndex,
            blueStart, blueEnd, blue, blueIndex)
        }
        if(retval !== void 0) {
          return retval
        }
      } else {
        iterPush(top++,
          axis+1,
          redStart, red0,
          blueStart, blueEnd,
          flip,
          -Infinity, Infinity)
        iterPush(top++,
          axis+1,
          blueStart, blueEnd,
          redStart, red0,
          flip^1,
          -Infinity, Infinity)
      }
    }

    //Divide and conquer phase
    if(red0 < redEnd) {

      //Cut blue into 3 parts:
      //
      //  Points < mid point
      //  Points = mid point
      //  Points > mid point
      //
      var blue0 = findMedian(
        d, axis, 
        blueStart, blueEnd, blue, blueIndex)
      var mid = blue[elemSize * blue0 + axis]
      var blue1 = partitionStartEqual(
        d, axis,
        blue0, blueEnd, blue, blueIndex,
        mid)

      //Right case
      if(blue1 < blueEnd) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blue1, blueEnd,
          (flip|4) + (full ? 16 : 0),
          mid, hi)
      }

      //Left case
      if(blueStart < blue0) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blueStart, blue0,
          (flip|2) + (full ? 16 : 0),
          lo, mid)
      }

      //Center case (the hard part)
      if(blue0 + 1 === blue1) {
        //Optimization: Range with exactly 1 point, use a brute force scan
        if(full) {
          retval = onePointFull(
            d, axis, visit,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        } else {
          retval = onePointPartial(
            d, axis, visit, flip,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        }
        if(retval !== void 0) {
          return retval
        }
      } else if(blue0 < blue1) {
        var red1
        if(full) {
          //If full intersection, need to handle special case
          red1 = partitionContainsPoint(
            d, axis,
            red0, redEnd, red, redIndex,
            mid)
          if(red0 < red1) {
            var redX = partitionStartEqual(
              d, axis,
              red0, red1, red, redIndex,
              mid)
            if(axis === d-2) {
              //Degenerate sweep intersection:
              //  [red0, redX] with [blue0, blue1]
              if(red0 < redX) {
                retval = sweep.sweepComplete(
                  d, visit,
                  red0, redX, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }

              //Normal sweep intersection:
              //  [redX, red1] with [blue0, blue1]
              if(redX < red1) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  redX, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }
            } else {
              if(red0 < redX) {
                iterPush(top++,
                  axis+1,
                  red0, redX,
                  blue0, blue1,
                  16,
                  -Infinity, Infinity)
              }
              if(redX < red1) {
                iterPush(top++,
                  axis+1,
                  redX, red1,
                  blue0, blue1,
                  0,
                  -Infinity, Infinity)
                iterPush(top++,
                  axis+1,
                  blue0, blue1,
                  redX, red1,
                  1,
                  -Infinity, Infinity)
              }
            }
          }
        } else {
          if(flip) {
            red1 = partitionContainsPointProper(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          } else {
            red1 = partitionContainsPoint(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          }
          if(red0 < red1) {
            if(axis === d-2) {
              if(flip) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  blue0, blue1, blue, blueIndex,
                  red0, red1, red, redIndex)
              } else {
                retval = sweep.sweepBipartite(
                  d, visit,
                  red0, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
              }
            } else {
              iterPush(top++,
                axis+1,
                red0, red1,
                blue0, blue1,
                flip,
                -Infinity, Infinity)
              iterPush(top++,
                axis+1,
                blue0, blue1,
                red0, red1,
                flip^1,
                -Infinity, Infinity)
            }
          }
        }
      }
    }
  }
}
},{"./brute":49,"./median":51,"./partition":52,"./sweep":54,"bit-twiddle":55,"typedarray-pool":57}],51:[function(require,module,exports){
'use strict'

module.exports = findMedian

var genPartition = require('./partition')

var partitionStartLessThan = genPartition('lo<p0', ['p0'])

var PARTITION_THRESHOLD = 8   //Cut off for using insertion sort in findMedian

//Base case for median finding:  Use insertion sort
function insertionSort(d, axis, start, end, boxes, ids) {
  var elemSize = 2 * d
  var boxPtr = elemSize * (start+1) + axis
  for(var i=start+1; i<end; ++i, boxPtr+=elemSize) {
    var x = boxes[boxPtr]
    for(var j=i, ptr=elemSize*(i-1); 
        j>start && boxes[ptr+axis] > x; 
        --j, ptr-=elemSize) {
      //Swap
      var aPtr = ptr
      var bPtr = ptr+elemSize
      for(var k=0; k<elemSize; ++k, ++aPtr, ++bPtr) {
        var y = boxes[aPtr]
        boxes[aPtr] = boxes[bPtr]
        boxes[bPtr] = y
      }
      var tmp = ids[j]
      ids[j] = ids[j-1]
      ids[j-1] = tmp
    }
  }
}

//Find median using quick select algorithm
//  takes O(n) time with high probability
function findMedian(d, axis, start, end, boxes, ids) {
  if(end <= start+1) {
    return start
  }

  var lo       = start
  var hi       = end
  var mid      = ((end + start) >>> 1)
  var elemSize = 2*d
  var pivot    = mid
  var value    = boxes[elemSize*mid+axis]
  
  while(lo < hi) {
    if(hi - lo < PARTITION_THRESHOLD) {
      insertionSort(d, axis, lo, hi, boxes, ids)
      value = boxes[elemSize*mid+axis]
      break
    }
    
    //Select pivot using median-of-3
    var count  = hi - lo
    var pivot0 = (Math.random()*count+lo)|0
    var value0 = boxes[elemSize*pivot0 + axis]
    var pivot1 = (Math.random()*count+lo)|0
    var value1 = boxes[elemSize*pivot1 + axis]
    var pivot2 = (Math.random()*count+lo)|0
    var value2 = boxes[elemSize*pivot2 + axis]
    if(value0 <= value1) {
      if(value2 >= value1) {
        pivot = pivot1
        value = value1
      } else if(value0 >= value2) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    } else {
      if(value1 >= value2) {
        pivot = pivot1
        value = value1
      } else if(value2 >= value0) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    }

    //Swap pivot to end of array
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Partition using pivot
    pivot = partitionStartLessThan(
      d, axis, 
      lo, hi-1, boxes, ids,
      value)

    //Swap pivot back
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Swap pivot to last pivot
    if(mid < pivot) {
      hi = pivot-1
      while(lo < hi && 
        boxes[elemSize*(hi-1)+axis] === value) {
        hi -= 1
      }
      hi += 1
    } else if(pivot < mid) {
      lo = pivot + 1
      while(lo < hi &&
        boxes[elemSize*lo+axis] === value) {
        lo += 1
      }
    } else {
      break
    }
  }

  //Make sure pivot is at start
  return partitionStartLessThan(
    d, axis, 
    start, mid, boxes, ids,
    boxes[elemSize*mid+axis])
}
},{"./partition":52}],52:[function(require,module,exports){
'use strict'

module.exports = genPartition

var code = 'for(var j=2*a,k=j*c,l=k,m=c,n=b,o=a+b,p=c;d>p;++p,k+=j){var _;if($)if(m===p)m+=1,l+=j;else{for(var s=0;j>s;++s){var t=e[k+s];e[k+s]=e[l],e[l++]=t}var u=f[p];f[p]=f[m],f[m++]=u}}return m'

function genPartition(predicate, args) {
  var fargs ='abcdef'.split('').concat(args)
  var reads = []
  if(predicate.indexOf('lo') >= 0) {
    reads.push('lo=e[k+n]')
  }
  if(predicate.indexOf('hi') >= 0) {
    reads.push('hi=e[k+o]')
  }
  fargs.push(
    code.replace('_', reads.join())
        .replace('$', predicate))
  return Function.apply(void 0, fargs)
}
},{}],53:[function(require,module,exports){
'use strict';

//This code is extracted from ndarray-sort
//It is inlined here as a temporary workaround

module.exports = wrapper;

var INSERT_SORT_CUTOFF = 32

function wrapper(data, n0) {
  if (n0 <= 4*INSERT_SORT_CUTOFF) {
    insertionSort(0, n0 - 1, data);
  } else {
    quickSort(0, n0 - 1, data);
  }
}

function insertionSort(left, right, data) {
  var ptr = 2*(left+1)
  for(var i=left+1; i<=right; ++i) {
    var a = data[ptr++]
    var b = data[ptr++]
    var j = i
    var jptr = ptr-2
    while(j-- > left) {
      var x = data[jptr-2]
      var y = data[jptr-1]
      if(x < a) {
        break
      } else if(x === a && y < b) {
        break
      }
      data[jptr]   = x
      data[jptr+1] = y
      jptr -= 2
    }
    data[jptr]   = a
    data[jptr+1] = b
  }
}

function swap(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = x
  data[j+1] = y
}

function move(i, j, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[i+1] = data[j+1]
}

function rotate(i, j, k, data) {
  i *= 2
  j *= 2
  k *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = data[k]
  data[j+1] = data[k+1]
  data[k] = x
  data[k+1] = y
}

function shufflePivot(i, j, px, py, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[j] = px
  data[i+1] = data[j+1]
  data[j+1] = py
}

function compare(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i],
      y = data[j]
  if(x < y) {
    return false
  } else if(x === y) {
    return data[i+1] > data[j+1]
  }
  return true
}

function comparePivot(i, y, b, data) {
  i *= 2
  var x = data[i]
  if(x < y) {
    return true
  } else if(x === y) {
    return data[i+1] < b
  }
  return false
}

function quickSort(left, right, data) {
  var sixth = (right - left + 1) / 6 | 0, 
      index1 = left + sixth, 
      index5 = right - sixth, 
      index3 = left + right >> 1, 
      index2 = index3 - sixth, 
      index4 = index3 + sixth, 
      el1 = index1, 
      el2 = index2, 
      el3 = index3, 
      el4 = index4, 
      el5 = index5, 
      less = left + 1, 
      great = right - 1, 
      tmp = 0
  if(compare(el1, el2, data)) {
    tmp = el1
    el1 = el2
    el2 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }
  if(compare(el1, el3, data)) {
    tmp = el1
    el1 = el3
    el3 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el1, el4, data)) {
    tmp = el1
    el1 = el4
    el4 = tmp
  }
  if(compare(el3, el4, data)) {
    tmp = el3
    el3 = el4
    el4 = tmp
  }
  if(compare(el2, el5, data)) {
    tmp = el2
    el2 = el5
    el5 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }

  var pivot1X = data[2*el2]
  var pivot1Y = data[2*el2+1]
  var pivot2X = data[2*el4]
  var pivot2Y = data[2*el4+1]

  var ptr0 = 2 * el1;
  var ptr2 = 2 * el3;
  var ptr4 = 2 * el5;
  var ptr5 = 2 * index1;
  var ptr6 = 2 * index3;
  var ptr7 = 2 * index5;
  for (var i1 = 0; i1 < 2; ++i1) {
    var x = data[ptr0+i1];
    var y = data[ptr2+i1];
    var z = data[ptr4+i1];
    data[ptr5+i1] = x;
    data[ptr6+i1] = y;
    data[ptr7+i1] = z;
  }

  move(index2, left, data)
  move(index4, right, data)
  for (var k = less; k <= great; ++k) {
    if (comparePivot(k, pivot1X, pivot1Y, data)) {
      if (k !== less) {
        swap(k, less, data)
      }
      ++less;
    } else {
      if (!comparePivot(k, pivot2X, pivot2Y, data)) {
        while (true) {
          if (!comparePivot(great, pivot2X, pivot2Y, data)) {
            if (--great < k) {
              break;
            }
            continue;
          } else {
            if (comparePivot(great, pivot1X, pivot1Y, data)) {
              rotate(k, less, great, data)
              ++less;
              --great;
            } else {
              swap(k, great, data)
              --great;
            }
            break;
          }
        }
      }
    }
  }
  shufflePivot(left, less-1, pivot1X, pivot1Y, data)
  shufflePivot(right, great+1, pivot2X, pivot2Y, data)
  if (less - 2 - left <= INSERT_SORT_CUTOFF) {
    insertionSort(left, less - 2, data);
  } else {
    quickSort(left, less - 2, data);
  }
  if (right - (great + 2) <= INSERT_SORT_CUTOFF) {
    insertionSort(great + 2, right, data);
  } else {
    quickSort(great + 2, right, data);
  }
  if (great - less <= INSERT_SORT_CUTOFF) {
    insertionSort(less, great, data);
  } else {
    quickSort(less, great, data);
  }
}
},{}],54:[function(require,module,exports){
'use strict'

module.exports = {
  init:           sqInit,
  sweepBipartite: sweepBipartite,
  sweepComplete:  sweepComplete,
  scanBipartite:  scanBipartite,
  scanComplete:   scanComplete
}

var pool  = require('typedarray-pool')
var bits  = require('bit-twiddle')
var isort = require('./sort')

//Flag for blue
var BLUE_FLAG = (1<<28)

//1D sweep event queue stuff (use pool to save space)
var INIT_CAPACITY      = 1024
var RED_SWEEP_QUEUE    = pool.mallocInt32(INIT_CAPACITY)
var RED_SWEEP_INDEX    = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_QUEUE   = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_INDEX   = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_QUEUE = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_INDEX = pool.mallocInt32(INIT_CAPACITY)
var SWEEP_EVENTS       = pool.mallocDouble(INIT_CAPACITY * 8)

//Reserves memory for the 1D sweep data structures
function sqInit(count) {
  var rcount = bits.nextPow2(count)
  if(RED_SWEEP_QUEUE.length < rcount) {
    pool.free(RED_SWEEP_QUEUE)
    RED_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(RED_SWEEP_INDEX.length < rcount) {
    pool.free(RED_SWEEP_INDEX)
    RED_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_QUEUE.length < rcount) {
    pool.free(BLUE_SWEEP_QUEUE)
    BLUE_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_INDEX.length < rcount) {
    pool.free(BLUE_SWEEP_INDEX)
    BLUE_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_QUEUE.length < rcount) {
    pool.free(COMMON_SWEEP_QUEUE)
    COMMON_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_INDEX.length < rcount) {
    pool.free(COMMON_SWEEP_INDEX)
    COMMON_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  var eventLength = 8 * rcount
  if(SWEEP_EVENTS.length < eventLength) {
    pool.free(SWEEP_EVENTS)
    SWEEP_EVENTS = pool.mallocDouble(eventLength)
  }
}

//Remove an item from the active queue in O(1)
function sqPop(queue, index, count, item) {
  var idx = index[item]
  var top = queue[count-1]
  queue[idx] = top
  index[top] = idx
}

//Insert an item into the active queue in O(1)
function sqPush(queue, index, count, item) {
  queue[count] = item
  index[item]  = count
}

//Recursion base case: use 1D sweep algorithm
function sweepBipartite(
    d, visit,
    redStart,  redEnd, red, redIndex,
    blueStart, blueEnd, blue, blueIndex) {

  //store events as pairs [coordinate, idx]
  //
  //  red create:  -(idx+1)
  //  red destroy: idx
  //  blue create: -(idx+BLUE_FLAG)
  //  blue destroy: idx+BLUE_FLAG
  //
  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = redIndex[i]
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -(idx+1)
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = blueIndex[i]+BLUE_FLAG
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive  = 0
  var blueActive = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e >= BLUE_FLAG) {
      //blue destroy event
      e = (e-BLUE_FLAG)|0
      sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, e)
    } else if(e >= 0) {
      //red destroy event
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e)
    } else if(e <= -BLUE_FLAG) {
      //blue create event
      e = (-e-BLUE_FLAG)|0
      for(var j=0; j<redActive; ++j) {
        var retval = visit(RED_SWEEP_QUEUE[j], e)
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, e)
    } else {
      //red create event
      e = (-e-1)|0
      for(var j=0; j<blueActive; ++j) {
        var retval = visit(e, BLUE_SWEEP_QUEUE[j])
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, e)
    }
  }
}

//Complete sweep
function sweepComplete(d, visit, 
  redStart, redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = (redIndex[i]+1)<<1
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = (blueIndex[i]+1)<<1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = (-idx)|1
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx|1
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  var blueActive   = 0
  var commonActive = 0
  for(var i=0; i<n; ++i) {
    var e     = SWEEP_EVENTS[2*i+1]|0
    var color = e&1
    if(i < n-1 && (e>>1) === (SWEEP_EVENTS[2*i+3]>>1)) {
      color = 2
      i += 1
    }
    
    if(e < 0) {
      //Create event
      var id = -(e>>1) - 1

      //Intersect with common
      for(var j=0; j<commonActive; ++j) {
        var retval = visit(COMMON_SWEEP_QUEUE[j], id)
        if(retval !== void 0) {
          return retval
        }
      }

      if(color !== 0) {
        //Intersect with red
        for(var j=0; j<redActive; ++j) {
          var retval = visit(RED_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color !== 1) {
        //Intersect with blue
        for(var j=0; j<blueActive; ++j) {
          var retval = visit(BLUE_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color === 0) {
        //Red
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, id)
      } else if(color === 1) {
        //Blue
        sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, id)
      } else if(color === 2) {
        //Both
        sqPush(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive++, id)
      }
    } else {
      //Destroy event
      var id = (e>>1) - 1
      if(color === 0) {
        //Red
        sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, id)
      } else if(color === 1) {
        //Blue
        sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, id)
      } else if(color === 2) {
        //Both
        sqPop(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive--, id)
      }
    }
  }
}

//Sweep and prune/scanline algorithm:
//  Scan along axis, detect intersections
//  Brute force all boxes along axis
function scanBipartite(
  d, axis, visit, flip,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {
  
  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  var redShift  = 1
  var blueShift = 1
  if(flip) {
    blueShift = BLUE_FLAG
  } else {
    redShift  = BLUE_FLAG
  }

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + redShift
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + blueShift
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      var isRed = false
      if(idx >= BLUE_FLAG) {
        isRed = !flip
        idx -= BLUE_FLAG 
      } else {
        isRed = !!flip
        idx -= 1
      }
      if(isRed) {
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, idx)
      } else {
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx
        
        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redPtr = elemSize * oidx

          if(b1 < red[redPtr+axis+1] || 
             red[redPtr+axis+1+d] < b0) {
            continue
          }

          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d] < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var redId  = redIndex[oidx]
          var retval
          if(flip) {
            retval = visit(blueId, redId)
          } else {
            retval = visit(redId, blueId)
          }
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e - redShift)
    }
  }
}

function scanComplete(
  d, axis, visit,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + BLUE_FLAG
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + 1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      if(idx >= BLUE_FLAG) {
        RED_SWEEP_QUEUE[redActive++] = idx - BLUE_FLAG
      } else {
        idx -= 1
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx

        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redId  = redIndex[oidx]

          if(redId === blueId) {
            break
          }

          var redPtr = elemSize * oidx
          if(b1 < red[redPtr+axis+1] || 
            red[redPtr+axis+1+d] < b0) {
            continue
          }
          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d]   < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var retval = visit(redId, blueId)
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      var idx = e - BLUE_FLAG
      for(var j=redActive-1; j>=0; --j) {
        if(RED_SWEEP_QUEUE[j] === idx) {
          for(var k=j+1; k<redActive; ++k) {
            RED_SWEEP_QUEUE[k-1] = RED_SWEEP_QUEUE[k]
          }
          break
        }
      }
      --redActive
    }
  }
}
},{"./sort":53,"bit-twiddle":55,"typedarray-pool":57}],55:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],56:[function(require,module,exports){
"use strict"

function dupe_array(count, value, i) {
  var c = count[i]|0
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1)
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i
  result = new Array(count)
  for(i=0; i<count; ++i) {
    result[i] = value
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

module.exports = dupe
},{}],57:[function(require,module,exports){
(function (global,Buffer){
'use strict'

var bits = require('bit-twiddle')
var dup = require('dup')

//Legacy pool support
if(!global.__TYPEDARRAY_POOL) {
  global.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  }
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
var POOL = global.__TYPEDARRAY_POOL

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0])
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0])
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER

exports.free = function free(array) {
  if(Buffer.isBuffer(array)) {
    BUFFER[bits.log2(array.length)].push(array)
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength
    var log_n = bits.log2(n)|0
    DATA[log_n].push(array)
  }
}

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength
  var log_n = bits.log2(n)
  DATA[log_n].push(buffer)
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer)
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray

exports.freeArrayBuffer = freeArrayBuffer

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[bits.log2(array.length)].push(array)
}

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
}

function mallocArrayBuffer(n) {
  var n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var d = DATA[log_n]
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView

function mallocBuffer(n) {
  n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var cache = BUFFER[log_n]
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0
    POOL.UINT16[i].length = 0
    POOL.UINT32[i].length = 0
    POOL.INT8[i].length = 0
    POOL.INT16[i].length = 0
    POOL.INT32[i].length = 0
    POOL.FLOAT[i].length = 0
    POOL.DOUBLE[i].length = 0
    POOL.UINT8C[i].length = 0
    DATA[i].length = 0
    BUFFER[i].length = 0
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"bit-twiddle":55,"buffer":2,"dup":56}],58:[function(require,module,exports){
module.exports = compareCells

var min = Math.min

function compareInt(a, b) {
  return a - b
}

function compareCells(a, b) {
  var n = a.length
    , t = a.length - b.length
  if(t) {
    return t
  }
  switch(n) {
    case 0:
      return 0
    case 1:
      return a[0] - b[0]
    case 2:
      return (a[0]+a[1]-b[0]-b[1]) ||
             min(a[0],a[1]) - min(b[0],b[1])
    case 3:
      var l1 = a[0]+a[1]
        , m1 = b[0]+b[1]
      t = l1+a[2] - (m1+b[2])
      if(t) {
        return t
      }
      var l0 = min(a[0], a[1])
        , m0 = min(b[0], b[1])
      return min(l0, a[2]) - min(m0, b[2]) ||
             min(l0+a[2], l1) - min(m0+b[2], m1)
    case 4:
      var aw=a[0], ax=a[1], ay=a[2], az=a[3]
        , bw=b[0], bx=b[1], by=b[2], bz=b[3]
      return (aw+ax+ay+az)-(bw+bx+by+bz) ||
             min(aw,ax,ay,az)-min(bw,bx,by,bz,bw) ||
             min(aw+ax,aw+ay,aw+az,ax+ay,ax+az,ay+az) -
               min(bw+bx,bw+by,bw+bz,bx+by,bx+bz,by+bz) ||
             min(aw+ax+ay,aw+ax+az,aw+ay+az,ax+ay+az) -
               min(bw+bx+by,bw+bx+bz,bw+by+bz,bx+by+bz)
    default:
      var as = a.slice().sort(compareInt)
      var bs = b.slice().sort(compareInt)
      for(var i=0; i<n; ++i) {
        t = as[i] - bs[i]
        if(t) {
          return t
        }
      }
      return 0
  }
}

},{}],59:[function(require,module,exports){
"use strict"

var doubleBits = require("double-bits")

var SMALLEST_DENORM = Math.pow(2, -1074)
var UINT_MAX = (-1)>>>0

module.exports = nextafter

function nextafter(x, y) {
  if(isNaN(x) || isNaN(y)) {
    return NaN
  }
  if(x === y) {
    return x
  }
  if(x === 0) {
    if(y < 0) {
      return -SMALLEST_DENORM
    } else {
      return SMALLEST_DENORM
    }
  }
  var hi = doubleBits.hi(x)
  var lo = doubleBits.lo(x)
  if((y > x) === (x > 0)) {
    if(lo === UINT_MAX) {
      hi += 1
      lo = 0
    } else {
      lo += 1
    }
  } else {
    if(lo === 0) {
      lo = UINT_MAX
      hi -= 1
    } else {
      lo -= 1
    }
  }
  return doubleBits.pack(lo, hi)
}
},{"double-bits":60}],60:[function(require,module,exports){
(function (Buffer){
var hasTypedArrays = false
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer)
  DOUBLE_VIEW[0] = 1.0
  hasTypedArrays = true
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    }
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo
      UINT_VIEW[1] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    }
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo
      UINT_VIEW[0] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE
  } else {
    hasTypedArrays = false
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8)
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true)
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  }
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true)
    buffer.writeUInt32LE(hi, 4, true)
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
}

module.exports.exponent = function(n) {
  var b = module.exports.hi(n)
  return ((b<<1) >>> 21) - 1023
}

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n)
  var hi = module.exports.hi(n)
  var b = hi & ((1<<20) - 1)
  if(hi & 0x7ff00000) {
    b += (1<<20)
  }
  return [lo, b]
}

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n)
  return !(hi & 0x7ff00000)
}
}).call(this,require("buffer").Buffer)

},{"buffer":2}],61:[function(require,module,exports){
'use strict'

var bnadd = require('big-rat/add')

module.exports = add

function add(a, b) {
  var n = a.length
  var r = new Array(n)
    for(var i=0; i<n; ++i) {
    r[i] = bnadd(a[i], b[i])
  }
  return r
}

},{"big-rat/add":29}],62:[function(require,module,exports){
'use strict'

module.exports = float2rat

var rat = require('big-rat')

function float2rat(v) {
  var result = new Array(v.length)
  for(var i=0; i<v.length; ++i) {
    result[i] = rat(v[i])
  }
  return result
}

},{"big-rat":32}],63:[function(require,module,exports){
'use strict'

var rat = require('big-rat')
var mul = require('big-rat/mul')

module.exports = muls

function muls(a, x) {
  var s = rat(x)
  var n = a.length
  var r = new Array(n)
  for(var i=0; i<n; ++i) {
    r[i] = mul(a[i], s)
  }
  return r
}

},{"big-rat":32,"big-rat/mul":41}],64:[function(require,module,exports){
'use strict'

var bnsub = require('big-rat/sub')

module.exports = sub

function sub(a, b) {
  var n = a.length
  var r = new Array(n)
    for(var i=0; i<n; ++i) {
    r[i] = bnsub(a[i], b[i])
  }
  return r
}

},{"big-rat/sub":46}],65:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],66:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"two-product":69,"two-sum":65}],67:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],68:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],69:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],70:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"robust-scale":66,"robust-subtract":67,"robust-sum":68,"two-product":69}],71:[function(require,module,exports){
"use strict"

module.exports = segmentsIntersect

var orient = require("robust-orientation")[3]

function checkCollinear(a0, a1, b0, b1) {

  for(var d=0; d<2; ++d) {
    var x0 = a0[d]
    var y0 = a1[d]
    var l0 = Math.min(x0, y0)
    var h0 = Math.max(x0, y0)    

    var x1 = b0[d]
    var y1 = b1[d]
    var l1 = Math.min(x1, y1)
    var h1 = Math.max(x1, y1)    

    if(h1 < l0 || h0 < l1) {
      return false
    }
  }

  return true
}

function segmentsIntersect(a0, a1, b0, b1) {
  var x0 = orient(a0, b0, b1)
  var y0 = orient(a1, b0, b1)
  if((x0 > 0 && y0 > 0) || (x0 < 0 && y0 < 0)) {
    return false
  }

  var x1 = orient(b0, a0, a1)
  var y1 = orient(b1, a0, a1)
  if((x1 > 0 && y1 > 0) || (x1 < 0 && y1 < 0)) {
    return false
  }

  //Check for degenerate collinear case
  if(x0 === 0 && y0 === 0 && x1 === 0 && y1 === 0) {
    return checkCollinear(a0, a1, b0, b1)
  }

  return true
}
},{"robust-orientation":70}],72:[function(require,module,exports){
"use strict"; "use restrict";

module.exports = UnionFind;

function UnionFind(count) {
  this.roots = new Array(count);
  this.ranks = new Array(count);
  
  for(var i=0; i<count; ++i) {
    this.roots[i] = i;
    this.ranks[i] = 0;
  }
}

var proto = UnionFind.prototype

Object.defineProperty(proto, "length", {
  "get": function() {
    return this.roots.length
  }
})

proto.makeSet = function() {
  var n = this.roots.length;
  this.roots.push(n);
  this.ranks.push(0);
  return n;
}

proto.find = function(x) {
  var x0 = x
  var roots = this.roots;
  while(roots[x] !== x) {
    x = roots[x]
  }
  while(roots[x0] !== x) {
    var y = roots[x0]
    roots[x0] = x
    x0 = y
  }
  return x;
}

proto.link = function(x, y) {
  var xr = this.find(x)
    , yr = this.find(y);
  if(xr === yr) {
    return;
  }
  var ranks = this.ranks
    , roots = this.roots
    , xd    = ranks[xr]
    , yd    = ranks[yr];
  if(xd < yd) {
    roots[xr] = yr;
  } else if(yd < xd) {
    roots[yr] = xr;
  } else {
    roots[yr] = xr;
    ++ranks[xr];
  }
}
},{}],73:[function(require,module,exports){
'use strict'

module.exports = boundary

var bnd = require('boundary-cells')
var reduce = require('reduce-simplicial-complex')

function boundary(cells) {
  return reduce(bnd(cells))
}

},{"boundary-cells":74,"reduce-simplicial-complex":78}],74:[function(require,module,exports){
"use strict"

module.exports = boundary

function boundary(cells) {
  var n = cells.length
  var sz = 0
  for(var i=0; i<n; ++i) {
    sz += cells[i].length
  }
  var result = new Array(sz)
  var ptr = 0
  for(var i=0; i<n; ++i) {
    var c = cells[i]
    var d = c.length
    for(var j=0; j<d; ++j) {
      var b = result[ptr++] = new Array(d-1)
      for(var k=1; k<d; ++k) {
        b[k-1] = c[(j+k)%d]
      }
    }
  }
  return result
}

},{}],75:[function(require,module,exports){
'use strict'

module.exports = orientation

function orientation(s) {
  var p = 1
  for(var i=1; i<s.length; ++i) {
    for(var j=0; j<i; ++j) {
      if(s[i] < s[j]) {
        p = -p
      } else if(s[j] === s[i]) {
        return 0
      }
    }
  }
  return p
}

},{}],76:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"dup":58}],77:[function(require,module,exports){
'use strict'

var compareCells = require('compare-cell')
var parity = require('cell-orientation')

module.exports = compareOrientedCells

function compareOrientedCells(a, b) {
  return compareCells(a, b) || parity(a) - parity(b)
}

},{"cell-orientation":75,"compare-cell":76}],78:[function(require,module,exports){
'use strict'

var compareCell = require('compare-cell')
var compareOrientedCell = require('compare-oriented-cell')
var orientation = require('cell-orientation')

module.exports = reduceCellComplex

function reduceCellComplex(cells) {
  cells.sort(compareOrientedCell)
  var n = cells.length
  var ptr = 0
  for(var i=0; i<n; ++i) {
    var c = cells[i]
    var o = orientation(c)
    if(o === 0) {
      continue
    }
    if(ptr > 0) {
      var f = cells[ptr-1]
      if(compareCell(c, f) === 0 &&
         orientation(f)    !== o) {
        ptr -= 1
        continue
      }
    }
    cells[ptr++] = c
  }
  cells.length = ptr
  return cells
}

},{"cell-orientation":75,"compare-cell":76,"compare-oriented-cell":77}],79:[function(require,module,exports){
'use strict'

var snapRound = require('clean-pslg')
var cdt2d = require('cdt2d')
var bsearch = require('binary-search-bounds')
var boundary = require('simplicial-complex-boundary')

module.exports = overlayPSLG

var RED  = 0
var BLUE = 1

var OPERATORS = {
  'xor':  [0, 1, 1, 0],
  'or':   [0, 1, 1, 1],
  'and':  [0, 0, 0, 1],
  'sub':  [0, 1, 0, 0],
  'rsub': [0, 0, 1, 0]
}

function getTable(op) {
  if(typeof op !== 'string') {
    return OPERATORS.xor
  }
  var x = OPERATORS[op.toLowerCase()]
  if(x) {
    return x
  }
  return OPERATORS.xor
}


function compareEdge(a, b) {
  return Math.min(a[0], a[1]) - Math.min(b[0], b[1]) ||
         Math.max(a[0], a[1]) - Math.max(b[0], b[1])
}

function edgeCellIndex(edge, cell) {
  var a = edge[0]
  var b = edge[1]
  for(var i=0; i<3; ++i) {
    if(cell[i] !== a && cell[i] !== b) {
      return i
    }
  }
  return -1
}

function buildCellIndex(cells) {
  //Initialize cell index
  var cellIndex = new Array(3*cells.length)
  for(var i=0; i<3*cells.length; ++i) {
    cellIndex[i] = -1
  }

  //Sort edges
  var edges = []
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    for(var j=0; j<3; ++j) {
      edges.push([c[j], c[(j+1)%3], i])
    }
  }
  edges.sort(compareEdge)

  //For each pair of edges, link adjacent cells
  for(var i=1; i<edges.length; ++i) {
    var e = edges[i]
    var f = edges[i-1]
    if(compareEdge(e, f) !== 0) {
      continue
    }
    var ce = e[2]
    var cf = f[2]
    var ei = edgeCellIndex(e, cells[ce])
    var fi = edgeCellIndex(f, cells[cf])
    cellIndex[3*ce+ei] = cf
    cellIndex[3*cf+fi] = ce
  }

  return cellIndex
}

function compareLex2(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    var a = e[0]
    var b = e[1]
    e[0] = Math.min(a, b)
    e[1] = Math.max(a, b)
  }
  edges.sort(compareLex2)
}


var TMP = [0,0]
function isConstraint(edges, a, b) {
  TMP[0] = Math.min(a,b)
  TMP[1] = Math.max(a,b)
  return bsearch.eq(edges, TMP, compareLex2) >= 0
}

//Classify all cells within boundary
function markCells(cells, adj, edges) {

  //Initialize active/next queues and flags
  var flags = new Array(cells.length)
  var constraint = new Array(3*cells.length)
  for(var i=0; i<3*cells.length; ++i) {
    constraint[i] = false
  }
  var active = []
  var next   = []
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    flags[i] = 0
    for(var j=0; j<3; ++j) {
      var a = c[(j+1)%3]
      var b = c[(j+2)%3]
      var constr = constraint[3*i+j] = isConstraint(edges, a, b)
      if(adj[3*i+j] >= 0) {
        continue
      }
      if(constr) {
        next.push(i)
      } else {
        flags[i] = 1
        active.push(i)
      }
    }
  }

  //Mark flags
  var side = 1
  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop()
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side
      var c = cells[t]
      for(var j=0; j<3; ++j) {
        var f = adj[3*t+j]
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f)
          } else {
            active.push(f)
            flags[f] = side
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next
    next = active
    active = tmp
    next.length = 0
    side = -side
  }

  return flags
}

function setIntersect(colored, edges) {
  var ptr = 0
  for(var i=0,j=0; i<colored.length&&j<edges.length; ) {
    var e = colored[i]
    var f = edges[j]
    var d = e[0]-f[0] || e[1]-f[1]
    if(d < 0) {
      i += 1
    } else if(d > 0) {
      j += 1
    } else {
      colored[ptr++] = colored[i]
      i += 1
      j += 1
    }
  }
  colored.length = ptr
  return colored
}

function relabelEdges(edges, labels) {
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    e[0] = labels[e[0]]
    e[1] = labels[e[1]]
  }
}

function markEdgesActive(edges, labels) {
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    labels[e[0]] = labels[e[1]] = 1
  }
}

function removeUnusedPoints(points, redE, blueE) {
  var labels = new Array(points.length)
  for(var i=0; i<labels.length; ++i) {
    labels[i] = -1
  }
  markEdgesActive(redE, labels)
  markEdgesActive(blueE, labels)

  var ptr = 0
  for(var i=0; i<points.length; ++i) {
    if(labels[i] > 0) {
      labels[i] = ptr
      points[ptr++] = points[i]
    }
  }
  points.length = ptr
  relabelEdges(redE, labels)
  relabelEdges(blueE, labels)
}

function overlayPSLG(redPoints, redEdges, bluePoints, blueEdges, op) {
  //1.  concatenate points
  var numRedPoints = redPoints.length
  var points = redPoints.concat(bluePoints)

  //2.  concatenate edges
  var numRedEdges  = redEdges.length
  var numBlueEdges = blueEdges.length
  var edges        = new Array(numRedEdges + numBlueEdges)
  var colors       = new Array(numRedEdges + numBlueEdges)
  for(var i=0; i<redEdges.length; ++i) {
    var e      = redEdges[i]
    colors[i]  = RED
    edges[i]   = [ e[0], e[1] ]
  }
  for(var i=0; i<blueEdges.length; ++i) {
    var e      = blueEdges[i]
    colors[i+numRedEdges]  = BLUE
    edges[i+numRedEdges]   = [ e[0]+numRedPoints, e[1]+numRedPoints ]
  }

  //3.  run snap rounding with edge colors
  snapRound(points, edges, colors)

  //4. Sort edges
  canonicalizeEdges(edges)

  //5.  extract red and blue edges
  var redE = [], blueE = []
  for(var i=0; i<edges.length; ++i) {
    if(colors[i] === RED) {
      redE.push(edges[i])
    } else {
      blueE.push(edges[i])
    }
  }

  //6.  triangulate
  var cells = cdt2d(points, edges, { delaunay: false })

  //7. build adjacency data structure
  var adj = buildCellIndex(cells)

  //8. classify triangles
  var redFlags = markCells(cells, adj, redE)
  var blueFlags = markCells(cells, adj, blueE)

  //9. filter out cels which are not part of triangulation
  var table = getTable(op)
  var ptr = 0
  for(var i=0; i<cells.length; ++i) {
    var code = ((redFlags[i] < 0)<<1) + (blueFlags[i] < 0)
    if(table[code]) {
      cells[ptr++] = cells[i]
    }
  }
  cells.length = ptr

  //10. extract boundary
  var bnd = boundary(cells)
  canonicalizeEdges(bnd)

  //11. Intersect constraint edges with boundary
  redE = setIntersect(redE, bnd)
  blueE = setIntersect(blueE, bnd)

  //12. filter old points
  removeUnusedPoints(points, redE, blueE)

  return {
    points: points,
    red:    redE,
    blue:   blueE
  }
}

},{"binary-search-bounds":9,"cdt2d":10,"clean-pslg":27,"simplicial-complex-boundary":73}],80:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./lib/rat-seg-intersect":81,"big-rat":85,"big-rat/cmp":83,"big-rat/to-float":100,"box-intersect":101,"compare-cell":111,"dup":27,"nextafter":112,"rat-vec":115,"robust-segment-intersect":124,"union-find":125}],81:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"big-rat/div":84,"big-rat/mul":94,"big-rat/sign":98,"big-rat/sub":99,"big-rat/to-float":100,"dup":28,"rat-vec/add":114,"rat-vec/muls":116,"rat-vec/sub":117}],82:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"./lib/rationalize":92,"dup":29}],83:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],84:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"./lib/rationalize":92,"dup":31}],85:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./div":84,"./is-rat":86,"./lib/is-bn":90,"./lib/num-to-bn":91,"./lib/rationalize":92,"./lib/str-to-bn":93,"dup":32}],86:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"./lib/is-bn":90,"dup":33}],87:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"bn.js":96,"dup":34}],88:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],89:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"bit-twiddle":95,"double-bits":97,"dup":36}],90:[function(require,module,exports){
arguments[4][37][0].apply(exports,arguments)
},{"bn.js":96,"dup":37}],91:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"bn.js":96,"double-bits":97,"dup":38}],92:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"./bn-sign":87,"./num-to-bn":91,"dup":39}],93:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"bn.js":96,"dup":40}],94:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./lib/rationalize":92,"dup":41}],95:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],96:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"dup":43}],97:[function(require,module,exports){
(function (Buffer){
var hasTypedArrays = false
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer)
  DOUBLE_VIEW[0] = 1.0
  hasTypedArrays = true
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    }
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo
      UINT_VIEW[1] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    }
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo
      UINT_VIEW[0] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE
  } else {
    hasTypedArrays = false
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8)
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true)
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  }
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true)
    buffer.writeUInt32LE(hi, 4, true)
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
}

module.exports.exponent = function(n) {
  var b = module.exports.hi(n)
  return ((b<<1) >>> 21) - 1023
}

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n)
  var hi = module.exports.hi(n)
  var b = hi & ((1<<20) - 1)
  if(hi & 0x7ff00000) {
    b += (1<<20)
  }
  return [lo, b]
}

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n)
  return !(hi & 0x7ff00000)
}
}).call(this,require("buffer").Buffer)

},{"buffer":2}],98:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"./lib/bn-sign":87,"dup":45}],99:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"./lib/rationalize":92,"dup":46}],100:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"./lib/bn-to-num":88,"./lib/ctz":89,"dup":47}],101:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"./lib/intersect":103,"./lib/sweep":107,"dup":48,"typedarray-pool":110}],102:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49}],103:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"./brute":102,"./median":104,"./partition":105,"./sweep":107,"bit-twiddle":108,"dup":50,"typedarray-pool":110}],104:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"./partition":105,"dup":51}],105:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"dup":52}],106:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}],107:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./sort":106,"bit-twiddle":108,"dup":54,"typedarray-pool":110}],108:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42}],109:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],110:[function(require,module,exports){
(function (global,Buffer){
'use strict'

var bits = require('bit-twiddle')
var dup = require('dup')

//Legacy pool support
if(!global.__TYPEDARRAY_POOL) {
  global.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  }
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
var POOL = global.__TYPEDARRAY_POOL

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0])
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0])
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER

exports.free = function free(array) {
  if(Buffer.isBuffer(array)) {
    BUFFER[bits.log2(array.length)].push(array)
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength
    var log_n = bits.log2(n)|0
    DATA[log_n].push(array)
  }
}

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength
  var log_n = bits.log2(n)
  DATA[log_n].push(buffer)
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer)
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray

exports.freeArrayBuffer = freeArrayBuffer

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[bits.log2(array.length)].push(array)
}

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
}

function mallocArrayBuffer(n) {
  var n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var d = DATA[log_n]
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView

function mallocBuffer(n) {
  n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var cache = BUFFER[log_n]
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0
    POOL.UINT16[i].length = 0
    POOL.UINT32[i].length = 0
    POOL.INT8[i].length = 0
    POOL.INT16[i].length = 0
    POOL.INT32[i].length = 0
    POOL.FLOAT[i].length = 0
    POOL.DOUBLE[i].length = 0
    POOL.UINT8C[i].length = 0
    DATA[i].length = 0
    BUFFER[i].length = 0
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"bit-twiddle":108,"buffer":2,"dup":109}],111:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"dup":58}],112:[function(require,module,exports){
arguments[4][59][0].apply(exports,arguments)
},{"double-bits":113,"dup":59}],113:[function(require,module,exports){
(function (Buffer){
var hasTypedArrays = false
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer)
  DOUBLE_VIEW[0] = 1.0
  hasTypedArrays = true
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    }
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo
      UINT_VIEW[1] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    }
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo
      UINT_VIEW[0] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE
  } else {
    hasTypedArrays = false
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8)
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true)
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  }
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true)
    buffer.writeUInt32LE(hi, 4, true)
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
}

module.exports.exponent = function(n) {
  var b = module.exports.hi(n)
  return ((b<<1) >>> 21) - 1023
}

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n)
  var hi = module.exports.hi(n)
  var b = hi & ((1<<20) - 1)
  if(hi & 0x7ff00000) {
    b += (1<<20)
  }
  return [lo, b]
}

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n)
  return !(hi & 0x7ff00000)
}
}).call(this,require("buffer").Buffer)

},{"buffer":2}],114:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"big-rat/add":82,"dup":61}],115:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"big-rat":85,"dup":62}],116:[function(require,module,exports){
arguments[4][63][0].apply(exports,arguments)
},{"big-rat":85,"big-rat/mul":94,"dup":63}],117:[function(require,module,exports){
arguments[4][64][0].apply(exports,arguments)
},{"big-rat/sub":99,"dup":64}],118:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],119:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"two-product":122,"two-sum":118}],120:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],121:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],122:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],123:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"robust-scale":119,"robust-subtract":120,"robust-sum":121,"two-product":122}],124:[function(require,module,exports){
arguments[4][71][0].apply(exports,arguments)
},{"dup":71,"robust-orientation":123}],125:[function(require,module,exports){
arguments[4][72][0].apply(exports,arguments)
},{"dup":72}],126:[function(require,module,exports){
'use strict'

module.exports = polygonToPSLG

var cleanPSLG = require('clean-pslg')

//Converts a polygon to a planar straight line graph
function polygonToPSLG(loops, options) {
  if(!Array.isArray(loops)) {
    throw new Error('poly-to-pslg: Error, invalid polygon')
  }
  if(loops.length === 0) {
    return {
      points: [],
      edges:  []
    }
  }

  options = options || {}

  var nested = true
  if('nested' in options) {
    nested = !!options.nested
  } else if(loops[0].length === 2 && typeof loops[0][0] === 'number') {
    //Hack:  If use doesn't pass in a loop, then try to guess if it is nested
    nested = false
  }
  if(!nested) {
    loops = [loops]
  }

  //First we just unroll all the points in the dumb/obvious way
  var points = []
  var edges = []
  for(var i=0; i<loops.length; ++i) {
    var loop = loops[i]
    var offset = points.length
    for(var j=0; j<loop.length; ++j) {
      points.push(loop[j])
      edges.push([ offset+j, offset+(j+1)%loop.length ])
    }
  }

  //Then we run snap rounding to clean up self intersections and duplicate verts
  var clean = 'clean' in options ? true : !!options.clean
  if(clean) {
    cleanPSLG(points, edges)
  }

  //Finally, we return the resulting PSLG
  return {
    points: points,
    edges:  edges
  }
}

},{"clean-pslg":80}],127:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./lib/delaunay":128,"./lib/filter":129,"./lib/monotone":130,"./lib/triangulation":131,"dup":10}],128:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"binary-search-bounds":132,"dup":11,"robust-in-sphere":133}],129:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"binary-search-bounds":132,"dup":12}],130:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"binary-search-bounds":132,"dup":13,"robust-orientation":144}],131:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"binary-search-bounds":132,"dup":14}],132:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],133:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"dup":15,"robust-scale":135,"robust-subtract":136,"robust-sum":137,"two-product":138}],134:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],135:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"two-product":138,"two-sum":134}],136:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],137:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],138:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],139:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],140:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"two-product":143,"two-sum":139}],141:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],142:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],143:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20}],144:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"robust-scale":140,"robust-subtract":141,"robust-sum":142,"two-product":143}],145:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"boundary-cells":146,"dup":73,"reduce-simplicial-complex":150}],146:[function(require,module,exports){
arguments[4][74][0].apply(exports,arguments)
},{"dup":74}],147:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"dup":75}],148:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"dup":58}],149:[function(require,module,exports){
arguments[4][77][0].apply(exports,arguments)
},{"cell-orientation":147,"compare-cell":148,"dup":77}],150:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"cell-orientation":147,"compare-cell":148,"compare-oriented-cell":149,"dup":78}],151:[function(require,module,exports){
'use strict'

var cdt2d     = require('cdt2d')
var boundary  = require('simplicial-complex-boundary')

module.exports = pslgToPolygon

function pslgToPolygon(points, edges) {
  //Get cells
  var cells = cdt2d(points, edges, {
    delaunay: false,
    exterior: false })

  //Extract boundary
  var bnd = boundary(cells)

  //Construct adjacency list from boundary
  var adj = new Array(points.length)
  for(var i=0; i<points.length; ++i) {
    adj[i] = []
  }

  for(var i=0; i<bnd.length; ++i) {
    var e = bnd[i]
    adj[e[0]].push(e[1])
  }

  //Extract boundary cycle
  var loops = []
  for(var i=0; i<points.length; ++i) {
    if(adj[i].length === 0) {
      continue
    }
    var v = i, loop = []
    do {
      loop.push(points[v])
      v = adj[v].pop()
    } while(v !== i)
    loops.push(loop)
  }

  return loops
}

},{"cdt2d":127,"simplicial-complex-boundary":145}],152:[function(require,module,exports){
//
// Perlin noise module.
//
// Written by Thom Chiovoloni, dedicated into the public domain (as explained at
// http://creativecommons.org/publicdomain/zero/1.0/).
//
var quickNoise = (function() {
	'use strict';

	function buildTable(randFunc) {
		if (!randFunc) {
			randFunc = Math.random;
		}
		// @NOTE(thom): could optimize this for allocations, but it
		// shouldn't be near anybody's fast path...
		var arr = new Array(256).map(function(v, i) { return i; });
		// shuffle numbers 0 through 255
		for (var i = arr.length-1; i > 0; --i) {
			var r = Math.floor(randFunc() * (i+1));
			var t = arr[r];
			arr[r] = arr[i];
			arr[i] = t;
		}
		return arr;
	}

	var gradBasis = [ 1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1 ]

	function initTables(tab, permTable, gradTable) {
		if (tab == null || typeof tab === 'function') {
			tab = buildTable(tab)
		}
		else if (tab.length !== 256) {
			console.error("create(): Expected array of length 256, got ", tab);
			tab = buildTable();
		}
		for (var i = 0; i < 256; ++i) {
			permTable[i] = tab[i];
			permTable[i+256] = tab[i];
		}
		var gradIdx = 0;
		for (var i = 0; i < permTable.length; ++i) {
			var v = (permTable[i]%12)*3;
			gradTable[gradIdx++] = gradBasis[v];
			gradTable[gradIdx++] = gradBasis[v+1];
			gradTable[gradIdx++] = gradBasis[v+2];
		}
	}

	var permTableSize = 256*2;
	var gradTableSize = permTableSize*3;
	var totalSize = permTableSize + gradTableSize;

	//
	// function quickNoise.create(tableOrRng=Math.random);
	//
	// `tableOrRng` must either be:
	//
	// - A function that takes 0 arguments and returns a uniformly distributed
	//   random number between 0 and 1 (like `Math.random`).
	// - An array of length 256, where the array is generated by shuffling all
	//   integers between 0 and 255 (inclusive).
	//
	// If no argument (or a bad argument) is provided, it defaults to Math.random.
	//
	// This creates a perlin noise generation function. For more documentation about
	// the function returned by this call, see the documentation for `quickNoise.noise`, below.
	//
	// If you provide a function, this will be used only to generate the permutation table, and
	// will not be called after this function returns.
	//
	// The array argument provided in case you want to provide a specific permutation table.
	//

	function create(tab) {
		var ab = new ArrayBuffer(totalSize);
		var permTable = new Uint8Array(ab, 0, permTableSize);
		var gradTable = new Int8Array(ab, permTableSize, gradTableSize);
		initTables(tab, permTable, gradTable);

		function noise(x, y, z, xWrap, yWrap, zWrap) {
			// coersce to integers and handle missing arguments
			xWrap = xWrap | 0;
			yWrap = yWrap | 0;
			zWrap = zWrap | 0;

			// type hints for vm
			x = +x;
			y = +y;
			z = +z;

			var xMask = ((xWrap-1) & 255) >>> 0;
			var yMask = ((yWrap-1) & 255) >>> 0;
			var zMask = ((zWrap-1) & 255) >>> 0;

			var px = Math.floor(x);
			var py = Math.floor(y);
			var pz = Math.floor(z);

			var x0 = (px+0) & xMask;
			var x1 = (px+1) & xMask;

			var y0 = (py+0) & yMask;
			var y1 = (py+1) & yMask;

			var z0 = (pz+0) & zMask;
			var z1 = (pz+1) & zMask;

			x -= px;
			y -= py;
			z -= pz;

			var u = ((x*6.0-15.0)*x + 10.0) * x * x * x;
			var v = ((y*6.0-15.0)*y + 10.0) * y * y * y;
			var w = ((z*6.0-15.0)*z + 10.0) * z * z * z;

			var r0 = permTable[x0];
			var r1 = permTable[x1];

			var r00 = permTable[r0+y0];
			var r01 = permTable[r0+y1];
			var r10 = permTable[r1+y0];
			var r11 = permTable[r1+y1];

			var h000 = permTable[r00+z0] * 3;
			var h001 = permTable[r00+z1] * 3;
			var h010 = permTable[r01+z0] * 3;
			var h011 = permTable[r01+z1] * 3;
			var h100 = permTable[r10+z0] * 3;
			var h101 = permTable[r10+z1] * 3;
			var h110 = permTable[r11+z0] * 3;
			var h111 = permTable[r11+z1] * 3;

			var n000 = gradTable[h000]*(x+0) + gradTable[h000+1]*(y+0) + gradTable[h000+2]*(z+0);
			var n001 = gradTable[h001]*(x+0) + gradTable[h001+1]*(y+0) + gradTable[h001+2]*(z-1);
			var n010 = gradTable[h010]*(x+0) + gradTable[h010+1]*(y-1) + gradTable[h010+2]*(z+0);
			var n011 = gradTable[h011]*(x+0) + gradTable[h011+1]*(y-1) + gradTable[h011+2]*(z-1);
			var n100 = gradTable[h100]*(x-1) + gradTable[h100+1]*(y+0) + gradTable[h100+2]*(z+0);
			var n101 = gradTable[h101]*(x-1) + gradTable[h101+1]*(y+0) + gradTable[h101+2]*(z-1);
			var n110 = gradTable[h110]*(x-1) + gradTable[h110+1]*(y-1) + gradTable[h110+2]*(z+0);
			var n111 = gradTable[h111]*(x-1) + gradTable[h111+1]*(y-1) + gradTable[h111+2]*(z-1);

			var n00 = n000 + (n001-n000) * w;
			var n01 = n010 + (n011-n010) * w;
			var n10 = n100 + (n101-n100) * w;
			var n11 = n110 + (n111-n110) * w;

			var n0 = n00 + (n01-n00) * v;
			var n1 = n10 + (n11-n10) * v;

			return n0 + (n1-n0) * u;
		}
		return noise;
	}

	//
	// function quickNoise.noise(x, y, z, xWrap=0, yWrap=0, zWrap=0);
	//
	// - `x`, `y`, `z` are numbers.
	// - `xWrap`, `yWrap`, and `zWrap` are integer powers of two between 0 and 256.
	//   (0 and 256 are equivalent). If these aren't provided, they default to 0.
	//
	// This implements Ken Perlin's revised noise function from 2002, in 3D. It
	// computes a random value for the coordinate `x`, `y`, `z`, where adjacent
	// values are continuous with a period of 1 (Values at integer points are
	// entirely unrelated).
	//
	// This function is seeded. That is, it will return the same results when
	// called with the same arguments, across successive program runs. An unseeded
	// version may be created with the `quickNoise.create` function. The table it is
	// seeded is the one from the `stb_perlin.h` library.
	//
	var noise = create([
		23, 125, 161, 52, 103, 117, 70, 37, 247, 101, 203, 169, 124, 126, 44, 123,
		152, 238, 145, 45, 171, 114, 253, 10, 192, 136, 4, 157, 249, 30, 35, 72,
		175, 63, 77, 90, 181, 16, 96, 111, 133, 104, 75, 162, 93, 56, 66, 240,
		8, 50, 84, 229, 49, 210, 173, 239, 141, 1, 87, 18, 2, 198, 143, 57,
		225, 160, 58, 217, 168, 206, 245, 204, 199, 6, 73, 60, 20, 230, 211, 233,
		94, 200, 88, 9, 74, 155, 33, 15, 219, 130, 226, 202, 83, 236, 42, 172,
		165, 218, 55, 222, 46, 107, 98, 154, 109, 67, 196, 178, 127, 158, 13, 243,
		65, 79, 166, 248, 25, 224, 115, 80, 68, 51, 184, 128, 232, 208, 151, 122,
		26, 212, 105, 43, 179, 213, 235, 148, 146, 89, 14, 195, 28, 78, 112, 76,
		250, 47, 24, 251, 140, 108, 186, 190, 228, 170, 183, 139, 39, 188, 244, 246,
		132, 48, 119, 144, 180, 138, 134, 193, 82, 182, 120, 121, 86, 220, 209, 3,
		91, 241, 149, 85, 205, 150, 113, 216, 31, 100, 41, 164, 177, 214, 153, 231,
		38, 71, 185, 174, 97, 201, 29, 95, 7, 92, 54, 254, 191, 118, 34, 221,
		131, 11, 163, 99, 234, 81, 227, 147, 156, 176, 17, 142, 69, 12, 110, 62,
		27, 255, 0, 194, 59, 116, 242, 252, 19, 21, 187, 53, 207, 129, 64, 135,
		61, 40, 167, 237, 102, 223, 106, 159, 197, 189, 215, 137, 36, 32, 22, 5
	]);

	return {
		create: create,
		noise: noise
	};

}());

if (typeof module !== 'undefined' && module.exports) {
	module.exports = quickNoise;
}

},{}],153:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var Vec2 = (function () {
	function Vec2(x, y) {
		_classCallCheck(this, Vec2);

		this.x = +x || 0.0;this.y = +y || 0.0;
	}

	Vec2.prototype.perp = function perp() {
		return new Vec2(-this.y, this.x);
	};

	Vec2.prototype.to = function to(o) {
		return new Vec2(o.x - this.x, o.y - this.y);
	};

	Vec2.prototype.dot = function dot(o) {
		return this.x * o.x + this.y * o.y;
	};

	Vec2.prototype.perpDot = function perpDot(o) {
		return -this.y * o.x + this.x * o.y;
	};

	Vec2.prototype.plus = function plus(o) {
		return new Vec2(this.x + o.x, this.y + o.y);
	};

	Vec2.prototype.minus = function minus(o) {
		return new Vec2(this.x - o.x, this.y - o.y);
	};

	Vec2.prototype.lenSq = function lenSq() {
		return this.x * this.x + this.y * this.y;
	};

	Vec2.prototype.len = function len() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	Vec2.prototype.length = function length() {
		return this.len();
	};

	Vec2.prototype.lengthSquared = function lengthSquared() {
		return lenSq();
	};

	Vec2.prototype.scaled = function scaled(n) {
		return new Vec2(this.x * n, this.y * n);
	};

	Vec2.prototype.normalize = function normalize() {
		this.normalizeGetLen();return this;
	};

	Vec2.prototype.clone = function clone() {
		return new Vec2(this.x, this.y);
	};

	Vec2.prototype.copy = function copy(_ref) {
		var x = _ref.x;
		var y = _ref.y;
		this.x = x;;this.y = y;return this;
	};

	Vec2.prototype.scale = function scale(n) {
		this.x *= n;this.y *= n;return this;
	};

	Vec2.prototype.set = function set(x, y) {
		this.x = x;this.y = y;return this;
	};

	Vec2.prototype.clear = function clear() {
		return this.set(0.0, 0.0);
	};

	Vec2.prototype.add = function add(o) {
		this.x += o.x;this.y += o.y;return this;
	};

	Vec2.prototype.addScaled = function addScaled(o, n) {
		this.x += o.x * n;this.y += o.y * n;return this;
	};

	Vec2.prototype.translate = function translate(x, y) {
		this.x += x;this.y += y;return this;
	};

	Vec2.prototype.normalized = function normalized() {
		return this.clone().normalize();
	};

	Vec2.prototype.scaled = function scaled(n) {
		return this.clone().scale(n);
	};

	Vec2.prototype.toString = function toString() {
		return '(' + this.x + ', ' + this.y + ')';
	};

	Vec2.prototype.distance = function distance(o) {
		var dx = this.x - o.x,
		    dy = this.y - o.y;
		return Math.sqrt(dx * dx + dy * dy);
	};

	Vec2.prototype.distanceSq = function distanceSq(o) {
		this;
		var dx = this.x - o.x,
		    dy = this.y - o.y;
		return dx * dx + dy * dy;
	};

	Vec2.prototype.normalizeGetLen = function normalizeGetLen() {
		var l2 = this.x * this.x + this.y * this.y;
		if (l2 === 0.0) {
			this.x = 0.0;this.y = 1.0;return 0.00001;
		}
		var il = 1.0 / Math.sqrt(l2);
		this.x *= il;
		this.y *= il;
		this;
		return l2 * il;
	};

	Vec2.prototype.normalizeOrZero = function normalizeOrZero() {
		return this.scale(1.0 / (Math.sqrt(this.x * this.x + this.y * this.y) + 1e-37));
	};

	Vec2.prototype.xFlip = function xFlip() {
		var about = arguments.length <= 0 || arguments[0] === undefined ? 0.0 : arguments[0];
		this.x = 2.0 * about - this.x;return this;
	};

	Vec2.prototype.yFlip = function yFlip() {
		var about = arguments.length <= 0 || arguments[0] === undefined ? 0.0 : arguments[0];
		this.y = 2.0 * about - this.y;return this;
	};

	Vec2.prototype.rotate = function rotate(angle, about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var nx = x * c - y * s;
		var ny = x * s + y * c;
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	};

	Vec2.prototype.rotate90 = function rotate90(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = -y + aboutX;
		this.y = x + aboutY;
		return this;
	};

	Vec2.prototype.rotate180 = function rotate180(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = -x + aboutX;
		this.y = -y + aboutY;
		return this;
	};

	Vec2.prototype.rotate270 = function rotate270(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = y + aboutX;
		this.y = -x + aboutY;
		return this;
	};

	Vec2.prototype.rotate = function rotate(angle, about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var sin = Math.sin(angle);
		var cos = Math.cos(angle);

		var x = this.x - aboutX;
		var y = this.y - aboutY;
		var nx = cos * x - sin * y;
		var ny = sin * x + cos * y;
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	};

	Vec2.prototype.rotated90 = function rotated90(about) {
		return this.clone().rotate90(about);
	};

	Vec2.prototype.rotated180 = function rotated180(about) {
		return this.clone().rotate180(about);
	};

	Vec2.prototype.rotated270 = function rotated270(about) {
		return this.clone().rotate270(about);
	};

	Vec2.prototype.xFlipped = function xFlipped(aboutX) {
		return this.clone().xFlip(aboutX);
	};

	Vec2.prototype.yFlipped = function yFlipped(aboutY) {
		return this.clone().yFlip(aboutY);
	};

	Vec2.prototype.nanCheck = function nanCheck() {
		ASSERT(+this.x === this.x);
		ASSERT(+this.y === this.y);
		return this;
	};

	return Vec2;
})();

Vec2.ZERO = Object.freeze(new Vec2(0.0, 0.0));

Vec2.zero = function () {
	return new Vec2(0.0, 0.0);
};
Vec2.fromDir = function (dir) {
	return new Vec2(Math.cos(dir), Math.sin(dir));
};
Vec2.towards = function (p0, p1) {
	return new Vec2(p1.x - p0.x, p1.y - p0.y);
};
Vec2.towardsXY = function (x0, y0, x1, y1) {
	return new Vec2(x1 - x0, y1 - y0);
};

Vec2.Pool = {
	items: [],
	count: 0,
	get: function get(x, y) {
		if (this.count === this.items.length) this.items.push(new Vec2(0.0, 0.0));
		return this.items[this.count++].set(+x || 0.0, +y || 0.0);
	},
	reset: function reset() {
		this.count = 0;
	},
	update: function update() {
		this.count = 0;
	}
};

Vec2.temp = function (x, y) {
	return Vec2.Pool.get(x, y);
};

module.exports = Vec2;

},{"./debug":161}],154:[function(require,module,exports){
'use strict';

var _require = require('./rand');

var RNG = _require.RNG;

function soundVariations(src) {
	var min = arguments.length <= 1 || arguments[1] === undefined ? 0.8 : arguments[1];
	var max = arguments.length <= 2 || arguments[2] === undefined ? 1.5 : arguments[2];
	var count = arguments.length <= 3 || arguments[3] === undefined ? 10 : arguments[3];

	var res = [new Howl({ src: src, volume: 0.2, rate: 1 })];
	for (var rate = min; rate <= max; rate += (max - min) / count) {
		res.push(new Howl({ rate: rate, src: src, volume: 0.2 }));
	}return res;
}
var Sounds = {
	currentSong: null,
	boom: soundVariations(['res/boom1.wav']),
	bang: soundVariations(['res/bang2.mp3'], 1, 1.1, 5),
	ouch: soundVariations(['res/big-ouch.mp3']),
	monstOuch: soundVariations(['res/monst-ouch.mp3']),
	growl: soundVariations(['res/growl.mp3'], 1.0, 2.0),
	unlock: soundVariations(['res/unlock.wav']),
	die: soundVariations(['res/die.mp3'], 0.9, 1.0),
	stop: [new Howl({ src: ['res/stop.mp3'], volume: 0.2 })],
	wait: [new Howl({ src: ['res/wait.mp3'], volume: 0.2 })],

	bangs: [new Howl({ src: ['res/bang1.wav'], rate: 1 }), new Howl({ src: ['res/bang1.wav'], rate: 0.9 }), new Howl({ src: ['res/bang1.wav'], rate: 1.1 }), new Howl({ src: ['res/bang1.wav'], rate: 1.5 }), new Howl({ src: ['res/bang1.wav'], rate: 0.8 })],
	song1: new Howl({ src: ['res/menubg.ogg', 'res/menubg.mp3'], loop: true, volume: 0.5 }),
	song2: new Howl({ src: ['res/song2.ogg', 'res/song2.mp3'], loop: true, volume: 0.5 }),
	song3: new Howl({ src: ['res/song3.ogg', 'res/song3.mp3'], loop: true, volume: 0.5 }),
	wobbles: new Howl({
		src: ['res/wobbles.ogg', 'res/wobbles.mp3'],
		sprite: {
			wobble0: [0, 8000],
			wobble1: [12500, 19000],
			wobble2: [24200, 31600],
			wobble3: [36300, 43600],
			wobble4: [47800, 56000],
			wobble5: [59400, 67800]
		}
	}),

	stopMusic: function stopMusic() {
		var _this = this;

		var fade = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		if (this.currentSong == null) return;
		if (fade) {
			(function () {
				var cs = _this.currentSong;
				cs.fade(0.5, 0.0, 1.0);
				cs.once('faded', function () {
					return cs.stop();
				});
			})();
		} else {
			cs.stop();
		}
		this.currentSong = null;
	},
	playMusic: function playMusic(id) {
		var _this2 = this;

		var fade = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

		if (!(id in this)) id = 'song' + id;
		if (this.currentSong) {
			(function () {
				var cs = _this2.currentSong;
				var ns = _this2.currentSong = _this2[id];
				if (fade) {
					cs.fade(0.5, 0.0, 1.0);
					cs.once('faded', function () {
						cs.stop();
						if (ns === _this2.currentSong) {
							ns.play();
							ns.fade(0.0, 0.5, 1.0);
						}
					});
				} else {
					cs.stop();
					ns.play();
				}
			})();
		} else if (id in this) {
			this.currentSong = this[id];
			this.currentSong.play();
			if (fade) {
				this.currentSong.fade(0.0, 0.5, 1.0);
			}
		}
	},
	playEffect: function playEffect(name) {
		if (name === 'wobble') this.playWobble();else if (name in this) {
			RNG.choose(this[name]).play();
		} else {
			console.warn('cnat play ' + name);
		}
	},
	playWobble: function playWobble() {
		var which = arguments.length <= 0 || arguments[0] === undefined ? -1 : arguments[0];

		if (which < 0) {
			which = RNG.upTo(6);
		}
		this.wobbles.play('wobble' + which % 5);
	}
};

Sounds.play = Sounds.playEffect;

window.Sounds = Sounds;

module.exports = Sounds;

},{"./rand":179}],155:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Particle = require('./particle');
var Consts = require('./constants');
var Clock = require('./clock');

var _require = require('./rand');

var RNG = _require.RNG;

var math = require('./math');

var Blood = (function (_Particle) {
	_inherits(Blood, _Particle);

	function Blood(game, x, y, z) {
		_classCallCheck(this, Blood);

		var _this = _possibleConstructorReturn(this, _Particle.call(this, game, x, y, z));

		_this.collidesWithEntities = false;
		_this.collidesWithPlayer = false;
		_this.radius = 0.5;
		_this.zAcc = -80;

		_this.color = RNG.colorBetween(0xff000060, 0xff000080);
		_this.zBounce = 0.1;
		return _this;
	}

	Blood.prototype.update = function update(dt) {
		_Particle.prototype.update.call(this, dt);
		if (RNG.oneChanceIn(10)) {
			this.game.bloodBuffer.putPixel(Math.round(this.pos.x), Math.round(this.pos.y), this.color);
		}
	};

	Blood.prototype.onGroundCollision = function onGroundCollision() {
		this.game.bloodBuffer.putPixel(Math.round(this.pos.x), Math.round(this.pos.y), this.color);
	};

	return Blood;
})(Particle);

module.exports = Blood;

},{"./clock":158,"./constants":160,"./math":175,"./particle":176,"./rand":179}],156:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('./tweens');

var Tween = _require.Tween;
var TweenGroup = _require.TweenGroup;

var Entity = require('./entity');
var Input = require('./input');
var drawing = require('./drawing');
var Consts = require('./constants');
var Clock = require('./clock');

var _require2 = require('./rand');

var RNG = _require2.RNG;

var Gore = require('./gore');
var Sounds = require('./audio');

var Bullet = (function (_Entity) {
	_inherits(Bullet, _Entity);

	function Bullet(game, shooter, dx, dy) {
		var dmg = arguments.length <= 4 || arguments[4] === undefined ? RNG.upTo(4) : arguments[4];
		var speed = arguments.length <= 5 || arguments[5] === undefined ? 400 : arguments[5];

		_classCallCheck(this, Bullet);

		var _this = _possibleConstructorReturn(this, _Entity.call(this, game, shooter.pos.x + dx * shooter.radius, shooter.pos.y + dy * shooter.radius));

		Sounds.play('bang');
		_this.dmg = dmg;
		_this.speed = speed;
		_this.shooter = shooter;
		_this.drag.set(0, 0);
		_this.vel.x = dx * _this.speed;
		_this.vel.y = dy * _this.speed;
		_this.life = 3.0;
		_this.timed = true;
		return _this;
	}

	Bullet.prototype.render = function render(ctx, buffer, minX, minY) {
		var x0 = Math.round(this.pos.x - minX);
		var y0 = Math.round(this.pos.y - minY);
		var x1 = Math.round(this.lastPos.x - minX);
		var y1 = Math.round(this.lastPos.y - minY);

		var dx = x1 - x0,
		    dy = y1 - y0;
		var dist = Math.ceil(Math.sqrt(dx * dx + dy * dy));
		for (var i = 0; i < dist; ++i) {
			// if (RNG.xChanceInY(i, dist)) continue;
			var br = i * 128 / dist + 64 & 0xff;
			var xx = x0 - dx * i / dist | 0;
			var yy = y0 - dy * i / dist | 0;
			var pixel = 0xff000000 | br * 0x10101;
			buffer.putPixel(xx, yy, pixel);
		}
	};

	Bullet.prototype.onCollision = function onCollision(who) {
		if (!this.enabled) return;
		if (who != null && who != this.shooter) {
			who.damage(this.dmg, this.pos, this.vel);
			this.enabled = false;
		}
		if (who != this.shooter) this.enabled = false;
	};

	return Bullet;
})(Entity);

module.exports = Bullet;

},{"./audio":154,"./clock":158,"./constants":160,"./drawing":162,"./entity":164,"./gore":168,"./input":169,"./rand":179,"./tweens":180}],157:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var math = require('./math');
var Vec2 = require('./vec2');
var Clock = require('./clock');

var _require = require('./rand');

var RNG = _require.RNG;

var _require2 = require('./debug');

var ASSERT = _require2.ASSERT;

var Input = require('./input');
var Consts = require('./constants');

var Camera = (function () {
	function Camera(game, focus, target, width, height) {
		_classCallCheck(this, Camera);

		this.game = game;
		this.focus = focus;
		this.target = target;
		// this.realTarget = new Vec2(0.0, 0.0);
		this.width = width;
		this.height = height;
		this.goal = new Vec2(0.0, 0.0);
		this.unclampedPos = new Vec2(0.0, 0.0);
		this.pos = new Vec2(0.0, 0.0);
		// this.vel = new Vec2(0.0, 0.0);
		// this.maxSpeed = Number.MAX_VALUE;
		// this.smoothing = 0.3;
		this.jitterLevel = 0;
		this.shake = new Vec2(0.0, 0.0);
		this.shakeDrag = 0.2;
		this.driftMul = new Vec2(0.1, 0.2);

		this.lookahead = 1.1;
		this.speed = 2.5;

		this.minX = 0;
		this.maxX = width;
		this.minY = 0;
		this.maxY = height;
	}

	Camera.prototype.xBound = function xBound() {
		return this.game.width;
	};

	Camera.prototype.yBound = function yBound() {
		return this.game.height;
	};

	Camera.prototype.setPosition = function setPosition(nx, ny, reset) {
		if (reset) {
			// this.vel.set(0, 0);
			this.goal.set(nx, ny);
			this.shake.set(0, 0);
		}
		this.unclampedPos.set(nx, ny);
		this.pos.x = math.clamp(nx, this.width * 0.5, this.xBound() - this.width * 0.5);
		this.pos.y = math.clamp(ny, this.height * 0.5, this.yBound() - this.height * 0.5);

		this.minX = this.pos.x - this.width * 0.5;
		this.minY = this.pos.y - this.height * 0.5;

		this.maxX = this.minX + this.width;
		this.maxY = this.minY + this.height;

		var _focus = this.focus;
		var _focus$pos = _focus.pos;
		var fx = _focus$pos.x;
		var fy = _focus$pos.y;
		var radius = _focus.radius;

		// @HACK: prevent camera from not containing player...

		if (fx - radius < this.minX) {
			this.minX = fx - radius;
			this.pos.x = this.minX + this.width * 0.5;
			this.maxX = this.minX + this.width;
		}

		if (fy - radius < this.minY) {
			this.minY = fy - radius;
			this.pos.y = this.minY + this.height * 0.5;
			this.maxY = this.minY + this.height;
		}

		if (fx + radius > this.maxX) {
			this.maxX = fx + radius;
			this.pos.x = this.maxX - this.width * 0.5;
			this.minX = this.maxX - this.width;
		}

		if (fy + radius > this.maxY) {
			this.maxY = fy + radius;
			this.pos.y = this.maxY - this.height * 0.5;
			this.minY = this.maxY - this.height;
		}
		ASSERT(+this.minX === this.minX);
		ASSERT(+this.minY === this.minY);
		ASSERT(+this.maxX === this.maxX);
		ASSERT(+this.maxY === this.maxY);
		this.pos.nanCheck();
		// this.vel.nanCheck();
		this.goal.nanCheck();
		this.target.nanCheck();
	};

	Camera.prototype.update = function update(dt) {
		var cx = this.pos.x;
		var cy = this.pos.y;
		var fx = this.focus.pos.x;
		var fy = this.focus.pos.y;

		if (Math.abs(fx - cx) < 100 / Consts.SCALE) {
			fx = cx;
		}
		if (Math.abs(fy - cy) < 100 / Consts.SCALE) {
			fy = cy;
		}

		var fvx = this.focus.vel.x * 0.1;
		var fvy = this.focus.vel.y * 0.1;

		var gx = fx + fvx * this.lookahead;
		var gy = fy + fvy * this.lookahead;
		var aiming = false;
		var aimDiv = 1;

		if (Input.mouse.isDown) {
			// aiming = true;
			aimDiv = 4;
		}

		if (Input.keyboard.isDown('space')) {
			// aiming = true;
			aimDiv = 2;
		}

		if (aiming) {
			var mwx = this.game.mouse.x;
			var mwy = this.game.mouse.y;

			var frx = mwx - this.focus.pos.x;
			var fry = mwy - this.focus.pos.y;
			gx += frx / aimDiv;
			gy += fry / aimDiv;
		}

		gx = math.clamp(gx, this.width / 2, this.xBound() - this.width / 2);
		gy = math.clamp(gy, this.height / 2, this.yBound() - this.height / 2);

		var nx = gx - cx;
		var ny = gy - cy;

		var relax = 1.0 - Math.exp(-this.speed * dt);

		nx = this.pos.x + nx * relax;
		ny = this.pos.y + ny * relax;

		this.setPosition(nx, ny);

		/*
  smoothDampV2(this.goal, this.goal, this.target, this.vel, this.smoothing, this.maxSpeed, dt);
  let driftX = Math.cos(Clock.accumTime*this.driftMul.x) * 5 * this.jitterLevel
  let driftY = Math.cos(Clock.accumTime*this.driftMul.y) * 5 * this.jitterLevel
  	this.unclampedPos.x = this.goal.x + driftX + this.shake.x;
  this.unclampedPos.y = this.goal.y + driftY + this.shake.y;
  	this.shake.x -= this.shakeDrag*this.shake.x*dt;
  this.shake.y -= this.shakeDrag*this.shake.y*dt;
  	this.setPosition(this.unclampedPos.x, this.unclampedPos.y);*/
	};

	return Camera;
})();

module.exports = Camera;

},{"./clock":158,"./constants":160,"./debug":161,"./input":169,"./math":175,"./rand":179,"./vec2":182}],158:[function(require,module,exports){
'use strict';

var Clock = {};

Clock.now = window.performance ? function () {
  return performance.now();
} : Date.now;

Clock.ticks = 0;
Clock.fps = 60.0;
Clock.time = 0.0;
Clock.realTime = 0.0;
Clock.accumTime = 0.0;
Clock.deltaTime = 1.0 / Clock.fps;
Clock.realDeltaTime = Clock.deltaTime;

Clock.timeScale = 1.0;

// debugging
window.CLOCK = Clock;

module.exports = Clock;

},{}],159:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var scratchArray = [];

var CollisionGrid = (function () {
	function CollisionGrid(width, height, cellSize) {
		_classCallCheck(this, CollisionGrid);

		this.width = Math.ceil(width / cellSize);
		this.height = Math.ceil(height / cellSize);
		this.cellSize = cellSize;
		this.cells = new Array(this.width * this.height);
		for (var i = 0; i < this.width * this.height; ++i) {
			this.cells[i] = [];
		}
	}

	CollisionGrid.prototype.add = function add(e) {
		ASSERT(e.pos.x >= 0 && e.pos.x < this.width * this.cellSize);
		ASSERT(e.pos.y >= 0 && e.pos.y < this.height * this.cellSize);
		ASSERT(e._cell === -1);
		var cellX = Math.floor(e.pos.x / this.cellSize);
		var cellY = Math.floor(e.pos.y / this.cellSize);

		var cellIndex = cellX + cellY * this.width;
		var newCell = this.cells[cellIndex];
		e._cell = cellIndex;
		e._indexInCell = newCell.length;
		newCell.push(e);
	};

	CollisionGrid.prototype.remove = function remove(e) {
		ASSERT(e._cell !== -1);
		ASSERT(e._indexInCell !== -1);
		var cell = this.cells[e._cell];
		ASSERT(cell[e._indexInCell] === e);
		var indexInCell = e._indexInCell;

		cell[indexInCell] = cell[cell.length - 1];
		cell[indexInCell]._indexInCell = indexInCell;
		cell.pop();
		e._cell = -1;
		e._indexInCell = -1;
	};

	CollisionGrid.prototype.update = function update(e) {
		this.remove(e);
		this.add(e);
	};

	CollisionGrid.prototype.entitiesAround = function entitiesAround(e) {
		var result = scratchArray;

		var cells = this.cells;
		var width = this.width;
		var height = this.height;

		var cellY = Math.floor(e._cell / width);
		var cellX = e._cell % width;

		var minX = Math.max(0, cellX - 1);
		var maxX = Math.min(cellX + 1, width - 1);

		var minY = Math.max(0, cellY - 1);
		var maxY = Math.min(cellY + 1, height - 1);

		for (var y = minY; y <= maxY; ++y) {
			for (var x = minX; x <= maxX; ++x) {
				var cellIndex = x + y * width;
				var cell = cells[cellIndex];
				for (var i = 0, l = cell.length; i < l; ++i) {
					result.push(cell[i]);
				}
			}
		}
		return result;
	};

	// getCollidablePairs(outP0, outP1, entities) {
	// 	let lookup = {};
	// 	outP1.length = 0;
	// 	outP0.length = 0;
	// 	let {cells, width, height} = this;
	// 	for (let y = 0; y < height; ++y) {
	// 		for (let x = 0; x < width; ++x) {
	// 			const minX = Math.max(0, x-1);
	// 			const maxX = Math.min(x+1, width-1);
	// 			const minY = Math.max(0, y-1);
	// 			const maxY = Math.min(y+1, height-1);

	// 			for (let yy = minY; yy <= maxY; ++yy) {
	// 				for (let xx = minX; xx <= maxX; ++xx) {
	// 					const cellIndex = xx + yy * width;
	// 					const cell = cells[cellIndex];
	// 					for (let i = 0, l = cell.length; i < l; ++i) {
	// 					}
	// 				}
	// 			}

	// 		}
	// 	}
	// }

	return CollisionGrid;
})();

module.exports = CollisionGrid;

},{"./debug":161}],160:[function(require,module,exports){
'use strict';

var FPS = exports.FPS = 60.0;
var Scale = exports.Scale = 3;

var ClientScreenWidth = exports.ClientScreenWidth = 960;
var ClientScreenHeight = exports.ClientScreenHeight = 540;

var ScreenHeight = exports.ScreenHeight = ClientScreenHeight / Scale >>> 0;
var ScreenWidth = exports.ScreenWidth = ClientScreenWidth / Scale >>> 0;

var DevicePixels = exports.DevicePixels = window.devicePixelRatio || window.webkitDevicePixelRatio || 1.0;

var TileSize = exports.TileSize = 16;

},{}],161:[function(require,module,exports){
'use strict';

var DEBUG = false;

window.DEBUG = DEBUG;

function assert(cnd, msg) {
	if (cnd) return;
	console.error("Assertation failed: " + (msg || "no message"));
	throw new Error("Assertation failure");
}

if (window.DEBUG) {
	window.ASSERT = exports.ASSERT = assert;
} else {
	window.ASSERT = exports.ASSERT = function () {};
}

exports.debug = DEBUG;

},{}],162:[function(require,module,exports){
'use strict';

exports.blitFullCanvas = blitFullCanvas;
function blitFullCanvas(context, canvas) {
	context.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, context.canvas.width, context.canvas.height);
}

// these are mostly for the debug canvas
exports.drawLine = drawLine;
function drawLine(ctx, x0, y0, x1, y1) {
	var _ref = arguments.length <= 5 || arguments[5] === undefined ? {} : arguments[5];

	var _ref$endpoints = _ref.endpoints;
	var endpoints = _ref$endpoints === undefined ? false : _ref$endpoints;
	var _ref$color = _ref.color;
	var color = _ref$color === undefined ? '' : _ref$color;

	var oldStrokeStyle = ctx.strokeStyle;
	if (color) ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
	if (endpoints) {
		drawBox(ctx, x0, y0);
		drawBox(ctx, x1, y1);
	}
	if (color) ctx.strokeStyle = oldStrokeStyle;
}

exports.drawBox = drawBox;
function drawBox(ctx, x, y) {
	var sz = arguments.length <= 3 || arguments[3] === undefined ? 2 : arguments[3];

	var hs = sz / 2;
	ctx.strokeRect(x - hs, y - hs, sz, sz);
}

exports.drawArrow = drawArrow;
function drawArrow(ctx, x0, y0, x1, y1, n) {
	drawLine(ctx, x0, y0, x1, y1);
	var dx = x0 - x1,
	    dy = y0 - y1;
	var l = Math.sqrt(dx * dx + dy * dy);
	if (l !== 0.0) {
		dx /= l;
		dy /= l;
		drawLine(ctx, x1, y1, x1 + n * dx + n * dy, y1 + n * dy - n * dx);
	}
}

exports.drawCircle = drawCircle;
function drawCircle(ctx, x0, y0, r) {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.arc(x0, y0, r, 0, Math.PI * 2);
	ctx.stroke();
}

},{}],163:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Entity = require('./entity');
var Input = require('./input');

var _require = require('./rand');

var RNG = _require.RNG;

var drawing = require('./drawing');
var Consts = require('./constants');
var Clock = require('./clock');
var Bullet = require('./bullet');
var Gore = require('./gore');
var Blood = require('./blood');
var Sounds = require('./audio');
var math = require('./math');
var Vec2 = require('./vec2');
var STATE = {
	Wander: 0,
	Attack: 1,
	Search: 2,
	Wait: 3
};

var Enemy = (function (_Entity) {
	_inherits(Enemy, _Entity);

	function Enemy(game, x, y) {
		_classCallCheck(this, Enemy);

		var _this = _possibleConstructorReturn(this, _Entity.call(this, game, x, y));

		_this.radius = 5.0;
		_this.normalizeAccel = true;
		_this.speed = 14 * 20;
		_this.drag.set(8, 8);
		_this.walking = false;
		_this.animProgress = 0.0;
		_this.maxHealth = 15;
		_this.health = _this.maxHealth;
		_this.castsShadow = true;
		_this.targetPos = new Vec2();
		_this.haveTarget = false;
		_this.lastSawPlayer = new Vec2();
		_this.state = STATE.Wander;
		_this.waitTimer = 0.0;
		_this.shootTimer = 0.0;
		_this.type = RNG.upTo(_this.game.assets.enemyRotations.length);
		return _this;
	}

	Enemy.prototype.pickRandomTarget = function pickRandomTarget() {
		var p = Vec2.temp(),
		    n = Vec2.temp();
		for (var i = 0; i < 3; ++i) {
			var v = Vec2.temp(RNG.betweenF(-1, 1), RNG.betweenF(-1, 1)).normalize();
			var r = this.game.raycast(this.targetPos, n, this.pos, v, 1000);
			if (r > 20 || RNG.oneChanceIn(10)) {
				this.moveTowards(this.targetPos);
				this.state = STATE.Wander;
				return;
			}
		}
		this.state = STATE.Wait;
	};

	Enemy.prototype.onCollision = function onCollision(who) {
		if (this.state === STATE.Wander && who == null) {
			this.pickRandomTarget();
		}
	};

	Enemy.prototype.damage = function damage(amt, pos, vel) {
		this.health -= amt;
		if (this.health <= 0) {
			Sounds.play('die');
			this.solid = false;
			this.castsShadow = false;
			this.game.grid.remove(this);
			this.collidesWithEntities = false;
			this.collidesWithPlayer = false;
		} else {
			Sounds.play('monstOuch');
		}
		this.drag.x += 2;
		this.drag.y += 2;

		var gib = new Gore(this.game, pos.x, pos.y);
		gib.vel.scale(0.1).addScaled(vel, 0.4);
		this.game.addEntity(gib);
	};

	Enemy.prototype.moveTowards = function moveTowards(pos) {
		var fy = pos.y - this.pos.y;
		var fx = pos.x - this.pos.x;
		var len = Math.sqrt(fx * fx + fy * fy);

		this.acc.set((pos.x - this.pos.x) / Consts.TileSize, (pos.y - this.pos.y) / Consts.TileSize);
		this.walking = true;
		this.heading = Math.atan2(fy, fx);
	};

	Enemy.prototype.think = function think(dt) {
		if (this.health <= 0) return;

		if (this.health != this.maxHealth) {
			if (RNG.xChanceInY(this.maxHealth - this.health, this.maxHealth)) {
				var blood = new Blood(this.game, this.pos.x, this.pos.y);
				blood.zPos = 5;
				blood.vel.x *= 0.05;blood.vel.x += this.vel.x;
				blood.vel.y *= 0.05;blood.vel.y += this.vel.y;
				this.game.addEntity(blood);
			}
		}

		if (this.walking) {
			this.animProgress += Math.min(this.lastPos.distance(this.pos) / 10, 1);
		}

		if (this.state === STATE.Wander) {
			this.drag.set(10, 10);
		} else {
			this.drag.set(8, 8);
		}

		var canSeePlayer = this.game.canSee(this.pos, this.game.player.pos);
		if (canSeePlayer && this.state !== STATE.Attack) {
			Sounds.play(RNG.choose(['wait', 'stop']));
			this.state = STATE.Attack;
			this.lastSawPlayer.copy(this.game.player.pos);
			this.shootAt(this.game.player.pos);
		} else if (this.state === STATE.Attack && !canSeePlayer) {
			this.state = STATE.Search;
		}

		switch (this.state) {
			case STATE.Wander:
				if (this.pos.distance(this.targetPos) < 8) {
					this.waitTimer = RNG.betweenF(1.0, 3.0);
					this.state = STATE.Wait;
				} else {
					this.moveTowards(this.targetPos);
				}
				break;
			case STATE.Wait:
				this.waitTimer -= dt;
				if (this.waitTimer < 0) {
					this.state = STATE.Wander;
					this.pickRandomTarget();
				} else {
					if (RNG.oneChanceIn(60)) {
						this.heading = RNG.betweenF(0, Math.PI * 2);
					}
					if (RNG.oneChanceIn(60)) {
						this.acc.set(RNG.betweenF(-10, 10), RNG.betweenF(-10, 10));
					}
				}

				break;
			case STATE.Search:
				if (this.pos.distance(this.lastSawPlayer) < 8) {
					this.state = STATE.Wait;
					this.waitTimer = RNG.betweenF(0.0, 1.0);
				} else {
					this.moveTowards(this.game.player.pos);
				}
				break;
			case STATE.Attack:
				this.shootTimer -= dt;
				var pdist = this.pos.distance(this.game.player.pos);
				if (pdist < 30) {
					this.shootTimer -= dt * 2;
				}
				if (pdist < 100) {
					this.moveTowards(this.game.player.pos);
				}
				if (this.shootTimer < 0) {
					this.shootAt(this.game.player.pos);
				}
				break;
		}
	};

	Enemy.prototype.postUpdate = function postUpdate() {
		this.acc.set(0, 0);
	};

	Enemy.prototype.shootAt = function shootAt(pos) {
		var fy = pos.y - this.pos.y;
		var fx = pos.x - this.pos.x;
		var len = Math.sqrt(fx * fx + fy * fy);
		if (len != 0) {
			var bullet = new Bullet(this.game, this, fx / len, fy / len);
			this.game.addEntity(bullet);
		}
		this.shootTimer = RNG.betweenF(1, 4);
	};

	Enemy.prototype.render = function render(layer) {
		if (!this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x + this.radius, this.pos.y + this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x + this.radius, this.pos.y - this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x - this.radius, this.pos.y + this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x - this.radius, this.pos.y - this.radius))) {
			return;
		}
		if (this.health <= 0) {
			layer.context.drawImage(this.game.assets.deadEnemies[this.type].canvas, 0, 0, 32, 16, Math.round(this.pos.x - 16), Math.round(this.pos.y - 8), 32, 16);
			layer.context.drawImage(this.game.assets.deadEnemies[this.type].canvas, 0, 16, 32, 16, Math.round(this.pos.x - 16), Math.round(this.pos.y - 8), 32, 16);
		} else {
			var rotation = Math.round(this.heading / (Math.PI * 2) * 16) & 15;

			var anim = (this.walking ? Math.floor(this.animProgress % 7) : 0) + 0;
			layer.context.drawImage(this.game.assets.enemyRotations[this.type].canvas, 16 * anim, 16 * rotation, 16, 16, Math.round(this.pos.x - 8), Math.round(this.pos.y - 8), 16, 16);
		}
		// drawing.drawCircle(this.game.debugContext, this.pos.x, this.pos.y, this.radius);
		//(layer.context, this.pos.x-mx, this.pos.y-my, this.radius);
	};

	return Enemy;
})(Entity);

module.exports = Enemy;

},{"./audio":154,"./blood":155,"./bullet":156,"./clock":158,"./constants":160,"./drawing":162,"./entity":164,"./gore":168,"./input":169,"./math":175,"./rand":179,"./vec2":182}],164:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./tweens');

var Tween = _require.Tween;
var TweenGroup = _require.TweenGroup;

var _require2 = require('./math');

var distance2D = _require2.distance2D;

var Vec2 = require('./vec2');
var LineSegment = require('./line_segment');

var Entity = (function () {
	function Entity(game) {
		var x = arguments.length <= 1 || arguments[1] === undefined ? 0.0 : arguments[1];
		var y = arguments.length <= 2 || arguments[2] === undefined ? 0.0 : arguments[2];
		var z = arguments.length <= 3 || arguments[3] === undefined ? 0.0 : arguments[3];

		_classCallCheck(this, Entity);

		this.game = game;
		this.id = Entity.idCounter++;
		this.pos = new Vec2(x, y);
		this.vel = new Vec2(0, 0);
		this.radius = 1.0;
		this.enabled = true;
		this.elastic = false;

		this.collidesWithWorld = true;
		this.collidesWithEntities = true;
		this.collidesWithPlayer = true;
		this.life = 0;
		this.timed = false;

		this.tweenGroup = new TweenGroup();

		this.mobile = true;
		this.solid = true;
		this.castsShadow = false;

		this.alpha = 1.0;
		this.lastPos = new Vec2(0.0, 0.0);
		this.acc = new Vec2(0.0, 0.0);
		this.drag = new Vec2(0.0, 0.0);
		this.collisionIterations = 1;

		this.heading = 0;
		this.shadowSegments = null;

		this.normalizeAccel = false;
		this.speed = 1;

		this._cell = -1;
		this._indexInCell = -1;
		this.elasticity = 0.4;
		// @@@HACK
		this.hasZ = false;
		this.zPos = z;
		this.zVel = 0;
		this.zAcc = 0;
		this.zDrag = 0;
		this.zBounce = 0.8;
	}

	Entity.prototype.think = function think(dt) {};

	Entity.prototype.postUpdate = function postUpdate(dt) {};

	Entity.prototype.tryGridUpdate = function tryGridUpdate() {
		try {
			this.game.grid.update(this);
		} catch (e) {
			this.enabled = false;
		}
	}; // @@HACK}

	Entity.prototype.update = function update(dt) {
		if (!this.enabled) return;
		this.think(dt);
		this.tweenGroup.update(dt);
		if (this.mobile) {
			this.move(dt);
			if (this.collidesWithEntities || this.collidesWithPlayer) {
				this.tryGridUpdate();
			}
		}
		if (this.timed) {
			this.life -= dt;
			if (this.life <= 0) {
				this.enabled = false;
			}
		}
	};

	Entity.prototype.damage = function damage() {};

	Entity.prototype.updateShadowSegments = function updateShadowSegments() {
		var minX = this.pos.x - this.radius / 2;
		var maxX = this.pos.x + this.radius / 2;
		var minY = this.pos.y - this.radius / 2;
		var maxY = this.pos.y + this.radius / 2;

		var t0 = Vec2.temp(minX, minY).rotate(this.heading, this.pos);
		var t1 = Vec2.temp(minX, maxY).rotate(this.heading, this.pos);
		var t2 = Vec2.temp(maxX, maxY).rotate(this.heading, this.pos);
		var t3 = Vec2.temp(maxX, minY).rotate(this.heading, this.pos);

		this.shadowSegments[0].start.copy(t0);this.shadowSegments[0].end.copy(t1);
		this.shadowSegments[1].start.copy(t1);this.shadowSegments[1].end.copy(t2);
		this.shadowSegments[2].start.copy(t2);this.shadowSegments[2].end.copy(t3);
		this.shadowSegments[3].start.copy(t3);this.shadowSegments[3].end.copy(t0);
	};

	Entity.prototype.getSegments = function getSegments() {
		if (this.castsShadow) {
			if (this.shadowSegments == null) {
				this.shadowSegments = [new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)), new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)), new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0)), new LineSegment(new Vec2(0.0, 0.0), new Vec2(0.0, 0.0))];
			}
			this.updateShadowSegments();
			return this.shadowSegments;
		}
		return null;
	};

	Entity.prototype.move = function move(dt) {
		this.lastPos.copy(this.pos);
		this.lastPos.nanCheck();
		if (this.normalizeAccel) {
			if (this.acc.length() > 1.0) {
				this.acc.normalizeOrZero();
			}
		}
		this.acc.scale(this.speed);
		this.acc.x += -this.drag.x * this.vel.x;
		this.acc.y += -this.drag.y * this.vel.y;
		this.acc.nanCheck();

		this.pos.x += this.vel.x * dt + this.acc.x * dt * dt * 0.5;
		this.pos.y += this.vel.y * dt + this.acc.y * dt * dt * 0.5;
		this.pos.nanCheck();

		this.vel.x += this.acc.x * dt;
		this.vel.y += this.acc.y * dt;
		this.vel.nanCheck();

		if (this.hasZ) {
			this.zAcc += -this.zDrag * this.zVel;
			this.zVel += this.zAcc * dt;
			var nzPos = this.zPos + this.zVel * dt + this.zAcc * dt * dt * 0.5;
			var deltaZ = nzPos - this.zPos;
			var steps = Math.ceil(Math.abs(deltaZ));
			for (var i = 0; i < steps; ++i) {
				var nz = this.zPos + deltaZ / steps;
				if (nz < 0) {
					this.zVel = -this.zVel * this.zBounce;
					this.onGroundCollision();
					break;
				}
				this.zPos = nz;
			}
		}

		if (this.collidesWithWorld) {
			for (var i = 0; i < this.collisionIterations; ++i) {
				this.collideWithWorld(dt);
			}
		}
		if (this.collidesWithEntities) {
			this.collideWithObjects(dt);
		} else if (this.collidesWithPlayer) {
			var e = this.game.player;
			if (this.pos.distance(e.pos) < this.radius + e.radius) {
				if (e.solid) {
					this.handleCollision(e, this.pos.to(e.pos), this.pos.distance(e.pos) - (this.radius + e.radius), false);
				}
			}
		}
	};

	Entity.prototype.collideWithObjects = function collideWithObjects() {
		var es = this.game.grid.entitiesAround(this);
		for (var i = 0; i < es.length; ++i) {
			var e = es[i];
			if (e === this || !e.enabled) continue;
			if (this.pos.distance(e.pos) < this.radius + e.radius) {
				if (e.solid && e.collidesWithEntities || this == this.game.player && e.collidesWithPlayer) this.handleCollision(e, this.pos.to(e.pos).normalize(), this.pos.distance(e.pos) - (this.radius + e.radius), false);
			}
		}
	};

	Entity.prototype.onGroundCollision = function onGroundCollision() {};

	Entity.prototype.collideWithWorld = function collideWithWorld(dt) {
		var collisionMaxTries = 4;
		var collisionPos = Vec2.Pool.get();
		for (var tries = 0;;) {
			var sign = this.game.closestPoint(collisionPos, this.pos, this.radius);
			if (sign === 0) {
				break;
			}
			collisionPos.nanCheck();
			var dx = this.pos.x - collisionPos.x;
			var dy = this.pos.y - collisionPos.y;

			var dist = Math.sqrt(dx * dx + dy * dy);

			var penetration = this.radius - sign * dist;
			if (penetration <= 0.001) {
				// @@ROBUSTNESS: this is a hack
				break;
			}
			if (dist === 0) {
				break;
			}
			dx /= dist;
			dy /= dist;
			// this should project us out of the collision
			this.handleCollision(null, collisionPos.set(dx, dy), sign * penetration, true);
			if (++tries >= collisionMaxTries) {
				// degenerate cases where projecting us out of something
				// projects us into something else
				console.warn("Collision detection hit max iteration.", penetration);
				return false;
			}
		}
		return true;
	};

	Entity.prototype.handleCollision = function handleCollision(who, normal, penetration, wasHard) {
		this.pos.nanCheck();
		this.vel.nanCheck();
		if (wasHard) {
			this.pos.x += normal.x * penetration;
			this.pos.y += normal.y * penetration;
			var dot = this.vel.dot(normal);
			if (this.elastic) {
				this.vel.x = -(2 * dot * normal.x - this.vel.x);
				this.vel.y = -(2 * dot * normal.y - this.vel.y);
				this.vel.x *= this.elasticity;
				this.vel.y *= this.elasticity;
			} else {
				if (dot < 0) {
					this.vel.x -= dot * normal.x;
					this.vel.y -= dot * normal.y;
				}
			}
		} else {
			if (who == null || !who.mobile) {
				this.vel.x += normal.x * penetration;
				this.vel.y += normal.y * penetration;
				this.pos.x += normal.x * penetration;
				this.pos.y += normal.y * penetration;
			} else {
				this.vel.x += normal.x * penetration * 0.5;
				this.vel.y += normal.y * penetration * 0.5;
				// who.vel.x -= normal.x * penetration * 0.5;
				// who.vel.y -= normal.y * penetration * 0.5;

				this.pos.x += normal.x * penetration * 0.5;
				this.pos.y += normal.y * penetration * 0.5;

				// who.pos.x -= normal.x * penetration * 0.5;
				// who.pos.y -= normal.y * penetration * 0.5;
				// who.onCollision(who, normal, penetration, wasHard)
			}
		}
		this.pos.nanCheck();
		this.vel.nanCheck();
		this.onCollision(who, normal, penetration, wasHard);
	};

	Entity.prototype.onCollision = function onCollision(who, normal, penetration, wasHard) {};

	Entity.prototype.tweenTo = function tweenTo(field, tweenOptions) {
		tweenOptions.enabledField = 'enabled';
		return this.tweenGroup.add(new Tween(this, field, tweenOptions)).promise;
	};

	return Entity;
})();

Entity.idCounter = 0;
module.exports = Entity;

},{"./line_segment":173,"./math":175,"./tweens":180,"./vec2":182}],165:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Consts = require('./constants');
var Camera = require('./camera');
var CollisionGrid = require('./collision_grid');

var _require = require('./tweens');

var Tween = _require.Tween;
var TweenGroup = _require.TweenGroup;

var PixelBuffer = require('./pixel_buffer');
var Player = require('./player');

var _require2 = require('./level_data');

var TestLevel = _require2.TestLevel;
var Tiles = _require2.Tiles;
var TileInfo = _require2.TileInfo;

var polybool = require('poly-bool');
var LineSegment = require('./line_segment');
var Layer = require('./gfx_layer');
var Vec2 = require('./vec2');
var math = require('./math');
var Input = require('./input');
var util = require('./util');
var drawing = require('./drawing');

var _require3 = require('./lighting');

var VisTracker = _require3.VisTracker;

var Sounds = require('./audio');
var Key = require('./key');
var Enemy = require('./enemy');

var _require4 = require('./rand');

var perlinNoise = _require4.perlinNoise;
var octaveNoise = _require4.octaveNoise;
var RNG = _require4.RNG;

var STATES = { Loading: 0, Menu: 1, Game: 2 };

var EnemyLocations = [[12, 1], [19, 10], [23, 7], [27, 10], [25, 14], [10, 19], [11, 19], [12, 19], [13, 19], [26, 20], [24, 21], [14, 27], [4, 9]];

function loadLevel(tmx) {
	var mapElem = tmx.querySelector('map');
	var result = {
		width: mapElem.getAttribute('width'),
		height: mapElem.getAttribute('height')
	};
	[].forEach.call(mapElem.querySelectorAll('properties property'), function (elem) {
		var val = elem.getAttribute('value');
		if (!isNaN(val)) {
			var fval = Number(val);
			if (+fval === fval) val = fval;
		}
		result[elem.getAttribute('name')] = val;
	});

	[].forEach.call(mapElem.querySelectorAll('layer'), function (layer) {
		if (result.data != null) return; // TODO
		var data = layer.querySelector('data');
		if (data == null) {
			console.warn("Layer without data...", layer, tmx);
			return;
		}
		if (data.getAttribute('encoding') && data.getAttribute('encoding').toLowerCase() !== 'csv') {
			console.error("Illegal tilemap type");
		}
		// try anyway
		var text = data.textContent.trim();
		var tileIds = text.split(/[\s,]+/g).filter(function (v) {
			return v.length !== 0;
		}).map(function (v) {
			return v | 0;
		});
		if (tileIds.length != result.width * result.height) {
			console.error("Not sure what to do about this, wrong size tile map...", tileIds, tmx);
			throw Error("Bad tile map");
		}
		result.tiles = tileIds;
	});

	return result;
}

var segmentTmp = [];

var LD34 = (function () {
	function LD34(drawCanv, dbgCanv) {
		_classCallCheck(this, LD34);

		this.debugCanvas = dbgCanv;
		this.debugContext = dbgCanv.getContext('2d');
		this.entities = [];

		this.paused = false;
		this.screen = drawCanv;
		this.ctx = drawCanv.getContext('2d');
		this.tweenGroup = new TweenGroup();
		this.loadingFailed = false;

		this.bgLayer = new Layer('bg', drawCanv.width, drawCanv.height);
		this.bgmodLayer = new Layer('bgmod', drawCanv.width, drawCanv.height);
		this.tileLayer = new Layer('tile', drawCanv.width, drawCanv.height);
		this.entsLayer = new Layer('ents', drawCanv.width, drawCanv.height);
		this.fxLayer = new Layer('fx', drawCanv.width, drawCanv.height);
		this.lightLayer = new Layer('light', drawCanv.width, drawCanv.height);
		this.hudLayer = new Layer('hud', drawCanv.width, drawCanv.height);
		this.overlayLayer = new Layer('overlay', drawCanv.width, drawCanv.height);

		this.startedGame = false;
		this.playerDead = false;
		this.deadPlayerTimer = 0.0;

		this.layers = [this.bgLayer,
		//this.bgmodLayer,
		this.bgmodLayer, this.fxLayer, this.entsLayer, this.lightLayer, this.tileLayer, this.hudLayer, this.overlayLayer];
		this.mouse = new Vec2(0.0, 0.0);

		this.width = 1000;
		this.height = 1000;

		this.grid = null;
		this.visTracker = new VisTracker();
		this.keys = [];
		this.locks = [];

		this.player = new Player(this);
		this.camTarget = new Vec2(0.0, 0.0);
		this.camera = new Camera(this, this.player, this.camTarget, drawCanv.width, drawCanv.height);
		this.tiles = [];
		this.edgeGeom = [];
		this.state = STATES.Loading;
		this.loadProgress = 0;
		this.assets = {};
		this.seenBuffer = null;
		this.bgbuffer = null;
		this.lightMaskCanvas = util.createCanvas(drawCanv.width, drawCanv.height);
		this.lightMaskCtx = this.lightMaskCanvas.getContext('2d');
		this.emptyTiles = null;
		this.bloodBuffer = null;
		this.gameWon = false;
		this.loadAssets();
	}

	LD34.prototype.loadAssets = function loadAssets() {
		var _this = this;

		var items = [{ path: 'res/player.png', name: 'player', type: 'image' }, { path: 'res/sprites.png', name: 'tiles', type: 'image' }, { path: 'res/lvl1.tmx', name: 'level0', type: 'level' }, { path: 'res/misc.png', name: 'misc', type: 'image' }, { path: 'res/dead.png', name: 'dead', type: 'image' }];
		var loaded = 0;
		return Promise.all(items.map(function (_ref) {
			var path = _ref.path;
			var name = _ref.name;
			var type = _ref.type;

			var p = null;
			switch (type) {
				case 'image':
					p = util.loadImage(path);
					break;
				case 'level':
					p = util.loadXML(path).then(function (doc) {
						return loadLevel(doc);
					});
					break;
				default:
					console.error("Not sure how to load ", type, name, path);
					debugger;
			}
			return p.then(function (stuff) {
				_this.assets[name] = stuff;
				_this.loadProgress = ++loaded / items.length * 0.8;
				return stuff;
			});
		})).then(function () {
			_this.assets.playerRotations = PixelBuffer.getRotatedTiles(_this.assets.player, 16);
			var hilight = _this.assets.playerRotations.getPixel(4, 7);
			var mid = _this.assets.playerRotations.getPixel(8, 5);
			var colors = [[[hilight, 0xff1717b4], [mid, 0xff0f0f6e]], [[hilight, 0xff00bacb], [mid, 0xff0099a7]], [[hilight, 0xff00bacb], [mid, 0xff0099a7]], [[hilight, 0xffcb0084], [mid, 0xffa7006c]]];
			_this.assets.enemyRotations = colors.map(function (replacements) {
				return _this.assets.playerRotations.withReplacedColors(replacements);
			});
			var deadPlayer = PixelBuffer.fromImage(_this.assets.dead);
			_this.assets.deadEnemies = colors.map(function (replacements) {
				return deadPlayer.withReplacedColors(replacements);
			});

			_this.setState(STATES.Game);
		}).catch(function (e) {
			console.error(e);
			_this.loadingFailed = true;
		});
	};

	LD34.prototype.startLevel = function startLevel(level) {
		var _this2 = this;

		this.player = new Player(this);
		this.camera = new Camera(this, this.player, this.camTarget, this.screen.width, this.screen.height);

		this.startedGame = true;
		this.entities.length = 0;
		this.playerDead = false;
		this.deadPlayerTimer = 0.0;

		this.width = level.width * Consts.TileSize;
		this.height = level.height * Consts.TileSize;
		this.grid = new CollisionGrid(this.width, this.height, Consts.TileSize * 4); // hm...

		// this.player.reset();
		this.addEntity(this.player, level.spawnX * Consts.TileSize + 8.1, level.spawnY * Consts.TileSize + 8.1);
		EnemyLocations.map(function (_ref2) {
			var x = _ref2[0];
			var y = _ref2[1];

			x *= Consts.TileSize;
			y *= Consts.TileSize;
			_this2.addEntity(new Enemy(_this2, x + 8, y + 8));
		});
		// this.addEn tity(new Enemy(this, 2*16+8, 5*16+8));
		this.camera.setPosition(this.player.pos.x, this.player.pos.y, true);
		this.tileWidth = level.width;
		this.tileHeight = level.height;
		this.tiles = new Array(this.tileWidth * this.tileHeight);
		this.emptyTiles = new Uint8Array(this.tileWidth * this.tileHeight);
		this.lockedTiles = new Array(this.tileWidth * this.tileHeight); // waste of memory...

		var knownKeysOrLocks = {};
		for (var y = 0; y < this.tileHeight; ++y) {
			for (var x = 0; x < this.tileWidth; ++x) {
				var i = x + y * this.tileWidth;
				var tileId = level.tiles[i];
				if (tileId >= Tiles.length) {
					if (!(tileId in knownKeysOrLocks)) {
						knownKeysOrLocks[tileId] = [];
					}
					knownKeysOrLocks[tileId].push({ x: x, y: y });
					tileId = 0;
				}
				var tileInfo = Tiles[tileId];
				this.tiles[i] = tileId ? tileInfo.offsetBy(x * Consts.TileSize, y * Consts.TileSize) : tileInfo;
				if (!tileId) {
					this.emptyTiles[i] = 1;
				}
				this.tiles[i].id = tileId;
			}
		}

		var geom = level.geom;
		if (this.edgeGeom.length === 0) {
			level.geom = geom = [];
			for (var y = 0; y < this.tileHeight; ++y) {
				for (var x = 0; x < this.tileWidth; ++x) {
					var i = x + y * this.tileWidth;
					var tileId = level.tiles[i];
					if (tileId >= Tiles.length) continue;
					var tileInfo = Tiles[tileId];
					if (tileId) {
						geom = polybool(geom, [this.tiles[i].edges.map(function (_ref3) {
							var start = _ref3.start;
							return [start.x, start.y];
						})]);
					}
				}
			}

			geom.forEach(function (poly) {
				for (var i = 1; i < poly.length; ++i) {
					var _poly = poly[i - 1];
					var px = _poly[0];
					var py = _poly[1];
					var _poly$i = poly[i];
					var cx = _poly$i[0];
					var cy = _poly$i[1];
					var _poly2 = poly[(i + 1) % poly.length];
					var nx = _poly2[0];
					var ny = _poly2[1];

					var dpx = cx - px,
					    dpy = cy - py;
					var dnx = nx - cx,
					    dny = ny - cy;
					var lp = Math.sqrt(dpx * dpx + dpy * dpy);
					if (lp !== 0) {
						dpx /= lp;dpy /= lp;
					}
					var ln = Math.sqrt(dnx * dnx + dny * dny);
					if (ln !== 0) {
						dnx /= ln;dny /= ln;
					}
					// same direction.
					if (Math.abs(dnx * dpx + dny * dpy - 1) < 0.0001) {
						poly.splice(i, 1);
						--i;
					}
				}
			});

			this.edgeGeom.length = 0;
			geom.forEach(function (poly, i) {
				for (var _i = 0; _i < poly.length; ++_i) {
					var _poly$_i = poly[_i];
					var px = _poly$_i[0];
					var py = _poly$_i[1];
					var _poly3 = poly[(_i + 1) % poly.length];
					var nx = _poly3[0];
					var ny = _poly3[1];

					_this2.edgeGeom.push(new LineSegment(new Vec2(px, py), new Vec2(nx, ny)));
				}
			});
		}

		this.keys.length = 0;
		this.locks.length = 0;
		Object.keys(knownKeysOrLocks).forEach(function (id, idx) {
			var lk = knownKeysOrLocks[id];
			var locks = [];
			var key = { id: idx, pos: null, locks: locks, locked: true };

			lk.forEach(function (_ref4) {
				var x = _ref4.x;
				var y = _ref4.y;

				var left = x !== 0 && _this2.tiles[x - 1 + y * _this2.tileWidth].id === 1;
				var right = x !== _this2.tileWidth - 1 && _this2.tiles[x + 1 + y * _this2.tileWidth].id === 1;
				var top = y !== 0 && _this2.tiles[(y - 1) * _this2.tileWidth + x].id === 1;
				var bottom = y !== _this2.tileHeight - 1 && _this2.tiles[x + (y + 1) * _this2.tileWidth].id === 1;
				if (left || right || top || bottom) {
					var lock = { key: key, id: idx, pos: new Vec2(x, y), tile: Tiles[1].offsetBy(x * Consts.TileSize, y * Consts.TileSize) };
					locks.push(lock);
					_this2.lockedTiles[x + y * _this2.tileWidth] = lock;
					_this2.locks.push(lock);
				} else {
					console.assert(key.pos == null);
					key.pos = new Vec2(x, y);
				}
			});
			console.assert(key.pos != null);
			_this2.keys.push(key);
		});

		this.keys.forEach(function (k) {
			return _this2.addEntity(new Key(_this2, k.pos.x * Consts.TileSize, k.pos.y * Consts.TileSize, k));
		});

		// let count = Math.ceil((this.geomPoints.length+4)*1.5);
		// let ptXYA = new Float32Array(count*3);
		// let tmpPoint = new Uint8Array(count)
		this.visTracker.setSegments(this.edgeGeom);
		this.bgbuffer = new PixelBuffer(this.width, this.height);
		// this.seenBuffer = new PixelBuffer(this.width, this.height);
		// this.seenBuffer.context.fillStyle = 'black'
		// this.seenBuffer.context.fillRect(0, 0, this.width, this.height);
		this.bloodBuffer = new PixelBuffer(this.width, this.height);

		Sounds.playMusic(1);
	};

	LD34.prototype.addEntity = function addEntity(ent) {
		var x = arguments.length <= 1 || arguments[1] === undefined ? ent.pos.x : arguments[1];
		var y = arguments.length <= 2 || arguments[2] === undefined ? ent.pos.y : arguments[2];

		ent.pos.x = x;
		ent.pos.y = y;
		this.entities.push(ent);
		if (ent.collidesWithEntities || ent.collidesWithPlayer) {
			this.grid.add(ent);
		}
		return ent;
	};

	LD34.prototype.segmentsAround = function segmentsAround(pos, radius) {
		var left = math.clamp(Math.floor((pos.x - radius) / Consts.TileSize) - 1, 0, this.tileWidth - 1);
		var right = math.clamp(Math.ceil((pos.x + radius) / Consts.TileSize) + 1, 0, this.tileWidth - 1);
		var top = math.clamp(Math.floor((pos.y - radius) / Consts.TileSize) - 1, 0, this.tileHeight - 1);
		var bottom = math.clamp(Math.ceil((pos.y + radius) / Consts.TileSize) + 1, 0, this.tileHeight - 1);
		var result = segmentTmp;
		result.length = 0;
		for (var y = top; y <= bottom; ++y) {
			for (var x = left; x <= right; ++x) {
				var tileIdx = y * this.tileWidth + x;
				result.push.apply(result, this.tiles[tileIdx].edges);
				if (this.lockedTiles[tileIdx] && this.lockedTiles[tileIdx].key.locked) {
					result.push.apply(result, this.lockedTiles[tileIdx].tile.edges);
				}
			}
		}
		return result;
	};

	LD34.prototype.update = function update(dt) {
		if (window.TIME_FUNCTIONS) console.time('update');
		switch (this.state) {
			case STATES.Game:
				if (!this.startedGame) {
					this.startLevel(this.assets.level0);
				} else if (this.playerDead) {
					this.deadPlayerTimer -= dt;
					if (this.deadPlayerTimer < 0) {
						this.startLevel(this.assets.level0);
					}
				}
				this.gameStateUpdate(dt);
				break;
			case STATES.Loading:
				// this is *stupid*
				if (this.loadProgress === 1.0) {
					this.state = STATES.Game;
				} else if (this.loadProgress >= 0.9) {
					this.loadProgress = 1.0;
				}
				break;
			case STATES.Menu:
				break; // NYI
		}
		if (window.TIME_FUNCTIONS) console.timeEnd('update');
	};

	LD34.prototype.gameStateUpdate = function gameStateUpdate(dt) {
		var _edgeGeom;

		this.debugContext.clearRect(0, 0, this.debugContext.canvas.width, this.debugContext.canvas.height);
		this.debugContext.save();
		this.debugContext.scale(Consts.Scale, Consts.Scale);

		// this.camTarget.copy(this.player.pos);

		this.mouse.x = this.camera.minX + Input.mouse.x;
		this.mouse.y = this.camera.minY + Input.mouse.y;
		if ( /*Input.mouse.isDown || */Input.keyboard.isDown('space')) {
			var mdx = this.mouse.x - this.player.pos.x;
			var mdy = this.mouse.y - this.player.pos.y;
			mdx /= 4;
			mdy /= 4;
			if (mdx < 20 && mdy < 20) {
				// this.camTarget.copy(this.player.pos)
			} else {
					// this.camTarget.set(this.player.pos.x+mdx, this.player.pos.y+mdy);
				}
		} else {
				this.camTarget.copy(this.player.pos);
			}
		var extraGeom = [];

		// if (window.TIME_FUNCTIONS) console.time('update:entities');
		{
			var entities = this.entities;
			for (var i = 0; i < entities.length; ++i) {
				entities[i].update(dt);
				entities[i].postUpdate(dt);
			}
			var j = 0;
			for (var i = 0, l = entities.length; i < l; ++i) {
				if (entities[i].enabled) {
					entities[j++] = entities[i];
					var segs = entities[i].getSegments();
					if (segs) extraGeom.push.apply(extraGeom, segs);
				}
			}
			entities.length = j;
		}
		// if (window.TIME_FUNCTIONS) console.timeEnd('update:entities');

		this.camera.update(dt);
		if (window.TIME_FUNCTIONS) console.time('lighting');
		//this.computeLighting();
		var _camera = this.camera;
		var minX = _camera.minX;
		var minY = _camera.minY;
		var maxX = _camera.maxX;
		var maxY = _camera.maxY;

		var p0 = Vec2.temp(minX - 1, minY - 1);
		var p1 = Vec2.temp(minX - 1, maxY + 1);
		var p2 = Vec2.temp(maxX + 1, maxY + 1);
		var p3 = Vec2.temp(maxX + 1, minY - 1);
		extraGeom.push(new LineSegment(p0, p1), new LineSegment(p1, p2), new LineSegment(p2, p3), new LineSegment(p3, p0));

		var ph = this.player.heading;
		var hx = Math.cos(ph);
		var hy = Math.sin(ph);
		var ihx = -hx;
		var ihy = -hy;
		var ih = Vec2.temp(ihx * 3 + this.player.pos.x, ihy * 3 + this.player.pos.y);
		var minAngle = ph - Math.PI / 5;
		var maxAngle = ph + Math.PI / 5;
		var minAx = Math.cos(minAngle) * 200 + ih.x;
		var minAy = Math.sin(minAngle) * 200 + ih.y;

		var maxAx = Math.cos(maxAngle) * 200 + ih.x;
		var maxAy = Math.sin(maxAngle) * 200 + ih.y;

		// @TODO: avoid copying this so frequently
		this.visTracker.setSegments((_edgeGeom = this.edgeGeom).concat.apply(_edgeGeom, [extraGeom].concat(this.locks.filter(function (l) {
			return l.key.locked;
		}).map(function (l) {
			return l.tile.edges;
		}))));

		this.visTracker.setCenter(this.player.pos);
		this.visTracker.sweep();
		if (window.TIME_FUNCTIONS) console.timeEnd('lighting');

		// if (window.TIME_FUNCTIONS) console.timeEnd('update:effects');
		this.debugContext.restore();
	};

	LD34.prototype.closestPoint = function closestPoint(out, pos, radius) {
		var min = Number.MAX_VALUE;
		var closestX = 0.0;
		var closestY = 0.0;
		var sign = 0;
		var segs = this.segmentsAround(pos, radius);
		var tmpClosest = Vec2.temp(0.0, 0.0);
		var px = pos.x;
		var py = pos.y;

		var paperWidth = 0.1;
		for (var si = 0, sl = segs.length; si < sl; ++si) {
			var seg = segs[si];
			var backface = seg.closestPoint(tmpClosest, pos);
			var dx = tmpClosest.x - px,
			    dy = tmpClosest.y - py;
			var dist = dx * dx + dy * dy;
			if (!backface) dist -= paperWidth;
			if (dist < min) {
				closestX = tmpClosest.x;
				closestY = tmpClosest.y;
				min = dist;
				sign = backface ? -1 : 1;
			}
		}
		out.x = closestX;
		out.y = closestY;
		return sign;
	};

	LD34.prototype.raycastCell = function raycastCell(outP, outN, x, y, rayPos, rayDir) {
		var tileIdx = x + y * this.tileWidth;
		var segs = this.tiles[tileIdx].edges;
		if (segs.length === 0) {
			if (this.lockedTiles[tileIdx] && this.lockedTiles[tileIdx].key.locked) {
				segs = this.lockedTiles[tileIdx].tile.edges;
			}
		}
		var curBest = 2.0;
		var tmpP = Vec2.temp(0.0, 0.0);
		var tmpN = Vec2.temp(0.0, 0.0);
		for (var i = 0, l = segs.length; i < l; ++i) {
			var seg = segs[i];
			var isect = seg.raycast(tmpP, tmpN, rayPos, rayDir, 0);
			if (isect === -1) return -1;
			if (isect < curBest) {
				curBest = isect;
				outP.copy(tmpP);
				outN.copy(tmpN);
			}
		}
		return curBest;
	};

	LD34.prototype.setState = function setState(state) {
		this.lastState = this.state;
		this.state = state;
	};

	LD34.prototype.canSee = function canSee(pt0, pt1) {
		var p = Vec2.temp();
		var n = Vec2.temp();
		var delta = pt0.to(pt1);
		var r = this.raycast(p, n, pt0, delta.normalized());
		if (r < 0 || r < delta.length()) {
			return false;
		}
		return true;
	};

	LD34.prototype.raycast = function raycast(outP, outN, rayPos, rayDir, rayLen, extraSegs) {
		var rayX = rayPos.x;
		var rayY = rayPos.y;
		var rayDirX = rayDir.x;
		var rayDirY = rayDir.y;

		var gx = Math.floor(rayX / Consts.TileSize);
		var gy = Math.floor(rayY / Consts.TileSize);
		var rayDxI = 0;
		var rayDyI = 0;
		var sx = 999999.0;
		var sy = 999999.0;
		var ex = 0.0;
		var ey = 0.0;

		if (rayDirX < 0) {
			rayDxI = -1;
			sx = (gx * Consts.TileSize - rayX) / rayDirX;
			ex = Consts.TileSize / -rayDirX;
		} else if (rayDirX > 0) {
			rayDxI = 1;
			sx = ((gx + 1) * Consts.TileSize - rayX) / rayDirX;
			ex = Consts.TileSize / rayDirX;
		}

		if (rayDirY < 0) {
			rayDyI = -1;
			sy = (gy * Consts.TileSize - rayY) / rayDirY;
			ey = Consts.TileSize / -rayDirY;
		} else if (rayDirY > 0) {
			rayDyI = 1;
			sy = ((gy + 1) * Consts.TileSize - rayY) / rayDirY;
			ey = Consts.TileSize / rayDirY;
		}

		if (rayDxI === 0 && rayDyI === 0) {
			console.error("Empty ray vector in raycast(): ", rayDirX, rayDirY);
			return -1;
		}

		var rayMaxDist = rayLen || 10000.0;
		var tmpRayP = Vec2.temp(rayX, rayY);
		var tmpRayV = Vec2.temp(rayDirX * rayMaxDist, rayDirY * rayMaxDist);

		var esBestT = 2;
		var esBestN = Vec2.temp();
		var esBestP = Vec2.temp();
		if (extraSegs != null) {
			var segTmpP = Vec2.temp();
			var segTmpN = Vec2.temp();
			for (var si = 0; si < extraSegs.length; ++si) {
				var t = extraSegs[si].raycast(segTmpP, segTmpN, tmpRayP, tmpRayV, 0);
				if (math.betweenI(t, 0.0, 1.0) && t < esBestT) {
					esBestT = t;
					esBestN.copy(segTmpN);
					esBestP.copy(segTmpP);
				}
			}
		}

		var travel = -1;
		while ((travel = this.raycastCell(outP, outN, gx, gy, tmpRayP, tmpRayV)) !== -1) {

			if (travel !== 2) {
				if (esBestT >= 0 && esBestT !== 2) {
					travel = Math.min(esBestT, travel);
					outP.copy(esBestP);
					outN.copy(esBestN);
				}
				return travel * rayMaxDist;
			}

			if (sx < sy) {
				sx += ex;
				gx += rayDxI;
				if (gx < 0 || gx >= this.tileWidth) {
					console.warn("raycast missed everything!", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
					return -1;
				}
			} else {
				sy += ey;
				gy += rayDyI;
				if (gy < 0 || gy >= this.tileHeight) {
					console.warn("raycast missed everything!", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
					return -1;
				}
			}
		}
		console.warn("raycast got bad ray (start pos inside geom)", new Vec2(rayX, rayY), new Vec2(rayDirX, rayDirY));
		return -1;
	};

	LD34.prototype.render = function render() {
		if (window.TIME_FUNCTIONS) console.time('render');
		switch (this.lastState) {
			case STATES.Game:
				this.gameStateRender();break;
			case STATES.Loading:
				this.renderLoading();break;
			case STATES.Menu:
				break; // NYI
		}
		if (window.TIME_FUNCTIONS) console.timeEnd('render');
		this.lastState = this.state; // @@HACK: we don't want to render until we've updated with our new state at least once.
	};

	LD34.prototype.renderLoading = function renderLoading() {
		this.overlayLayer.clear();
		this.hudLayer.fill('black');
		var progressBarWidth = this.hudLayer.width >> 1;
		var progressBarHeight = 8;

		this.hudLayer.context.strokeStyle = 'white';
		this.hudLayer.context.strokeRect((this.hudLayer.width - progressBarWidth) / 2, (this.hudLayer.height - progressBarHeight) / 2, progressBarWidth, progressBarHeight);

		this.hudLayer.context.fillStyle = 'black';
		this.hudLayer.context.fillRect((this.hudLayer.width - progressBarWidth) / 2, (this.hudLayer.height - progressBarHeight) / 2, progressBarWidth, progressBarHeight);

		this.hudLayer.context.fillStyle = this.loadingFailed ? 'red' : 'white';

		this.hudLayer.context.fillRect((this.hudLayer.width - progressBarWidth) / 2, (this.hudLayer.height - progressBarHeight) / 2, progressBarWidth * this.loadProgress, progressBarHeight);
	};

	LD34.prototype.unlock = function unlock(key) {
		key.locked = false;
		key.locks.forEach(function (l) {
			l.locked = false;
		});

		if (!this.keys.some(function (k) {
			return k.locked;
		})) {
			this.gameWon = true;
			alert("You win (this message is all I had time for, sorry)");
		}
	};

	LD34.prototype.killPlayer = function killPlayer() {
		this.deadPlayerTimer = 1.0;
		this.playerDead = true;
	};

	LD34.prototype.gameStateRender = function gameStateRender() {
		var _this3 = this;

		var _camera2 = this.camera;
		var minX = _camera2.minX;
		var minY = _camera2.minY;
		var maxX = _camera2.maxX;
		var maxY = _camera2.maxY;
		// minX = Math.floor(minX);
		// minY = Math.floor(minY);

		var iMinX = Math.round(minX);
		var iMinY = Math.round(minY);

		for (var i = 0; i < this.layers.length; ++i) {
			var pb = this.layers[i].buffer;
			if (pb.pixelsDirty) pb.reset();
			this.layers[i].clear();
			this.layers[i].context.save();
			this.layers[i].context.translate(-iMinX, -iMinY);
		}

		this.debugContext.save();
		this.debugContext.scale(Consts.Scale, Consts.Scale);
		this.debugContext.lineWidth = 1 / Consts.Scale;
		this.debugContext.strokeStyle = 'red';
		this.debugContext.translate(-minX, -minY);

		var minTileX = math.clamp(Math.floor(minX / Consts.TileSize), 0, this.tileWidth - 1);
		var minTileY = math.clamp(Math.floor(minY / Consts.TileSize), 0, this.tileHeight - 1);

		var maxTileX = math.clamp(Math.ceil(maxX / Consts.TileSize), 0, this.tileWidth - 1);
		var maxTileY = math.clamp(Math.ceil(maxY / Consts.TileSize), 0, this.tileHeight - 1);

		// this.bgmodLayer.context.drawImage(this.bgbuffer.canvas, -minX, -minY);
		// this.bgmodLayer.blendMode = 'overlay';
		// this.bgmodLayer.alpha = 0.2;
		{
			if (window.TIME_FUNCTIONS) console.time('render tiles');
			var tileCtx = this.tileLayer.context;
			tileCtx.fillStyle = 'red';
			for (var ty = minTileY; ty <= maxTileY; ++ty) {
				var row = ty * this.tileWidth;
				for (var tx = minTileX; tx <= maxTileX; ++tx) {
					var tile = this.tiles[tx + row];
					if (tile.id === 0) {
						var lock = this.lockedTiles[tx + row];
						if (lock && lock.key.locked) {
							this.entsLayer.context.drawImage(this.assets.misc, 0, lock.id * 16, 16, 16, tx * Consts.TileSize, ty * Consts.TileSize, Consts.TileSize, Consts.TileSize);
						}
						continue;
					}
					var tileId = tile.id - 1;
					var tileX = tileId % 16;
					var tileY = tileId / 16 | 0;
					tileX *= 16;
					tileY *= 16;

					tileCtx.drawImage(this.assets.tiles, tileX, tileY, 16, 16, tx * Consts.TileSize, ty * Consts.TileSize, Consts.TileSize, Consts.TileSize);
				}
			}
			if (window.TIME_FUNCTIONS) console.timeEnd('render tiles');
		}

		// if (window.TIME_FUNCTIONS) console.time('render entities');
		for (var ei = 1; ei < this.entities.length; ++ei) {
			var ent = this.entities[ei];
			if (ent.enabled) {
				ent.render(this.entsLayer, this.fxLayer.buffer, minX, minY);
			}
		}
		this.entities[0].render(this.entsLayer, this.fxLayer.buffer, minX, minY); // player
		// if (window.TIME_FUNCTIONS) console.timeEnd('render entities');

		if (this.visTracker.outXs.length) {
			if (window.TIME_FUNCTIONS) console.time('render lighting');
			this.lightLayer.clear();

			this.lightLayer.alpha = 0.5;
			this.lightLayer.blendMode = 'multiply';
			var lctx = this.lightLayer.context;
			// let sctx = this.seenBuffer.context;
			lctx.save();
			lctx.beginPath();
			lctx.moveTo(this.player.pos.x, this.player.pos.y);

			var _visTracker = this.visTracker;
			var outXs = _visTracker.outXs;
			var outYs = _visTracker.outYs;

			lctx.moveTo(outXs[0], outYs[0]);
			for (var i = 0, l = outXs.length; i < l; ++i) {
				var px = outXs[i];
				var py = outYs[i];
				if (i === 0) {
					lctx.moveTo(px, py); /*sctx.moveTo(px, py);*/
				} else {
						lctx.lineTo(px, py); /*sctx.lineTo(px, py);*/
					}
				if (DEBUG) drawing.drawArrow(this.debugContext, this.player.pos.x, this.player.pos.y, px, py);
			}
			var ShadowBlur = 10;
			lctx.shadowColor = 'white';
			lctx.shadowBlur = ShadowBlur / 2;
			lctx.shadowOffsetX = 0;
			lctx.shadowOffsetY = 0;

			lctx.closePath();
			// sctx.closePath();
			lctx.fillStyle = 'white';
			// sctx.fillStyle = 'white';
			lctx.fill();
			// sctx.fill();

			var maskCtx = this.lightMaskCtx;
			maskCtx.save();
			maskCtx.clearRect(0, 0, maskCtx.canvas.width, maskCtx.canvas.height);
			maskCtx.globalCompositeOperation = 'source-over';

			maskCtx.shadowColor = 'black';
			maskCtx.shadowBlur = ShadowBlur;
			maskCtx.shadowOffsetX = 0;
			maskCtx.shadowOffsetY = 0;
			maskCtx.beginPath();
			maskCtx.moveTo(this.player.pos.x - minX, this.player.pos.y - minY);
			maskCtx.arc(this.player.pos.x - minX, this.player.pos.y - minY, 200, this.player.heading - Math.PI / 5, this.player.heading + Math.PI / 5);
			maskCtx.closePath();
			maskCtx.fill();
			maskCtx.restore();

			maskCtx.globalCompositeOperation = 'source-in';
			maskCtx.drawImage(lctx.canvas, 0, 0);
			lctx.restore();
			lctx.translate(iMinX, iMinY);

			lctx.clearRect(0, 0, lctx.canvas.width, lctx.canvas.height);
			lctx.fillStyle = 'black';
			lctx.fillRect(0, 0, lctx.canvas.width, lctx.canvas.height);
			lctx.drawImage(maskCtx.canvas, 0, 0);
			// this.seenBuffer.context.drawImage(maskCtx.canvas, iMinX, iMinY);
			if (window.TIME_FUNCTIONS) console.timeEnd('render lighting');
		}

		// this.bgLayer.fill('rgb(55, 55, 55)');
		// this.bgmodLayer.clear();
		// this.bgmodLayer.context.drawImage(this.seenBuffer.canvas, 0, 0);
		//,
		//	0, 0, this.bgmodLayer.width, this.bgmodLayer.height,
		//	-iMinX, -iMinY, this.bgmodLayer.width, this.bgmodLayer.height);
		// this.bgmodLayer.blendMode = 'multiply';
		// this.bgmodLayer.alpha = 0.3

		var DRAW_DEBUG_GEOM = false;

		if (DRAW_DEBUG_GEOM) {
			this.debugContext.strokeStyle = 'yellow';
			this.edgeGeom.forEach(function (seg) {
				return seg.debugRender(_this3.debugContext);
			});
			this.debugContext.strokeStyle = 'yellow';
		}

		for (var i = 0; i < this.layers.length; ++i) {
			this.layers[i].context.restore();
			if (this.layers[i].buffer.pixelsDirty) this.layers[i].buffer.update(false);
		}

		this.bloodBuffer.update(true);
		this.bgmodLayer.context.drawImage(this.bloodBuffer.canvas, iMinX, iMinY, this.bgmodLayer.width, this.bgmodLayer.height, 0, 0, this.bgmodLayer.width, this.bgmodLayer.height);

		this.debugContext.restore();
	};

	return LD34;
})();

module.exports = LD34;

},{"./audio":154,"./camera":157,"./collision_grid":159,"./constants":160,"./drawing":162,"./enemy":163,"./gfx_layer":167,"./input":169,"./key":170,"./level_data":171,"./lighting":172,"./line_segment":173,"./math":175,"./pixel_buffer":177,"./player":178,"./rand":179,"./tweens":180,"./util":181,"./vec2":182,"poly-bool":8}],166:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Game = require('./game');

var _require = require('./input');

var updateInput = _require.update;

var Clock = require('./clock');
var Consts = require('./constants');
var Input = require('./input');

var _require2 = require('./util');

var createCanvas = _require2.createCanvas;
var createContext2D = _require2.createContext2D;

var Vec2 = require('./vec2');

var GameRunner = (function () {
	function GameRunner() {
		var _this = this;

		_classCallCheck(this, GameRunner);

		var screen = this.screen = document.getElementById('screen');
		this.screen.width = Consts.ClientScreenWidth * Consts.DevicePixels;
		this.screen.height = Consts.ClientScreenHeight * Consts.DevicePixels;
		this.screen.style.width = Consts.ClientScreenWidth + "px";
		this.screen.style.height = Consts.ClientScreenHeight + "px";
		this.screenCtx = screen.getContext('2d');

		this.debugElem = document.getElementById('debug');

		this.debugCanvas = createCanvas(Consts.ClientScreenWidth, Consts.ClientScreenHeight);
		this.debugCtx = this.debugCanvas.getContext('2d');

		this.drawCanvas = createCanvas(Consts.ScreenWidth, Consts.ScreenHeight);
		this.drawContext = this.drawCanvas.getContext('2d');

		Input.initialize(screen);
		window.addEventListener('keydown', function (e) {
			if (e.which === 27) {
				_this.paused = !_this.paused;
				if (!_this.paused) _this.start();
			}
		});
		this.paused = false;
		this.game = null;
		this.startTime = 0;
		this.accum = 0;
		this.lastUpdate = 0;
		this.frames = 0;
		this.ticks = 0;
		this.lastSecond = 0;
		this.fpsElem = document.getElementById('fps');
		this.tpsElem = document.getElementById('tps');
		this.mspfElem = document.getElementById('mspf');
		this.doUpdate = function (timestamp) {
			return _this.update(timestamp);
		};
	}

	GameRunner.prototype.start = function start() {
		if (!this.game) this.game = new Game(this.drawCanvas, this.debugCanvas);
		this.startTime = 0;
		this.accum = 0;
		this.lastUpdate = 0;
		this.frames = 0;
		this.ticks = 0;
		this.lastSecond = 0;
		requestAnimationFrame(this.doUpdate);
	};

	GameRunner.prototype.update = function update(timestamp) {
		if (this.paused) {
			return;
		}
		if (!this.lastUpdate) {
			this.lastUpdate = timestamp;
			this.lastSecond = timestamp;
			return requestAnimationFrame(this.doUpdate);
		}
		requestAnimationFrame(this.doUpdate);
		Clock.realTime = timestamp / 1000.0;
		var unscaledDeltaTime = 1.0 / Clock.fps;

		var dt = unscaledDeltaTime * Clock.timeScale;
		Clock.realDeltaTime = (timestamp - this.lastUpdate) / 1000.0;
		Clock.deltaTime = dt;
		this.lastUpdate = timestamp;

		this.accum += Clock.realDeltaTime;
		if (this.accum >= 5 * unscaledDeltaTime) {
			this.accum = unscaledDeltaTime;
		}
		var frameStart = Clock.now();
		while (this.accum >= dt) {
			++this.ticks;
			Vec2.Pool.reset();
			this.game.update(dt);
			Clock.accumTime += dt;
			Input.update();
			this.accum -= dt;
			++Clock.ticks;
		}
		++this.frames;
		this.game.render();
		this.render();

		var frameEnd = Clock.now();
		if (this.mspfElem != null) {
			this.mspfElem.textContent = 'mspf: ' + (frameEnd - frameStart).toFixed(2);
		}

		if (timestamp - this.lastSecond >= 1000.0) {
			this.lastSecond = timestamp;
			console.log("fps: " + this.frames + ", tps: " + this.ticks + ', mspf: ' + (frameEnd - frameStart).toFixed(2));
			if (this.tpsElem != null) {
				this.tpsElem.textContent = "tps: " + this.ticks;
			}
			if (this.fpsElem != null) {
				this.fpsElem.textContent = "fps: " + this.frames;
			}
			this.frames = this.ticks = 0;
		}
	};

	GameRunner.prototype.render = function render() {
		var screenCtx = this.screenCtx;
		var screen = this.screen;

		screenCtx.imageSmoothingEnabled = false;
		screenCtx.mozImageSmoothingEnabled = false;
		screenCtx.webkitImageSmoothingEnabled = false;
		screenCtx.clearRect(0, 0, screenCtx.canvas.width, screenCtx.canvas.height);
		screenCtx.globalCompositeOperation = 'source-over';
		screenCtx.globalAlpha = 1.0;
		if (this.game.layers) {
			// let camMinX = 0, camMinY = 0;
			// if (this.game.needCameraAdjust) {
			// 	camMinX = this.game.camera.minX;
			// 	camMinY = this.game.camera.minY;
			// }
			var gco = 'source-over';
			var globalAlpha = 1.0;
			for (var i = 0; i < this.game.layers.length; ++i) {
				var _game$layers$i = this.game.layers[i];
				var blendMode = _game$layers$i.blendMode;
				var alpha = _game$layers$i.alpha;
				var canvas = _game$layers$i.canvas;

				if (blendMode && blendMode !== gco) {
					gco = screenCtx.globalCompositeOperation = blendMode;
				}
				if (globalAlpha && globalAlpha !== alpha) {
					globalAlpha = screenCtx.globalAlpha = alpha;
				}
				screenCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, screen.width, screen.height);
			}
		} else {
			screenCtx.drawImage(this.drawCanvas, 0, 0, this.drawCanvas.width, this.drawCanvas.height, 0, 0, screen.width, screen.height);
		}
		screenCtx.drawImage(this.debugCanvas, 0, 0, this.debugCanvas.width, this.debugCanvas.height, 0, 0, screen.width, screen.height);
	};

	return GameRunner;
})();

module.exports = GameRunner;

},{"./clock":158,"./constants":160,"./game":165,"./input":169,"./util":181,"./vec2":182}],167:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PixelBuffer = require('./pixel_buffer');

var Layer = (function () {
	function Layer(name, width, height) {
		_classCallCheck(this, Layer);

		this.name = name;
		this.buffer = new PixelBuffer(width, height);
		this.width = this.buffer.width;
		this.height = this.buffer.height;
		this.canvas = this.buffer.canvas;
		this.context = this.buffer.context;
		this.viewport = { x: 0, y: 0, width: this.width, height: this.height };

		this.alpha = 1.0;
		this.blendMode = 'source-over';
	}

	Layer.prototype.clear = function clear() {
		this.context.clearRect(0, 0, this.width, this.height);
	};

	Layer.prototype.fill = function fill(color) {
		this.context.fillStyle = color;
		this.context.fillRect(0, 0, this.width, this.height);
	};

	return Layer;
})();

module.exports = Layer;

},{"./pixel_buffer":177}],168:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Particle = require('./particle');
var Consts = require('./constants');
var Clock = require('./clock');

var _require = require('./rand');

var RNG = _require.RNG;

var math = require('./math');
var Blood = require('./blood');

var Gore = (function (_Particle) {
	_inherits(Gore, _Particle);

	function Gore(game, x, y) {
		var z = arguments.length <= 3 || arguments[3] === undefined ? 5 : arguments[3];

		_classCallCheck(this, Gore);

		var _this = _possibleConstructorReturn(this, _Particle.call(this, game, x, y, z));

		_this.radius = 1;
		_this.life *= 2;
		_this.timed = true;
		_this.collidesWithEntities = false;
		_this.drag.set(2, 2);
		_this.elastic = true;
		_this.color = RNG.colorBetween(0xff1a395f, 0xff304880); // 0xff7898f0, 0xff88a8ff)
		return _this;
	}

	Gore.prototype.update = function update(dt) {
		_Particle.prototype.update.call(this, dt);
		if (this.vel.length() > 5) {
			var blood = new Blood(this.game, this.pos.x, this.pos.y, Math.max(0.1, this.pos.z - 1));
			blood.zPos = this.zPos;
			blood.vel.x *= 0.05;blood.vel.x += this.vel.x;
			blood.vel.y *= 0.05;blood.vel.y += this.vel.y;
			blood.zVel *= 0.05;blood.zVel += this.zVel;
			this.game.addEntity(blood);
		}
	};

	Gore.prototype.doCollision = function doCollision(o) {
		if (!this.enabled) return;
		if (o && o instanceof Gore) return;
		for (var i = 0; i < 20; i++) {
			var blood = new Blood(this.game, this.pos.x, this.pos.y);
			blood.zPos = this.zPos;
			blood.vel.x *= 0.05;blood.vel.x += this.vel.x * 0.5;
			blood.vel.y *= 0.05;blood.vel.y += this.vel.y * 0.5;
			blood.zVel *= 0.05;blood.zVel += this.zVel * 0.5;
			this.game.addEntity(blood);
		}
	};

	Gore.prototype.onGroundCollision = function onGroundCollision() {
		if (Math.abs(this.zVel) > 5) this.doCollision();
	};

	Gore.prototype.onCollision = function onCollision(o) {
		this.doCollision(o);
	};

	return Gore;
})(Particle);

module.exports = Gore;

},{"./blood":155,"./clock":158,"./constants":160,"./math":175,"./particle":176,"./rand":179}],169:[function(require,module,exports){
'use strict';

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var Consts = require('./constants');
// mostly borrowed from my library, demon.js, with some modifications
var Mouse = {
	x: 0,
	y: 0,
	dx: 0,
	dy: 0,
	lastX: 0,
	lastY: 0,
	isDown: false,
	transitions: 0,
	wasPressed: function wasPressed() {
		return this.isDown && this.transitions > 0;
	},
	wasReleased: function wasReleased() {
		return !this.isDown && this.transitions > 0;
	}
};

var MouseScreen = null;
function updateMousePos(cx, cy) {
	var rect = MouseScreen.getBoundingClientRect();
	cx -= rect.left;
	cy -= rect.top;
	Mouse.x = cx / Consts.Scale;
	Mouse.y = cy / Consts.Scale;
	Mouse.dx = Mouse.x - Mouse.lastX;
	Mouse.dy = Mouse.y - Mouse.lastY;
}

function initMouse(screen) {
	MouseScreen = screen;
	window.addEventListener('blur', function () {
		Mouse.isDown = false;
		Mouse.lastX = Mouse.dx = Mouse.x = Mouse.lastY = Mouse.dy = Mouse.y = 0;
		Mouse.transitions = 0;
	});

	window.addEventListener('mousedown', function (e) {
		if (e.button === 0) {
			Mouse.isDown = true;++Mouse.transitions;
		}
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});

	window.addEventListener('mouseup', function (e) {
		if (e.button === 0) {
			Mouse.isDown = false;++Mouse.transitions;
		}
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});

	window.addEventListener('mousemove', function (e) {
		updateMousePos(e.clientX, e.clientY);
		e.preventDefault();
	});
}

function updateMouse() {
	Mouse.transitions = 0;
	Mouse.lastX = Mouse.x;
	Mouse.lastY = Mouse.y;
}

var KEYMAX = 256;

var Keyboard = {
	KeyCodes: null,
	KeyCodeInverse: null,
	KC: {},
	KCI: {},
	keyTransitions: new Uint8Array(KEYMAX),
	keysDown: new Uint8Array(KEYMAX),
	defaultPrevented: new Array(KEYMAX),

	isDownC: function isDownC(kc) {
		return !!this.keysDown[kc >>> 0];
	},
	transitionsC: function transitionsC(kc) {
		return this.keyTransitions[kc >>> 0];
	},
	wasPressedC: function wasPressedC(kc) {
		var code = kc >>> 0;return !!(this.keysDown[code] && this.keyTransitions[code]);
	},
	wasReleasedC: function wasReleasedC(kc) {
		var code = kc >>> 0;return !!(!this.keysDown[code] && this.keyTransitions[code]);
	},
	isDown: function isDown(key) {
		return this.isDownC(keyToCode(key));
	},
	transitions: function transitions(key) {
		return this.transitionsC(keyToCode(key));
	},
	wasPressed: function wasPressed(key) {
		return this.wasPressedC(keyToCode(key));
	},
	wasReleased: function wasReleased(key) {
		return this.wasReleasedC(keyToCode(key));
	}
};

Keyboard.KeyCodes = Keyboard.KC;
Keyboard.KeyCodeInverse = Keyboard.KCI;
var KnownKeys = new Uint8Array(KEYMAX);

function keyToCode(key) {
	var code = 0;
	if (typeof key === 'number') {
		code = key >>> 0;
		if (KnownKeys[code] === 0) {
			console.error("Keycode " + key + " is not mapped to any known key");return 0;
		}
	} else {
		var maybeCode = Keyboard.KC[key];
		if (maybeCode === 0) {
			console.error("Unknown key: " + key);return 0;
		}
		code = maybeCode >>> 0;
	}
	if (code >= KEYMAX || code === 0) {
		console.error("Keycode " + key + " is outside valid range: " + code);return 0;
	}
	return code;
}

(function () {
	var keysToCodes = {
		A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
		Left: 37, Up: 38, Right: 39, Down: 40,
		Escape: 27, Return: 13,
		Backspace: 8, Space: 32, Tab: 9,
		Num0: 48, Num1: 49, Num2: 50, Num3: 51, Num4: 52, Num5: 53, Num6: 54, Num7: 55, Num8: 56, Num9: 57,
		Numpad0: 96, Numpad1: 97, Numpad2: 98, Numpad3: 99, Numpad4: 100, Numpad5: 101, Numpad6: 102, Numpad7: 103, Numpad8: 104, Numpad9: 105,
		NumpadMinus: 109, NumpadPlus: 107, NumpadEqual: 12, NumpadSlash: 111,
		F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
		Tilde: 192, Shift: 16, Ctrl: 17, Alt: 18,
		Colon: 186, Equals: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191, OpenBracket: 219, CloseBracket: 221, Backslash: 220, Quote: 222
	};

	var kcAliases = {
		Tilde: ['Backtick'], Return: ['Enter'], Escape: ['Esc'], Ctrl: ['Control'], Alt: ['Meta'],
		Num0: ['Zero'], Num1: ['One'], Num2: ['Two'], Num3: ['Three'], Num4: ['Four'], Num5: ['Five'], Num6: ['Six'], Num7: ['Seven'], Num8: ['Eight'], Num9: ['Nine']
	};

	Object.keys(keysToCodes).forEach(function (key) {
		var code = keysToCodes[key];
		ASSERT(code < KEYMAX, "[BUG] keycode for " + key + " is greater than KEYMAX");
		Keyboard.KCI[code] = key;
		KnownKeys[code] = 1;
		var keys = [key].concat(kcAliases[key] || []);
		keys.forEach(function (keyName) {
			Keyboard.KC[keyName] = code;
			Keyboard.KC[keyName.toLowerCase()] = code;
			var camelCase = keyName[0].toLowerCase() + keyName.slice(1);
			Keyboard.KC[camelCase] = code;
			var capCase = keyName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
			Keyboard.KC[capCase] = code;
		});
	});

	for (var _i = 0; _i < KEYMAX; ++_i) {
		Keyboard.defaultPrevented[_i] = true;
	}

	for (var i = 1; i <= 12; ++i) {
		Keyboard.defaultPrevented[Keyboard.KC["F" + i]] = false;
	}
})();

var keyTransitions32 = new Uint32Array(Keyboard.keyTransitions.buffer);
var keysDown32 = new Uint32Array(Keyboard.keysDown.buffer);

function initKeyboard() {
	window.addEventListener('keydown', function (e) {
		var kc = e.keyCode >>> 0;
		if (kc > KEYMAX || kc === 0) {
			console.warn("Unknown keycode value from DOM event.", e);return;
		}
		if (!Keyboard.keysDown[kc]) {
			Keyboard.keysDown[kc] = 1;++Keyboard.keyTransitions[kc];
		}
		if (Keyboard.defaultPrevented[kc]) {
			e.preventDefault();
		}
	});

	window.addEventListener('keyup', function (e) {
		var kc = e.keyCode >>> 0;
		if (kc > KEYMAX || kc === 0) {
			console.warn("Unknown keycode value from DOM event.", e);return;
		}
		if (Keyboard.keysDown[kc]) {
			Keyboard.keysDown[kc] = false;++Keyboard.keyTransitions[kc];
		}
		if (Keyboard.defaultPrevented[kc]) {
			e.preventDefault();
		}
	});

	window.addEventListener('blur', function () {
		for (var i = 0; i < keyTransitions32.length; ++i) {
			keyTransitions32[i] = 0;
		}for (var i = 0; i < keysDown32.length; ++i) {
			keysDown32[i] = 0;
		}
	});
}

function updateKeyboard() {
	for (var i = 0; i < keyTransitions32.length; ++i) {
		keyTransitions32[i] = 0;
	}
}

exports.mouse = exports.Mouse = Mouse;
exports.keyboard = exports.keys = exports.Keyboard = Keyboard;
exports.KeyCode = Keyboard.KeyCodes;

exports.initialize = function (screen) {
	initMouse(screen);
	initKeyboard(screen);
};

exports.update = function () {
	updateMouse();
	updateKeyboard();
};

},{"./constants":160,"./debug":161}],170:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Particle = require('./particle');
var Consts = require('./constants');
var Clock = require('./clock');

var _require = require('./rand');

var RNG = _require.RNG;

var math = require('./math');
var Sounds = require('./audio');
var Entity = require('./entity');
var Vec2 = require('./vec2');

var Key = (function (_Entity) {
	_inherits(Key, _Entity);

	function Key(game, x, y, keyInfo) {
		_classCallCheck(this, Key);

		var _this = _possibleConstructorReturn(this, _Entity.call(this, game, x, y));

		_this.keyInfo = keyInfo;
		_this.radius = 8;
		_this.mobile = false;
		_this.noiseTimer = 0;
		return _this;
	}

	Key.prototype.onCollision = function onCollision(who) {
		if (who === this.game.player) {
			this.unlock();
		}
	};

	Key.prototype.unlock = function unlock() {
		Sounds.play('unlock');
		this.game.unlock(this.keyInfo);
		this.enabled = false;
	};

	Key.prototype.update = function update(dt) {
		_Entity.prototype.update.call(this, dt);
		this.noiseTimer += dt;
		var pdist = this.game.player.pos.distance(this.pos);
		if (pdist < this.radius + this.game.player.radius) {
			this.unlock();
		} else if (this.noiseTimer > 3000) {
			if (this.game.player.pos.distance(this.pos) < 10 * Consts.TileSize) {
				Sounds.playWobble(this.keyInfo.id);
			}
		}
	};

	Key.prototype.render = function render(layer) {
		if (!this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x + this.radius, this.pos.y + this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x + this.radius, this.pos.y - this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x - this.radius, this.pos.y + this.radius)) && !this.game.canSee(this.game.player.pos, Vec2.temp(this.pos.x - this.radius, this.pos.y - this.radius))) {
			return;
		}
		layer.context.drawImage(this.game.assets.misc, 16, 16 * this.keyInfo.id, 16, 16, this.pos.x - 8, this.pos.y - 8, 16, 16);
	};

	return Key;
})(Entity);

module.exports = Key;

},{"./audio":154,"./clock":158,"./constants":160,"./entity":164,"./math":175,"./particle":176,"./rand":179,"./vec2":182}],171:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LineSegment = require('./line_segment');
var Vec2 = require('./vec2');
var Consts = require('./constants');

var TileInfo = (function () {
	function TileInfo(edges) {
		var tx = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
		var ty = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

		_classCallCheck(this, TileInfo);

		this.id = -1;
		this.edges = edges.map(function (_ref) {
			var _ref$start = _ref.start;
			var sx = _ref$start.x;
			var sy = _ref$start.y;
			var _ref$end = _ref.end;
			var ex = _ref$end.x;
			var ey = _ref$end.y;
			return new LineSegment(new Vec2(sx + tx, sy + ty), new Vec2(ex + tx, ey + ty));
		});
	}

	TileInfo.prototype.offsetBy = function offsetBy(x, y) {
		return new TileInfo(this.edges, x, y);
	};

	return TileInfo;
})();

// function triangle(p0, p1, p2) {
// 	return new TileInfo([{start: p0, end: p1}, {start: p1, end: p2}, {start: p2, end: p0}])
// }

function polygon() {
	for (var _len = arguments.length, pts = Array(_len), _key = 0; _key < _len; _key++) {
		pts[_key] = arguments[_key];
	}

	return new TileInfo(pts.map(function (pt, i) {
		return { start: pt.scaled(Consts.TileSize), end: pts[(i + 1) % pts.length].scaled(Consts.TileSize) };
	}));
}

function v(x, y) {
	return new Vec2(x, y);
}

var TILE_MID = new Vec2(0.5, 0.5);

// function triTile(p0, p1, p2) {
// 	return [
// 		triangle(p0, p1, p2),
// 		triangle(p0.rotated90(TILE_MID), p1.rotated90(TILE_MID), p2.rotated90(TILE_MID)),
// 		triangle(p0.rotated180(TILE_MID), p1.rotated180(TILE_MID), p2.rotated180(TILE_MID)),
// 		triangle(p0.rotated270(TILE_MID), p1.rotated270(TILE_MID), p2.rotated270(TILE_MID))
// 	];
// }

function polyTile() {
	for (var _len2 = arguments.length, pts = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
		pts[_key2] = arguments[_key2];
	}

	return [polygon.apply(undefined, pts), polygon.apply(undefined, pts.map(function (pt) {
		return pt.rotated90(TILE_MID);
	})), polygon.apply(undefined, pts.map(function (pt) {
		return pt.rotated180(TILE_MID);
	})), polygon.apply(undefined, pts.map(function (pt) {
		return pt.rotated270(TILE_MID);
	}))];
}

function polyTile2S() {
	for (var _len3 = arguments.length, pts = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
		pts[_key3] = arguments[_key3];
	}

	return [polygon.apply(undefined, pts), polygon.apply(undefined, pts.map(function (pt) {
		return pt.rotated90(TILE_MID);
	})), polygon.apply(undefined, pts.map(function (pt) {
		return pt.xFlipped(0.5);
	}).reverse()), polygon.apply(undefined, pts.map(function (pt) {
		return pt.xFlipped(0.5).rotated90(TILE_MID);
	}).reverse())];
}
function polyTile2() {
	for (var _len4 = arguments.length, pts = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
		pts[_key4] = arguments[_key4];
	}

	return [polygon.apply(undefined, pts), polygon.apply(undefined, pts.map(function (pt) {
		return pt.rotated90(TILE_MID);
	}))];
}

function polyTile2F() {
	for (var _len5 = arguments.length, pts = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
		pts[_key5] = arguments[_key5];
	}

	return polyTile.apply(undefined, pts).concat(polyTile.apply(undefined, pts.map(function (pt) {
		return pt.xFlipped();
	})));
}

var H = 0.5;
var Q = 0.25;
var S = 0.75;
var T = 1.0 / 3.0;
var X = 2.0 / 3.0;

var Tiles = [].concat([new TileInfo([])], // empty
[polygon(v(0, 0), v(0, 1), v(1, 1), v(1, 0))], // quad, 100% symmetry
polyTile(v(0, 0), v(0, H), v(1, H), v(1, 0)), polyTile(v(0, 0), v(0, 1), v(1, 0)), polyTile(v(0, 0), v(0, H), v(1, 0)), polyTile(v(0, 0), v(1, H), v(1, 0)), polyTile(v(0, 0), v(0, 1), v(1, H), v(1, 0)), polyTile(v(0, 0), v(0, H), v(1, 1), v(1, 0)), polyTile(v(0, H), v(1, H), v(1, 0)), polyTile(v(0, 0), v(0, H), v(1, H)), polyTile(v(0, 0), v(0, H), v(H, 0)), polyTile(v(0, 0), v(0, H), v(H, H), v(H, 0)), polyTile2S(v(0, 0), v(H, 1), v(1, 1), v(H, 0)), polyTile2(v(0, 0), v(0, H), v(H, 1), v(1, 1), v(1, H), v(H, 0)), polyTile(v(0, 0), v(0, 1), v(H, 1), v(H, H), v(1, H), v(1, 0)), polyTile(v(0, 0), v(0, 1), v(H, 1), v(1, H), v(1, 0))
// polyTile2F(v(0, 0), v(0, 1), v(1, 1), v(H, H), v(H, 0))

);

var TestLevel = {
	width: 30,
	height: 30,
	spawnX: 3,
	spawnY: 2,
	tiles: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 0, 0, 19, 1, 1, 1, 1, 18, 2, 2, 2, 2, 2, 2, 2, 10, 0, 0, 0, 14, 1, 1, 18, 10, 0, 0, 7, 1, 1, 0, 0, 0, 11, 1, 1, 1, 1, 0, 12, 4, 0, 4, 4, 0, 2, 34, 0, 12, 4, 20, 1, 6, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 19, 1, 1, 1, 0, 7, 1, 0, 1, 1, 0, 2, 34, 15, 25, 0, 19, 25, 0, 0, 0, 12, 4, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 7, 13, 0, 1, 0, 1, 1, 0, 2, 34, 3, 5, 0, 3, 17, 0, 0, 15, 17, 0, 0, 1, 1, 56, 57, 58, 59, 0, 1, 9, 0, 0, 15, 1, 0, 1, 1, 0, 2, 34, 3, 5, 0, 3, 0, 0, 0, 3, 0, 0, 0, 1, 1, 9, 0, 0, 0, 8, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 2, 34, 3, 5, 0, 11, 0, 13, 0, 3, 10, 12, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 18, 0, 1, 1, 0, 2, 34, 11, 21, 0, 0, 12, 17, 0, 3, 0, 0, 0, 1, 1, 1, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 1, 1, 0, 2, 34, 0, 14, 2, 2, 10, 0, 0, 3, 0, 12, 4, 1, 1, 1, 5, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 34, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 1, 1, 1, 21, 0, 0, 15, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 17, 0, 0, 0, 0, 0, 15, 25, 0, 0, 0, 1, 1, 1, 1, 21, 0, 23, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 17, 0, 0, 0, 1, 1, 1, 1, 1, 0, 22, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 19, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 0, 19, 0, 0, 0, 0, 0, 0, 14, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 1, 1, 0, 0, 3, 0, 8, 1, 1, 1, 24, 0, 1, 1, 1, 1, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 23, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 0, 0, 0, 0, 0, 1, 1, 0, 20, 18, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 21, 0, 23, 1, 1, 1, 1, 9, 0, 0, 0, 7, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 17, 0, 0, 0, 0, 0, 11, 1, 25, 0, 19, 1, 1, 1, 1, 1, 1, 1, 13, 0, 1, 1, 1, 10, 0, 14, 1, 1, 1, 1, 0, 8, 1, 1, 1, 21, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 21, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 6, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 25, 0, 1, 1, 1, 16, 0, 12, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 17, 15, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 7, 1, 1, 24, 16, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 23, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 21, 0, 1, 1, 1, 1, 24, 16, 0, 0, 8, 1, 1, 1, 1, 1, 1, 0, 22, 1, 1, 1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 8, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 9, 0, 0, 0, 0, 8, 1, 1, 1, 1, 1, 1, 1, 18, 22, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 14, 22, 22, 22, 22, 22, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 13, 0, 12, 20, 20, 20, 20, 20, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1

	/*
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
 1,6,0,0,19,1,1,1,1,18,2,2,2,2,2,2,2,10,0,0,0,14,1,1,18,10,0,0,7,1,
 1,0,0,0,11,1,1,1,1,0,12,4,0,4,4,0,2,10,0,12,4,20,1,6,0,0,0,0,0,1,
 1,0,0,0,0,19,1,1,1,0,7,1,0,1,1,0,2,10,15,25,0,19,25,0,0,0,12,4,0,1,
 1,0,0,0,0,0,0,0,7,13,0,1,0,1,1,0,2,10,3,5,0,3,17,0,0,15,17,0,0,1,
 1,0,0,0,0,0,1,9,0,0,15,1,0,1,1,0,2,10,3,5,0,3,0,0,0,3,0,0,0,1,
 1,9,0,0,0,8,1,1,1,1,1,1,0,1,1,0,2,10,3,5,0,11,0,13,0,3,10,12,4,1,
 1,1,1,1,1,1,1,1,1,1,1,18,0,1,1,0,2,10,11,21,0,0,12,17,0,3,0,0,0,1,
 1,1,25,0,0,0,0,0,0,0,0,0,12,1,1,0,2,10,0,14,2,2,10,0,0,3,0,12,4,1,
 1,1,5,0,0,0,1,1,1,1,1,1,1,1,1,0,2,10,0,0,0,0,0,0,0,23,0,0,0,1,
 1,1,21,0,0,15,1,1,1,1,1,1,1,1,1,0,1,1,17,0,0,0,0,0,15,25,0,0,0,1,
 1,1,1,21,0,23,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,23,17,0,0,0,1,
 1,1,1,1,0,22,1,1,1,1,1,1,1,1,1,0,19,1,1,1,1,1,1,1,1,1,1,1,1,1,
 1,10,0,19,0,0,0,0,0,0,14,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,11,1,
 1,0,0,3,0,8,1,1,1,24,0,1,1,1,1,9,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
 1,0,0,23,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,9,0,0,0,0,0,1,
 1,0,20,18,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,21,0,23,1,1,1,
 1,9,0,0,0,7,1,1,1,1,0,1,1,1,1,1,17,0,0,0,0,0,11,1,25,0,19,1,1,1,
 1,1,1,1,13,0,1,1,1,10,0,14,1,1,1,1,0,8,1,1,1,21,0,0,0,0,0,0,1,1,
 1,1,1,1,21,0,1,1,1,0,0,0,1,1,1,1,0,1,1,1,1,6,0,0,0,0,0,0,1,1,
 1,1,1,1,25,0,1,1,1,16,0,12,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,1,1,
 1,1,1,1,17,15,1,1,1,1,1,1,1,1,1,1,0,0,7,1,1,24,16,0,0,0,0,0,1,1,
 1,1,1,1,0,23,1,1,1,1,1,1,1,1,1,1,1,21,0,1,1,1,1,24,16,0,0,8,1,1,
 1,1,1,1,0,22,1,1,1,6,0,0,0,0,0,0,0,0,8,1,1,1,1,1,1,0,0,1,1,1,
 1,1,1,1,9,0,0,0,0,8,1,1,1,1,1,1,1,18,22,1,1,1,1,1,1,0,0,1,1,1,
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,14,22,22,22,22,22,0,0,1,1,1,
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,8,1,1,1,
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,13,0,12,20,20,20,20,20,1,1,1,1,1,
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1*/
	]
};

exports.TestLevel = TestLevel;

exports.Tiles = Tiles;
exports.TileInfo = TileInfo;

},{"./constants":160,"./line_segment":173,"./vec2":182}],172:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Vec2 = require('./Vec2');
// const LineSegment = require('./line_segment');
var math = require('./math');

var _require = require('./debug');

var ASSERT = _require.ASSERT;
// based on code originally by amit patel: www.redblobgames.com/articles/visibility/
// needs some work since it seems to be O(n^2) in the number of points in the level... @NOTE: may have fixed this now
// if this weren't in a jam i'd make an effort to fix that problem, and to reuse the
// line segment / raycasting code I already wrote...

function leftOf(_ref, x, y) {
	var start = _ref.start;
	var end = _ref.end;

	return (end.x - start.x) * (y - start.y) - (end.y - start.y) * (x - start.x) < 0.0;
}

function inFrontOf(a, b, center) {
	// @NOTE: check if we can just compare a.d to b.d...
	var a1 = leftOf(a, math.lerp(b.start.x, b.end.x, 0.01), math.lerp(b.start.y, b.end.y, 0.01));
	var a2 = leftOf(a, math.lerp(b.end.x, b.start.x, 0.01), math.lerp(b.end.y, b.start.y, 0.01));
	var a3 = leftOf(a, center.x, center.y);

	var b1 = leftOf(b, math.lerp(a.start.x, a.end.x, 0.01), math.lerp(a.start.y, a.end.y, 0.01));
	var b2 = leftOf(b, math.lerp(a.end.x, a.start.x, 0.01), math.lerp(a.end.y, a.start.y, 0.01));
	var b3 = leftOf(b, center.x, center.y);

	if (b1 === b2 && b2 !== b3) return true;
	if (a1 === a2 && a2 === a3) return true;
	if (a1 === a2 && a2 !== a3) return false;
	if (b1 === b2 && b2 === b3) return false;
	return false;
}
var idctr = 0;

var VisSegment = (function () {
	function VisSegment(start, end) {
		_classCallCheck(this, VisSegment);

		this.start = start;
		this.end = end;
		this.start.segment = this;
		this.end.segment = this;
		this.d = 0.0;
		this.next = null;
		this.prev = null;
		this.listGen_ = -1;
		this.id_ = ++idctr;
	}

	VisSegment.prototype.clone = function clone() {
		var vs = new VisSegment(this.start, this.end);
		vs.start = this.start;
		vs.end = this.end;
		vs.start = this.start;
		vs.end = this.end;
		vs.d = this.d;
		vs.next = this.next;
		vs.prev = this.prev;
		// vs.listGen_ = this.listGen_;
		// vs.id_ = this.id_;
		return vs;
	};

	return VisSegment;
})();

var currentListGen = 0;

function lineIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
	var s = ((p4x - p3x) * (p1y - p3y) - (p4y - p3y) * (p1x - p3x)) / ((p4y - p3y) * (p2x - p1x) - (p4x - p3x) * (p2y - p1y));
	return Vec2.temp(p1x + s * (p2x - p1x), p1y + s * (p2y - p1y));
}

function pointSorter(a, b) {
	var aAngle = +a.angle,
	    bAngle = +b.angle;
	if (aAngle !== bAngle) return aAngle - bAngle;else return !a.begin && b.begin ? -1 : a.begin && !b.begin ? 1 : 0;
}

var SegList = (function () {
	function SegList() {
		_classCallCheck(this, SegList);

		this.head = null;
		this.tail = null;
	}

	SegList.prototype.append = function append(seg) {
		// console.log('APPEND: '+seg.id_);
		if (seg.listGen_ === currentListGen) {
			seg = seg.clone();
			// console.log(' NEW ID => '+seg.id_)
		}
		seg.listGen_ = currentListGen;
		seg.next = seg.prev = null;
		if (this.head == null && this.tail == null) {
			this.head = this.tail = seg;
			// console.log('  ONLY NODE: '+seg.id_);
		} else {
				ASSERT(seg != this.head && seg != this.tail);
				// console.log('  TAIL '+this.tail.id_+' => '+seg.id_);
				this.tail.next = seg;
				seg.prev = this.tail;
				this.tail = seg;
			}
		// this.check();
	};

	SegList.prototype.remove = function remove(seg) {
		if (seg === this.tail) this.tail = seg.prev;
		if (seg === this.head) this.head = seg.next;
		if (seg.next) seg.next.prev = seg.prev;
		if (seg.prev) seg.prev.next = seg.next;
		seg.next = seg.prev = null;
	};

	SegList.prototype.empty = function empty() {
		return !this.head;
	};

	SegList.prototype.insertBefore = function insertBefore(seg, other) {
		// console.log('INSERT_BEFORE: '+seg.id_+', '+other.id_);
		if (other.listGen_ === currentListGen) {
			other = other.clone();
			// console.log('  NEW ID => '+other.id_);
		}
		other.listGen_ = currentListGen;
		other.next = other.prev = null;
		ASSERT(seg != null);
		if (this.empty() || seg == null) {
			return this.append(other);
		}
		// console.log('  BETWEEN: '+(!seg.prev ? 'nothing' : seg.prev.id_)+' AND: '+seg.id_);

		other.prev = seg.prev;
		other.next = seg;
		seg.prev = other;
		if (other.prev) {
			other.prev.next = other;
		}
		other.next.prev = other;
		if (seg === this.head) {
			this.head = other;
		}
		// this.check();
	};

	SegList.prototype.clear = function clear(unlink) {
		while (this.head != null) {
			var next = this.head.next;

			this.head.prev = this.head.next = null;
			this.head = next;
		}
		this.head = this.tail = null;
	};

	SegList.prototype.toString = function toString() {
		var r = [];
		for (var n = this.head; n != null; n = n.next) {
			r.push('[' + n.id_ + ']');
			if (n.next === this.head) {
				debugger;
				document.body.innerHTML += 'BAD';
			}
		}
		return '[' + r.join(' ') + ']';
	};

	SegList.prototype.check = function check() {
		// console.log(this.toString());
		var seen = {};
		ASSERT(this.head == null === (this.tail == null));
		ASSERT(this.head.prev == null);
		ASSERT(this.tail.next == null);

		for (var n = this.head; n != null; n = n.next) {

			if (n.prev) ASSERT(n.prev.next === n);else ASSERT(n === this.head);

			if (n.next) ASSERT(n.next.prev === n);else ASSERT(n === this.tail);
			ASSERT(!(n.id_ in seen));
			seen[n.id_] = true;
		}
	};

	return SegList;
})();

var SegPoint = function SegPoint(pos) {
	_classCallCheck(this, SegPoint);

	this.x = pos.x;
	this.y = pos.y;
	this.pos = pos;
	this.begin = false;
	this.segment = null;
	this.angle = 0.0;
};

// @TODO: support camera explicitly.

var VisTracker = (function () {
	function VisTracker() {
		_classCallCheck(this, VisTracker);

		this.segments = [];
		this.points = [];
		this.open = new SegList();
		this.center = new Vec2(0.0, 0.0);
		this.outXs = [];
		this.outYs = [];
	}

	VisTracker.prototype.setSegments = function setSegments(segs) {
		this.segments.length = 0;
		this.points.length = 0;
		// this.open.clear();
		// this.outXs.length = 0;
		// this.outYs.length = 0;
		for (var i = 0; i < segs.length; ++i) {
			this.addSegment(segs[i].start, segs[i].end);
		}
	};

	VisTracker.prototype.addSegment = function addSegment(start, end) {
		var sp = new SegPoint(start);
		var ep = new SegPoint(end);
		this.segments.push(new VisSegment(sp, ep));
		this.points.push(sp, ep);
	};

	VisTracker.prototype.setCenter = function setCenter(_ref2) {
		var x = _ref2.x;
		var y = _ref2.y;

		this.center.set(x, y);
		for (var i = 0; i < this.segments.length; ++i) {
			var seg = this.segments[i];
			var dx = 0.5 * (seg.start.x + seg.end.x) - x;
			var dy = 0.5 * (seg.start.y + seg.end.y) - y;
			seg.d = dx * dx + dy * dy;
			seg.start.angle = Math.atan2(seg.start.y - y, seg.start.x - x);
			seg.end.angle = Math.atan2(seg.end.y - y, seg.end.x - x);
			var delta = seg.end.angle - seg.start.angle;
			if (delta <= -Math.PI) {
				delta += 2 * Math.PI;
			}
			if (delta > Math.PI) {
				delta -= 2 * Math.PI;
			}
			seg.start.begin = delta > 0.0;
			seg.end.begin = !seg.start.begin;
		}
	};

	VisTracker.prototype.sweep = function sweep() {
		var maxAngle = arguments.length <= 0 || arguments[0] === undefined ? 999 : arguments[0];

		++currentListGen;
		this.outXs.length = 0;
		this.outYs.length = 0;
		this.points.sort(pointSorter);
		this.open.clear();
		var beginAngle = 0;
		for (var pass = 0; pass < 2; ++pass) {
			for (var ep = 0, epl = this.points.length; ep < epl; ++ep) {
				var p = this.points[ep];
				if (pass === 1 && p.angle > maxAngle) {
					break;
				}
				var currentOld = this.open.head;
				if (p.begin) {
					var node = this.open.head;
					while (node != null && inFrontOf(p.segment, node, this.center)) {
						node = node.next;
					}
					if (node == null) {
						this.open.append(p.segment);
					} else {
						this.open.insertBefore(node, p.segment);
					}
					this.open.check();
				} else {
					this.open.remove(p.segment);
				}

				var currentNew = this.open.head;
				if (currentOld != currentNew) {
					if (pass === 1) {
						this.addTri_(beginAngle, p.angle, currentOld);
					}
					beginAngle = p.angle;
				}
			}
		}
	};

	VisTracker.prototype.addTri_ = function addTri_(a1, a2, segment) {
		var centerX = +this.center.x,
		    centerY = +this.center.y;
		var p1x = centerX,
		    p1y = +centerY;
		var p2x = p1x + Math.cos(a1),
		    p2y = p1y + Math.sin(a1);
		var p3x = 0.0,
		    p3y = 0.0;
		var p4x = 0.0,
		    p4y = 0.0;

		if (segment) {
			p3x = +segment.start.x;
			p3y = +segment.start.y;
			p4x = +segment.end.x;
			p4y = +segment.end.y;
		} else {
			p3x = centerX + Math.cos(a1) * 10000;
			p3y = centerY + Math.sin(a1) * 10000;
			p4x = centerX + Math.cos(a2) * 10000;
			p4y = centerY + Math.sin(a2) * 10000;
		}

		var _lineIntersection = lineIntersection(p3x, p3y, p4x, p4y, p1x, p1y, p2x, p2y);

		var xBegin = _lineIntersection.x;
		var yBegin = _lineIntersection.y;

		p2x = centerX + Math.cos(a2);
		p2y = centerY + Math.sin(a2);

		var _lineIntersection2 = lineIntersection(p3x, p3y, p4x, p4y, p1x, p1y, p2x, p2y);

		var xEnd = _lineIntersection2.x;
		var yEnd = _lineIntersection2.y;

		/*
  		let d21x = p2x-p1x, d21y = p2y-p1y;
  		let d31x = p3x-p1x, d31y = p3y-p1y;
  		let d43x = p4x-p3x, d43y = p4y-p3y;
  
  		let s = (d21x*d31y - d21y*d31x) / (d21y*d43x - d21x*d43y);
  		let xBegin = p3x + s * d43x;
  		let yBegin = p3y + s * d43y;
  
  		p2x = centerX + Math.cos(a2);
  		p2y = centerY + Math.sin(a2);
  
  		d21x = p2x-p1x;
  		d21y = p2y-p1y;
  		s = (d21x*d31y - d21y*d31x) / (d21y*d43x - d21x*d43y);
  
  		let xEnd = p3x + s * d43x;
  		let yEnd = p3y + s * d43y;
  
  		this.outXs.push(xEnd);
  		this.outYs.push(yEnd);*/

		this.outXs.push(xBegin, xEnd);
		this.outYs.push(yBegin, yEnd);
	};

	return VisTracker;
})();

exports.VisTracker = VisTracker;

},{"./Vec2":153,"./debug":161,"./math":175}],173:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Vec2 = require('./vec2');
var math = require('./math');

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var drawing = require('./drawing');

var LineSegment = (function () {
	function LineSegment(start, end) {
		var flags = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

		_classCallCheck(this, LineSegment);

		this.start = start;
		this.end = end;
		this.flags = flags | 0;
	}

	LineSegment.prototype.normal = function normal() {
		// @HACK: seg is broken.
		var idx = this.start.x - this.end.x;
		var idy = this.start.y - this.end.y;
		var px = -idy,
		    py = idx;
		var il = 1.0 / (Math.sqrt(px * px + py * py) + 1e-37);
		return Vec2.temp(px * il, py * il);
	};

	LineSegment.prototype.closestPoint = function closestPoint(out, _ref) {
		var x = _ref.x;
		var y = _ref.y;

		var segX = this.end.x - this.start.x;
		var segY = this.end.y - this.start.y;

		var fx = x - this.start.x;
		var fy = y - this.start.y;

		var proj = segX * fx + segY * fy;
		var sdot = segX * segX + segY * segY;
		if (out) {
			if (proj <= 0) {
				out.x = this.start.x;
				out.y = this.start.y;
			} else if (proj >= sdot) {
				out.x = this.end.x;
				out.y = this.end.y;
			} else {
				var amount = proj / sdot;
				out.x = this.start.x + amount * segX;
				out.y = this.start.y + amount * segY;
			}
		}
		if (this.flags & LineSegment.DoubleSided) return false;
		return fx * -segY + fy * segX < 0;
	};

	LineSegment.prototype.getClosestPoint = function getClosestPoint(out, point) {
		if (!out) out = Vec2.temp(0.0, 0.0);
		this.closestPoint(out, point);
		return out;
	};

	LineSegment.prototype.debugRender = function debugRender(dbgCtx) {
		drawing.drawLine(dbgCtx, this.start.x, this.start.y, this.end.x, this.end.y, { endpoints: true });
		// drawing.drawBox(dbgCtx, this.start.x, this.start.y);
		// drawing.drawBox(dbgCtx, this.end.x, this.end.y);
		var delta = this.start.to(this.end);
		var norm = delta.perp().normalize();
		var mx = (this.start.x + this.end.x) * 0.5;
		var my = (this.start.y + this.end.y) * 0.5;
		drawing.drawLine(dbgCtx, mx, my, mx + 4 * norm.x, my + 4 * norm.y);
	};

	LineSegment.prototype.raycast = function raycast(outPos, outDir, rayPos, rayDir, size) {
		var bgnHit = math.raycastTimePoint(rayPos, rayDir, this.start, Vec2.ZERO, size);
		var endHit = math.raycastTimePoint(rayPos, rayDir, this.end, Vec2.ZERO, size);
		var midHit = math.raycastTimeLine(rayPos, rayDir, this.start, this.end, size);

		var hit = Math.min(Math.min(bgnHit, midHit), endHit);
		if (0 <= hit && hit <= 1) {
			var rayPoint = Vec2.temp(rayPos.x + hit * rayDir.x, rayPos.y + hit * rayDir.y);
			if (size > 0) {
				var closest = this.getClosestPoint(Vec2.temp(0.0, 0.0), rayPoint);
				var dx = rayPoint.x - closest.x;
				var dy = rayPoint.y - closest.y;
				var il = 1.0 / (Math.sqrt(dx * dx + dy * dy) + 1e-37);
				dx *= il;
				dy *= il;
				outPos.copy(closest);
				outDir.set(dx, dy);
			} else {
				var nx = -(this.end.y - this.start.y);
				var ny = this.end.x - this.start.x;
				var il = 1.0 / (Math.sqrt(nx * nx + ny * ny) + 1e-37);
				nx *= il;
				ny *= il;
				if (nx * rayDir.x + ny * rayDir.y > 0) {
					nx = -nx;
					ny = -ny;
				}
				outPos.copy(rayPos);
				outDir.set(nx, ny);
			}
		}
		return hit;
	};

	return LineSegment;
})();

LineSegment.Flags = {
	None: 0,
	DoubleSided: 1 << 0
};

// Transparent: (1 << 1),
// Nonspatial: (1 << 2),
module.exports = LineSegment;

},{"./debug":161,"./drawing":162,"./math":175,"./vec2":182}],174:[function(require,module,exports){
'use strict';

window.TIME_FUNCTIONS = false;

window.onload = function () {
	var GameRunner = require('./game_runner');
	window.gameRunner = new GameRunner(document.getElementById('screen'));
	window.gameRunner.start();
};

},{"./game_runner":166}],175:[function(require,module,exports){
'use strict';

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var EPSILON = 0.0001;
var DEG2RAD = Math.PI / 180.0;
var RAD2DEG = 180.0 / Math.PI;

exports.EPSILON = EPSILON;
exports.DEG2RAD = DEG2RAD;
exports.RAD2DEG = RAD2DEG;

exports.toRadians = toRadians;
function toRadians(v) {
	return v * DEG2RAD;
}

exports.toDegrees = toDegrees;
function toDegrees(v) {
	return v * RAD2DEG;
}

exports.clamp = clamp;
function clamp(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}

exports.saturate = saturate;
function saturate(v) {
	return clamp(v, 0.0, 1.0);
}

exports.lerp = lerp;
function lerp(a, b, t) {
	var s = saturate(t);return a * (1.0 - s) + b * s;
}

exports.uLerp = uLerp;
function uLerp(a, b, t) {
	return a + (b - a) * t;
}

exports.square = square;
function square(v) {
	return v * v;
}

exports.cube = cube;
function cube(v) {
	return v * v * v;
}

exports.approxZero = approxZero;
function approxZero(v) {
	var eps = arguments.length <= 1 || arguments[1] === undefined ? EPSILON : arguments[1];
	return v <= eps || v >= -eps;
}

exports.approxEqual = approxEqual;
function approxEqual(a, b) {
	var eps = arguments.length <= 2 || arguments[2] === undefined ? EPSILON : arguments[2];
	return Math.abs(a - b) <= eps * Math.max(1.0, Math.abs(a), Math.abs(b));
}

exports.safeDiv = safeDiv;
function safeDiv(a, b, r) {
	return b === 0.0 ? r : a / b;
}

exports.safeDiv0 = safeDiv0;
function safeDiv0(a, b) {
	return safeDiv(a, b, 0.0);
}

exports.safeDiv1 = safeDiv1;
function safeDiv1(a, b) {
	return safeDiv(a, b, 1.0);
}

exports.signOf = signOf;
function signOf(v) {
	return v < 0 ? -1 : v > 0 ? 1 : 0;
}

exports.smoothStep01 = smoothStep01;
function smoothStep01(t) {
	return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

exports.linearStep = linearStep;
function linearStep(a, b, t) {
	return saturate(safeDiv0(t - a, b - a));
}

exports.smoothStep = smoothStep;
function smoothStep(a, b, t) {
	return smoothStep01(linearStep(a, b, t));
}

exports.repeat = repeat;
function repeat(t, len) {
	return t - Math.floor(t / len) * len;
}

exports.pingpong = pingpong;
function pingpong(t, len) {
	return len - Math.abs(repeat(t, len * 2) - len);
}

exports.length2D = length2D;
function length2D(x, y) {
	return Math.sqrt(x * x + y * y);
}

exports.length3D = length3D;
function length3D(x, y, z) {
	return Math.sqrt(x * x + y * y + z * z);
}

exports.distance2D = distance2D;
function distance2D(x0, y0, x1, y1) {
	var dx = x0 - x1,
	    dy = y0 - y1;
	return Math.sqrt(dx * dx + dy * dy);
};

exports.distance3D = distance3D;
function distance3D(x0, y0, z0, x1, y1, z1) {
	var dx = x0 - x1,
	    dy = y0 - y1,
	    dz = z0 - z1;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

exports.normLen2D = normLen2D;
function normLen2D(x, y) {
	var l = x * x + y * y;
	return l < EPSILON ? 1.0 : Math.sqrt(l);
};

exports.safeInvLen = exports.safeInverseLength = safeInvLen;
function safeInvLen(x, y) {
	return 1.0 / (Math.sqrt(x * x + y * y) + 1e-37);
};

exports.normLen3D = normLen3D;
function normLen3D(x, y, z) {
	var l = x * x + y * y + z * z;
	return l < EPSILON ? 1.0 : Math.sqrt(l);
};

exports.lerpColors = lerpColors;
function lerpColors(c0, c1, t) {
	var supportAlpha = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

	var b0 = (c0 >>> 16 & 0xff) / 255.0;
	var g0 = (c0 >>> 8 & 0xff) / 255.0;
	var r0 = (c0 >>> 0 & 0xff) / 255.0;
	var a0 = (c0 >>> 24 & 0xff) / 255.0;

	var b1 = (c1 >>> 16 & 0xff) / 255.0;
	var g1 = (c1 >>> 8 & 0xff) / 255.0;
	var r1 = (c1 >>> 0 & 0xff) / 255.0;
	var a1 = (c1 >>> 24 & 0xff) / 255.0;

	var rr = lerp(r0, r1, t) * 255 | 0;
	var rg = lerp(g0, g1, t) * 255 | 0;
	var rb = lerp(b0, b1, t) * 255 | 0;
	var ra = supportAlpha ? lerp(a0, a1, t) * 255 | 0 : 0xff;

	return ra << 24 | rb << 16 | rg << 8 | rr;
};

exports.buildPixelRGBA = buildPixelRGBA;
function buildPixelRGBA(r, g, b, a) {
	r = r & 0xff;g = g & 0xff;b = b & 0xff;a = a & 0xff;
	return a << 24 | b << 16 | g << 8 | r;
}

exports.buildPixelRGB = buildPixelRGB;
function buildPixelRGB(r, g, b) {
	r = r & 0xff;g = g & 0xff;b = b & 0xff;
	return b << 16 | g << 8 | r;
}

exports.gammaToLinear32 = gammaToLinear32;
function gammaToLinear32(pixel) {
	var b = (pixel >>> 16 & 0xff) / 255.0;
	var g = (pixel >>> 8 & 0xff) / 255.0;
	var r = (pixel >>> 0 & 0xff) / 255.0;

	var rr = r * r * 255 | 0;
	var rg = g * g * 255 | 0;
	var rb = b * b * 255 | 0;

	return pixel & 0xff000000 | rb << 16 | rg << 8 | rr;
}

exports.changeSaturation = changeSaturation;
function changeSaturation(pixel, level, gamma) {
	var r = (pixel >>> 16 & 0xff) / 255.0;
	var g = (pixel >>> 8 & 0xff) / 255.0;
	var b = (pixel >>> 0 & 0xff) / 255.0;
	var a = pixel & 0xff000000;

	if (gamma) {
		r *= r;
		g *= g;
		b *= b;
	}

	var avg = 1.0 / 3.0 * (r + g + b);

	var dr = r - avg;
	var dg = g - avg;
	var db = b - avg;

	var rr = avg + level * dr;
	var rg = avg + level * dg;
	var rb = avg + level * db;

	if (gamma) {
		rr = Math.sqrt(rr);
		rg = Math.sqrt(rg);
		rb = Math.sqrt(rb);
	}

	var pr = rr * 255.0 | 0;
	var pg = rg * 255.0 | 0;
	var pb = rb * 255.0 | 0;

	return pixel & 0xff000000 | pr << 16 | pg << 8 | pb;
}

exports.raycastTimePoint = raycastTimePoint;
function raycastTimePoint(pos0, dir0, pos1, dir1, Size) {
	var dirDX = dir0.x - dir1.x,
	    dirDY = dir0.y - dir1.y;
	var posDX = pos0.x - pos1.x,
	    posDY = pos0.y - pos1.y;

	var dirMag = dirDX * dirDX + dirDY * dirDY;
	var ref = 2.0 * (posDX * dirDX + posDY * dirDY);
	var d2d = posDX * posDX + posDY * posDY - Size * Size;

	var eps = 0.0001;

	if (d2d <= 0) return -1;
	if (Math.abs(dirMag) < eps) return 2;

	if (ref >= 0) return 2;

	var t = ref * ref - 4 * dirMag * d2d;
	if (t < 0) return 2;

	var s = -0.5 * (ref - Math.sqrt(t));
	return Math.min(s / dirMag, d2d / s);
};

exports.raycastTimeLine = raycastTimeLine;
function raycastTimeLine(rayPos, rayDir, p0, p1, size) {
	var segDirX = p1.x - p0.x,
	    segDirY = p1.y - p0.y;
	var segLen = Math.sqrt(segDirX * segDirX + segDirY * segDirY);

	ASSERT(segLen !== 0);

	segDirX /= segLen;
	segDirY /= segLen;

	var segNormX = -segDirY;
	var segNormY = segDirX;

	var fx = rayPos.x - p0.x;
	var fy = rayPos.y - p0.y;

	var pnf = segNormX * fx + segNormY * fy;
	var pnr = segNormX * rayDir.x + segNormY * rayDir.y;

	var fsp = segDirX * fx + segDirY * fy;

	var dist = Math.abs(pnf) - size;

	if (dist < 0) {
		return fsp < 0 || fsp > segLen ? 2 : -1;
	}

	if (pnf * pnr >= 0) {
		return 2;
	}

	var time = dist / Math.abs(pnr);
	var segray = segDirX * rayDir.x + segDirY * rayDir.y;
	var t = fsp + time * segray;

	return t < 0 || t > segLen ? 2 : time;
}

// hm...
exports.Vec2 = require('./vec2');

exports.betweenI = betweenI;
function betweenI(n, lo, hi) {
	return n >= lo && n <= hi;
}

exports.betweenX = exports.between = betweenX;
function betweenX(n, lo, hi) {
	return n > lo && n < hi;
}

exports.betweenXI = betweenXI;
function betweenXI(n, lo, hi) {
	return n > lo && n <= hi;
}

exports.betweenIX = betweenIX;
function betweenIX(n, lo, hi) {
	return n >= lo && n < hi;
}

},{"./debug":161,"./vec2":182}],176:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Entity = require('./entity');
var Input = require('./input');
var drawing = require('./drawing');
var Consts = require('./constants');
var Clock = require('./clock');

var _require = require('./rand');

var RNG = _require.RNG;

var math = require('./math');

var Particle = (function (_Entity) {
	_inherits(Particle, _Entity);

	function Particle(game) {
		var x = arguments.length <= 1 || arguments[1] === undefined ? 0.0 : arguments[1];
		var y = arguments.length <= 2 || arguments[2] === undefined ? 0.0 : arguments[2];
		var z = arguments.length <= 3 || arguments[3] === undefined ? 0.0 : arguments[3];

		_classCallCheck(this, Particle);

		var _this = _possibleConstructorReturn(this, _Entity.call(this, game, x, y, z));

		_this.collidesWithEntities = false;
		_this.collidesWithPlayer = false;
		_this.radius = 1;
		_this.drag.set(1, 1);

		_this.hasZ = true;
		_this.zDrag = 0.5;
		_this.color = 0xff000000;
		_this.life = RNG.betweenF(0.4, 0.8);
		do {
			_this.vel.x = RNG.betweenF(-1.0, 1.0);
			_this.vel.y = RNG.betweenF(-1.0, 1.0);
		} while (_this.vel.lenSq() > 1.0);
		_this.vel.x *= 60;
		_this.vel.y *= 60;
		_this.zAcc = -60;
		return _this;
	}

	Particle.prototype.update = function update(dt) {
		_Entity.prototype.update.call(this, dt);
		this.life -= dt;
		if (this.life <= 0) {
			this.enabled = false;
		}
	};

	Particle.prototype.postUpdate = function postUpdate(dt) {
		this.acc.set(0, 0);
		this.zAcc = -60;
	};

	Particle.prototype.render = function render(ctx, buffer, minX, minY) {
		var width = buffer.width;
		var height = buffer.height;

		var x = Math.round(this.pos.x - minX);
		var y = Math.round(this.pos.y - minY); //-this.zPos); // no visual representation for z
		if (x >>> 0 >= width) return;
		if (y >>> 0 >= height) return;

		var _buffer$getPixbuf = buffer.getPixbuf();

		var pixels = _buffer$getPixbuf.pixels;

		var c = this.color >>> 0;
		if (this.radius < 1.0) {
			pixels[x + y * width] = c;
			return;
		}
		var x0 = math.clamp(Math.round(x - this.radius), 0, width - 1) >>> 0;
		var x1 = math.clamp(Math.round(x + this.radius), 0, width - 1) >>> 0;
		var y0 = math.clamp(Math.round(y - this.radius), 0, height - 1) >>> 0;
		var y1 = math.clamp(Math.round(y + this.radius), 0, height - 1) >>> 0;
		for (var yy = y0; yy < y1; ++yy) {
			var row = yy * width >>> 0;
			for (var xx = x0; xx < x1; ++xx) {
				pixels[xx + row] = c;
			}
		}
	};

	return Particle;
})(Entity);

module.exports = Particle;

},{"./clock":158,"./constants":160,"./drawing":162,"./entity":164,"./input":169,"./math":175,"./rand":179}],177:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./util');

var createCanvas = _require.createCanvas;

var math = require('./math');

var PixelBuffer = (function () {
	function PixelBuffer(width, height) {
		var trackBounds = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

		_classCallCheck(this, PixelBuffer);

		this.width = width;
		this.height = height;
		this.canvas = createCanvas(this.width, this.height);
		this.context = this.canvas.getContext('2d');
		this.imageData = this.context.createImageData(this.width, this.height);
		this.pixels = new Uint32Array(this.imageData.data.buffer);
		this.bounds = { minX: width, minY: height, maxX: 0, maxY: 0 }; // dirty rect
		this.trackBounds = trackBounds;
		this.pixelsDirty = false;
	}

	PixelBuffer.prototype.reset = function reset() {
		this.resetBounds();
		for (var i = 0, pix = this.pixels, len = pix.length; i < len; ++i) {
			pix[i] = 0;
		}
	};

	PixelBuffer.prototype.refreshImageData = function refreshImageData() {
		this.imageData = this.context.getImageData(0, 0, this.width, this.height);
		this.pixels = new Uint32Array(this.imageData.data.buffer);
	};

	PixelBuffer.prototype.resetBounds = function resetBounds() {
		this.bounds.minX = this.width;
		this.bounds.minY = this.height;
		this.bounds.maxX = 0;
		this.bounds.maxY = 0;
	};

	PixelBuffer.prototype.update = function update() {
		var clear = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

		if (clear) this.context.clearRect(0, 0, this.width, this.height);
		this.context.putImageData(this.imageData, 0, 0);
	};

	PixelBuffer.prototype.putPixel = function putPixel(x, y, v) {
		if (x >>> 0 < this.width && y >>> 0 < this.height) {
			this.pixelsDirty = true;
			this.pixels[x + y * this.width] = v;
			if (this.trackBounds) {
				this.bounds.minX = Math.min(this.bounds.minX, x);
				this.bounds.maxX = Math.max(this.bounds.maxX, x);
				this.bounds.minY = Math.min(this.bounds.minY, y);
				this.bounds.maxY = Math.max(this.bounds.maxY, y);
			}
		}
	};

	PixelBuffer.prototype.getPixbuf = function getPixbuf() {
		this.pixelsDirty = true;
		return this;
	};

	PixelBuffer.prototype.inBounds = function inBounds(x, y) {
		return x >>> 0 < this.width && y >>> 0 < this.height;
	};

	PixelBuffer.prototype.getPixel = function getPixel(x, y) {
		if (x >>> 0 < this.width && y >>> 0 < this.height) {
			return this.pixels[x + y * this.width];
		}
		return 0;
	};

	PixelBuffer.prototype.bresenham = function bresenham(x0, y0, x1, y1, color) {
		this.pixelsDirty = true;
		x0 = x0 | 0;
		y0 = y0 | 0;
		x1 = x1 | 0;
		y1 = y1 | 0;
		color = color | 0;
		var dx = Math.abs(x1 - x0) | 0;
		var dy = Math.abs(y1 - y0) | 0;
		var sx = x0 < x1 ? 1 : -1;
		var sy = y0 < y1 ? 1 : -1;
		var err = dx - dy;
		var pixels = this.pixels;
		var width = this.width >>> 0;
		var height = this.height >>> 0;
		if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
			pixels[x0 + y0 * width] = color;
		} else if (x1 < 0 || x1 >= width || y1 < 0 && y1 >= height) {
			return;
		}

		this.bounds.minX = Math.min(this.bounds.minX, x0, x1);
		this.bounds.maxX = Math.max(this.bounds.maxX, x0, x1);
		this.bounds.minY = Math.min(this.bounds.minY, y0, y1);
		this.bounds.maxY = Math.max(this.bounds.maxY, y0, y1);

		pixels[x0 + y0 * width] = color;
		while (x0 !== x1 && y0 !== y1) {
			var e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				x0 += sx;
				if (x0 < 0 || x0 > width) {
					break;
				}
			}
			if (e2 < dx) {
				err += dx;
				y0 += sy;
				if (y0 < 0 || y0 > height) {
					break;
				}
			}
			pixels[x0 + y0 * width] = color;
		}
	};

	PixelBuffer.prototype.withReplacedColors = function withReplacedColors(replacements) {
		var pb = new PixelBuffer(this.width, this.height);
		var pbpix = pb.pixels;
		var ownPix = this.pixels;
		for (var i = 0; i < ownPix.length; ++i) {
			var pixel = ownPix[i] >>> 0;
			pbpix[i] = pixel;
			for (var r = 0; r < replacements.length; ++r) {
				var search = replacements[r][0] >>> 0;
				if (pixel === search) {
					pbpix[i] = replacements[r][1] >>> 0;
					break;
				}
			}
		}
		pb.update();
		return pb;
	};

	return PixelBuffer;
})();

PixelBuffer.fromImage = function (image) {
	var pb = new PixelBuffer(image.width, image.height);
	pb.context.drawImage(image, 0, 0);
	pb.refreshImageData();
	return pb;
};

PixelBuffer.getRotatedTiles = function (image, tileSize) {
	var rotations = arguments.length <= 2 || arguments[2] === undefined ? 16 : arguments[2];

	var pb = PixelBuffer.fromImage(image);
	var result = new PixelBuffer(pb.width, pb.height * rotations);
	var numTiles = Math.floor(image.width / tileSize);
	for (var rot = 0; rot < rotations; ++rot) {
		var angle = rot / rotations * 2 * Math.PI;
		var sa = Math.sin(angle);
		var ca = Math.cos(angle);
		var yOffset = rot * tileSize;
		for (var tile = 0; tile < numTiles; ++tile) {
			var xOffset = tile * tileSize;
			for (var j = 0; j < tileSize; ++j) {
				for (var i = 0; i < tileSize; ++i) {
					var px = Math.floor(ca * (i - tileSize / 2) + sa * (j - tileSize / 2) + tileSize / 2);
					var py = Math.floor(ca * (j - tileSize / 2) - sa * (i - tileSize / 2) + tileSize / 2);
					px = math.clamp(px, 0, tileSize - 1);
					py = math.clamp(py, 0, tileSize - 1);
					result.putPixel(xOffset + i, yOffset + j, pb.getPixel(xOffset + px, py));
				}
			}
		}
	}
	result.update();
	return result;
};

module.exports = PixelBuffer;

},{"./math":175,"./util":181}],178:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('./tweens');

var Tween = _require.Tween;
var TweenGroup = _require.TweenGroup;

var Entity = require('./entity');
var Input = require('./input');

var _require2 = require('./rand');

var RNG = _require2.RNG;

var drawing = require('./drawing');
var Consts = require('./constants');
var Clock = require('./clock');
var Bullet = require('./bullet');
var Gore = require('./gore');
var Blood = require('./blood');
var Sounds = require('./audio');

var Player = (function (_Entity) {
	_inherits(Player, _Entity);

	function Player(game) {
		_classCallCheck(this, Player);

		var _this = _possibleConstructorReturn(this, _Entity.call(this, game));

		_this.radius = 5.0;
		_this.normalizeAccel = true;
		_this.speed = 20 * 20;
		_this.drag.set(5, 5);
		_this.walking = false;
		_this.animProgress = 0.0;
		_this.health = 50;
		_this.maxHealth = 50;
		return _this;
	}

	Player.prototype.damage = function damage(amt, pos, vel) {
		var gib = new Gore(this.game, pos.x, pos.y);
		gib.vel.scale(0.1).addScaled(vel, 0.4);
		this.vel.addScaled(vel, 0.3);
		this.game.addEntity(gib);
		this.health -= amt;
		if (this.health <= 0) {
			Sounds.play('die');
			this.game.killPlayer();
		} else {
			Sounds.play('ouch');
		}
	};

	Player.prototype.think = function think(dt) {
		if (this.walking) {
			this.animProgress += Math.min(this.lastPos.distance(this.pos) / 10, 1);
		}
		var _game$mouse = this.game.mouse;
		var mwx = _game$mouse.x;
		var mwy = _game$mouse.y;

		var fy = mwy - this.pos.y;
		var fx = mwx - this.pos.x;
		var len = Math.sqrt(fx * fx + fy * fy);

		if (this.health > 0) {
			if (Input.mouse.isDown && len > 1 && !Input.keyboard.isDown('space')) {
				this.acc.set((mwx - this.pos.x) / Consts.TileSize, (mwy - this.pos.y) / Consts.TileSize);
				this.walking = true;
			} else {
				this.walking = false;
				this.animProgress = 0.0;
				this.acc.set(0.0, 0.0);
			}

			this.heading = Math.atan2(fy, fx);
			if (Input.mouse.wasPressed() && Input.keyboard.isDown('space')) {
				var bullet = new Bullet(this.game, this, fx / len, fy / len, 10);
				this.game.addEntity(bullet);
			}
		}
		if (this.health != this.maxHealth) {
			if (RNG.xChanceInY(this.maxHealth - this.health, this.maxHealth)) {
				var blood = new Blood(this.game, this.pos.x, this.pos.y);
				blood.zPos = 5;
				blood.vel.x *= 0.05;blood.vel.x += this.vel.x;
				blood.vel.y *= 0.05;blood.vel.y += this.vel.y;
				this.game.addEntity(blood);
			}
			if (RNG.oneChanceIn(60)) {
				this.health = Math.min(this.health + 1, this.maxHealth);
			}
		}
	};

	Player.prototype.render = function render(layer, pix, minX, minY) {
		if (this.health <= 0) {
			layer.context.drawImage(this.game.assets.dead, 0, 0, 32, 16, Math.round(this.pos.x - 16), Math.round(this.pos.y - 8), 32, 16);
			layer.context.drawImage(this.game.assets.dead, 0, 16, 32, 16, Math.round(this.pos.x - 16), Math.round(this.pos.y - 8), 32, 16);
			return;
		}
		var rotation = Math.round(this.heading / (Math.PI * 2) * 16) & 15;
		var anim = (this.walking ? Math.floor(this.animProgress % 7) : 0) + 0;
		layer.context.strokeStyle = 'green';
		layer.context.drawImage(this.game.assets.playerRotations.canvas, 16 * anim, 16 * rotation, 16, 16, Math.round(this.pos.x - 8), Math.round(this.pos.y - 8), 16, 16);

		// drawing.drawCircle(this.game.debugContext, this.pos.x, this.pos.y, this.radius);
		//(layer.context, this.pos.x-mx, this.pos.y-my, this.radius);
	};

	return Player;
})(Entity);

module.exports = Player;

},{"./audio":154,"./blood":155,"./bullet":156,"./clock":158,"./constants":160,"./drawing":162,"./entity":164,"./gore":168,"./input":169,"./rand":179,"./tweens":180}],179:[function(require,module,exports){
'use strict';

var PCGRandom = require('pcg-random');
var quickNoise = require('quick-noise-js');

var RandUtils = {
	nextInt: function nextInt(a) {
		return this.integer(a);
	},
	random: function random() {
		return this.number();
	},
	upTo: function upTo(a) {
		return this.integer(a);
	},
	upToI: function upToI(a) {
		return this.upTo(a + 1);
	},
	// inclusive
	upToF: function upToF(a) {
		return this.number() * a;
	},
	betweenF: function betweenF(min, max) {
		return min + this.number() * (max - min);
	},
	betweenI: function betweenI(min, max) {
		return min + this.upTo(max - min + 1);
	},
	betweenX: function betweenX(min, max) {
		return min + this.upTo(max - min);
	},
	oneChanceIn: function oneChanceIn(n) {
		return this.upTo(n) === 0;
	},
	coinflip: function coinflip() {
		return this.oneChanceIn(2);
	},
	probability: function probability(n) {
		return this.number() < n;
	},
	xChanceInY: function xChanceInY(x, y) {
		return this.upTo(y) < x;
	},
	choose: function choose(arr) {
		if (arr.length === 0) {
			console.error("empty array in choose");
			return null;
		}
		return arr[this.upTo(arr.length)];
	},
	round: function round(v) {
		var vi = Math.floor(v);
		return vi + this.probability(v - vi) ? 1 : 0;
	},
	diceRoll: function diceRoll(count, size) {
		if (count <= 0 || size <= 0) return 0;
		var result = count;
		for (var i = 0; i < count; ++i) {
			result += this.upTo(size);
		}
		return result;
	},
	bestRoll: function bestRoll(max, rolls) {
		var best = 0;
		for (var i = 0; i < rolls; ++i) {
			best = Math.max(this.upTo(max), best);
		}
		return best;
	},
	gaussian01: function gaussian01() {
		var u = 0.0,
		    v = 0.0,
		    r = 0.0;
		do {
			u = this.number() * 2.0 - 1.0;
			v = this.number() * 2.0 - 1.0;
			r = u * u + v * v;
		} while (r === 0.0 || r > 1.0);
		var mul = Math.sqrt(-2.0 * Math.log(r) / r);
		return u * mul;
	},
	gaussian: function gaussian(mean, stddev) {
		return this.gaussian01() * stddev + mean;
	},
	uniform: function uniform() {
		var mean = arguments.length <= 0 || arguments[0] === undefined ? 0.0 : arguments[0];
		var halfRange = arguments.length <= 1 || arguments[1] === undefined ? 1.0 : arguments[1];

		return this.number() * (halfRange * 2.0) + (mean - 1.0);
	},
	chooseIndexWeighted: function chooseIndexWeighted(weights) {
		var l = weights.length;
		if (l === 0) {
			console.error("empty array passed to chooseIndexWeighted");
			return -1;
		}
		var sum = 0;
		for (var i = 0; i < l; ++i) {
			sum += weights[i];
		}sum *= this.number();
		for (var i = 0; i < l; ++i) {
			sum -= weights[i];
			if (sum <= 0.0) return i;
		}
		console.error("fell through choice loop", weights);
		return this.upTo(weights.length);
	},
	chooseWeightedFn: function chooseWeightedFn(arr, getWeight) {
		var l = arr.length;
		if (l === 0) {
			console.error("empty array passed to chooseWeightedFn");
			return -1;
		}
		var sum = 0;
		for (var i = 0; i < l; ++i) {
			sum += getWeight(arr[i]);
		}sum *= this.number();
		for (var i = 0; i < l; ++i) {
			sum -= getWeight(arr[i]);
			if (sum <= 0.0) return i;
		}
		console.error("fell through choice loop", arr);
		return this.upTo(arr.length);
	},
	shuffle: function shuffle(arr) {
		for (var i = arr.length - 1; i > 0; --i) {
			var r = this.upToI(i);
			var tmp = arr[r];arr[r] = arr[i];arr[i] = tmp;
		}
		return arr;
	},
	colorBetween: function colorBetween(c0, c1) {
		var a0 = c0 >>> 24;
		var b0 = c0 >>> 16 & 0xff;
		var g0 = c0 >>> 8 & 0xff;
		var r0 = c0 & 0xff;

		var a1 = c1 >>> 24;
		var b1 = c1 >>> 16 & 0xff;
		var g1 = c1 >>> 8 & 0xff;
		var r1 = c1 & 0xff;

		return RNG.betweenI(a0, a1) << 24 | RNG.betweenI(b0, b1) << 16 | RNG.betweenI(g0, g1) << 8 | RNG.betweenI(r0, r1);
	}
};

Object.assign(PCGRandom.prototype, RandUtils);

var RNG = new PCGRandom();
exports.RNG = RNG;
exports.RNGType = PCGRandom;

var perlinNoise = quickNoise.noise;

exports.perlinNoise = perlinNoise;
exports.octaveNoise = octaveNoise;

function octaveNoise(x, y, z) {
	var octaves = arguments.length <= 3 || arguments[3] === undefined ? 3 : arguments[3];
	var persistence = arguments.length <= 4 || arguments[4] === undefined ? 0.5 : arguments[4];

	var total = 0.0;
	var frequency = 1.0;
	var amplitude = 1.0;
	var maxValue = 0.0;
	for (var i = 0; i < octaves; ++i) {
		total += perlinNoise(x * frequency, y * frequency, z * frequency) * amplitude;
		maxValue += amplitude;
		amplitude *= persistence;
		frequency *= 2.0;
	}
	return total / maxValue;
}

},{"pcg-random":7,"quick-noise-js":152}],180:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Math = Math;
var cos = _Math.cos;
var sin = _Math.sin;
var PI = _Math.PI;
var pow = _Math.pow;
var sqrt = _Math.sqrt;

var _require = require('./rand');

var RNG = _require.RNG;

var Promise = require('bluebird');

var HALF_PI = PI * 0.5;
var TWO_PI = PI * 2.0;

var EaseTypeIn = 0;
var EaseTypeOut = 1;
var EaseTypeInOut = 2;
var EaseTypeShake = 3;

exports.EaseType = { In: EaseTypeIn, Out: EaseTypeOut, InOut: EaseTypeInOut, Shake: EaseTypeShake };

function bounceReverse(t) {
	if (t < 1.0 / 2.75) return 7.5625 * t * t;else if (t < 2.0 / 2.75) {
		t -= 1.50 / 2.75;return 7.5625 * t * t + 0.75;
	} else if (t < 2.5 / 2.75) {
		t -= 2.25 / 2.75;return 7.5625 * t * t + 0.9375;
	} else {
		t -= 2.625 / 2.75;return 7.5625 * t * t + 0.984375;
	}
}

function bezier(t, p0, p1, p2, p3) {
	var s = 1.0 - t;
	return s * s * s * p0 + 3.0 * t * s * s * p1 + 3.0 * t * t * s * p2 + t * t * t * p3;
}

function easeLinear(t) {
	return t;
}
function easeQuad(t) {
	return t * t;
}
function easeCubic(t) {
	return t * t * t;
}
function easeQuart(t) {
	return t * t * t * t;
}
function easeQuint(t) {
	return t * t * t * t * t;
}
function easeExpo(t) {
	return pow(2.0, 10.0 * (t - 1.0));
}
function easeSine(t) {
	return -cos(p * HALF_PI) + 1.0;
}
function easeCirc(t) {
	return -(sqrt(1.0 - p * p) - 1.0);
}
function easeBack(t) {
	return p * p * (2.7 * p - 1.7);
}
function easeElastic(t) {
	return -(pow(2.0, 10.0 * (p - 1.0)) * sin((p - 1.075) * TWO_PI / 0.3));
}
function easeBounce(t) {
	return 1.0 - bounceReverse(1.0 - t);
}
function easeZigzag(t) {
	return bezier(t, 0.0, 2.5, -1.5, 1.0);
}
function easeShake(t) {
	return bezier(t, 0.5, 1.22, 1.25, 0.0);
}
function easeRubberband(t) {
	return bezier(t, 0.0, 0.7, 1.5, 1.0);
}

var Easings = exports.Easings = {
	linear: easeLinear,
	quad: easeQuad,
	cubic: easeCubic,
	quart: easeQuart,
	quint: easeQuint,
	expo: easeExpo,
	sine: easeSine,
	circ: easeCirc,
	back: easeBack,
	elastic: easeElastic,
	bounce: easeBounce,
	zigzag: easeZigzag,
	shake: easeShake,
	rubberband: easeRubberband
};

var objects = [];

var Tween = (function () {
	function Tween(object, field, _ref) {
		var end = _ref.end;
		var _ref$start = _ref.start;
		var start = _ref$start === undefined ? object[field] : _ref$start;
		var _ref$duration = _ref.duration;
		var duration = _ref$duration === undefined ? 1.0 : _ref$duration;
		var _ref$easing = _ref.easing;
		var easing = _ref$easing === undefined ? Easings.linear : _ref$easing;
		var _ref$type = _ref.type;
		var type = _ref$type === undefined ? EaseTypeIn : _ref$type;
		var _ref$loop = _ref.loop;
		var loop = _ref$loop === undefined ? false : _ref$loop;
		var _ref$snap = _ref.snap;
		var snap = _ref$snap === undefined ? false : _ref$snap;
		var _ref$enabledField = _ref.enabledField;
		var enabledField = _ref$enabledField === undefined ? '' : _ref$enabledField;
		var _ref$resolveOnFinish = _ref.resolveOnFinish;
		var resolveOnFinish = _ref$resolveOnFinish === undefined ? true : _ref$resolveOnFinish;

		_classCallCheck(this, Tween);

		this.object = object;
		this.field = field;
		this.end = end;
		this.start = start;
		this.duration = duration;
		this.easing = typeof easing === 'string' ? Easings[easing] : easing;
		this.type = type;
		this.looped = loop;
		this.snap = snap;
		this.time = 0.0;
		this.deferred = Promise.pending();
		this.promise = deferred.promise;
		this.object[this.field] = this.start;
		this.finished = true;
	}

	Tween.prototype.update = function update(deltaTime) {
		this.time += deltaTime;
		var time = this.time;
		var duration = this.duration;
		var object = this.object;
		var field = this.field;
		var easing = this.easing;
		var start = this.start;
		var end = this.end;

		if (time > duration && !this.looped) {
			object[field] = this.end;
			if (this.resolveOnFinish) this.deferred.resolve(this.object);
			return true;
		}
		var t = 0.0;
		var progress = time / duration;
		if (this.looped) {
			progress = this.looped === 'pingpong' ? pingpong(progress, 1.0) : progress % 1.0;
		}
		switch (type) {
			case EaseTypeIn:
				t = easing(progress);break;
			case EaseTypeOut:
				t = 1.0 - easing(1.0 - progress);break;
			case EaseTypeInOut:
				t = progress < 0.5 ? easing(progress) : 1.0 - easing(1.0 - progress);break;
			case EaseTypeShake:
				t = easing(progress) * RNG.number();break;
			default:
				console.error("illegal value for type: " + type);t = easing(progress);break;
		}
		var value = start * (1.0 - t) + end * t;
		if (this.snap) {
			value = Math.round(value);
		}
		object[field] = value;
		return false;
	};

	Tween.prototype.complete = function complete() {
		return this.finished || this.enabledField && !this.object[this.enabledField];
	};

	return Tween;
})();

var TweenGroup = (function () {
	function TweenGroup() {
		_classCallCheck(this, TweenGroup);

		this.tweens = [];
		this.resolveQueue_ = [];
	}

	TweenGroup.prototype.add = function add(obj) {
		obj.resolveOnFinish = false;
		this.tweens.push(obj);
		return obj;
	};

	TweenGroup.prototype.update = function update(deltaTime) {
		var tweens = this.tweens;
		var l = tweens.length;
		for (var i = 0; i < l; ++i) {
			tweens[i].update();
		}
		var newLen = tweens.length,
		    j = 0;
		this.resolveQueue_.length = 0;
		for (var i = 0; i < l; ++i) {
			if (tweens[i].complete()) {
				this.resolveQueue_.push(tweens[i]);
			} else {
				this.tweens[j++] = this.tweens[i];
			}
		}
		this.tweens.length = j + Math.max(0, newLen - l);
		for (var i = 0; i < this.resolveQueue_.length; ++i) {
			this.resolveQueue_[i].deferred.resolve(this.resolveQueue_[i].object);
		}
		this.resolveQueue_.length = 0;
	};

	return TweenGroup;
})();

var TweenManager = new TweenGroup();

exports.Tween = Tween;
exports.TweenGroup = TweenGroup;
exports.TweenManager = TweenManager;

},{"./rand":179,"bluebird":1}],181:[function(require,module,exports){
'use strict';

var Promise = require('bluebird');

exports.createCanvas = createCanvas;
function createCanvas(width, height) {
	var result = document.createElement('canvas');
	result.width = width;
	result.height = height;
	return result;
}

exports.createContext2D = createContext2D;
function createContext2D(width, height) {
	var c = createCanvas(width, height);
	return c.getContext('2d');
}

exports.loadImage = loadImage;
function loadImage(src) {
	return new Promise(function (resolve, reject) {
		var image = new Image();
		image.onload = function () {
			resolve(image);
		};
		image.onerror = function (e) {
			console.log(e);
			console.error("Failed to load: " + src);
			reject(e);
		};
		image.src = src;
	});
}

exports.getRequest = getRequest;
function getRequest(src) {
	var preRequest = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', src, true);
		if (preRequest) preRequest(xhr);
		xhr.onload = function () {
			if (xhr.status >= 200 && xhr.status < 400) {
				resolve(xhr);
			} else {
				console.error("request failed");
				reject(xhr);
			}
		};
		xhr.onerror = function (e) {
			console.error(e, xhr);
			reject(xhr);
		};
		xhr.send();
	});
}

exports.loadXML = loadXML;
function loadXML(src) {
	return getRequest(src).then(function (response) {
		return new DOMParser().parseFromString(response.responseText, "application/xml");
	});
}

exports.loadText = loadText;
function loadText(src) {
	return getRequest(src).then(function (response) {
		return response.responseText;
	});
}

exports.loadJSON = loadJSON;
function loadJSON(src) {
	return getRequest(src).then(function (response) {
		return JSON.parse(response.responseText);
	});
}

},{"bluebird":1}],182:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./debug');

var ASSERT = _require.ASSERT;

var Vec2 = (function () {
	function Vec2(x, y) {
		_classCallCheck(this, Vec2);

		this.x = +x || 0.0;this.y = +y || 0.0;
	}

	Vec2.prototype.perp = function perp() {
		return new Vec2(-this.y, this.x);
	};

	Vec2.prototype.to = function to(o) {
		return new Vec2(o.x - this.x, o.y - this.y);
	};

	Vec2.prototype.dot = function dot(o) {
		return this.x * o.x + this.y * o.y;
	};

	Vec2.prototype.perpDot = function perpDot(o) {
		return -this.y * o.x + this.x * o.y;
	};

	Vec2.prototype.plus = function plus(o) {
		return new Vec2(this.x + o.x, this.y + o.y);
	};

	Vec2.prototype.minus = function minus(o) {
		return new Vec2(this.x - o.x, this.y - o.y);
	};

	Vec2.prototype.lenSq = function lenSq() {
		return this.x * this.x + this.y * this.y;
	};

	Vec2.prototype.len = function len() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	Vec2.prototype.length = function length() {
		return this.len();
	};

	Vec2.prototype.lengthSquared = function lengthSquared() {
		return lenSq();
	};

	Vec2.prototype.scaled = function scaled(n) {
		return new Vec2(this.x * n, this.y * n);
	};

	Vec2.prototype.normalize = function normalize() {
		this.normalizeGetLen();return this;
	};

	Vec2.prototype.clone = function clone() {
		return new Vec2(this.x, this.y);
	};

	Vec2.prototype.copy = function copy(_ref) {
		var x = _ref.x;
		var y = _ref.y;
		this.x = x;;this.y = y;return this;
	};

	Vec2.prototype.scale = function scale(n) {
		this.x *= n;this.y *= n;return this;
	};

	Vec2.prototype.set = function set(x, y) {
		this.x = x;this.y = y;return this;
	};

	Vec2.prototype.clear = function clear() {
		return this.set(0.0, 0.0);
	};

	Vec2.prototype.add = function add(o) {
		this.x += o.x;this.y += o.y;return this;
	};

	Vec2.prototype.addScaled = function addScaled(o, n) {
		this.x += o.x * n;this.y += o.y * n;return this;
	};

	Vec2.prototype.translate = function translate(x, y) {
		this.x += x;this.y += y;return this;
	};

	Vec2.prototype.normalized = function normalized() {
		return this.clone().normalize();
	};

	Vec2.prototype.scaled = function scaled(n) {
		return this.clone().scale(n);
	};

	Vec2.prototype.toString = function toString() {
		return '(' + this.x + ', ' + this.y + ')';
	};

	Vec2.prototype.distance = function distance(o) {
		var dx = this.x - o.x,
		    dy = this.y - o.y;
		return Math.sqrt(dx * dx + dy * dy);
	};

	Vec2.prototype.distanceSq = function distanceSq(o) {
		this;
		var dx = this.x - o.x,
		    dy = this.y - o.y;
		return dx * dx + dy * dy;
	};

	Vec2.prototype.normalizeGetLen = function normalizeGetLen() {
		var l2 = this.x * this.x + this.y * this.y;
		if (l2 === 0.0) {
			this.x = 0.0;this.y = 1.0;return 0.00001;
		}
		var il = 1.0 / Math.sqrt(l2);
		this.x *= il;
		this.y *= il;
		this;
		return l2 * il;
	};

	Vec2.prototype.normalizeOrZero = function normalizeOrZero() {
		return this.scale(1.0 / (Math.sqrt(this.x * this.x + this.y * this.y) + 1e-37));
	};

	Vec2.prototype.xFlip = function xFlip() {
		var about = arguments.length <= 0 || arguments[0] === undefined ? 0.0 : arguments[0];
		this.x = 2.0 * about - this.x;return this;
	};

	Vec2.prototype.yFlip = function yFlip() {
		var about = arguments.length <= 0 || arguments[0] === undefined ? 0.0 : arguments[0];
		this.y = 2.0 * about - this.y;return this;
	};

	Vec2.prototype.rotate = function rotate(angle, about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		var nx = x * c - y * s;
		var ny = x * s + y * c;
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	};

	Vec2.prototype.rotate90 = function rotate90(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = -y + aboutX;
		this.y = x + aboutY;
		return this;
	};

	Vec2.prototype.rotate180 = function rotate180(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = -x + aboutX;
		this.y = -y + aboutY;
		return this;
	};

	Vec2.prototype.rotate270 = function rotate270(about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var x = this.x - aboutX;
		var y = this.y - aboutY;
		this.x = y + aboutX;
		this.y = -x + aboutY;
		return this;
	};

	Vec2.prototype.rotate = function rotate(angle, about) {
		var aboutX = 0.0,
		    aboutY = 0.0;
		if (about) {
			aboutX = about.x;aboutY = about.y;
		}
		var sin = Math.sin(angle);
		var cos = Math.cos(angle);

		var x = this.x - aboutX;
		var y = this.y - aboutY;
		var nx = cos * x - sin * y;
		var ny = sin * x + cos * y;
		this.x = nx + aboutX;
		this.y = ny + aboutY;
		return this;
	};

	Vec2.prototype.rotated90 = function rotated90(about) {
		return this.clone().rotate90(about);
	};

	Vec2.prototype.rotated180 = function rotated180(about) {
		return this.clone().rotate180(about);
	};

	Vec2.prototype.rotated270 = function rotated270(about) {
		return this.clone().rotate270(about);
	};

	Vec2.prototype.xFlipped = function xFlipped(aboutX) {
		return this.clone().xFlip(aboutX);
	};

	Vec2.prototype.yFlipped = function yFlipped(aboutY) {
		return this.clone().yFlip(aboutY);
	};

	Vec2.prototype.nanCheck = function nanCheck() {
		ASSERT(+this.x === this.x);
		ASSERT(+this.y === this.y);
		return this;
	};

	return Vec2;
})();

Vec2.ZERO = Object.freeze(new Vec2(0.0, 0.0));

Vec2.zero = function () {
	return new Vec2(0.0, 0.0);
};
Vec2.fromDir = function (dir) {
	return new Vec2(Math.cos(dir), Math.sin(dir));
};
Vec2.towards = function (p0, p1) {
	return new Vec2(p1.x - p0.x, p1.y - p0.y);
};
Vec2.towardsXY = function (x0, y0, x1, y1) {
	return new Vec2(x1 - x0, y1 - y0);
};

Vec2.Pool = {
	items: [],
	count: 0,
	get: function get(x, y) {
		if (this.count === this.items.length) this.items.push(new Vec2(0.0, 0.0));
		return this.items[this.count++].set(+x || 0.0, +y || 0.0);
	},
	reset: function reset() {
		this.count = 0;
	},
	update: function update() {
		this.count = 0;
	}
};

Vec2.temp = function (x, y) {
	return Vec2.Pool.get(x, y);
};

module.exports = Vec2;

},{"./debug":161}]},{},[174])