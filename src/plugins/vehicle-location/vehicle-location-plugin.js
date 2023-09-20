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
import Vue from 'vue'
import {VBtn, VInput} from 'vuetify'
import Leaflet from 'leaflet'
import {EventBus} from '@/common/event-bus'
import Place from '@/models/place'
import MapViewData from '@/models/map-view-data'

const barData = [
  {
    'id': 'a4a4615da5a7ee532b7583b5aea93a6b',
    'name': 'Haberdasher',
    'lng': -121.886548,
    'lat': 37.329916
  },
  // {
  //   'id': 'cb0fa663c2a10d13841f1c9aa03ccabe',
  //   'name': 'The Fountainhead Bar',
  //   'lng': -121.886489,
  //   'lat': 37.33015
  // },
  {
    'id': 'fb52167a1c9b58ab32e2d5541af6984a',
    'name': 'The Continental Bar Lounge & Patio',
    'lng': -121.886583,
    'lat': 37.33057
  },
  {
    'id': 'b5c513b0bb04eb821615c056946e3653',
    'name': 'Uproar Brewing Company',
    'lng': -121.8858,
    'lat': 37.329313
  },
  {
    'id': '9ae7cfe51a03e238ecc8c13082d7ae90',
    'name': 'Caravan Lounge',
    'lng': -121.892301,
    'lat': 37.333053
  },
  // {
  //   'id': '041a8c06998540fb64c4f4e1374b568f',
  //   'name': 'Skewers & Brew',
  //   'lng': -121.88997,
  //   'lat': 37.334991
  // },
  {
    'id': '629da9d1f51913a729940e1fea2cbbf0',
    'name': 'Paper Plane',
    'lng': -121.889403,
    'lat': 37.335097
  },
  // {
  //   'id': 'e172ca007ed02005f921ea22fbac842b',
  //   'name': 'Splash Video Dance Bar',
  //   'lng': -121.890903,
  //   'lat': 37.335023
  // },
  // {
  //   'id': 'ef70322aead58ce9564533453dbce31d',
  //   'name': 'Mac\'s Club',
  //   'lng': -121.890482,
  //   'lat': 37.335185
  // },
  // {
  //   'id': '79f533eacc9f6bb540b0fbc0040044f9',
  //   'name': 'Five Points',
  //   'lng': -121.89362,
  //   'lat': 37.334962
  // },
  {
    'id': 'a24d6adeebd22305b15af51e8d7cf18a',
    'name': 'Fox Tale Fermentation Project',
    'lng': -121.889894,
    'lat': 37.336244
  },
  // {
  //   'id': '8dd48db006a4574b07bbbed394d82c37',
  //   'name': 'Olla',
  //   'lng': -121.893356,
  //   'lat': 37.335375
  // },
  {
    'id': '0cfbad103ef56c846f60f3de5f2fe39c',
    'name': 'O\'Flaherty\'s Irish Pub',
    'lng': -121.893436,
    'lat': 37.335533
  },
  // {
  //   'id': 'd31be4b2ab376b3ac9f08d97f5f18046',
  //   'name': 'ISO Beers',
  //   'lng': -121.889293,
  //   'lat': 37.337041
  // },
  // {
  //   'id': '3de0fb2ff9ebb0761702fa292b2bc218',
  //   'name': 'District San Jose',
  //   'lng': -121.894111,
  //   'lat': 37.336109
  // },
  // {
  //   'id': '5c0e74e3abec46cf00f1b6b467e83b4d',
  //   'name': '3rd & Bourbon',
  //   'lng': -121.888879,
  //   'lat': 37.337333
  // },
  // {
  //   'id': '759f360ce779cb0f71eaf272179a4c9f',
  //   'name': 'San Pedro Square Market',
  //   'lng': -121.894348,
  //   'lat': 37.336519
  // },
  // {
  //   'id': 'd67a9dbaf1fbd8fc45ac96e649a4c787',
  //   'name': 'San Pedro Square Market Bar',
  //   'lng': -121.894278,
  //   'lat': 37.336556
  // }
]

const Button = Vue.extend(VBtn)
const Input = Vue.extend(VInput)

class VehicleLocationPlugin {
  /**
   * PluginExample constructor.
   * IMPORTANT: this constructor is expected
   * to be called on the hooks.js the `appLoaded` hook
   */
  constructor (vueInstance) {
    this.vueInstance = vueInstance
    this.taxiRouteAPI = process.env.TAXIROUTEAPI || 'http://localhost:8080/taxiroute.TaxiRoute/CreateTaxi'
    this.taxiLocationAPI = process.env.TAXILOCATIONAPI || 'http://localhost:7114/taxi/locations'
    this.timer = null
    this.localMapViewData = new MapViewData()
    this.routeKeyPath = ''
    this.barPlaces = barData.map((b) => (new Place(b.lng, b.lat, b.name, {placeId: b.id, isPoi: true})))
  }

