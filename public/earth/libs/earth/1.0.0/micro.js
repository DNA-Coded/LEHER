/**
 * micro - a grab bag of somewhat useful utility functions and other stuff that requires unit testing
 *
 * Copyright (c) 2014 Cameron Beccario
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * https://github.com/cambecc/earth
 */
var µ = function() {
    "use strict";

    var τ = 2 * Math.PI;
    var H = 0.0000360;  // 0.0000360°φ ~= 4m
    var DEFAULT_CONFIG = "orthographic";
    var TOPOLOGY = isMobile() ? "data/earth-topo-mobile.json" : "data/earth-topo.json";

    /**
     * @returns {Boolean} true if the specified value is truthy.
     */
    function isTruthy(x) {
        return !!x;
    }

    /**
     * @returns {Boolean} true if the specified value is not null and not undefined.
     */
    function isValue(x) {
        return x !== null && x !== undefined;
    }

    /**
     * @returns {Object} the first argument if not null and not undefined, otherwise the second argument.
     */
    function coalesce(a, b) {
        return isValue(a) ? a : b;
    }

    /**
     * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
     *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
     */
    function floorMod(a, n) {
        var f = a - n * Math.floor(a / n);
        return f === n ? 0 : f;
    }

    /**
     * @returns {Number} distance between two points having the form [x, y].
     */
    function distance(a, b) {
        var Δx = b[0] - a[0];
        var Δy = b[1] - a[1];
        return Math.sqrt(Δx * Δx + Δy * Δy);
    }

    /**
     * @returns {Number} the value x clamped to the range [low, high].
     */
    function clamp(x, low, high) {
        return Math.max(low, Math.min(x, high));
    }

    /**
     * @returns {number} the fraction of the bounds [low, high] covered by the value x, after clamping x to the
     *          bounds. For example, given bounds=[10, 20], this method returns 1 for x>=20, 0.5 for x=15 and 0
     *          for x<=10.
     */
    function proportion(x, low, high) {
        return (µ.clamp(x, low, high) - low) / (high - low);
    }

    /**
     * @returns {number} the value p within the range [0, 1], scaled to the range [low, high].
     */
    function spread(p, low, high) {
        return p * (high - low) + low;
    }

    /**
     * Pad number with leading zeros. Does not support fractional or negative numbers.
     */
    function zeroPad(n, width) {
        var s = n.toString();
        var i = Math.max(width - s.length, 0);
        return new Array(i + 1).join("0") + s;
    }

    /**
     * @returns {String} the specified string with the first letter capitalized.
     */
    function capitalize(s) {
        return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.substr(1);
    }

    /**
     * @returns {Boolean} true if agent is probably firefox.
     */
    function isFF() {
        return (/firefox/i).test(navigator.userAgent);
    }

    /**
     * @returns {Boolean} true if agent is probably a mobile device.
     */
    function isMobile() {
        return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
    }

    function isEmbeddedInIFrame() {
        return window != window.top;
    }

    function toUTCISO(date) {
        return date.getUTCFullYear() + "-" +
            zeroPad(date.getUTCMonth() + 1, 2) + "-" +
            zeroPad(date.getUTCDate(), 2) + " " +
            zeroPad(date.getUTCHours(), 2) + ":00";
    }

    function toLocalISO(date) {
        return date.getFullYear() + "-" +
            zeroPad(date.getMonth() + 1, 2) + "-" +
            zeroPad(date.getDate(), 2) + " " +
            zeroPad(date.getHours(), 2) + ":00";
    }

    function ymdRedelimit(ymd, fromDelimiter, toDelimiter) {
        if (!fromDelimiter) {
            return ymd.substr(0, 4) + toDelimiter + ymd.substr(4, 2) + toDelimiter + ymd.substr(6, 2);
        }
        var parts = ymd.substr(0, 10).split(fromDelimiter);
        return [parts[0], parts[1], parts[2]].join(toDelimiter);
    }

    function dateToUTCymd(date, delimiter) {
        return ymdRedelimit(date.toISOString(), "-", delimiter || "");
    }

    function dateToConfig(date) {
        return {date: µ.dateToUTCymd(date, "/"), hour: µ.zeroPad(date.getUTCHours(), 2) + "00"};
    }

    function log() {
        function format(o) { return o && o.stack ? o + "\n" + o.stack : o; }
        return {
            debug:   function(s) { if (console && console.log) console.log(format(s)); },
            info:    function(s) { if (console && console.info) console.info(format(s)); },
            error:   function(e) { if (console && console.error) console.error(format(e)); },
            time:    function(s) { if (console && console.time) console.time(format(s)); },
            timeEnd: function(s) { if (console && console.timeEnd) console.timeEnd(format(s)); }
        };
    }

    function view() {
        var w = window;
        var d = document && document.documentElement;
        var b = document && document.getElementsByTagName("body")[0];
        var x = w.innerWidth || d.clientWidth || b.clientWidth;
        var y = w.innerHeight || d.clientHeight || b.clientHeight;
        return {width: x, height: y};
    }

    function removeChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function clearCanvas(canvas) {
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        return canvas;
    }

    function colorInterpolator(start, end) {
        var r = start[0], g = start[1], b = start[2];
        var Δr = end[0] - r, Δg = end[1] - g, Δb = end[2] - b;
        return function(i, a) {
            return [Math.floor(r + i * Δr), Math.floor(g + i * Δg), Math.floor(b + i * Δb), a];
        };
    }

    function sinebowColor(hue, a) {
        var rad = hue * τ * 5/6;
        rad *= 0.75;
        var s = Math.sin(rad);
        var c = Math.cos(rad);
        var r = Math.floor(Math.max(0, -c) * 255);
        var g = Math.floor(Math.max(s, 0) * 255);
        var b = Math.floor(Math.max(c, 0, -s) * 255);
        return [r, g, b, a];
    }

    var BOUNDARY = 0.45;
    var fadeToWhite = colorInterpolator(sinebowColor(1.0, 0), [255, 255, 255]);

    function extendedSinebowColor(i, a) {
        return i <= BOUNDARY ?
            sinebowColor(i / BOUNDARY, a) :
            fadeToWhite((i - BOUNDARY) / (1 - BOUNDARY), a);
    }

    function asColorStyle(r, g, b, a) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
    }

    function loadJson(resource) {
        var d = when.defer();
        d3.json(resource, function(error, result) {
            return error ?
                d.reject({status: error.status, message: error.statusText, resource: resource}) :
                d.resolve(result);
        });
        return d.promise;
    }

    /**
     * Parses the URL hash to extract the active projection and optional orientation.
     */
    function parse(hash, projectionNames) {
        var result = {
            projection: "orthographic",
            orientation: "",
            topology: TOPOLOGY
        };
        if (!hash) {
            return result;
        }

        hash = hash.replace(/^#+/, "").trim();

        // Support both single token (#concentric_region) and compound paths
        var segments = hash.split("/");
        var foundProjection = false;

        segments.forEach(function(segment) {
            var option = /^([a-zA-Z0-9_-]+)(?:=([\d\-.,]*))?$/.exec(segment);
            if (option) {
                var name = option[1];
                var orientation = option[2] || "";
                if (projectionNames && projectionNames.has(name)) {
                    result.projection = name;
                    result.orientation = orientation;
                    foundProjection = true;
                }
            }
        });

        if (!foundProjection && projectionNames) {
            var directMatch = /^([a-zA-Z0-9_-]+)(?:=([\d\-.,]*))?$/.exec(hash);
            if (directMatch && projectionNames.has(directMatch[1])) {
                result.projection = directMatch[1];
                result.orientation = directMatch[2] || "";
            }
        }

        return result;
    }

    /**
     * A Backbone.js Model that persists its attributes as a human readable URL hash fragment.
     */
    var Configuration = Backbone.Model.extend({
        id: 0,
        _ignoreNextHashChangeEvent: false,
        _projectionNames: null,

        /**
         * @returns {String} this configuration converted to a hash fragment.
         */
        toHash: function() {
            var attr = this.attributes;
            var proj = attr.projection || "orthographic";
            var orient = attr.orientation ? "=" + attr.orientation : "";
            return proj + orient;
        },

        /**
         * Synchronizes between the configuration model and the hash fragment in the URL bar.
         */
        sync: function(method, model, options) {
            switch (method) {
                case "read":
                    if (options && options.trigger === "hashchange" && model._ignoreNextHashChangeEvent) {
                        model._ignoreNextHashChangeEvent = false;
                        return;
                    }
                    var hash = window.location.hash.substr(1) || DEFAULT_CONFIG;
                    model.set(parse(hash, model._projectionNames));
                    break;
                case "update":
                    model._ignoreNextHashChangeEvent = true;
                    window.location.hash = model.toHash();
                    break;
            }
        }
    });

    function buildConfiguration(projectionNames, overlayTypes) {
        var result = new Configuration();
        result._projectionNames = projectionNames;
        result._overlayTypes = overlayTypes;
        var initialHash = (typeof window !== "undefined" && window.location.hash) ? window.location.hash.substr(1) : "";
        result.set(parse(initialHash || DEFAULT_CONFIG, projectionNames));
        return result;
    }

    return {
        isTruthy: isTruthy,
        isValue: isValue,
        coalesce: coalesce,
        floorMod: floorMod,
        distance: distance,
        clamp: clamp,
        proportion: proportion,
        spread: spread,
        zeroPad: zeroPad,
        capitalize: capitalize,
        isFF: isFF,
        isMobile: isMobile,
        isEmbeddedInIFrame: isEmbeddedInIFrame,
        toUTCISO: toUTCISO,
        toLocalISO: toLocalISO,
        ymdRedelimit: ymdRedelimit,
        dateToUTCymd: dateToUTCymd,
        dateToConfig: dateToConfig,
        log: log,
        view: view,
        removeChildren: removeChildren,
        clearCanvas: clearCanvas,
        sinebowColor: sinebowColor,
        extendedSinebowColor: extendedSinebowColor,
        asColorStyle: asColorStyle,
        loadJson: loadJson,
        parse: parse,
        buildConfiguration: buildConfiguration
    };

}();
