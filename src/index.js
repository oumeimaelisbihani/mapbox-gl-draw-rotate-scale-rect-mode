import MapboxDraw from '@mapbox/mapbox-gl-draw';

// const Constants = require('../constants');
// const doubleClickZoom = require('../lib/double_click_zoom');
// const createSupplementaryPoints = require('../lib/create_supplementary_points');
import Constants from '@mapbox/mapbox-gl-draw/src/constants';
import doubleClickZoom from '@mapbox/mapbox-gl-draw/src/lib/double_click_zoom';
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points';

import * as turf from '@turf/turf';




export const TxRectMode = {};


// TxRectMode.toDisplayFeatures = function(state, geojson, display) {
//     display(geojson);
// };
TxRectMode.toDisplayFeatures = function(state, geojson, push) {
    if (state.featureId === geojson.properties.id) {
        geojson.properties.active = Constants.activeStates.ACTIVE;
        push(geojson);
        createSupplementaryPoints(geojson, {
            map: this.map,
            midpoints: false,
            selectedPaths: state.selectedCoordPaths
        }).forEach(push);
        this.createRotationPoint(geojson).forEach(push);
    } else {
        geojson.properties.active = Constants.activeStates.INACTIVE;
        push(geojson);
    }

    // this.fireActionable(state);
    this.setActionableState({
        combineFeatures: false,
        uncombineFeatures: false,
        trash: false
    });
};

TxRectMode.onSetup = function(opts) {
    const featureId = opts.featureId;
    const feature = this.getFeature(featureId);

    if (!feature) {
        throw new Error('You must provide a featureId to enter direct_select mode');
    }

    if (feature.type != Constants.geojsonTypes.POLYGON) {
        throw new TypeError('tx_rect mode doesn\'t handle only rectangles');
    }
    if (feature.coordinates === undefined
        || feature.coordinates.length != 1
        || feature.coordinates[0].length != 4) {
        throw new TypeError('tx_rect mode doesn\'t handle only rectangles');
    }

    const state = {
        featureId,
        feature,
        dragMoveLocation: opts.startPos || null,
        dragMoving: false,
        canDragMove: false,
        selectedCoordPaths: opts.coordPath ? [opts.coordPath] : []
    };

    // TODO why I need this?
    this.setSelectedCoordinates(this.pathsToCoordinates(featureId, state.selectedCoordPaths));
    this.setSelected(featureId);
    doubleClickZoom.disable(this);

    this.setActionableState({
        trash: true
    });

    return state;
};

TxRectMode.onStop = function() {
    doubleClickZoom.enable(this);
    this.clearSelectedCoordinates();
};

// TODO why I need this?
TxRectMode.pathsToCoordinates = function(featureId, paths) {
    return paths.map(coord_path => { return { feature_id: featureId, coord_path }; });
};

TxRectMode.createRotationPoint = function(geojson) {
    const { type, coordinates } = geojson.geometry;
    const featureId = geojson.properties && geojson.properties.id;

    let rotationPoints = [];
    if (type === Constants.geojsonTypes.POLYGON
        && coordinates && coordinates.length == 1 && coordinates[0].length >= 5) {
        var c0 = coordinates[0][0];
        var c1 = coordinates[0][1];
        var cR = turf.midpoint(turf.point(c0), turf.point(c1)).geometry.coordinates;

        rotationPoints.push({
                type: Constants.geojsonTypes.FEATURE,
                properties: {
                    meta: 'rotate_point',
                    parent: featureId,
                    lng: cR[0],
                    lat: cR[1],
                    // coord_path: endVertex.properties.coord_path
                },
                geometry: {
                    type: Constants.geojsonTypes.POINT,
                    coordinates: cR
                }
            }
        );


    }
    return rotationPoints;
};

// return {
//     type: Constants.geojsonTypes.FEATURE,
//     properties: {
//         meta: Constants.meta.MIDPOINT,
//         parent: parent,
//         lng: mid.lng,
//         lat: mid.lat,
//         coord_path: endVertex.properties.coord_path
//     },
//     geometry: {
//         type: Constants.geojsonTypes.POINT,
//         coordinates: [mid.lng, mid.lat]
//     }
// };

// 0. inherit from DirectSelect mode
// 1. forbid adding midpoints: DirectSelect.onMidpoint
// 2. forbid deleting midpoints: DirectSelect.onTrash
// 3. implement rotation
// 4. implement scale on point move



// TxRectMode.prototype = Object.create(MapboxDraw.modes.direct_select);
// export const TxRectMode = Object.create(MapboxDraw.modes.direct_select);

// TxRectMode.prototype.onMidpoint = function(state, e) {
//     console.log('onMidpoint()');
//     // this.startDragging(state, e);
//     // const about = e.featureTarget.properties;
//     // state.feature.addCoordinate(about.coord_path, about.lng, about.lat);
//     // this.fireUpdate();
//     // state.selectedCoordPaths = [about.coord_path];
// };



// ----Demo----