  appLoaded(vueInstance) {
    console.log('VehicleLocationPlugin: appLoaded callback', vueInstance)

    this.timer = setInterval(async () => {
      if (this.localMapViewData.routes.length == 0 || (this.routeKeyPath != '' && this.localMapViewData.routes.length > 0)){
        var res = await fetch(this.taxiLocationAPI + this.routeKeyPath)
        if (res.status == 200) {
          var locations = await res.json()
          var mapData = this.localMapViewData
          if (mapData) {
            if (Array.isArray(locations)) {
              mapData.pois = this.barPlaces
              locations.forEach(({key, coordinate}) => {
                if (coordinate[coordinate.length - 1] != -1) {
                  mapData.places.push(new Place(coordinate[0], coordinate[1], key))
                }
              })
            } else {
              var coordinate = locations.coordinate
              if (coordinate[coordinate.length - 1] != -1 && mapData.places.length >= 2) {
                mapData.places = [
                  mapData.places[0],
                  new Place(coordinate[0], coordinate[1], locations.key),
                  mapData.places[mapData.places.length -1]
                ]
              } else {
                mapData.places = [
                  mapData.places[0],
                  mapData.places[mapData.places.length -1]
                ]
                this.routeKeyPath = ''
              }
            }
            EventBus.$emit('mapViewDataChanged', mapData)
          }
        }
      }
    }, 2000)
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
    this.localMapViewData = mapViewData.clone()
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
      var res = await fetch(this.taxiRouteAPI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `${taxiRoute.timestamp}`,
        },
        body: JSON.stringify(taxiRoute),
      })
      if (res.status == 200) {
        this.routeKeyPath = `/${taxiRoute.timestamp}`
      }
    } else {
      this.routeKeyPath = ''
    }
  }

  beforeOpenMarkerPopup({ markerPopupContainerRef, marker }) {
    // hookData has the following structure {marker: Object, markerPopupContainer: HtmlNode}
    // `markerPopupContainer` is an HTML node and can be manipulated.
    // It possible to remove and change existing content, as well
    // as add new VueJS component. See the example below.
    console.log('marker', marker)
    console.log('markerPopupContainerRef', markerPopupContainerRef)


    // this hook will be invoked every time the popup is about
    // to render. So, to avoid content multiple times
    // we check it the component was not already added
    let buttons = markerPopupContainerRef.querySelectorAll('a')

    // If the VueJS component was not already added
    if (buttons.length == 0 && marker.place.isPoi) {
      markerPopupContainerRef.innerText = marker.label

      //capture name doesn't work but formats the popup better
      var name = ''
      var input = new Input({ propsData: { value: name } })
      // input.$slots.label = ['Name']
      input.$on('input', (e) => name = e)
      input.$mount()
      markerPopupContainerRef.appendChild(input.$el)

      var btn = new Button({ propsData: { color: 'primary' } })
      btn.$slots.default = ['Order Taxi']
      btn.$on(['click'], () => {
        console.log('getting directions to', marker.place)
        EventBus.$emit('setInputPlace', {
          pickPlaceIndex: 0,
          place: new Place(
            -121.888771,
            37.329079,
            'San Jose McEnery Convention Center',
          )
        })
        EventBus.$emit('directionsToPoint', {
          place: marker.place
        })
      })
      btn.$mount()
      markerPopupContainerRef.appendChild(btn.$el)
    }
  }

  poisMarkersCreated(markers) {
    let markerIcoStyle = 'transform: rotate(+45deg); margin-left: 4px;margin-top: 2px;'

    for (let key in markers) {
      let markerColor = 'red'
      let markerIcon = 'local_bar'
      let iconDivMarkerStyle = `color: white; width: 30px; height: 30px;border-radius: 50% 50% 50% 0;background: ${markerColor};position: absolute;transform: rotate(-45deg);left: 50%;top: 50%;margin: -15px 0 0 -15px;`
      markers[key].icon = Leaflet.divIcon({
        className: 'custom-div-icon',
        html: `<div style='${iconDivMarkerStyle}'><i style='${markerIcoStyle}' class='material-icons'>${markerIcon}</i></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      })
    }
    return markers
  }

  markersCreated(markers) {
    // Code example for customizing icons using material design icons https://material.io/resources/icons/
    let markerIcoStyle =
      'transform: rotate(+45deg); margin-left: 4px;margin-top: 2px;'
    for (let key in markers) {
      let markerColor = '#0d9b76' // maybe change the color based on the place properties ?
      let markerIcon = 'local_taxi' // maybe change the icon based on the place properties ?

      if (this.localMapViewData.routes.length > 0 ) {
        if (key == 0) {
          markerColor = 'green'
          markerIcon = 'location_on' // ma
        } else if (key == markers.length - 1) {
          markerColor = 'red'
          markerIcon = 'local_bar' // ma
        }

      }

      let iconDivMarkerStyle = `color: white; width: 30px; height: 30px;border-radius: 50% 50% 50% 0;background: ${markerColor};position: absolute;transform: rotate(-45deg);left: 50%;top: 50%;margin: -15px 0 0 -15px;`
      markers[key].icon = Leaflet.divIcon({
        className: 'custom-div-icon',
        html: `<div style='${iconDivMarkerStyle}'><i style='${markerIcoStyle}' class='material-icons'>${markerIcon}</i></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      })
    }
    return markers
  }

}
// export the AppHooks json builder class
export default VehicleLocationPlugin
