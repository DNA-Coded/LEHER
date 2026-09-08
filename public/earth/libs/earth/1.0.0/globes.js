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

    var CONCENTRIC_BBOX = makeDenseBBox(20, -40, 130, 30, 0.5);

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
                defs.append("path")
                    .attr("id", "sphere")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                // Water / Ocean background sphere
                mapSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("class", "background-sphere");

                // Landmasses
                mapSvg.append("path")
                    .attr("class", "land");

                // Coastlines
                mapSvg.append("path")
                    .attr("class", "coastline");

                // Lakes
                mapSvg.append("path")
                    .attr("class", "lakes");

                // Longitude & Latitude Graticule Grid
                mapSvg.append("path")
                    .attr("class", "graticule")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                // Hemisphere Equator / Prime Meridian
                mapSvg.append("path")
                    .attr("class", "hemisphere")
                    .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
                    .attr("d", path);

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("class", "foreground-sphere");
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
     * Latitude: 40°S (-40°) to 30°N (+30°)
     * Longitude: 20°E (+20°) to 130°E (+130°)
     * Concentric circular parallels and radial meridians, with only this region shown.
     */
    function concentricRegion(view) {
        return newGlobe({
            newProjection: function(view) {
                return d3.geo.conicEquidistant()
                    .center([0, -5])
                    .rotate([-75, 0])
                    .parallels([-30, 20])
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
                return Math.min(view.width / hScale, view.height / vScale) * 0.90;
            },
            center: function(view) {
                return [view.width / 2, view.height / 2];
            },
            orientation: function(o, view) {
                var projection = this.projection;
                var defaultProjection = this.newProjection(view);
                projection.rotate(defaultProjection.rotate());
                projection.scale(this.fit(view));
                projection.translate(this.center(view));
                return this;
            },
            manipulator: function() {
                return {
                    move: function() {},
                    end: function() {}
                };
            },
            defineMap: function(mapSvg, foregroundSvg) {
                var path = d3.geo.path().projection(this.projection);
                var defs = mapSvg.append("defs");

                // Region boundary path (40°S to 30°N, 20°E to 130°E)
                defs.append("path")
                    .attr("id", "concentric-bounds")
                    .datum(CONCENTRIC_BBOX)
                    .attr("d", path);

                defs.append("clipPath")
                    .attr("id", "concentric-clip")
                    .append("use")
                    .attr("xlink:href", "#concentric-bounds");

                // Normal vibrant water/ocean fill specifically for this region
                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "background-sphere concentric-ocean");

                // Normal vibrant landmasses clipped to this region only
                mapSvg.append("path")
                    .attr("class", "land concentric-land")
                    .attr("clip-path", "url(#concentric-clip)");

                // Coastlines clipped to this region only
                mapSvg.append("path")
                    .attr("class", "coastline")
                    .attr("clip-path", "url(#concentric-clip)");

                // Lakes clipped to this region only
                mapSvg.append("path")
                    .attr("class", "lakes")
                    .attr("clip-path", "url(#concentric-clip)");

                // Concentric Latitude & Longitude Graticule grid within this region
                mapSvg.append("path")
                    .attr("class", "graticule")
                    .attr("clip-path", "url(#concentric-clip)")
                    .datum(d3.geo.graticule().step([10, 10]).extent([[20, -40], [130, 30]]))
                    .attr("d", path);

                // Equator and major division lines
                mapSvg.append("path")
                    .attr("class", "hemisphere")
                    .attr("clip-path", "url(#concentric-clip)")
                    .datum(d3.geo.graticule().minorStep([0, 10]).majorStep([0, 10]).extent([[20, -40], [130, 30]]))
                    .attr("d", path);

                // Distinct glowing region boundary border
                mapSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "region-border");

                foregroundSvg.append("use")
                    .attr("xlink:href", "#concentric-bounds")
                    .attr("class", "foreground-sphere");
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

                // Radial gradient for deep 3D ocean illumination
                var gradientFill = defs.append("radialGradient")
                    .attr("id", "orthographic-ocean-fill")
                    .attr("gradientUnits", "objectBoundingBox")
                    .attr("cx", "48%").attr("cy", "46%").attr("r", "52%");
                gradientFill.append("stop").attr("stop-color", "#162a45").attr("offset", "0%");
                gradientFill.append("stop").attr("stop-color", "#0e1c31").attr("offset", "65%");
                gradientFill.append("stop").attr("stop-color", "#070e1a").attr("offset", "100%");

                defs.append("path")
                    .attr("id", "sphere")
                    .datum({type: "Sphere"})
                    .attr("d", path);

                // Ocean water base
                mapSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("fill", "url(#orthographic-ocean-fill)")
                    .attr("class", "background-sphere");

                // Landmasses
                mapSvg.append("path")
                    .attr("class", "land");

                // Coastlines
                mapSvg.append("path")
                    .attr("class", "coastline");

                // Lakes
                mapSvg.append("path")
                    .attr("class", "lakes");

                // Latitude & Longitude Graticule lines
                mapSvg.append("path")
                    .attr("class", "graticule")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                // Major Hemisphere lines (Equator / Prime Meridian)
                mapSvg.append("path")
                    .attr("class", "hemisphere")
                    .datum(d3.geo.graticule().minorStep([0, 90]).majorStep([0, 90]))
                    .attr("d", path);

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere")
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
                defs.append("path")
                    .attr("id", "sphere")
                    .datum({type: "Sphere"})
                    .attr("d", path);
                defs.append("clipPath")
                    .attr("id", "clip")
                    .append("use")
                    .attr("xlink:href", "#sphere");

                mapSvg.append("use")
                    .attr("xlink:href", "#sphere")
                    .attr("class", "background-sphere");

                mapSvg.append("path")
                    .attr("class", "land")
                    .attr("clip-path", "url(#clip)");

                mapSvg.append("path")
                    .attr("class", "coastline")
                    .attr("clip-path", "url(#clip)");

                mapSvg.append("path")
                    .attr("class", "lakes")
                    .attr("clip-path", "url(#clip)");

                mapSvg.append("path")
                    .attr("class", "graticule")
                    .attr("clip-path", "url(#clip)")
                    .datum(d3.geo.graticule().step([15, 15]))
                    .attr("d", path);

                foregroundSvg.append("use")
                    .attr("xlink:href", "#sphere")
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