function tx_rect_mode_demo_map_onload(event) {

    var map = event.target;

    var draw = new MapboxDraw({
        displayControlsDefault: true,
        // styles: drawStyles,
        modes: Object.assign({
            tx_rect: TxRectMode,
        }, MapboxDraw.modes),

        styles: [
            {
                'id': 'gl-draw-polygon-fill-inactive',
                'type': 'fill',
                'filter': ['all',
                    ['==', 'active', 'false'],
                    ['==', '$type', 'Polygon'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'fill-color': '#3bb2d0',
                    'fill-outline-color': '#3bb2d0',
                    'fill-opacity': 0.0
                }
            },
            {
                'id': 'gl-draw-polygon-fill-active',
                'type': 'fill',
                'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                'paint': {
                    'fill-color': '#fbb03b',
                    'fill-outline-color': '#fbb03b',
                    'fill-opacity': 0.0
                }
            },
            {
                'id': 'gl-draw-polygon-midpoint',
                'type': 'circle',
                'filter': ['all',
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'midpoint']],
                'paint': {
                    'circle-radius': 3,
                    'circle-color': '#fbb03b'
                }
            },






            {
                'id': 'gl-draw-polygon-stroke-inactive',
                'type': 'line',
                'filter': ['all',
                    ['==', 'active', 'false'],
                    ['==', '$type', 'Polygon'],
                    ['!=', 'mode', 'static']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#3bb2d0',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-polygon-stroke-active',
                'type': 'line',
                'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#fbb03b',
                    'line-dasharray': [0.2, 2],
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-line-inactive',
                'type': 'line',
                'filter': ['all',
                    ['==', 'active', 'false'],
                    ['==', '$type', 'LineString'],
                    ['!=', 'mode', 'static']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#3bb2d0',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-line-active',
                'type': 'line',
                'filter': ['all',
                    ['==', '$type', 'LineString'],
                    ['==', 'active', 'true']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#fbb03b',
                    'line-dasharray': [0.2, 2],
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'meta', 'vertex'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 10,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-polygon-and-line-vertex-inactive',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'meta', 'vertex'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#fbb03b'
                }
            },

            {
                'id': 'gl-draw-point-point-stroke-inactive',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'active', 'false'],
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'feature'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 5,
                    'circle-opacity': 1,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-point-inactive',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'active', 'false'],
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'feature'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 3,
                    'circle-color': '#3bb2d0'
                }
            },
            {
                'id': 'gl-draw-point-stroke-active',
                'type': 'circle',
                'filter': ['all',
                    ['==', '$type', 'Point'],
                    ['==', 'active', 'true'],
                    ['!=', 'meta', 'midpoint']
                ],
                'paint': {
                    'circle-radius': 7,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-point-active',
                'type': 'circle',
                'filter': ['all',
                    ['==', '$type', 'Point'],
                    ['!=', 'meta', 'midpoint'],
                    ['==', 'active', 'true']],
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#fbb03b'
                }
            },
            {
                'id': 'gl-draw-polygon-fill-static',
                'type': 'fill',
                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
                'paint': {
                    'fill-color': '#404040',
                    'fill-outline-color': '#404040',
                    'fill-opacity': 0.1
                }
            },
            {
                'id': 'gl-draw-polygon-stroke-static',
                'type': 'line',
                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#404040',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-line-static',
                'type': 'line',
                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#404040',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-point-static',
                'type': 'circle',
                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Point']],
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#404040'
                }
            },


            // {
            //     'id': 'gl-draw-polygon-rotate-point',
            //     'type': 'circle',
            //     'filter': ['all',
            //         ['==', '$type', 'Point'],
            //         ['==', 'meta', 'rotate_point']],
            //     'paint': {
            //         'circle-radius': 5,
            //         'circle-color': '#fbb03b'
            //     }
            // },
            {
                'id': 'gl-draw-polygon-rotate-point-stroke',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'meta', 'rotate_point'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 15,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-polygon-rotate-point',
                'type': 'circle',
                'filter': ['all',
                    ['==', 'meta', 'rotate_point'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static']
                ],
                'paint': {
                    'circle-radius': 8,
                    'circle-color': '#fbb03b'
                }
            },
        ]
    });



    // nyc_1911.jpg - 468x760

    var im_w = 468;
    var im_h = 760;

    const canvas = map.getCanvas();
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    console.log('canvas: ' + w + 'x' + h);

    while (im_w >= w || im_h >= h) {
        im_w = Math.round(0.8 * im_w);
        im_h = Math.round(0.8 * im_h);
    }

    const cUL = map.unproject ([w/2 - im_w/2, h/2 - im_h/2]).toArray();
    const cUR = map.unproject ([w/2 + im_w/2, h/2 - im_h/2]).toArray();
    const cLR = map.unproject ([w/2 + im_w/2, h/2 + im_h/2]).toArray();
    const cLL = map.unproject ([w/2 - im_w/2, h/2 + im_h/2]).toArray();
    const coordinates = [cUL,cUR,cLR,cLL,cUL];
    const polygon = turf.polygon([coordinates]);
    polygon.id = 1;



    map.addSource("test-overlay", {
        "type": "image",
        "url": 'nyc_1911.jpg',
        "coordinates": [cUL,cUR,cLR,cLL]
    });

    map.addLayer({
        "id": "test-overlay-layer",
        "type": "raster",
        "source": "test-overlay",
        "paint": {"raster-opacity": 0.90},
    });



    map.addControl(draw, 'top-right');
    map.on('draw.update', drawUpdateOverlay.bind({
        map: map
    }));


    draw.add(polygon);
    // draw.changeMode('mode', opts);
    // tx_rect, direct_select
    draw.changeMode('tx_rect', {
        featureId: polygon.id
    });
}

function drawUpdateOverlay(e) {
    var feature = e.features[0];
    var coordinates = feature.geometry.coordinates[0].slice(0, 4);

    console.log(coordinates);

    this.map.getSource("test-overlay").setCoordinates(coordinates);
}

export function tx_rect_mode_demo() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5a292YW5vdiIsImEiOiJjazM0OG9hYW4wenR4M2xtajVseW1qYjY3In0.YnbkeuaBiSaDOn7eYDAXsQ';
    var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        center: [-73.93, 40.73], // starting position [lng, lat]
        zoom: 10 // starting zoom
    });

    map.on('load', tx_rect_mode_demo_map_onload);




}
