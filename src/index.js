/*global carto mapboxgl*/

import './../style/style.scss';
import locations from './locations.geo.json';
import * as trivia from './../trivia/trivia.json';
import { getDistanceFromLngLatInKm } from './utils';

let currentIndex = 0;
let indexes = null;
let inQuestion = false;
let currentPlace = null;
let hits = 0;
let totalScore = 0;

function getRandomInt (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomQuestionIndex () {
  const length = Object.keys(trivia).length - 1;
  const randomIndex = getRandomInt(0, length);
  const questionIndex = getRandomInt(1, 4);
  return `${ randomIndex }: ${ questionIndex }`;
}

function getTenQuestions () {
  const idxs = [];
  while (idxs.length <= 10) {
    let index = getRandomQuestionIndex();
    if (idxs.indexOf(index) > -1) {
      index = getRandomQuestionIndex();
    }
    if (getQuestionFromIndex(index)) {
      idxs.push(index);
    }
  }
  indexes = idxs;
}

function getQuestionFromIndex (index) {
  const [ placeIndex, questionIndex ] = index.split(':');
  const place = trivia[parseInt(placeIndex)];
  const question = place[`Trivia ${questionIndex.trim()}`];
  return question;
}

function getPlaceFromIndex (index) {
  const [ placeIndex, questionIndex ] = index.split(':');
  const place = trivia[parseInt(placeIndex)];
  return place;
}

function getPlaceFromGeoJSON (place) {
  const placeId = parseInt(place.id);
  let thePlace = null;
  if (!Number.isNaN(placeId)) {
    thePlace = locations.features.reduce(function (accum, feature) {
      if (accum === null && placeId === feature.properties.id) {
        accum = feature;
      }
      return accum;
    }, null);  
  }
  return thePlace;
}

function addMap () {
  const map = new mapboxgl.Map({
    container: 'map',
    style: carto.basemaps.darkmatter,
    center: [30, 15],
    zoom: 4
  });

  const locationsSource = new carto.source.GeoJSON(locations);
  const viz = new carto.Viz(`
    @name: $name
  `);

  const layer = new carto.Layer('layer', locationsSource, viz);
  const interactivity = new carto.Interactivity(layer);

  interactivity.on('featureClick', featureEvent => {
    if (inQuestion) {
      const feature = featureEvent.features[0];
      getPlaceFromGeoJSON(currentPlace);
      if (feature) {
        const selectedId = feature.id;
        const targetId = parseInt(currentPlace.id);
        if (selectedId === targetId) {
          const score = calculateScore(0);
          totalScore += score;
          console.log(`YEAH! You nailed it! You earned ${ score } points.`);
          console.log('');
          hits++;
        } else {
          const targetPlace = getPlaceFromGeoJSON(currentPlace);
          let distance = null;
          let distanceText = '';
          if (targetPlace !== null) {
            distance = getDistanceFromLngLatInKm({
              lat: targetPlace.geometry.coordinates[0],
              lng: targetPlace.geometry.coordinates[1]
            }, featureEvent.coordinates);
            distanceText = ` It's ${ Math.floor(distance) } kms. far from the answer.`;
          }
          const score = calculateScore(distance);
          console.log(`FAIL! You clicked on ${ feature.variables.name.value }.${ distanceText }`);
          if (score === 0) {
            console.log(`You didn't earn any points.`);
          } else {
            totalScore += score;
            console.log(`You earned ${ score } points.`);
          }
          console.log('');
        }
        currentIndex++;
        if (currentIndex <= 10) {
          askQuestion();
        } else {
          console.log(`Your score: ${ totalScore }/1000`);
        }  
      }
    }

    // const winterfell = { lng: 14.560156, lat: 26.611139};
    // featureEvent.features.forEach((feature) => {
    //   const name = feature.variables.name.value;
    //   console.log(`:${name}: distance: ${ getDistanceFromLngLatInKm(winterfell, featureEvent.coordinates) }`);
    // });
  });

  layer.addTo(map);
}

function calculateScore (distance) {
  const maxPoints = 100;
  const maxDistance = 1000;
  if (distance === null || distance > maxDistance) {
    return 0;
  }
  const percentage = (maxDistance - distance) / maxDistance;
  return Math.floor(percentage * maxPoints);
}

function askQuestion () {
  const question = getQuestionFromIndex(indexes[currentIndex]);
  inQuestion = true;
  currentPlace = getPlaceFromIndex(indexes[currentIndex]);
  console.log(`${ currentIndex + 1 }/10: ${ question }`);
}

function autorun() {
  console.log('GoT');
  addMap();
  getTenQuestions();
  askQuestion();
}

if (window.addEventListener) {
  window.addEventListener('load', autorun, false);
} else if (window.attachEvent) {
  window.attachEvent('onload', autorun);
} else {
  window.onload = autorun;
}
