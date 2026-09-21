/**
 * globes - a set of models of the earth, each having their own kind of projection and onscreen behavior.
 */
var globes = function() {
    "use strict";

    function currentPosition() {
        var λ = µ.floorMod(new Date().getTimezoneOffset() / 4, 360);
        return [λ, 0];
    }

    function ensureNumber(num, fallback) {
        return _.isFinite(num) || num === Infinity || num === -Infinity ? num : fallback;
    }

    function clampedBounds(bounds, view) {
        var upperLeft = bounds[0];
        var lowerRight = bounds[1];
        var x = Math.max(Math.floor(ensureNumber(upperLeft[0], 0)), 0);
        var y = Math.max(Math.floor(ensureNumber(upperLeft[1], 0)), 0);
        var xMax = Math.min(Math.ceil(ensureNumber(lowerRight[0], view.width)), view.width - 1);
        var yMax = Math.min(Math.ceil(ensureNumber(lowerRight[1], view.height)), view.height - 1);
        return {x: x, y: y, xMax: xMax, yMax: yMax, width: xMax - x + 1, height: yMax - y + 1};
    }

    function makeDenseBBox(minLon, minLat, maxLon, maxLat, step) {
        step = step || 0.5;
        var coords = [];
        // CCW winding (Right-Hand Rule for spherical polygon):
        // 1. Left edge: minLon, minLat -> maxLat (going North)
        for (var lat = minLat; lat <= maxLat; lat += step) coords.push([minLon, lat]);
        if (coords[coords.length - 1][1] !== maxLat) coords.push([minLon, maxLat]);
        // 2. Top edge: maxLat, minLon -> maxLon (going East)
        for (var lon = minLon; lon <= maxLon; lon += step) coords.push([lon, maxLat]);
        if (coords[coords.length - 1][0] !== maxLon) coords.push([maxLon, maxLat]);
        // 3. Right edge: maxLon, maxLat -> minLat (going South)
        for (var lat = maxLat; lat >= minLat; lat -= step) coords.push([maxLon, lat]);
        if (coords[coords.length - 1][1] !== minLat) coords.push([maxLon, minLat]);
        // 4. Bottom edge: minLat, maxLon -> minLon (going West)
        for (var lon = maxLon; lon >= minLon; lon -= step) coords.push([lon, minLat]);
        if (coords[coords.length - 1][0] !== minLon) coords.push([minLon, minLat]);
        return {
            type: "Polygon",
            coordinates: [coords]
        };
    }

    var CONCENTRIC_BBOX = makeDenseBBox(53, -20, 99, 25, 0.5);

    function standardGlobe() {
        return {
            projection: null,

            newProjection: function(view) {
                throw new Error("method must be overridden");
            },

            bounds: function(view) {
                return clampedBounds(d3.geo.path().projection(this.projection).bounds({type: "Sphere"}), view);
            },

            fit: function(view) {
                var defaultProjection = this.newProjection(view);
                var bounds = d3.geo.path().projection(defaultProjection).bounds({type: "Sphere"});
                var hScale = (bounds[1][0] - bounds[0][0]) / defaultProjection.scale();
                var vScale = (bounds[1][1] - bounds[0][1]) / defaultProjection.scale();
                return Math.min(view.width / hScale, view.height / vScale) * 0.9;
            },

            center: function(view) {
                return [view.width / 2, view.height / 2];
            },

            scaleExtent: function() {
                return [25, 4000];
            },

            orientation: function(o, view) {
                var projection = this.projection, rotate = projection.rotate();
                if (µ.isValue(o)) {
                    var parts = o.split(","), λ = +parts[0], φ = +parts[1], scale = +parts[2];
                    var extent = this.scaleExtent();
                    projection.rotate(_.isFinite(λ) && _.isFinite(φ) ?
                        [-λ, -φ, rotate[2]] :
                        this.newProjection(view).rotate());
                    projection.scale(_.isFinite(scale) ? µ.clamp(scale, extent[0], extent[1]) : this.fit(view));
                    projection.translate(this.center(view));
                    return this;
                }
                return [(-rotate[0]).toFixed(2), (-rotate[1]).toFixed(2), Math.round(projection.scale())].join(",");
            },

            manipulator: function(startMouse, startScale) {
                var projection = this.projection;
                var sensitivity = 150 / startScale;
                var rotation = [projection.rotate()[0] / sensitivity, -projection.rotate()[1] / sensitivity];
                var original = projection.precision();
                projection.precision(original * 10);
                return {
                    move: function(mouse, scale) {
                        if (mouse) {
                            var xd = mouse[0] - startMouse[0] + rotation[0];
                            var yd = mouse[1] - startMouse[1] + rotation[1];
                            projection.rotate([xd * sensitivity, -yd * sensitivity, projection.rotate()[2]]);
                        }
                        projection.scale(scale);
                    },
                    end: function() {
                        projection.precision(original);
                    }
                };
            },

            locate: function(coord) {
                return null;
            },

            defineMask: function(context) {
                d3.geo.path().projection(this.projection).context(context)({type: "Sphere"});
                return context;
            },

            defineMap: function(mapSvg, foregroundSvg) {
                var path = d3.geo.path().projection(this.projection);
                var defs = mapSvg.append("defs");

                // Region boundary path
                defs.append("path")
                    .attr("id", "concentric-bounds")
                    .datum(CONCENTRIC_BBOX)
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "concentric-clip")
                    .append("use")
                    .attr("xlink:href", "#concentric-bounds");

                var scanGrad = defs.append("linearGradient")
                    .attr("id", "tactical-scanline-grad")
                    .attr("x1", "0%").attr("y1", "0%")
                    .attr("x2", "0%").attr("y2", "100%");
                scanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");
                scanGrad.append("stop").attr("offset", "50%").attr("stop-color", "#00f0ff").attr("stop-opacity", "0.35");
                scanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");

                defs.append("path")
                    .attr("id", "sphere")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                // --- MONOCHROMATIC LAYER (Entire Globe/World Map) ---
                mapSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("class", "background-sphere mono-ocean");

                mapSvg.append("path")
                    .attr("class", "land mono-land");

                mapSvg.append("path")
                    .attr("class", "coastline mono-coastline");

                mapSvg.append("path")
                    .attr("class", "lakes mono-lakes");

                // Base Longitude & Latitude Graticule Grid (Muted)
                mapSvg.append("path")
                    .attr("class", "graticule mono-graticule")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                // Base Hemisphere Equator / Prime Meridian (Muted)
                mapSvg.append("path")
                    .attr("class", "hemisphere mono-hemisphere")
                    .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
                    .attr("d", path);

                // --- COLORED ACTIVE LAYER (Group clipped strictly to Data Region) ---
                var activeGroup = mapSvg.append("g")
                    .attr("id", "concentric-active-layer")
                    .attr("clip-path", "url(#concentric-clip)");

                // Ocean fill inside the active data bounding box
                activeGroup.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "background-sphere concentric-ocean");

                // Vibrant landmasses inside the active data region (India, Sri Lanka, etc.)
                activeGroup.append("path")
                    .attr("class", "land concentric-land");

                // Vibrant coastlines inside the active data region
                activeGroup.append("path")
                    .attr("class", "coastline");

                // Vibrant lakes inside the active data region
                activeGroup.append("path")
                    .attr("class", "lakes");

                // Regional Graticule grid within this region
                activeGroup.append("path")
                    .attr("class", "graticule")
                    .datum(d3.geo.graticule().step([5, 5]).extent([[53, 4], [99, 25]]))
                    .attr("d", path);

                // Subtle sweeping tactical telemetry scan beam
                activeGroup.append("rect")
                    .attr("class", "tactical-scan-beam")
                    .attr("x", -2000)
                    .attr("y", -2000)
                    .attr("width", 4000)
                    .attr("height", 4000)
                    .attr("fill", "url(#tactical-scanline-grad)");

                // Distinct glowing region boundary border
                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "region-border");

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("class", "foreground-sphere");

                // --- TACTICAL HUD SECTOR CORNERS & LABELS ---
                var sectorHud = foregroundSvg.append("g")
                    .attr("class", "sector-hud-overlay");

                var corners = [
                    { id: "nw", coord: [53, 25], label: "NW 25°N 53°E", path: "M 0 16 L 0 0 L 16 0", textDx: -10, textDy: -8, anchor: "end" },
                    { id: "ne", coord: [99, 25], label: "NE 25°N 99°E", path: "M 0 16 L 0 0 L -16 0", textDx: 10, textDy: -8, anchor: "start" },
                    { id: "se", coord: [99, -20],  label: "SE 20°S 99°E",  path: "M 0 -16 L 0 0 L -16 0", textDx: 10, textDy: 18, anchor: "start" },
                    { id: "sw", coord: [53, -20],  label: "SW 20°S 53°E",  path: "M 0 -16 L 0 0 L 16 0", textDx: -10, textDy: 18, anchor: "end" }
                ];

                var proj = this.projection;
                corners.forEach(function(c) {
                    var pt = proj(c.coord);
                    var isVis = pt && _.isFinite(pt[0]) && _.isFinite(pt[1]);
                    var g = sectorHud.append("g")
                        .attr("id", "corner-group-" + c.id)
                        .attr("transform", "translate(" + (isVis ? pt[0] : -9999) + "," + (isVis ? pt[1] : -9999) + ")")
                        .style("display", isVis ? null : "none");

                    g.append("path")
                        .attr("class", "sector-corner-bracket")
                        .attr("d", c.path);

                    g.append("circle")
                        .attr("class", "sector-corner-dot")
                        .attr("r", 2.5);

                    g.append("text")
                        .attr("class", "sector-corner-label")
                        .attr("x", c.textDx)
                        .attr("y", c.textDy)
                        .attr("text-anchor", c.anchor)
                        .text(c.label);
                });
            }
        };
    }

    function newGlobe(source, view) {
        var result = _.extend(standardGlobe(), source);
        result.projection = result.newProjection(view);
        return result;
    }

    // ============================================================================================

    /**
     * Concentric regional projection specifically bounded from:
     * Latitude: 4°N to 25°N
     * Longitude: 53°E to 99°E
     * Concentric circular parallels and radial meridians, with only this region shown.
     */
    function concentricRegion(view) {
        return newGlobe({
            isConcentric: true,
            isBounded: true,
            boundsGeo: { minLon: 53, maxLon: 99, minLat: -20, maxLat: 25 },
            newProjection: function(view) {
                return d3.geo.conicEquidistant()
                    .center([0, 0])
                    .rotate([-76, 0])
                    .parallels([-20, 25])
                    .precision(0.1);
            },
            bounds: function(view) {
                return clampedBounds(d3.geo.path().projection(this.projection).bounds(CONCENTRIC_BBOX), view);
            },
            fit: function(view) {
                var defaultProjection = this.newProjection(view);
                var bounds = d3.geo.path().projection(defaultProjection).bounds(CONCENTRIC_BBOX);
                var hScale = (bounds[1][0] - bounds[0][0]) / defaultProjection.scale();
                var vScale = (bounds[1][1] - bounds[0][1]) / defaultProjection.scale();
                return Math.max(view.width / hScale, view.height / vScale) * 1.02;
            },
            center: function(view) {
                return [view.width / 2, view.height / 2];
            },
            scaleExtent: function() {
                return [100, 10000];
            },
            orientation: function(o, view) {
                var projection = this.projection;
                view = view || µ.view();
                var extent = this.scaleExtent();
                var defaultProjection = this.newProjection(view);
                var baseFit = this.fit(view);
                if (µ.isValue(o)) {
                    var parts = o.split(","), λ = +parts[0], φ = +parts[1], scale = +parts[2];
                    projection.rotate(_.isFinite(λ) && _.isFinite(φ) ?
                        [-λ, -φ, defaultProjection.rotate()[2] || 0] :
                        defaultProjection.rotate());
                    projection.scale(_.isFinite(scale) ? µ.clamp(scale, extent[0], extent[1]) : baseFit);
                    projection.translate(this.center(view));
                    return this;
                }
                var rotate = projection.rotate();
                return [(-rotate[0]).toFixed(2), (-rotate[1]).toFixed(2), Math.round(projection.scale())].join(",");
            },
            manipulator: function(startMouse, startScale) {
                var projection = this.projection;
                var sScale = startScale || projection.scale();
                var sensitivity = 150 / sScale;
                var rotation = [projection.rotate()[0] / sensitivity, -projection.rotate()[1] / sensitivity];
                var original = projection.precision();
                projection.precision(original * 10);
                return {
                    move: function(mouse, scale) {
                        if (mouse && startMouse) {
                            var xd = mouse[0] - startMouse[0] + rotation[0];
                            var yd = mouse[1] - startMouse[1] + rotation[1];
                            projection.rotate([xd * sensitivity, -yd * sensitivity, projection.rotate()[2]]);
                        }
                        if (_.isFinite(scale)) {
                            projection.scale(scale);
                        }
                    },
                    end: function() {
                        projection.precision(original);
                    }
                };
            },
            defineMap: function(mapSvg, foregroundSvg) {
                var path = d3.geo.path().projection(this.projection);
                var defs = mapSvg.append("defs");

                // Region boundary path
                defs.append("path")
                    .attr("id", "concentric-bounds")
                    .datum(CONCENTRIC_BBOX)
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "concentric-clip")
                    .append("use")
                    .attr("xlink:href", "#concentric-bounds");

                var scanGrad = defs.append("linearGradient")
                    .attr("id", "tactical-scanline-grad")
                    .attr("x1", "0%").attr("y1", "0%")
                    .attr("x2", "0%").attr("y2", "100%");
                scanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");
                scanGrad.append("stop").attr("offset", "50%").attr("stop-color", "#00f0ff").attr("stop-opacity", "0.35");
                scanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");

                // Full globe sphere for monochromatic background
                defs.append("path")
                    .attr("id", "mono-sphere")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                // --- MONOCHROMATIC LAYER (Entire Globe) ---
                mapSvg.append("use")
                    .attr("xlink:href", "#mono-sphere")
                    .attr("class", "background-sphere mono-ocean");

                mapSvg.append("path")
                    .attr("class", "land mono-land");

                mapSvg.append("path")
                    .attr("class", "coastline mono-coastline");

                mapSvg.append("path")
                    .attr("class", "lakes mono-lakes");

                // --- COLORED ACTIVE LAYER (Group clipped strictly to Data Region) ---
                var activeGroup = mapSvg.append("g")
                    .attr("id", "concentric-active-layer")
                    .attr("clip-path", "url(#concentric-clip)");

                // Ocean fill inside the active data bounding box
                activeGroup.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "background-sphere concentric-ocean");

                // Vibrant landmasses inside the active data region (India, Sri Lanka, etc.)
                activeGroup.append("path")
                    .attr("class", "land concentric-land");

                // Vibrant coastlines inside the active data region
                activeGroup.append("path")
                    .attr("class", "coastline");

                // Vibrant lakes inside the active data region
                activeGroup.append("path")
                    .attr("class", "lakes");

                // Concentric Latitude & Longitude Graticule grid within this region
                activeGroup.append("path")
                    .attr("class", "graticule")
                    .datum(d3.geo.graticule().step([5, 5]).extent([[53, 4], [99, 25]]))
                    .attr("d", path);

                // Equator and major division lines
                activeGroup.append("path")
                    .attr("class", "hemisphere")
                    .datum(d3.geo.graticule().minorStep([0, 5]).majorStep([0, 5]).extent([[53, 4], [99, 25]]))
                    .attr("d", path);

                // Subtle sweeping tactical telemetry scan beam
                activeGroup.append("rect")
                    .attr("class", "tactical-scan-beam")
                    .attr("x", -2000)
                    .attr("y", -2000)
                    .attr("width", 4000)
                    .attr("height", 4000)
                    .attr("fill", "url(#tactical-scanline-grad)");

                // Distinct glowing region boundary border
                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "region-border");

                foregroundSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "foreground-sphere");

                // --- TACTICAL HUD SECTOR CORNERS & LABELS ---
                var sectorHud = foregroundSvg.append("g")
                    .attr("class", "sector-hud-overlay");

                var corners = [
                    { id: "nw", coord: [53, 20], label: "NW 20°N 53°E", path: "M 0 16 L 0 0 L 16 0", textDx: -10, textDy: -8, anchor: "end" },
                    { id: "ne", coord: [99, 20], label: "NE 20°N 99°E", path: "M 0 16 L 0 0 L -16 0", textDx: 10, textDy: -8, anchor: "start" },
                    { id: "se", coord: [99, -20],  label: "SE 20°S 99°E",  path: "M 0 -16 L 0 0 L -16 0", textDx: 10, textDy: 18, anchor: "start" },
                    { id: "sw", coord: [53, -20],  label: "SW 20°S 53°E",  path: "M 0 -16 L 0 0 L 16 0", textDx: -10, textDy: 18, anchor: "end" }
                ];

                var proj = this.projection;
                corners.forEach(function(c) {
                    var pt = proj(c.coord) || [0, 0];
                    var g = sectorHud.append("g")
                        .attr("id", "corner-group-" + c.id)
                        .attr("transform", "translate(" + (pt ? pt[0] : 0) + "," + (pt ? pt[1] : 0) + ")");

                    g.append("path")
                        .attr("class", "sector-corner-bracket")
                        .attr("d", c.path);

                    g.append("circle")
                        .attr("class", "sector-corner-dot")
                        .attr("r", 2.5);

                    g.append("text")
                        .attr("class", "sector-corner-label")
                        .attr("x", c.textDx)
                        .attr("y", c.textDy)
                        .attr("text-anchor", c.anchor)
                        .text(c.label);
                });
            }
        }, view);
    }

    function atlantis(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.mollweide().rotate([30, -45, 90]).precision(0.1);
            }
        }, view);
    }

    function azimuthalEquidistant(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.azimuthalEquidistant().precision(0.1).rotate([0, -90]).clipAngle(180 - 0.001);
            }
        }, view);
    }

    function conicEquidistant(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.conicEquidistant().rotate(currentPosition()).precision(0.1);
            },
            center: function(view) {
                return [view.width / 2, view.height / 2 + view.height * 0.065];
            }
        }, view);
    }

    function equirectangular(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.equirectangular().rotate(currentPosition()).precision(0.1);
            }
        }, view);
    }

    function orthographic(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.orthographic().rotate(currentPosition()).precision(0.1).clipAngle(90);
            },
            defineMap: function(mapSvg, foregroundSvg) {
                var path = d3.geo.path().projection(this.projection);
                var defs = mapSvg.append("defs");

                // Region boundary path for concentric clipping
                defs.append("path")
                    .attr("id", "concentric-bounds-ortho")
                    .datum(CONCENTRIC_BBOX)
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "concentric-clip-ortho")
                    .append("use")
                    .attr("xlink:href", "#concentric-bounds-ortho");

                var scanGrad = defs.append("linearGradient")
                    .attr("id", "tactical-scanline-grad-ortho")
                    .attr("x1", "0%").attr("y1", "0%")
                    .attr("x2", "0%").attr("y2", "100%");
                scanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");
                scanGrad.append("stop").attr("offset", "50%").attr("stop-color", "#00f0ff").attr("stop-opacity", "0.35");
                scanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");

                // Radial gradient for deep 3D ocean illumination (used as base)
                var gradientFill = defs.append("radialGradient")
                    .attr("id", "orthographic-ocean-fill")
                    .attr("gradientUnits", "objectBoundingBox")
                    .attr("cx", "48%").attr("cy", "46%").attr("r", "52%");
                gradientFill.append("stop").attr("stop-color", "#162a45").attr("offset", "0%");
                gradientFill.append("stop").attr("stop-color", "#0e1c31").attr("offset", "65%");
                gradientFill.append("stop").attr("stop-color", "#070e1a").attr("offset", "100%");

                defs.append("path")
                    .attr("id", "sphere-ortho")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                // --- MONOCHROMATIC LAYER ---
                mapSvg.append("use")
                    .attr("xlink:href", "#sphere-ortho")
                    .attr("fill", "url(#orthographic-ocean-fill)")
                    .attr("class", "background-sphere mono-ocean");

                mapSvg.append("path")
                    .attr("class", "land mono-land");

                mapSvg.append("path")
                    .attr("class", "coastline mono-coastline");

                mapSvg.append("path")
                    .attr("class", "lakes mono-lakes");

                mapSvg.append("path")
                    .attr("class", "graticule mono-graticule")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                mapSvg.append("path")
                    .attr("class", "hemisphere mono-hemisphere")
                    .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
                    .attr("d", path);

                // --- COLORED ACTIVE LAYER ---
                var activeGroup = mapSvg.append("g")
                    .attr("id", "ortho-active-layer")
                    .attr("clip-path", "url(#concentric-clip-ortho)");

                activeGroup.append("use")
                    .attr("xlink:href", "#concentric-bounds-ortho")
                    .attr("class", "background-sphere concentric-ocean");

                activeGroup.append("path")
                    .attr("class", "land concentric-land");

                activeGroup.append("path")
                    .attr("class", "coastline");

                activeGroup.append("path")
                    .attr("class", "lakes");

                activeGroup.append("path")
                    .attr("class", "graticule")
                    .datum(d3.geo.graticule().step([5, 5]).extent([[53, 4], [99, 25]]))
                    .attr("d", path);

                activeGroup.append("rect")
                    .attr("class", "tactical-scan-beam")
                    .attr("x", -2000)
                    .attr("y", -2000)
                    .attr("width", 4000)
                    .attr("height", 4000)
                    .attr("fill", "url(#tactical-scanline-grad-ortho)");

                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds-ortho")
                    .attr("class", "region-border");

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere-ortho")
                    .attr("class", "foreground-sphere");
            },
            locate: function(coord) {
                return [-coord[0], -coord[1], this.projection.rotate()[2]];
            }
        }, view);
    }

    function stereographic(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.stereographic()
                    .rotate([-43, -20])
                    .precision(1.0)
                    .clipAngle(180 - 0.0001)
                    .clipExtent([[0, 0], [view.width, view.height]]);
            }
        }, view);
    }

    function waterman(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.polyhedron.waterman().rotate([20, 0]).precision(0.1);
            },
            defineMap: function(mapSvg, foregroundSvg) {
                var path = d3.geo.path().projection(this.projection);
                var defs = mapSvg.append("defs");

                // Region boundary path for concentric clipping
                defs.append("path")
                    .attr("id", "concentric-bounds-water")
                    .datum(CONCENTRIC_BBOX)
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "concentric-clip-water")
                    .append("use")
                    .attr("xlink:href", "#concentric-bounds-water");

                var scanGrad = defs.append("linearGradient")
                    .attr("id", "tactical-scanline-grad-water")
                    .attr("x1", "0%").attr("y1", "0%")
                    .attr("x2", "0%").attr("y2", "100%");
                scanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");
                scanGrad.append("stop").attr("offset", "50%").attr("stop-color", "#00f0ff").attr("stop-opacity", "0.35");
                scanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#38bdf8").attr("stop-opacity", "0");

                defs.append("path")
                    .attr("id", "sphere-water")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "clip-water")
                    .append("use")
                    .attr("xlink:href", "#sphere-water");

                // --- MONOCHROMATIC LAYER ---
                mapSvg.append("use")
                    .attr("xlink:href", "#sphere-water")
                    .attr("class", "background-sphere mono-ocean");

                mapSvg.append("path")
                    .attr("class", "land mono-land")
                    .attr("clip-path", "url(#clip-water)");

                mapSvg.append("path")
                    .attr("class", "coastline mono-coastline")
                    .attr("clip-path", "url(#clip-water)");

                mapSvg.append("path")
                    .attr("class", "lakes mono-lakes")
                    .attr("clip-path", "url(#clip-water)");

                mapSvg.append("path")
                    .attr("class", "graticule mono-graticule")
                    .attr("clip-path", "url(#clip-water)")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                // --- COLORED ACTIVE LAYER ---
                var activeGroup = mapSvg.append("g")
                    .attr("id", "water-active-layer")
                    .attr("clip-path", "url(#concentric-clip-water)");

                activeGroup.append("use")
                    .attr("xlink:href", "#concentric-bounds-water")
                    .attr("class", "background-sphere concentric-ocean");

                activeGroup.append("path")
                    .attr("class", "land concentric-land")
                    .attr("clip-path", "url(#clip-water)");

                activeGroup.append("path")
                    .attr("class", "coastline")
                    .attr("clip-path", "url(#clip-water)");

                activeGroup.append("path")
                    .attr("class", "lakes")
                    .attr("clip-path", "url(#clip-water)");

                activeGroup.append("path")
                    .attr("class", "graticule")
                    .attr("clip-path", "url(#clip-water)")
                    .datum(d3.geo.graticule().step([5, 5]).extent([[53, 4], [99, 25]]))
                    .attr("d", path);

                activeGroup.append("rect")
                    .attr("class", "tactical-scan-beam")
                    .attr("x", -2000)
                    .attr("y", -2000)
                    .attr("width", 4000)
                    .attr("height", 4000)
                    .attr("fill", "url(#tactical-scanline-grad-water)");

                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds-water")
                    .attr("class", "region-border");

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere-water")
                    .attr("class", "foreground-sphere");
            }
        }, view);
    }

    function winkel3(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.winkel3().precision(0.1);
            }
        }, view);
    }

    return d3.map({
        orthographic: orthographic,
        concentric_region: concentricRegion,
        equirectangular: equirectangular,
        winkel3: winkel3,
        waterman: waterman,
        stereographic: stereographic,
        azimuthal_equidistant: azimuthalEquidistant,
        conic_equidistant: conicEquidistant,
        atlantis: atlantis
    });

}();
