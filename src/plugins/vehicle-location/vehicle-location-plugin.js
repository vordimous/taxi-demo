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
import {EventBus} from '@/common/event-bus'
import Place from '@/models/place'

function delay(milliseconds){
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}

class VehicleLocationPlugin {
  /**
   * PluginExample constructor.
   * IMPORTANT: this constructor is expected
   * to be called on the hooks.js the `appLoaded` hook
   */
  constructor (vueInstance) {
    this.vueInstance = vueInstance
    this.timer = null
    this.localMapViewData = null
  }

  appLoaded(vueInstance) {
    console.log('VehicleLocationPlugin: appLoaded callback', vueInstance)

    this.timer = setInterval(async () => {
      var res = await fetch('http://localhost:7114/taxi/locations')
      var locations = await res.json()
      // console.log('afterBuildDirectionsMapViewData get', locations)
      var mapData = this.localMapViewData
      if (mapData) {
        mapData.pois = []
        locations.forEach((loc) => {
          if (loc.length == 3) {
            mapData.pois.push(new Place(loc[0], loc[1], loc[2]))
          }
        })
        EventBus.$emit('mapViewDataChanged', mapData)
      }
    }, 1000)

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

  /**
   * Method to get the current mapViewData and potentially
   * change it. As it is an object, when you change it you are
   * changing the original object.
   * The MapView is watching to changes to this object and
   * will re-render the displayed content on the map view
   * when it is changed.
   * IMPORTANT: this method is expected to be called on
   * hooks.js on the mapViewDataChanged hook.
   * @param {*} mapViewData
   */
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
          -121.883844,
          37.354559,
          'San Jose, CA, USA',
        )
      })
    }
  }

  async afterBuildDirectionsMapViewData (mapViewData) {
    console.log('VehicleLocationPlugin: afterBuildDirectionsMapViewData callback', mapViewData)
    if (mapViewData.routes.length) {
      var coords = mapViewData.routes[0].geometry.coordinates
      var key = mapViewData.routes[0].timestamp
      for (let i = 0; i < coords.length; i++) {
        var c = coords[i]
        // console.log('afterBuildDirectionsMapViewData push', c)
        await fetch('http://localhost:7114/taxi/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `${key}`,
          },
          body: JSON.stringify(c),
        })
        await delay(Math.floor(Math.random() * (2000 - 500) + 500))
      }
    }
  }

}
// export the AppHooks json builder class
export default VehicleLocationPlugin