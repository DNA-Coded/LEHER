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
     * Data bounding is enforced across all globe projections.
     */
    function isConcentricBounded(globeObj) {
        return true;
    }

    /**
     * Checks if coordinates fall within the supported maritime data coverage bounds:
     * Longitude: 53°E to 99°E, Latitude: 4°N to 25°N
     */
    function isCoordWithinDataBounds(coord) {
        if (!coord || !_.isFinite(coord[0]) || !_.isFinite(coord[1])) return false;
        var lon = ((coord[0] + 180) % 360 + 360) % 360 - 180;
        var lat = coord[1];
        return lon >= 53 && lon <= 99 && lat >= 4 && lat <= 25;
    }

    /**
     * Identifies the specific marine water body or geographical basin from coordinates.
     */
    function getWaterBody(lat, lon) {
        // Specific gulfs & bays
        if (lat >= 22.0 && lat <= 23.6 && lon >= 68.5 && lon <= 70.8) {
            return "Gulf of Kutch";
        }
        if (lat >= 20.5 && lat <= 22.3 && lon >= 71.8 && lon <= 73.2) {
            return "Gulf of Khambhat";
        }
        if (lat >= 22.0 && lat <= 26.0 && lon >= 56.0 && lon <= 61.0) {
            return "Gulf of Oman";
        }
        if (lat >= 8.2 && lat <= 9.8 && lon >= 78.2 && lon <= 79.8) {
            return "Gulf of Mannar";
        }
        if (lat >= 9.8 && lat <= 10.5 && lon >= 79.0 && lon <= 80.2) {
            return "Palk Strait";
        }
        // Andaman Sea (east of Andaman-Nicobar archipelago)
        if (lat >= 6.0 && lat <= 16.0 && lon >= 92.2 && lon <= 99.0) {
            return "Andaman Sea";
        }
        // Lakshadweep Sea
        if (lat >= 8.5 && lat <= 14.0 && lon >= 71.2 && lon <= 74.5) {
            return "Lakshadweep Sea";
        }
        // Maldives Waters
        if (lat >= 0.0 && lat <= 8.5 && lon >= 71.0 && lon <= 74.5) {
            return "Maldives Waters";
        }
        // South Sri Lanka Basin
        if (lat >= 4.0 && lat <= 7.8 && lon >= 79.5 && lon <= 82.5) {
            return "South Sri Lanka Basin";
        }
        // Bay of Bengal (east of India, longitude > 80.2°E)
        if (lon > 80.2 && lon <= 93.0 && lat >= 5.0 && lat <= 24.0) {
            return "Bay of Bengal";
        }
        // Arabian Sea (west of India, longitude 53°E to 78.5°E)
        if (lon >= 53.0 && lon <= 78.5 && lat >= 7.0 && lat <= 26.0) {
            return "Arabian Sea";
        }
        // Equatorial Indian Ocean
        if (lat < 7.0 && lon >= 53.0 && lon <= 99.0) {
            return "Equatorial Indian Ocean";
        }
        return "Indian Ocean";
    }

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
                    }
                    else {
                        op.type = "drag";
                    }
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
                    if (invertCoord && _.isFinite(invertCoord[0]) && _.isFinite(invertCoord[1])) {
                        // Normalize longitude to [-180, 180]
                        invertCoord[0] = ((invertCoord[0] + 180) % 360 + 360) % 360 - 180;
                        // If concentric bounded projection is active, strictly disallow clicks outside data region
                        if (isConcentricBounded(globe) && !isCoordWithinDataBounds(invertCoord)) {
                            op = null;
                            return; // Unclickable in the monochromatic / out-of-bounds area
                        }
                        dispatch.trigger("click", op.startMouse, invertCoord);
                    }
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

        // Visual feedback cursor & Live Floating Coordinate HUD Chip
        d3.select("#display").on("mousemove", function() {
            var g = globeAgent.value();
            var mouse = d3.mouse(this);
            var hud = d3.select("#cursor-hud");
            if (g && isConcentricBounded(g)) {
                var inv = g.projection.invert(mouse);
                if (inv && isCoordWithinDataBounds(inv)) {
                    d3.select(this).style("cursor", "crosshair");
                    var lon = ((inv[0] + 180) % 360 + 360) % 360 - 180;
                    var lat = inv[1];
                    var latStr = lat >= 0 ? lat.toFixed(2) + "°N" : Math.abs(lat).toFixed(2) + "°S";
                    var lonStr = lon >= 0 ? lon.toFixed(2) + "°E" : Math.abs(lon).toFixed(2) + "°W";
                    d3.select("#cursor-lat").text(latStr);
                    d3.select("#cursor-lon").text(lonStr);
                    d3.select("#cursor-region").text(getWaterBody(lat, lon));
                    hud.style("display", "block")
                       .style("transform", "translate3d(" + (mouse[0] + 18) + "px, " + (mouse[1] + 18) + "px, 0)");
                } else {
                    d3.select(this).style("cursor", "not-allowed");
                    hud.style("display", "none");
                }
            } else {
                d3.select(this).style("cursor", null);
                hud.style("display", "none");
            }
        });

        d3.select("#display").on("mouseleave", function() {
            d3.select("#cursor-hud").style("display", "none");
        });

        // Intercept native clicks that might bubble up past the zoom controller
        d3.select("#display").on("click", function() {
            var g = globeAgent.value();
            if (g && isConcentricBounded(g)) {
                var inv = g.projection.invert(d3.mouse(this));
                if (inv && !isCoordWithinDataBounds(inv)) {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                }
            }
        }, true);

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

    function updateSectorCorners(g) {
        var currentGlobe = g || globeAgent.value();
        if (!currentGlobe || !currentGlobe.projection) {
            d3.select(".sector-hud-overlay").style("display", "none");
            return;
        }
        d3.select(".sector-hud-overlay").style("display", null);
        var proj = currentGlobe.projection;
        var centerLon = 0;
        var centerLat = 0;
        if (proj.rotate) {
            var rot = proj.rotate();
            centerLon = -rot[0];
            centerLat = -rot[1];
        }
        var corners = [
            { id: "nw", coord: [53, 25] },
            { id: "ne", coord: [99, 25] },
            { id: "se", coord: [99, 4] },
            { id: "sw", coord: [53, 4] }
        ];
        corners.forEach(function(c) {
            var isVisible = true;
            if (proj.clipAngle && proj.clipAngle() < 180) {
                var dist = d3.geo.distance(c.coord, [centerLon, centerLat]) * 180 / Math.PI;
                if (dist > proj.clipAngle() - 1) {
                    isVisible = false;
                }
            }
            var pt = proj(c.coord);
            if (isVisible && pt && _.isFinite(pt[0]) && _.isFinite(pt[1])) {
                d3.select("#corner-group-" + c.id)
                    .attr("transform", "translate(" + pt[0] + "," + pt[1] + ")")
                    .style("display", null);
            } else {
                d3.select("#corner-group-" + c.id).style("display", "none");
            }
        });
    }

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
        var land = d3.selectAll(".land");
        var coastline = d3.selectAll(".coastline");
        var lakes = d3.selectAll(".lakes");

        land.datum(mesh.land);
        coastline.datum(mesh.coastHi);
        lakes.datum(mesh.lakesHi);

        d3.selectAll("path").attr("d", path);

        if (activeLocation && activeLocation.coord) {
            updateLocationMarker(activeLocation.coord, true);
        }

        updateSectorCorners(globe);

        var isDrawPending = false;
        function scheduleDraw() {
            if (!isDrawPending) {
                isDrawPending = true;
                requestAnimationFrame(function() {
                    isDrawPending = false;
                    doDraw();
                });
            }
        }

        function doDraw() {
            d3.selectAll("path").attr("d", path);
            if (activeLocation && activeLocation.coord) {
                var pt = globe.projection(activeLocation.coord);
                if (pt && _.isFinite(pt[0]) && _.isFinite(pt[1])) {
                    d3.select(".sonar-ring-1").attr("cx", pt[0]).attr("cy", pt[1]);
                    d3.select(".sonar-ring-2").attr("cx", pt[0]).attr("cy", pt[1]);
                }
            }
            updateSectorCorners(globe);
            rendererAgent.trigger("redraw");
        }

        dispatch.listenTo(
            inputController, {
                moveStart: function() {
                    coastline.datum(mesh.coastLo);
                    lakes.datum(mesh.lakesLo);
                    rendererAgent.trigger("start");
                },
                move: function() {
                    scheduleDraw();
                },
                moveEnd: function() {
                    coastline.datum(mesh.coastHi);
                    lakes.datum(mesh.lakesHi);
                    d3.selectAll("path").attr("d", path);
                    rendererAgent.trigger("render");
                },
                click: function(point, coord) {
                    updateLocationMarker(coord, false);
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
     * Updates or draws the location marker pin and syncs HUD details.
     */
    function updateLocationMarker(coord, suppressBroadcast) {
        if (!coord || !_.isFinite(coord[0]) || !_.isFinite(coord[1])) return;
        var globe = globeAgent.value();
        if (!globe || !globe.projection) return;

        // Ensure longitude is normalized to [-180, 180]
        coord[0] = ((coord[0] + 180) % 360 + 360) % 360 - 180;

        // Disallow location markers or HUD updates outside data bounds when in concentric mode
        if (isConcentricBounded(globe) && !isCoordWithinDataBounds(coord)) {
            return;
        }

        var pt = globe.projection(coord);
        activeLocation = {point: pt, coord: coord};

        // Tactical Sonar Ripple (expanding pulse wave)
        if (pt && _.isFinite(pt[0]) && _.isFinite(pt[1])) {
            var fg = d3.select("#foreground");
            var sonar1 = d3.select(".sonar-ring-1");
            if (!sonar1.node()) {
                fg.append("circle").attr("class", "sonar-pulse-ring sonar-ring-1");
                fg.append("circle").attr("class", "sonar-pulse-ring sonar-ring-2");
            }
            d3.select(".sonar-ring-1").attr("cx", pt[0]).attr("cy", pt[1]);
            d3.select(".sonar-ring-2").attr("cx", pt[0]).attr("cy", pt[1]);
        }

        var path = d3.geo.path().projection(globe.projection).pointRadius(7);
        var mark = d3.select(".location-mark");
        if (!mark.node()) {
            mark = d3.select("#foreground").append("path").attr("class", "location-mark");
        }
        mark.datum({type: "Point", coordinates: coord}).attr("d", path);

        showLocationDetails(pt, coord, suppressBroadcast);
    }

    /**
     * Displays coordinates in the HUD panel.
     */
    function showLocationDetails(point, coord, suppressBroadcast) {
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

        if (!suppressBroadcast) {
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
    }

    function clearLocationDetails(clearEverything) {
        d3.select("#display-lat").text("--° --' --\"");
        d3.select("#display-lon").text("--° --' --\"");
        d3.select("#location-close").style("display", "none");
        d3.select("#coords-title").text("Coordinates");
        if (clearEverything) {
            activeLocation = {};
            d3.select(".location-mark").remove();
            d3.selectAll(".sonar-pulse-ring").remove();
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
                if (autoCenter && typeof globe.locate === "function") {
                    var rotate = globe.locate(coord);
                    if (rotate) {
                        globe.projection.rotate(rotate);
                        configuration.save({orientation: globe.orientation()});
                    }
                }
                d3.select("#coords-title").text("Your Location");
                updateLocationMarker(coord, false);
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

        // Initial coordinate marker setup
        var initialLocateDone = false;
        rendererAgent.on("render", function() {
            if (!initialLocateDone) {
                initialLocateDone = true;
                if (!activeLocation || !activeLocation.coord) {
                    // Default marker at central Indian Ocean (15.4°N, 71.2°E) if none set
                    updateLocationMarker([71.2, 15.4], true);
                }
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
            } else if (e.data.action === "setLocation" && typeof e.data.latitude === "number" && typeof e.data.longitude === "number") {
                updateLocationMarker([e.data.longitude, e.data.latitude], true);
            }
        });

        // Expose public API for intra-window or script-based Controls & Analytics integration
        window.earthControls = {
            setProjection: setProjection,
            fetchUserLocation: fetchUserLocation,
            clearLocationDetails: clearLocationDetails,
            setLocation: function(lat, lon) { updateLocationMarker([lon, lat], false); },
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
