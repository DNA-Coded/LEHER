/**
 * 3D Globe - Interactive Land, Water, Coordinates & Projections
 */
(function() {
    "use strict";

    var SECOND = 1000;
    var MIN_MOVE = 1;                         // slack before a drag operation begins (pixels)
    var MOVE_END_WAIT = 500;                  // time to wait for a move operation to be considered done (millis)

    var view = µ.view();
    var log = µ.log();
    var activeLocation = {};

    /**
     * Display status/messages in HUD.
     */
    var report = (function() {
        var s = d3.select("#status");
        return {
            status: function(msg) {
                return s.text(msg || "");
            },
            error: function(err) {
                var msg = err.status ? err.status + " " + err.message : (err.message || err);
                return s.text(msg);
            },
            reset: function() {
                return s.text("");
            }
        };
    })();

    /**
     * Multi-agent async coordinator.
     */
    function createAgent() {
        return _.extend({
            _previous: null,
            cancel: {requested: false},
            submit: function(task, arg0, arg1) {
                this.cancel.requested = true;
                var next = this.cancel = {requested: false};
                var self = this;
                this.trigger("submit");
                return when(task.call(next, arg0, arg1)).then(function(value) {
                    if (!next.requested) {
                        self._previous = value;
                        self.trigger("update", value);
                        return value;
                    }
                    return null;
                }).otherwise(report.error);
            },
            value: function() {
                return this._previous;
            }
        }, Backbone.Events);
    }

    var meshAgent = createAgent();
    var globeAgent = createAgent();
    var rendererAgent = createAgent();

    var configuration = µ.buildConfiguration(d3.set(globes.keys()), d3.set(["off"]));

    /**
     * Maps user drag and zoom interactions to globe rotation.
     */
    function buildInputController() {
        var globe, op = null;

        var zoom = d3.behavior.zoom()
            .on("zoomstart", function() {
                op = {
                    type: "click",
                    startMouse: d3.mouse(this),
                    startScale: zoom.scale(),
                    manipulator: globe.manipulator(d3.mouse(this), zoom.scale())
                };
            })
            .on("zoom", function() {
                var currentMouse = d3.mouse(this);
                var currentScale = d3.event.scale;
                if (!op) return;

                if (op.type === "click" || op.type === "spurious") {
                    var distanceMoved = µ.distance(currentMouse, op.startMouse);
                    if (currentScale === op.startScale && distanceMoved < MIN_MOVE) {
                        op.type = distanceMoved > 0 ? "click" : "spurious";
                        return;
                    }
                    dispatch.trigger("moveStart");
                    op.type = "drag";
                }
                if (currentScale !== op.startScale) {
                    op.type = "zoom";
                }

                op.manipulator.move(op.type === "zoom" ? null : currentMouse, currentScale);
                dispatch.trigger("move");
            })
            .on("zoomend", function() {
                if (!op) return;
                op.manipulator.end();
                if (op.type === "click") {
                    var invertCoord = globe.projection.invert(op.startMouse);
                    dispatch.trigger("click", op.startMouse, invertCoord || []);
                }
                else if (op.type !== "spurious") {
                    signalEnd();
                }
                op = null;
            });

        var signalEnd = _.debounce(function() {
            if (!op || (op.type !== "drag" && op.type !== "zoom")) {
                configuration.save({orientation: globe.orientation()}, {source: "moveEnd"});
                dispatch.trigger("moveEnd");
            }
        }, MOVE_END_WAIT);

        d3.select("#display").call(zoom);

        function reorient() {
            var options = arguments[3] || {};
            if (!globe || options.source === "moveEnd") {
                return;
            }
            dispatch.trigger("moveStart");
            globe.orientation(configuration.get("orientation"), view);
            zoom.scale(globe.projection.scale());
            dispatch.trigger("moveEnd");
        }

        var dispatch = _.extend({
            globe: function(_) {
                if (_) {
                    globe = _;
                    zoom.scaleExtent(globe.scaleExtent());
                    reorient();
                }
                return _ ? this : globe;
            }
        }, Backbone.Events);
        return dispatch.listenTo(configuration, "change:orientation", reorient);
    }

    var inputController = buildInputController();

    /**
     * Loads local topology files and constructs GeoJSON features for land and coastlines.
     */
    function buildMesh() {
        var cancel = this ? (this.cancel || this) : null;
        report.status("Loading 3D Earth model...");
        return when.all([
            µ.loadJson("data/land-50m.json"),
            µ.loadJson("data/earth-topo.json")
        ]).spread(function(landTopo, earthTopo) {
            if (cancel && cancel.requested) return null;
            log.time("building meshes");
            var landFeature = topojson.feature(landTopo, landTopo.objects.land);
            var coastLo = topojson.feature(earthTopo, earthTopo.objects.coastline_110m);
            var coastHi = topojson.feature(earthTopo, earthTopo.objects.coastline_50m);
            var lakesLo = topojson.feature(earthTopo, earthTopo.objects.lakes_110m);
            var lakesHi = topojson.feature(earthTopo, earthTopo.objects.lakes_50m);
            log.timeEnd("building meshes");
            report.status("");
            return {
                land: landFeature,
                coastLo: coastLo,
                coastHi: coastHi,
                lakesLo: lakesLo,
                lakesHi: lakesHi
            };
        });
    }

    function buildGlobe(projectionName) {
        var builder = globes.get(projectionName);
        if (!builder) {
            return when.reject("Unknown projection: " + projectionName);
        }
        return when(builder(view));
    }

    var currentRendererDispatch = null;

    function buildRenderer(mesh, globe) {
        if (!mesh || !globe) return null;

        if (currentRendererDispatch && typeof currentRendererDispatch.stopListening === "function") {
            currentRendererDispatch.stopListening();
        }
        var dispatch = currentRendererDispatch = _.clone(Backbone.Events);

        // Clear existing map SVG
        µ.removeChildren(d3.select("#map").node());
        µ.removeChildren(d3.select("#foreground").node());

        // Render globe SVG structure
        globe.defineMap(d3.select("#map"), d3.select("#foreground"));

        var path = d3.geo.path().projection(globe.projection).pointRadius(7);
        var land = d3.select(".land");
        var coastline = d3.select(".coastline");
        var lakes = d3.select(".lakes");

        land.datum(mesh.land);
        coastline.datum(mesh.coastHi);
        lakes.datum(mesh.lakesHi);

        d3.selectAll("path").attr("d", path);

        function drawLocationMark(point, coord) {
            if (coord && _.isFinite(coord[0]) && _.isFinite(coord[1])) {
                var mark = d3.select(".location-mark");
                if (!mark.node()) {
                    mark = d3.select("#foreground").append("path").attr("class", "location-mark");
                }
                mark.datum({type: "Point", coordinates: coord}).attr("d", path);
            }
        }

        if (activeLocation && activeLocation.point && activeLocation.coord) {
            drawLocationMark(activeLocation.point, activeLocation.coord);
        }

        var REDRAW_WAIT = 5;
        var doDraw_throttled = _.throttle(doDraw, REDRAW_WAIT, {leading: false});

        function doDraw() {
            d3.selectAll("path").attr("d", path);
            rendererAgent.trigger("redraw");
            doDraw_throttled = _.throttle(doDraw, REDRAW_WAIT, {leading: false});
        }

        dispatch.listenTo(
            inputController, {
                moveStart: function() {
                    coastline.datum(mesh.coastLo);
                    lakes.datum(mesh.lakesLo);
                    rendererAgent.trigger("start");
                },
                move: function() {
                    doDraw_throttled();
                },
                moveEnd: function() {
                    coastline.datum(mesh.coastHi);
                    lakes.datum(mesh.lakesHi);
                    d3.selectAll("path").attr("d", path);
                    rendererAgent.trigger("render");
                },
                click: function(point, coord) {
                    drawLocationMark(point, coord);
                    showLocationDetails(point, coord);
                }
            });

        when(true).then(function() {
            inputController.globe(globe);
        });

        return dispatch;
    }

    /**
     * Formats degrees into DMS (Degrees, Minutes, Seconds) + Decimal notation.
     */
    function formatDMS(deg, isLat) {
        if (!_.isFinite(deg)) return "--° --' --\"";
        var dir = isLat ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
        var abs = Math.abs(deg);
        var d = Math.floor(abs);
        var minFloat = (abs - d) * 60;
        var m = Math.floor(minFloat);
        var s = ((minFloat - m) * 60).toFixed(1);
        return d + "° " + µ.zeroPad(m, 2) + "' " + (s < 10 ? "0" + s : s) + '" ' + dir + " (" + abs.toFixed(4) + "° " + dir + ")";
    }

    /**
     * Displays coordinates in the HUD panel.
     */
    function showLocationDetails(point, coord) {
        point = point || [];
        coord = coord || [];
        var λ = coord[0], φ = coord[1];

        if (!_.isFinite(λ) || !_.isFinite(φ)) {
            return;
        }

        activeLocation = {point: point, coord: coord};

        var latDMS = formatDMS(φ, true);
        var lonDMS = formatDMS(λ, false);

        d3.select("#display-lat").text(latDMS);
        d3.select("#display-lon").text(lonDMS);
        d3.select("#location-close").style("display", "inline-flex");

        // Broadcast to parent / embedder / Controls & Analytics page
        try {
            var msg = {
                type: "earth:location",
                latitude: φ,
                longitude: λ,
                latDMS: latDMS,
                lonDMS: lonDMS,
                coord: coord,
                point: point
            };
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(msg, "*");
            }
            window.postMessage(msg, "*");
        } catch (e) {}
    }

    function clearLocationDetails(clearEverything) {
        d3.select("#display-lat").text("--° --' --\"");
        d3.select("#display-lon").text("--° --' --\"");
        d3.select("#location-close").style("display", "none");
        d3.select("#coords-title").text("Coordinates");
        if (clearEverything) {
            activeLocation = {};
            d3.select(".location-mark").remove();
        }
        try {
            var clearMsg = { type: "earth:clear" };
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(clearMsg, "*");
            }
            window.postMessage(clearMsg, "*");
        } catch (e) {}
    }

    /**
     * Auto-fetches device geolocation and rotates globe to user coordinates.
     */
    function fetchUserLocation(autoCenter) {
        if (!navigator.geolocation) {
            report.status("Geolocation not supported by browser");
            return;
        }
        report.status("Detecting your location...");
        navigator.geolocation.getCurrentPosition(function(pos) {
            report.status("");
            var coord = [pos.coords.longitude, pos.coords.latitude];
            var globe = globeAgent.value();
            if (globe) {
                if (autoCenter) {
                    var rotate = globe.locate(coord);
                    if (rotate) {
                        globe.projection.rotate(rotate);
                        configuration.save({orientation: globe.orientation()});
                    }
                }
                var pt = globe.projection(coord);
                d3.select("#coords-title").text("📍 Your Location");
                showLocationDetails(pt, coord);
                if (activeLocation.point && activeLocation.coord) {
                    var path = d3.geo.path().projection(globe.projection).pointRadius(7);
                    var mark = d3.select(".location-mark");
                    if (!mark.node()) {
                        mark = d3.select("#foreground").append("path").attr("class", "location-mark");
                    }
                    mark.datum({type: "Point", coordinates: coord}).attr("d", path);
                }
            }
        }, function(err) {
            report.status("");
            log.info("Geolocation warning:", err ? err.message : "unavailable");
        }, { enableHighAccuracy: true, timeout: 8000 });
    }

    /**
     * Instantly switches to the target projection on a single click.
     */
    function setProjection(projName) {
        if (!globes.has(projName)) return;

        // 1. Immediately highlight active button with zero delay
        d3.selectAll(".proj-btn").classed("highlighted", false);
        d3.select("#" + projName).classed("highlighted", true);

        // 2. Update model attributes
        configuration.set({projection: projName, orientation: ""}, {silent: true});

        // 3. Update URL hash cleanly
        try {
            history.replaceState(null, "", "#" + projName);
        } catch (e) {
            window.location.hash = projName;
        }

        // 4. Immediately trigger globe projection render & auto-refresh screen
        report.reset();
        var mesh = meshAgent.value();
        var globeBuilder = globes.get(projName);
        if (mesh && globeBuilder) {
            var globe = globeBuilder(view);
            globeAgent._previous = globe;
            globeAgent.trigger("update", globe);
            rendererAgent.submit(buildRenderer, mesh, globe);
        } else {
            globeAgent.submit(buildGlobe, projName);
        }
    }

    function init() {
        d3.selectAll(".fill-screen").attr("width", view.width).attr("height", view.height);

        // Auto-locate button
        var locateBtn = document.getElementById("locate-me-btn");
        if (locateBtn) {
            locateBtn.onclick = function(e) {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                fetchUserLocation(true);
                return false;
            };
        }

        // Close HUD coordinates button
        var closeBtn = document.getElementById("location-close");
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                clearLocationDetails(true);
                return false;
            };
        }

        if (µ.isFF()) {
            d3.select("#display").classed("firefox", true);
        }

        if ("ontouchstart" in document.documentElement) {
            d3.select(document).on("touchstart", function() {});
        }
        else {
            d3.select(document.documentElement).classed("no-touch", true);
        }

        // Handle browser Back/Forward navigation
        window.addEventListener("hashchange", function() {
            var hash = (window.location.hash || "").replace(/^#+/, "").trim();
            var parsed = µ.parse(hash, d3.set(globes.keys()));
            var p = parsed.projection || "orthographic";
            if (p !== configuration.get("projection")) {
                setProjection(p);
            }
        });

        configuration.on("change", report.reset);

        meshAgent.listenTo(configuration, "change:topology", function(context, attr) {
            meshAgent.submit(buildMesh, attr);
        });

        function startRendering() {
            rendererAgent.submit(buildRenderer, meshAgent.value(), globeAgent.value());
        }
        rendererAgent.listenTo(meshAgent, "update", startRendering);
        rendererAgent.listenTo(globeAgent, "update", startRendering);

        // Bind all 9 projection buttons with immediate click execution
        globes.keys().forEach(function(p) {
            var btn = document.getElementById(p);
            if (btn) {
                btn.onclick = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    setProjection(p);
                    return false;
                };
            }
        });

        // Auto-fetch user location on load
        var initialLocateDone = false;
        rendererAgent.on("render", function() {
            if (!initialLocateDone) {
                initialLocateDone = true;
                setTimeout(function() {
                    fetchUserLocation(true);
                }, 600);
            }
        });

        d3.select(window).on("orientationchange", function() {
            view = µ.view();
            globeAgent.submit(buildGlobe, configuration.get("projection"));
        });

        // Remote control message listener for Controls & Analytics dashboard / iframe host
        window.addEventListener("message", function(e) {
            if (!e.data || typeof e.data !== "object") return;
            if (e.data.action === "setProjection" && e.data.projection) {
                setProjection(e.data.projection);
            } else if (e.data.action === "locateMe") {
                fetchUserLocation(true);
            } else if (e.data.action === "clearLocation") {
                clearLocationDetails(true);
            }
        });

        // Expose public API for intra-window or script-based Controls & Analytics integration
        window.earthControls = {
            setProjection: setProjection,
            fetchUserLocation: fetchUserLocation,
            clearLocationDetails: clearLocationDetails,
            getActiveLocation: function() { return activeLocation; }
        };
    }

    function start() {
        meshAgent.submit(buildMesh);
        var initialHash = (window.location.hash || "").replace(/^#+/, "").trim();
        var parsed = µ.parse(initialHash, d3.set(globes.keys()));
        var proj = parsed.projection || "orthographic";
        setProjection(proj);
    }

    when(true).then(init).then(start).otherwise(report.error);

})();
