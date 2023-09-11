/**
 * This is an example of a simple plugin aiming at demonstrating how you can add
 * custom behavior to the maps-client. To make the plugin work it is necessary
 * to import this class in the hooks.js, instantiate it and run the plugin methods
 * on hooks defined on hooks.js
 * @see /src/config/hook-example.js
 *
 * It is possible to use values from the store, like, for example:
 * store.getters.mapCenter, store.getters.mapBounds and store.getters.mode
 * It is also possible to emit events using the EventBus. For example:
 * EventBus.$emit('mapViewDataChanged', mapViewDataChanged)
 */
import Leaflet from 'leaflet'
import {EventBus} from '@/common/event-bus'
import Place from '@/models/place'
import MapViewData from '@/models/map-view-data'

class VehicleLocationPlugin {
  /**
   * PluginExample constructor.
   * IMPORTANT: this constructor is expected
   * to be called on the hooks.js the `appLoaded` hook
   */
  constructor (vueInstance) {
    this.vueInstance = vueInstance
    this.timer = null
    this.localMapViewData = new MapViewData()
    this.routeKeyPath = ''
  }

  appLoaded(vueInstance) {
    console.log('VehicleLocationPlugin: appLoaded callback', vueInstance)

    this.timer = setInterval(async () => {
      var res = await fetch(`http://localhost:7114/taxi/locations${this.routeKeyPath}`)
      if (res.status == 200) {
        var locations = await res.json()
        var mapData = this.localMapViewData
        if (mapData) {
          mapData.pois = []
          if (Array.isArray(locations)) {
            locations.forEach(({coordinate}) => {
              if (coordinate.length == 3) {
                mapData.pois.push(new Place(coordinate[0], coordinate[1], coordinate[2]))
              }
            })
          } else {
            var coordinate = locations.coordinate
            if (coordinate.length == 3) {
              mapData.pois.push(new Place(coordinate[0], coordinate[1], coordinate[2]))
            }
          }
          EventBus.$emit('mapViewDataChanged', mapData)
        }
      }
    }, 2000)

    // setTimeout(() => clearInterval(this.timer), 30000)
  }

  /**
   * Is called when the app is loaded and the map view is ready
   *
   * IMPORTANT: this method is expected to be called on
   * hooks.js on the mapReady hook or automatically via catchAll
   * @param {Object} hookData
   */
  async mapReady ({ context }) {
    console.log('VehicleLocationPlugin: mapReady callback', context)
  }

  mapViewDataChanged (mapViewData) {
    console.log('VehicleLocationPlugin: mapViewDataChanged callback', mapViewData)
    // change the mapViewData object
    // so that it will update the map view
    this.localMapViewData = mapViewData
    if (mapViewData.places && mapViewData.places.length == 2 && mapViewData.places[0].coordinates == null) {
      console.log('VehicleLocationPlugin: mapViewDataChanged place', mapViewData)
      EventBus.$emit('setInputPlace', {
        pickPlaceIndex: 0,
        place: new Place(
          -121.888771,
          37.329079,
          'San Jose McEnery Convention Center',
        )
      })
    }
    if (!mapViewData.routes.length) {
      this.routeKeyPath = ''
    }
  }

  async afterBuildDirectionsMapViewData (mapViewData) {
    console.log('VehicleLocationPlugin: afterBuildDirectionsMapViewData callback', mapViewData)
    if (mapViewData.routes.length) {
      var route = mapViewData.routes[0]
      var taxiRoute = {
        timestamp: mapViewData.timestamp,
        bbox: route.bbox,
        distance: route.summary.distance,
        duration: route.summary.duration,
        coordinates: route.geometry.coordinates,
      }
      this.routeKeyPath = `/${taxiRoute.timestamp}`
      await fetch('http://localhost:8081/taxiroute.TaxiRoute/CreateTaxi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `${taxiRoute.timestamp}`,
        },
        body: JSON.stringify(taxiRoute),
      })
    } else {
      this.routeKeyPath = ''
    }
  }

  markersCreated(markers) {
    // Code example for customizing icons using material design icons https://material.io/resources/icons/
    let markerIcoStyle =
      'transform: rotate(+45deg); margin-left: 4px;margin-top: 2px;'

    for (let key in markers) {
      let markerColor = '#0d9b76' // maybe change the color based on the place properties ?
      let iconDivMarkerStyle = `width: 30px;height: 30px;border-radius: 50% 50% 50% 0;background: ${markerColor};position: absolute;transform: rotate(-45deg);left: 50%;top: 50%;margin: -15px 0 0 -15px;`
      let markerIcon = 'local_taxi' // maybe change the icon based on the place properties ?

      if (markers[key].place.isPoi) {
        markers[key].icon = Leaflet.divIcon({
          className: 'custom-div-icon',
          html: `<div style='${iconDivMarkerStyle}'><i style='${markerIcoStyle}' class='material-icons'>${markerIcon}</i></div>`,
          iconSize: [30, 42],
          iconAnchor: [15, 42],
        })
      }
    }
    return markers
  }

}
// export the AppHooks json builder class
export default VehicleLocationPlugin
