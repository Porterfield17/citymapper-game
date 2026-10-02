import './App.css';
import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Marker,
  Polyline,
} from 'react-leaflet';
import {
  getAdminSession,
  getPublishedContent,
  loginAdmin,
  logoutAdmin,
  publishContent,
  subscribeToPublishedContent,
  uploadClueImage,
} from './contentSync';

const gameDay1 = [
  {
    level: 1,
    name: 'Ulaanbaatar',
    coordinates: [47.8864, 106.9057],
    clues: {
      places: ['Genghis Khan Sculpture', 'Genghis Khan Museum'],
      artsCulture: ['One Day in Mongolia', 'Mongolian Throat Singer'],
      people: ['Punsalmaagiin Ochirbat', 'Chinggis Khaan'],
      logos: ['Gobi Cashmere', 'Khan Bank'],
      miscellaneous: ['Yurt', 'Mongolian Coat of Arms'],
    },
  },
  {
    level: 2,
    name: 'Tallinn',
    coordinates: [59.437, 24.7536],
    clues: {
      places: ['Linnahall', 'Tallinn Old Town'],
      artsCulture: ['Kumu', 'Singing Revolution'],
      people: ['Kaia Kanepi', 'Arvo Pärt'],
      logos: ['Skype', 'Bolt'],
      miscellaneous: ['Singing Festival', 'Vana Tallinn'],
    },
  },
  {
    level: 3,
    name: 'Buenos Aires',
    coordinates: [-34.6037, -58.3816],
    clues: {
      places: ['The Obelisk', 'Caminito'],
      artsCulture: ['Evita', 'Tango'],
      people: ['Pope Francis', 'Diego Maradona'],
      logos: ['Subte', 'Quilmes'],
      miscellaneous: ['Steak & Wine', 'Mate'],
    },
  },
  {
    level: 4,
    name: 'Mexico City',
    coordinates: [19.4326, -99.1332],
    clues: {
      places: ['Palacio de Bellas Artes', 'Ángel de la Independencia'],
      artsCulture: [
        'Dream of a Sunday Afternoon at Alameda Central Park',
        "Frida Kahlo's The Two Fridas",
      ],
      people: ['Frida Kahlo', 'Diego Rivera'],
      logos: ['Club América', 'Corona'],
      miscellaneous: ['Lucha Libre', 'Día de los Muertos'],
    },
  },
  {
    level: 5,
    name: 'New York',
    coordinates: [40.7128, -74.006],
    clues: {
      places: ['Grand Central Terminal', 'Statue of Liberty'],
      artsCulture: ['Taxi Driver', 'West Side Story'],
      people: ['Jay-Z', 'Andy Warhol'],
      logos: ['Shake Shack', 'New York Yankees'],
      miscellaneous: ['Pizza Rat', 'New York City Subway'],
    },
  },
];

const correctRadius = 25;

const categoryOrder = ['places', 'artsCulture', 'people', 'logos', 'miscellaneous'];

const gameDayCategoryConfig = [
  ['places', 'artsCulture', 'people', 'logos', 'miscellaneous'],
  ['places', 'people', 'logos', 'miscellaneous'],
  ['places', 'artsCulture', 'people'],
  ['artsCulture', 'miscellaneous'],
  ['logos'],
];

function getLevelCategorySelection(level) {
  return [...(gameDayCategoryConfig[level - 1] ?? ['logos'])];
}

const clueCategories = [
  { id: 'places', label: 'Places' },
  { id: 'artsCulture', label: 'Arts & Culture' },
  { id: 'people', label: 'People' },
  { id: 'logos', label: 'Logos' },
  { id: 'miscellaneous', label: 'Miscellaneous' },
];

const emptyClues = () => ({
  places: [],
  artsCulture: [],
  people: [],
  logos: [],
  miscellaneous: [],
});

const initialCities = [];
const CITY_STORAGE_KEY = 'citymapper-studio-cities-v1';
const CITY_STORAGE_BACKUP_KEY = `${CITY_STORAGE_KEY}-backup`;
const DAILY_GAMES_STORAGE_KEY = 'citymapper-daily-games-v1';
const DAILY_GAMES_STORAGE_BACKUP_KEY = `${DAILY_GAMES_STORAGE_KEY}-backup`;
const INDEXED_DB_NAME = 'citymapper-db';
const INDEXED_DB_VERSION = 2;

function areJsonEqual(valueA, valueB) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

function makeSvgDataUrl(label, accent, textColor = '#111827') {
  const safeLabel = String(label)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="100%" height="100%" fill="${accent}"/>
      <rect x="12" y="12" width="216" height="216" rx="18" fill="rgba(255,255,255,0.2)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="${textColor}" font-family="Arial, sans-serif">${safeLabel}</text>
    </svg>
  `)}`;
}

function buildHistoricalCitySeed() {
  return [
    {
      id: 'city-ulaanbaatar',
      name: 'Ulaanbaatar',
      continent: 'Asia',
      gameLevels: [1, 2, 3],
      coordinates: [47.8864, 106.9057],
      totalUses: 0,
      lastGameUsed: null,
      dailyGames: [],
      clues: {
        places: [
          { id: 'city-ulaanbaatar-places-1', caption: 'Genghis Khan Statue', image: makeSvgDataUrl('Genghis Khan', '#dbeafe') },
          { id: 'city-ulaanbaatar-places-2', caption: 'Sukhbaatar Square', image: makeSvgDataUrl('Square', '#bfdbfe') },
        ],
        artsCulture: [
          { id: 'city-ulaanbaatar-arts-1', caption: 'Traditional throat singing', image: makeSvgDataUrl('Throat Singing', '#fef3c7') },
          { id: 'city-ulaanbaatar-arts-2', caption: 'Mongolian folk performance', image: makeSvgDataUrl('Folk Music', '#fde68a') },
        ],
        people: [
          { id: 'city-ulaanbaatar-people-1', caption: 'Punsalmaagiin Ochirbat', image: makeSvgDataUrl('Ochirbat', '#ddd6fe') },
          { id: 'city-ulaanbaatar-people-2', caption: 'Sanjaa', image: makeSvgDataUrl('Sanjaa', '#c4b5fd') },
        ],
        logos: [
          { id: 'city-ulaanbaatar-logos-1', caption: 'Khan Bank', image: makeSvgDataUrl('Khan Bank', '#dcfce7') },
          { id: 'city-ulaanbaatar-logos-2', caption: 'Gobi Cashmere', image: makeSvgDataUrl('Cashmere', '#bbf7d0') },
        ],
        miscellaneous: [
          { id: 'city-ulaanbaatar-misc-1', caption: 'Ger / Yurt', image: makeSvgDataUrl('Ger', '#fecaca') },
          { id: 'city-ulaanbaatar-misc-2', caption: 'Naadam festival', image: makeSvgDataUrl('Naadam', '#fca5a5') },
        ],
      },
    },
    {
      id: 'city-tallinn',
      name: 'Tallinn',
      continent: 'Europe',
      gameLevels: [1, 2, 3],
      coordinates: [59.437, 24.7536],
      totalUses: 0,
      lastGameUsed: null,
      dailyGames: [],
      clues: {
        places: [
          { id: 'city-tallinn-places-1', caption: 'Old Town', image: makeSvgDataUrl('Old Town', '#dbeafe') },
          { id: 'city-tallinn-places-2', caption: 'Linnahall', image: makeSvgDataUrl('Linnahall', '#bfdbfe') },
        ],
        artsCulture: [
          { id: 'city-tallinn-arts-1', caption: 'Song Festival', image: makeSvgDataUrl('Song Festival', '#fef3c7') },
          { id: 'city-tallinn-arts-2', caption: 'Kumu Art Museum', image: makeSvgDataUrl('Kumu', '#fde68a') },
        ],
        people: [
          { id: 'city-tallinn-people-1', caption: 'Arvo Pärt', image: makeSvgDataUrl('Arvo Pärt', '#ddd6fe') },
          { id: 'city-tallinn-people-2', caption: 'Kaia Kanepi', image: makeSvgDataUrl('Kaia Kanepi', '#c4b5fd') },
        ],
        logos: [
          { id: 'city-tallinn-logos-1', caption: 'Bolt', image: makeSvgDataUrl('Bolt', '#dcfce7') },
          { id: 'city-tallinn-logos-2', caption: 'Skype', image: makeSvgDataUrl('Skype', '#bbf7d0') },
        ],
        miscellaneous: [
          { id: 'city-tallinn-misc-1', caption: 'Vana Tallinn', image: makeSvgDataUrl('Vana Tallinn', '#fecaca') },
          { id: 'city-tallinn-misc-2', caption: 'Singing Revolution', image: makeSvgDataUrl('Revolution', '#fca5a5') },
        ],
      },
    },
    {
      id: 'city-porto',
      name: 'Porto',
      continent: 'Europe',
      gameLevels: [1, 2, 3],
      coordinates: [41.1579, -8.6291],
      totalUses: 0,
      lastGameUsed: null,
      dailyGames: [],
      clues: {
        places: [
          { id: 'city-porto-places-1', caption: 'Dom Luís I Bridge', image: makeSvgDataUrl('Bridge', '#dbeafe') },
          { id: 'city-porto-places-2', caption: 'Ribeira district', image: makeSvgDataUrl('Ribeira', '#bfdbfe') },
        ],
        artsCulture: [
          { id: 'city-porto-arts-1', caption: 'Port wine', image: makeSvgDataUrl('Port Wine', '#fef3c7') },
          { id: 'city-porto-arts-2', caption: 'Serralves', image: makeSvgDataUrl('Serralves', '#fde68a') },
        ],
        people: [
          { id: 'city-porto-people-1', caption: 'Fátima', image: makeSvgDataUrl('Fátima', '#ddd6fe') },
          { id: 'city-porto-people-2', caption: 'Fernando Pessoa', image: makeSvgDataUrl('Pessoa', '#c4b5fd') },
        ],
        logos: [
          { id: 'city-porto-logos-1', caption: 'Porto', image: makeSvgDataUrl('Porto', '#dcfce7') },
          { id: 'city-porto-logos-2', caption: 'Tram 1', image: makeSvgDataUrl('Tram 1', '#bbf7d0') },
        ],
        miscellaneous: [
          { id: 'city-porto-misc-1', caption: 'Azulejo tiles', image: makeSvgDataUrl('Tiles', '#fecaca') },
          { id: 'city-porto-misc-2', caption: 'Port wine lodges', image: makeSvgDataUrl('Lodges', '#fca5a5') },
        ],
      },
    },
    {
      id: 'city-mexico-city',
      name: 'Mexico City',
      continent: 'North America',
      gameLevels: [1, 2, 3],
      coordinates: [19.4326, -99.1332],
      totalUses: 0,
      lastGameUsed: null,
      dailyGames: [],
      clues: {
        places: [
          { id: 'city-mexico-city-places-1', caption: 'Palacio de Bellas Artes', image: makeSvgDataUrl('Bellas Artes', '#dbeafe') },
          { id: 'city-mexico-city-places-2', caption: 'Ángel de la Independencia', image: makeSvgDataUrl('Angel', '#bfdbfe') },
        ],
        artsCulture: [
          { id: 'city-mexico-city-arts-1', caption: 'Frida Kahlo', image: makeSvgDataUrl('Frida Kahlo', '#fef3c7') },
          { id: 'city-mexico-city-arts-2', caption: 'Lucha Libre', image: makeSvgDataUrl('Lucha Libre', '#fde68a') },
        ],
        people: [
          { id: 'city-mexico-city-people-1', caption: 'Diego Rivera', image: makeSvgDataUrl('Rivera', '#ddd6fe') },
          { id: 'city-mexico-city-people-2', caption: 'Salma Hayek', image: makeSvgDataUrl('Hayek', '#c4b5fd') },
        ],
        logos: [
          { id: 'city-mexico-city-logos-1', caption: 'Corona', image: makeSvgDataUrl('Corona', '#dcfce7') },
          { id: 'city-mexico-city-logos-2', caption: 'Club América', image: makeSvgDataUrl('Club América', '#bbf7d0') },
        ],
        miscellaneous: [
          { id: 'city-mexico-city-misc-1', caption: 'Día de los Muertos', image: makeSvgDataUrl('Muertos', '#fecaca') },
          { id: 'city-mexico-city-misc-2', caption: 'Tacos al pastor', image: makeSvgDataUrl('Tacos', '#fca5a5') },
        ],
      },
    },
    {
      id: 'city-new-york',
      name: 'New York',
      continent: 'North America',
      gameLevels: [1, 2, 3],
      coordinates: [40.7128, -74.006],
      totalUses: 0,
      lastGameUsed: null,
      dailyGames: [],
      clues: {
        places: [
          { id: 'city-new-york-places-1', caption: 'Statue of Liberty', image: makeSvgDataUrl('Liberty', '#dbeafe') },
          { id: 'city-new-york-places-2', caption: 'Grand Central', image: makeSvgDataUrl('Grand Central', '#bfdbfe') },
        ],
        artsCulture: [
          { id: 'city-new-york-arts-1', caption: 'Broadway', image: makeSvgDataUrl('Broadway', '#fef3c7') },
          { id: 'city-new-york-arts-2', caption: 'Museum of Modern Art', image: makeSvgDataUrl('MoMA', '#fde68a') },
        ],
        people: [
          { id: 'city-new-york-people-1', caption: 'Jay-Z', image: makeSvgDataUrl('Jay-Z', '#ddd6fe') },
          { id: 'city-new-york-people-2', caption: 'Andy Warhol', image: makeSvgDataUrl('Warhol', '#c4b5fd') },
        ],
        logos: [
          { id: 'city-new-york-logos-1', caption: 'New York Yankees', image: makeSvgDataUrl('Yankees', '#dcfce7') },
          { id: 'city-new-york-logos-2', caption: 'Shake Shack', image: makeSvgDataUrl('Shake Shack', '#bbf7d0') },
        ],
        miscellaneous: [
          { id: 'city-new-york-misc-1', caption: 'NYC subway', image: makeSvgDataUrl('Subway', '#fecaca') },
          { id: 'city-new-york-misc-2', caption: 'pizza slice', image: makeSvgDataUrl('Pizza', '#fca5a5') },
        ],
      },
    },
  ];
}

function isGeneratedDefaultCityName(cityName) {
  const generatedNames = ['London', 'Paris', 'Rome', 'Tallinn', 'Tokyo'];
  return Boolean(cityName) && generatedNames.includes(cityName);
}

function isGeneratedDefaultCitySet(cities) {
  if (!Array.isArray(cities) || cities.length !== 5) {
    return false;
  }

  return cities.every((city) => city && city.name && isGeneratedDefaultCityName(city.name));
}

function hasUserCreatedCityData(entries) {
  if (!Array.isArray(entries)) {
    return false;
  }

  return entries.some((city) => {
    if (!city || typeof city !== 'object') {
      return false;
    }

    const hasCustomCityName = !isGeneratedDefaultCityName(city.name);
    const hasImageData = Object.values(city.clues ?? {}).some((clues) =>
      Array.isArray(clues) && clues.some((clue) => Boolean(clue?.image && clue.image.startsWith('data:image/')))
    );

    return hasCustomCityName || hasImageData || (city.dailyGames ?? []).length > 0;
  });
}

function getDurableCityData() {
  const primaryCities = getFallbackStoredValue(CITY_STORAGE_KEY) ?? [];
  const backupCities = getFallbackStoredValue(CITY_STORAGE_BACKUP_KEY) ?? [];
  const historicalSeed = buildHistoricalCitySeed();

  const mergedCities = mergeStoredEntries(primaryCities, backupCities);

  if (hasUserCreatedCityData(mergedCities)) {
    return mergedCities;
  }

  if (hasUserCreatedCityData(primaryCities) || hasUserCreatedCityData(backupCities)) {
    return mergeStoredEntries(primaryCities, backupCities);
  }

  if (mergedCities.length === 0) {
    return historicalSeed;
  }

  return isGeneratedDefaultCitySet(mergedCities) ? historicalSeed : mergedCities;
}

function getFallbackStoredValue(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    return null;
  }
}

function countImagePayloads(value) {
  if (!value || typeof value !== 'object') {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countImagePayloads(item), 0);
  }

  let total = 0;

  if (typeof value.image === 'string' && value.image.startsWith('data:image/') && value.image.length > 200) {
    total += 1;
  }

  Object.values(value).forEach((nestedValue) => {
    total += countImagePayloads(nestedValue);
  });

  return total;
}

function getEntryPriorityScore(entry) {
  if (!entry || typeof entry !== 'object') {
    return 0;
  }

  return countImagePayloads(entry) * 100000 + JSON.stringify(entry).length;
}

function mergeStoredEntries(primaryEntries, secondaryEntries, idKey = 'id') {
  if (!Array.isArray(primaryEntries) && !Array.isArray(secondaryEntries)) {
    return [];
  }

  const mergedMap = new Map();

  [...(Array.isArray(secondaryEntries) ? secondaryEntries : []), ...(Array.isArray(primaryEntries) ? primaryEntries : [])].forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const key = entry[idKey] ?? `${Date.now()}-${Math.random()}`;
    const existingEntry = mergedMap.get(key);
    const nextScore = getEntryPriorityScore(entry);
    const currentScore = existingEntry ? getEntryPriorityScore(existingEntry) : 0;

    if (!existingEntry || nextScore > currentScore) {
      mergedMap.set(key, entry);
    }
  });

  return Array.from(mergedMap.values());
}

function persistJsonFallback(key, value) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('appData')) {
        database.createObjectStore('appData');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open storage database.'));
  });
}

async function readStoredCities() {
  if (typeof window === 'undefined') {
    return [];
  }

  const legacyCities = getFallbackStoredValue(CITY_STORAGE_KEY) ?? [];
  const backupCities = getFallbackStoredValue(CITY_STORAGE_BACKUP_KEY) ?? [];
  const indexedBackupCities = [];
  const mergedLegacyCities = mergeStoredEntries(legacyCities, backupCities);

  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('appData', 'readonly');
      const store = transaction.objectStore('appData');
      const request = store.get(CITY_STORAGE_KEY);
      const backupRequest = store.get(CITY_STORAGE_BACKUP_KEY);

      request.onsuccess = () => {
        const indexedCities = request.result ?? [];
        backupRequest.onsuccess = () => {
          const indexedBackup = backupRequest.result ?? [];
          const mergedCities = mergeStoredEntries(indexedCities, mergeStoredEntries(mergedLegacyCities, indexedBackup));
          const recoveredCities = hasUserCreatedCityData(mergedCities)
            ? mergedCities
            : getDurableCityData();
          resolve(recoveredCities);
        };
        backupRequest.onerror = () => {
          const mergedCities = mergeStoredEntries(indexedCities, mergedLegacyCities);
          resolve(hasUserCreatedCityData(mergedCities) ? mergedCities : getDurableCityData());
        };
      };
      request.onerror = () => reject(request.error || new Error('Could not load cities.'));
    });
  } catch (error) {
    const recoveredCities = getDurableCityData();
    return recoveredCities;
  }
}

async function readStoredDailyGames() {
  if (typeof window === 'undefined') {
    return [];
  }

  const legacyGames = getFallbackStoredValue(DAILY_GAMES_STORAGE_KEY) ?? [];
  const backupGames = getFallbackStoredValue(DAILY_GAMES_STORAGE_BACKUP_KEY) ?? [];
  const mergedLegacyGames = mergeStoredEntries(legacyGames, backupGames);

  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('appData', 'readonly');
      const store = transaction.objectStore('appData');
      const request = store.get(DAILY_GAMES_STORAGE_KEY);

      request.onsuccess = () => {
        const indexedGames = request.result ?? [];
        resolve(mergeStoredEntries(indexedGames, mergedLegacyGames));
      };
      request.onerror = () => reject(request.error || new Error('Could not load daily games.'));
    });
  } catch (error) {
    return mergedLegacyGames;
  }
}

async function persistJsonToStorage(key, value) {
  if (typeof window === 'undefined') {
    return false;
  }

  const backupKey = `${key}-backup`;

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('appData', 'readwrite');
      const store = transaction.objectStore('appData');
      const request = store.put(value, key);
      const backupRequest = store.put(value, backupKey);

      request.onsuccess = () => backupRequest.onsuccess ? resolve() : resolve();
      request.onerror = () => reject(request.error || new Error('Could not save data.'));
      backupRequest.onerror = () => reject(backupRequest.error || new Error('Could not save backup data.'));
    });

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.localStorage.setItem(backupKey, JSON.stringify(value));
    } catch (error) {
      // Keep the IndexedDB copy as the source of truth, but avoid blanking the app when localStorage is full.
    }

    return true;
  } catch (error) {
    const fallbackResult = persistJsonFallback(key, value);
    persistJsonFallback(backupKey, value);
    return fallbackResult;
  }
}

function compressImageDataUrl(file, maxDimension = 640, quality = 0.42) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No image file was selected.'));
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      reject(new Error('This image is too large. Please upload a smaller image under 2MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : '';
      if (!source) {
        reject(new Error('No image data found.'));
        return;
      }

      const image = new Image();
      image.onload = () => {
        const attempts = [
          { maxDimension, quality },
          { maxDimension: 520, quality: 0.32 },
          { maxDimension: 420, quality: 0.24 },
        ];

        const tryRender = (attemptIndex) => {
          const attempt = attempts[attemptIndex];
          const squareSize = Math.min(attempt.maxDimension, 800);
          const scale = Math.min(squareSize / image.width, squareSize / image.height);
          const drawWidth = Math.max(1, Math.round(image.width * scale));
          const drawHeight = Math.max(1, Math.round(image.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = squareSize;
          canvas.height = squareSize;

          const context = canvas.getContext('2d');
          if (!context) {
            resolve(source);
            return;
          }

          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, squareSize, squareSize);
          context.drawImage(
            image,
            (squareSize - drawWidth) / 2,
            (squareSize - drawHeight) / 2,
            drawWidth,
            drawHeight
          );

          const output = canvas.toDataURL('image/jpeg', attempt.quality);
          if (output.length > 220000 && attemptIndex < attempts.length - 1) {
            tryRender(attemptIndex + 1);
            return;
          }

          resolve(output);
        };

        tryRender(0);
      };
      image.onerror = () => reject(new Error('This image could not be processed.'));
      image.src = source;
    };
    reader.onerror = () => reject(new Error('This image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function createEmptyGameDraft() {
  return {
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
  };
}

function hasUploadedImage(clue) {
  return Boolean(clue?.image && typeof clue.image === 'string' && clue.image.startsWith('data:image/'));
}

function getValidCluesForCategory(city, categoryId) {
  if (!city || !city.clues) {
    return [];
  }

  return (city.clues[categoryId] ?? []).filter((clue) => hasUploadedImage(clue));
}

function isCityEligibleForDailyGame(city) {
  if (!city || !city.clues) {
    return false;
  }

  const totalImageClues = clueCategories.reduce(
    (sum, { id }) => sum + getValidCluesForCategory(city, id).length,
    0
  );

  const hasCategoryMinimums = clueCategories.every(
    ({ id }) => getValidCluesForCategory(city, id).length >= 2
  );

  return hasCategoryMinimums && totalImageClues >= 10;
}

function getCityReadiness(city) {
  if (!city || !city.clues) {
    return { ready: false, totalClues: 0, label: 'Not Ready' };
  }

  const totalClues = clueCategories.reduce(
    (sum, { id }) => sum + getValidCluesForCategory(city, id).length,
    0
  );

  const ready = clueCategories.every(({ id }) => getValidCluesForCategory(city, id).length >= 2) && totalClues >= 10;

  return {
    ready,
    totalClues,
    label: ready ? 'Ready for Gameplay' : 'Not Ready',
  };
}

function getCityAverageScore(city, dailyGames) {
  if (!city || !Array.isArray(dailyGames)) {
    return null;
  }

  const matchingGames = dailyGames.filter((game) => {
    if (!game || !game.levels) {
      return false;
    }

    return Object.values(game.levels).includes(city.id);
  });

  if (matchingGames.length === 0) {
    return null;
  }

  const validScores = matchingGames
    .map((game) => Number(game.averageScore))
    .filter((score) => Number.isFinite(score));

  if (validScores.length === 0) {
    return null;
  }

  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  return Number(average.toFixed(1));
}

function getRandomClueForCategory(city, categoryId) {
  const cluePool = city.clues?.[categoryId] ?? [];
  if (cluePool.length === 0) {
    return null;
  }

  return cluePool[Math.floor(Math.random() * cluePool.length)];
}

function getNextGameNumber(dailyGames) {
  if (!Array.isArray(dailyGames) || dailyGames.length === 0) {
    return 0;
  }

  return dailyGames.reduce((currentMax, game) => Math.max(currentMax, game.gameNumber ?? 0), 0) + 1;
}

function getGameCityIds(gameLevels) {
  return Object.values(gameLevels ?? {}).filter(Boolean);
}

function getCityById(cities, cityId) {
  return cities.find((city) => city.id === cityId) ?? null;
}

function isFutureDate(dateString) {
  if (!dateString) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${dateString}T00:00:00`);
  return targetDate.getTime() > today.getTime();
}

function normalizeCityDisplayName(cityName) {
  const trimmedName = cityName.trim();
  if (!trimmedName) {
    return '';
  }

  const [primaryName] = trimmedName.split(',');
  return primaryName.trim();
}

function sortCitiesByName(cities) {
  return [...cities].sort((cityA, cityB) =>
    cityA.name.localeCompare(cityB.name, undefined, { sensitivity: 'base' })
  );
}

function seededShuffle(items, seedString) {
  const shuffled = [...items];

  let seed = 0;
  for (let index = 0; index < seedString.length; index += 1) {
    seed = (seed * 31 + seedString.charCodeAt(index)) >>> 0;
  }

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const randomIndex = seed % (index + 1);
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getRoundCategorySelection(gameId, level) {
  const levelCounts = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
  const categoryIds = clueCategories.map(({ id }) => id);
  const shuffled = seededShuffle(categoryIds, `${gameId}-${level}`);
  return shuffled.slice(0, levelCounts[level] ?? 1);
}

async function geocodeCity(cityName) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(cityName)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Unable to geocode city');
  }

  const candidates = await response.json();

  if (!candidates || candidates.length === 0) {
    throw new Error('No location found');
  }

  const city = candidates[0];

  return [Number(city.lat), Number(city.lon)];
}

function calculateDistance(point1, point2) {
  const earthRadius = 6371;

  const lat1 = (point1[0] * Math.PI) / 180;
  const lat2 = (point2[0] * Math.PI) / 180;

  const deltaLat = ((point2[0] - point1[0]) * Math.PI) / 180;
  const deltaLng = ((point2[1] - point1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function GuessMarker({ setGuess, disabled }) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        setGuess([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return null;
}

function StudioPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  useEffect(() => {
    let isActive = true;

    getAdminSession()
      .then(({ authenticated }) => {
        if (isActive) {
          setIsAuthenticated(authenticated);
        }
      })
      .catch((error) => {
        if (isActive) {
          setAuthError(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleAdminLogin(event) {
    event.preventDefault();
    setIsSubmittingLogin(true);
    setAuthError('');

    try {
      await loginAdmin(adminName, adminPassword);
      setAdminPassword('');
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleAdminLogout() {
    await logoutAdmin().catch(() => {});
    setAdminPassword('');
    setIsAuthenticated(false);
  }

  if (isCheckingSession) {
    return (
      <main className="studio-login-page">
        <p>Checking admin session…</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return <StudioWorkspace onLogout={handleAdminLogout} />;
  }

  return (
    <main className="studio-login-page">
      <section className="studio-login-panel">
        <p className="eyebrow">CITYMAPPER STUDIO</p>
        <h1>Admin sign in</h1>
        <form className="studio-form" onSubmit={handleAdminLogin}>
          <label htmlFor="admin-name">Admin name</label>
          <input
            id="admin-name"
            type="text"
            autoComplete="username"
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            required
          />
          {authError && <p className="field-error" role="alert">{authError}</p>}
          <button type="submit" className="primary-button" disabled={isSubmittingLogin}>
            {isSubmittingLogin ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link to="/" className="inline-link">Return to game</Link>
      </section>
    </main>
  );
}

function StudioWorkspace({ onLogout }) {
  const [activeTab, setActiveTab] = useState('City Database');
  const [cities, setCities] = useState([]);
  const [dailyGames, setDailyGames] = useState([]);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const skipNextCloudSave = useRef(false);
  const cloudSaveQueue = useRef(Promise.resolve());
  const latestContent = useRef({ cities, dailyGames });

  useEffect(() => {
    latestContent.current = { cities, dailyGames };
  }, [cities, dailyGames]);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityContinent, setNewCityContinent] = useState('Europe');
  const [newCityLevels, setNewCityLevels] = useState([1]);
  const [citySearch, setCitySearch] = useState('');
  const [cityError, setCityError] = useState('');
  const [cityDetailError, setCityDetailError] = useState('');
  const [isEditingCityDetails, setIsEditingCityDetails] = useState(false);
  const [cityDetailDraft, setCityDetailDraft] = useState({
    name: '',
    continent: 'Europe',
    gameLevels: [1],
    coordinates: [0, 0],
  });
  const [uploadError, setUploadError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [dailyGameError, setDailyGameError] = useState('');
  const [selectedGameDate, setSelectedGameDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedGameNumber, setSelectedGameNumber] = useState(0);
  const [buildMode, setBuildMode] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [gameDraft, setGameDraft] = useState(createEmptyGameDraft);
  const [draftInputValues, setDraftInputValues] = useState(createEmptyGameDraft);
  const [isSubmittingCity, setIsSubmittingCity] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState(() => ({
    places: { caption: '', image: '', isEditing: false, clueId: null },
    artsCulture: { caption: '', image: '', isEditing: false, clueId: null },
    people: { caption: '', image: '', isEditing: false, clueId: null },
    logos: { caption: '', image: '', isEditing: false, clueId: null },
    miscellaneous: { caption: '', image: '', isEditing: false, clueId: null },
  }));

  const orderedCities = sortCitiesByName(cities);
  const orderedDailyGames = [...dailyGames].sort(
    (gameA, gameB) => (gameA.gameNumber ?? 0) - (gameB.gameNumber ?? 0)
  );
  const filteredCities = citySearch.trim()
    ? orderedCities.filter((city) => city.name.toLowerCase().includes(citySearch.trim().toLowerCase()))
    : orderedCities;

  const visibleCities = filteredCities;

  const selectedCity =
    cities.find((city) => city.id === selectedCityId) ?? visibleCities[0] ?? null;
  const selectedCityAverageScore = selectedCity ? getCityAverageScore(selectedCity, dailyGames) : null;

  useEffect(() => {
    let isActive = true;

    const legacyCities = getDurableCityData();
    const legacyDailyGames = getFallbackStoredValue(DAILY_GAMES_STORAGE_KEY) ?? [];

    setCities(legacyCities);
    setDailyGames(legacyDailyGames);

    async function loadStoredData() {
      try {
        const [storedCities, storedDailyGames, publishedContent] = await Promise.all([
          readStoredCities(),
          readStoredDailyGames(),
          getPublishedContent().catch(() => null),
        ]);

        if (!isActive) {
          return;
        }

        const mergedCities = mergeStoredEntries(storedCities, legacyCities);
        const mergedDailyGames = mergeStoredEntries(storedDailyGames, legacyDailyGames);

        setCities(publishedContent?.cities ?? mergedCities);
        setDailyGames(publishedContent?.dailyGames ?? mergedDailyGames);
        skipNextCloudSave.current = Boolean(publishedContent);
      } catch (error) {
        if (isActive) {
          setCities(legacyCities);
          setDailyGames(legacyDailyGames);
          skipNextCloudSave.current = false;
        }
      } finally {
        if (isActive) {
          setIsStorageHydrated(true);
        }
      }
    }

    loadStoredData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageHydrated || typeof window === 'undefined') {
      return;
    }

    const shouldPublish = !skipNextCloudSave.current;
    skipNextCloudSave.current = false;

    void (async () => {
      const [savedCities, savedGames] = await Promise.all([
        persistJsonToStorage(CITY_STORAGE_KEY, cities),
        persistJsonToStorage(DAILY_GAMES_STORAGE_KEY, dailyGames),
      ]);

      if (!savedCities || !savedGames) {
        setStorageWarning('Storage is full. Remove large photos or export data to keep adding clues.');
      }

      if (!shouldPublish) {
        return;
      }

      const content = { cities, dailyGames };
      cloudSaveQueue.current = cloudSaveQueue.current
        .catch(() => {})
        .then(async () => {
          try {
            await publishContent(content);
            if (savedCities && savedGames) {
              setStorageWarning('');
            }
          } catch (error) {
            setStorageWarning(`Live publish failed: ${error.message}`);
          }
        });
    })();
  }, [cities, dailyGames, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated) {
      return undefined;
    }

    return subscribeToPublishedContent((content) => {
      const citiesChanged = !areJsonEqual(latestContent.current.cities, content.cities);
      const gamesChanged = !areJsonEqual(latestContent.current.dailyGames, content.dailyGames);
      if (!citiesChanged && !gamesChanged) {
        return;
      }

      skipNextCloudSave.current = true;
      if (citiesChanged) {
        setCities(content.cities);
      }
      if (gamesChanged) {
        setDailyGames(content.dailyGames);
      }
    });
  }, [isStorageHydrated]);

  useEffect(() => {
    if (!selectedCityId && orderedCities.length > 0) {
      setSelectedCityId(orderedCities[0].id);
    }
  }, [orderedCities, selectedCityId]);

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    setCityDetailDraft({
      name: selectedCity.name ?? '',
      continent: selectedCity.continent ?? 'Europe',
      gameLevels: [...(selectedCity.gameLevels ?? [1])],
      coordinates: [
        Number(selectedCity.coordinates?.[0] ?? 0),
        Number(selectedCity.coordinates?.[1] ?? 0),
      ],
    });
    setCityDetailError('');
  }, [selectedCity]);

  function resetCategoryDrafts() {
    setCategoryDrafts({
      places: { caption: '', image: '', isEditing: false, clueId: null },
      artsCulture: { caption: '', image: '', isEditing: false, clueId: null },
      people: { caption: '', image: '', isEditing: false, clueId: null },
      logos: { caption: '', image: '', isEditing: false, clueId: null },
      miscellaneous: { caption: '', image: '', isEditing: false, clueId: null },
    });
  }

  async function handleAddCity(event) {
    event.preventDefault();

    const trimmedName = newCityName.trim();
    if (!trimmedName) {
      setCityError('City name is required.');
      return;
    }

    const cityDisplayName = normalizeCityDisplayName(trimmedName);
    if (!cityDisplayName) {
      setCityError('City name is required.');
      return;
    }

    const alreadyExists = cities.some(
      (city) => normalizeCityDisplayName(city.name) === cityDisplayName
    );

    if (alreadyExists) {
      setCityError('This city is already in the database.');
      return;
    }

    setIsSubmittingCity(true);
    setCityError('');

    try {
      const coordinates = await geocodeCity(trimmedName);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newCityId = `${cityDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-city-${uniqueSuffix}`;

      const cityToAdd = {
        id: newCityId,
        name: cityDisplayName,
        continent: newCityContinent,
        gameLevels: newCityLevels,
        coordinates,
        totalUses: 0,
        lastGameUsed: null,
        averageScore: null,
        dailyGames: [],
        clues: emptyClues(),
      };

      setCities((previousCities) => sortCitiesByName([...previousCities, cityToAdd]));
      setSelectedCityId(newCityId);
      setNewCityName('');
      setNewCityContinent('Europe');
      setNewCityLevels([1]);
      setShowCityForm(false);
      setCitySearch('');
      resetCategoryDrafts();
    } catch (error) {
      setCityError('We could not find that city automatically. Please try a more specific name.');
    } finally {
      setIsSubmittingCity(false);
    }
  }

  function toggleGameLevel(level) {
    setNewCityLevels((previousLevels) => {
      if (previousLevels.includes(level)) {
        return previousLevels.filter((currentLevel) => currentLevel !== level);
      }

      return [...previousLevels, level].sort((a, b) => a - b);
    });
  }

  function handleDeleteClue(cityId, category, clueId) {
    setCities((previousCities) =>
      previousCities.map((city) => {
        if (city.id !== cityId) {
          return city;
        }

        return {
          ...city,
          clues: {
            ...city.clues,
            [category]: city.clues[category].filter((clue) => clue.id !== clueId),
          },
        };
      })
    );
  }

  function handleCityDetailLevelToggle(level) {
    setCityDetailDraft((previousDraft) => {
      const nextLevels = previousDraft.gameLevels.includes(level)
        ? previousDraft.gameLevels.filter((currentLevel) => currentLevel !== level)
        : [...previousDraft.gameLevels, level].sort((a, b) => a - b);

      return {
        ...previousDraft,
        gameLevels: nextLevels,
      };
    });
  }

  function handleSaveCityDetails() {
    if (!selectedCity) {
      return;
    }

    const trimmedName = cityDetailDraft.name.trim();
    if (!trimmedName) {
      setCityDetailError('City name is required.');
      return;
    }

    const nextLevels = [...new Set(cityDetailDraft.gameLevels.map(Number).filter((value) => [1, 2, 3, 4, 5].includes(value)))].sort((a, b) => a - b);
    if (nextLevels.length === 0) {
      setCityDetailError('Choose at least one gameplay level.');
      return;
    }

    const latitude = Number(cityDetailDraft.coordinates[0]);
    const longitude = Number(cityDetailDraft.coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setCityDetailError('Coordinates must be valid numbers.');
      return;
    }

    const normalizedName = normalizeCityDisplayName(trimmedName);
    const duplicateName = cities.some(
      (city) => city.id !== selectedCity.id && normalizeCityDisplayName(city.name) === normalizedName
    );

    if (duplicateName) {
      setCityDetailError('Another city already has this name.');
      return;
    }

    setCities((previousCities) =>
      previousCities.map((city) => {
        if (city.id !== selectedCity.id) {
          return city;
        }

        return {
          ...city,
          name: normalizedName,
          continent: cityDetailDraft.continent || 'Europe',
          gameLevels: nextLevels,
          coordinates: [latitude, longitude],
        };
      })
    );

    setIsEditingCityDetails(false);
    setCityDetailError('');
  }

  async function handleClueFileUpload(category, event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const compressedImage = await compressImageDataUrl(file);
      const publishedImage = await uploadClueImage(compressedImage);
      setUploadError('');
      setCategoryDrafts((previousDrafts) => ({
        ...previousDrafts,
        [category]: {
          ...previousDrafts[category],
          image: publishedImage,
        },
      }));
    } catch (error) {
      setUploadError(error.message || 'This image could not be uploaded.');
      setCategoryDrafts((previousDrafts) => ({
        ...previousDrafts,
        [category]: {
          ...previousDrafts[category],
          image: '',
        },
      }));
    }

    event.target.value = '';
  }

  function handleAddClueForCategory(category) {
    if (!selectedCity) {
      return;
    }

    const draft = categoryDrafts[category];
    const trimmedCaption = draft.caption.trim();
    const hasValidImage = Boolean(draft.image && typeof draft.image === 'string' && draft.image.startsWith('data:image/'));

    if (!trimmedCaption || !hasValidImage) {
      setUploadError('Clues can only be saved with a real uploaded image.');
      return;
    }

    setUploadError('');

    setCities((previousCities) =>
      previousCities.map((city) => {
        if (city.id !== selectedCity.id) {
          return city;
        }

        const currentClues = city.clues[category] ?? [];

        if (draft.isEditing && draft.clueId) {
          return {
            ...city,
            clues: {
              ...city.clues,
              [category]: currentClues.map((clue) =>
                clue.id === draft.clueId
                  ? { ...clue, caption: trimmedCaption, image: draft.image }
                  : clue
              ),
            },
          };
        }

        const newClue = {
          id: `${selectedCity.id}-${category}-${Date.now()}`,
          caption: trimmedCaption,
          image: draft.image,
        };

        return {
          ...city,
          clues: {
            ...city.clues,
            [category]: [...currentClues, newClue],
          },
        };
      })
    );

    setCategoryDrafts((previousDrafts) => ({
      ...previousDrafts,
      [category]: { caption: '', image: '', isEditing: false, clueId: null },
    }));
  }

  function handleEditClue(category, clue) {
    setCategoryDrafts((previousDrafts) => ({
      ...previousDrafts,
      [category]: {
        caption: clue.caption,
        image: clue.image,
        isEditing: true,
        clueId: clue.id,
      },
    }));
  }

  function clearGameBuilder() {
    setEditingGameId(null);
    setGameDraft(createEmptyGameDraft());
    setDraftInputValues(createEmptyGameDraft());
    setSelectedGameDate(new Date().toISOString().slice(0, 10));
    setSelectedGameNumber(getNextGameNumber(dailyGames));
    setDailyGameError('');
  }

  function startNewGameBuilder() {
    clearGameBuilder();
    setBuildMode(true);
  }

  function startEditingGame(game) {
    const nextGameDraft = {
      1: game.levels?.[1] ?? '',
      2: game.levels?.[2] ?? '',
      3: game.levels?.[3] ?? '',
      4: game.levels?.[4] ?? '',
      5: game.levels?.[5] ?? '',
    };
    const nextInputValues = {};

    [1, 2, 3, 4, 5].forEach((level) => {
      const cityId = nextGameDraft[level];
      const city = getCityById(cities, cityId);
      nextInputValues[level] = city ? city.name : '';
    });

    setEditingGameId(game.id);
    setGameDraft(nextGameDraft);
    setDraftInputValues(nextInputValues);
    setSelectedGameDate(game.date);
    setSelectedGameNumber(Number(game.gameNumber ?? 0));
    setDailyGameError('');
    setBuildMode(true);
  }

  function handleDailyGameSelection(level, inputValue) {
    const normalized = inputValue.trim();
    const matchingCity = cities.find(
      (city) => city.name.toLowerCase() === normalized.toLowerCase()
    );

    if (normalized && matchingCity && !isCityEligibleForDailyGame(matchingCity)) {
      setDailyGameError(
        `${matchingCity.name} needs at least 2 clues in every category before it can be used in a daily game.`
      );
    } else {
      setDailyGameError('');
    }

    setDraftInputValues((previousValues) => ({
      ...previousValues,
      [level]: normalized,
    }));

    setGameDraft((previousDraft) => ({
      ...previousDraft,
      [level]: matchingCity ? matchingCity.id : '',
    }));
  }

  function handleSaveDailyGame(event) {
    event.preventDefault();

    const levelSlots = [1, 2, 3, 4, 5];
    const selectedCityIds = levelSlots.map((level) => gameDraft[level]).filter(Boolean);
    const isComplete = selectedCityIds.length === levelSlots.length;

    if (!isComplete) {
      setDailyGameError('Pick one city for each level before saving the daily game.');
      return;
    }

    const nextGameNumberValue = Number(selectedGameNumber);
    if (!Number.isFinite(nextGameNumberValue) || nextGameNumberValue < 0) {
      setDailyGameError('Enter a valid game number.');
      return;
    }

    const duplicateGameNumber = dailyGames.some(
      (game) => game.id !== editingGameId && Number(game.gameNumber ?? 0) === nextGameNumberValue
    );

    if (duplicateGameNumber) {
      setDailyGameError('Another daily game already uses that game number.');
      return;
    }

    const invalidCity = selectedCityIds
      .map((cityId) => getCityById(cities, cityId))
      .find((city) => !isCityEligibleForDailyGame(city));

    if (invalidCity) {
      setDailyGameError(
        `${invalidCity.name} needs at least 2 clues in every category before it can be used in a daily game.`
      );
      return;
    }

    const selectedCitiesByLevel = Object.fromEntries(
      levelSlots.map((level) => [level, getCityById(cities, gameDraft[level])])
    );
    const clueSetByLevel = Object.fromEntries(
      levelSlots.map((level) => {
        const city = selectedCitiesByLevel[level];
        const clueSet = {};

        clueCategories.forEach(({ id }) => {
          const nextClue = getRandomClueForCategory(city, id);
          clueSet[id] = nextClue ?? null;
        });

        return [level, clueSet];
      })
    );

    if (editingGameId) {
      const existingGame = dailyGames.find((game) => game.id === editingGameId);
      const previousCityIds = getGameCityIds(existingGame?.levels ?? {});
      const nextCityIds = getGameCityIds(gameDraft);
      const addedCityIds = nextCityIds.filter((cityId) => !previousCityIds.includes(cityId));
      const removedCityIds = previousCityIds.filter((cityId) => !nextCityIds.includes(cityId));

      setDailyGames((previousGames) =>
        previousGames.map((game) =>
          game.id === editingGameId
            ? {
                ...game,
                id: `daily-game-${nextGameNumberValue}-${selectedGameDate}`,
                gameNumber: nextGameNumberValue,
                date: selectedGameDate,
                levels: gameDraft,
                clueSet: clueSetByLevel,
                gamesPlayed: game.gamesPlayed ?? 0,
                averageScore: game.averageScore ?? 0,
              }
            : game
        )
      );

      setCities((previousCities) =>
        previousCities.map((city) => {
          let totalUses = city.totalUses ?? 0;
          let nextDailyGames = [...(city.dailyGames ?? [])].map((entry) => {
            const matchesExistingEntry =
              entry.gameNumber === existingGame?.gameNumber && entry.date === existingGame?.date;

            if (matchesExistingEntry) {
              return {
                ...entry,
                gameNumber: nextGameNumberValue,
                date: selectedGameDate,
              };
            }

            return entry;
          });

          if (addedCityIds.includes(city.id)) {
            totalUses += 1;
            nextDailyGames.push({
              gameNumber: nextGameNumberValue,
              date: selectedGameDate,
              successRate: '—',
            });
          }

          if (removedCityIds.includes(city.id)) {
            totalUses = Math.max(0, totalUses - 1);
            nextDailyGames = nextDailyGames.filter(
              (entry) => !(entry.gameNumber === existingGame?.gameNumber && entry.date === existingGame?.date)
            );
          }

          return {
            ...city,
            totalUses,
            lastGameUsed: nextDailyGames.length > 0 ? nextDailyGames[nextDailyGames.length - 1].date : city.lastGameUsed,
            dailyGames: nextDailyGames,
          };
        })
      );

      setEditingGameId(null);
      setBuildMode(false);
      clearGameBuilder();
      return;
    }

    const nextEntry = {
      id: `daily-game-${nextGameNumberValue}-${selectedGameDate}`,
      gameNumber: nextGameNumberValue,
      date: selectedGameDate,
      levels: gameDraft,
      clueSet: clueSetByLevel,
      gamesPlayed: 0,
      averageScore: 0,
    };

    const nextCityIds = getGameCityIds(gameDraft);

    setDailyGames((previousGames) => [nextEntry, ...previousGames]);

    setCities((previousCities) =>
      previousCities.map((city) => {
        const isSelected = nextCityIds.includes(city.id);

        if (!isSelected) {
          return city;
        }

        return {
          ...city,
          totalUses: (city.totalUses ?? 0) + 1,
          lastGameUsed: selectedGameDate,
          dailyGames: [
            ...(city.dailyGames ?? []),
            {
              gameNumber: nextGameNumberValue,
              date: selectedGameDate,
              successRate: '—',
            },
          ],
        };
      })
    );

    clearGameBuilder();
    setBuildMode(false);
  }

  function handleDeleteFutureGame(gameId) {
    const gameToDelete = dailyGames.find((game) => game.id === gameId);
    if (!gameToDelete || !isFutureDate(gameToDelete.date)) {
      return;
    }

    const cityIdsToRemove = getGameCityIds(gameToDelete.levels ?? {});

    setCities((previousCities) =>
      previousCities.map((city) => {
        if (!cityIdsToRemove.includes(city.id)) {
          return city;
        }

        const nextDailyGames = (city.dailyGames ?? []).filter(
          (entry) => !(entry.gameNumber === gameToDelete.gameNumber && entry.date === gameToDelete.date)
        );

        return {
          ...city,
          totalUses: Math.max(0, (city.totalUses ?? 0) - 1),
          dailyGames: nextDailyGames,
          lastGameUsed: nextDailyGames.length > 0 ? nextDailyGames[nextDailyGames.length - 1].date : null,
        };
      })
    );

    setDailyGames((previousGames) => previousGames.filter((game) => game.id !== gameId));

    if (editingGameId === gameId) {
      clearGameBuilder();
      setBuildMode(false);
    }
  }

  function renderEmptyStudioState() {
    return (
      <div className="studio-empty-state">
        <p className="eyebrow">CITY DATABASE</p>
        <h2>No cities yet</h2>
        <p>Add your first city to begin building the daily game library.</p>
        <button type="button" className="primary-button" onClick={() => setShowCityForm(true)}>
          Add City
        </button>
      </div>
    );
  }

  function renderStudioTabs() {
    const tabs = ['City Database', 'Daily Games', 'Settings'];

    return (
      <div className="studio-tabs" role="tablist" aria-label="Studio sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'studio-tab active' : 'studio-tab'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  }

  if (activeTab === 'Daily Games') {
    return (
      <div className="studio-page">
        <aside className="studio-sidebar">
          <div className="studio-sidebar-header">
            <div>
              <p className="eyebrow">FRAMEWORK STUDIO</p>
              <h2>Studio</h2>
            </div>
            <div className="studio-header-actions">
              <Link to="/" className="studio-return-link">Game</Link>
              <button type="button" className="studio-logout-button" onClick={onLogout}>Sign out</button>
            </div>
          </div>

          {renderStudioTabs()}
        </aside>

        <main className="studio-detail">
          <header className="studio-detail-header">
            <div>
              <p className="eyebrow">DAILY GAMES</p>
              <h1>Daily Games</h1>
            </div>
            <button type="button" className="primary-button" onClick={startNewGameBuilder}>
              Build New Game
            </button>
          </header>

          {buildMode && (
            <form className="daily-game-form" onSubmit={handleSaveDailyGame}>
              <div className="daily-game-builder-header">
                <div>
                  <p className="eyebrow">{editingGameId ? 'EDIT DAILY GAME' : 'NEW DAILY GAME'}</p>
                  <h2>Game #{selectedGameNumber}</h2>
                </div>
                <div className="daily-game-meta-picker">
                  <label className="daily-number-picker">
                    Game number
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={selectedGameNumber}
                      onChange={(event) => setSelectedGameNumber(Number(event.target.value) || 0)}
                    />
                  </label>

                  <label className="daily-date-picker">
                    Publish date
                    <input
                      type="date"
                      value={selectedGameDate}
                      onChange={(event) => setSelectedGameDate(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              {dailyGameError && <p className="field-error">{dailyGameError}</p>}

              <div className="daily-builder-grid">
                {[1, 2, 3, 4, 5].map((level) => {
                  const cityId = gameDraft[level];
                  const typedValue = draftInputValues[level] ?? '';
                  const displayedValue = cityId
                    ? getCityById(cities, cityId)?.name ?? typedValue
                    : typedValue;

                  return (
                    <div key={level} className="daily-builder-level">
                      <div className="daily-level-header">
                        <h3>Level {level}</h3>
                      </div>

                      <label className="daily-slot-input">
                        <span>City</span>
                        <input
                          type="text"
                          value={displayedValue}
                          list={`city-options-${level}`}
                          placeholder="Type city name"
                          onChange={(event) => handleDailyGameSelection(level, event.target.value)}
                        />
                        <datalist id={`city-options-${level}`}>
                          {sortCitiesByName(cities).map((city) => (
                            <option key={city.id} value={city.name} />
                          ))}
                        </datalist>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="form-actions">
                <button type="submit" className="primary-button">Save daily game</button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setBuildMode(false);
                    setEditingGameId(null);
                    setDailyGameError('');
                    setGameDraft(createEmptyGameDraft());
                    setDraftInputValues(createEmptyGameDraft());
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!buildMode && (
            <section className="daily-game-history">
              <div className="daily-game-table-wrapper">
                <table className="daily-game-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Date</th>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <th key={level}>Level {level}</th>
                      ))}
                      <th>Games Played</th>
                      <th>Average Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedDailyGames.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="usage-log-empty">No daily games saved yet.</td>
                      </tr>
                    ) : (
                      orderedDailyGames.map((game) => (
                        <tr key={game.id}>
                          <td>Game {game.gameNumber}</td>
                          <td>{game.date}</td>
                          {[1, 2, 3, 4, 5].map((level) => {
                            const cityId = game.levels?.[level];
                            const city = cityId ? getCityById(cities, cityId) : null;

                            return (
                              <td key={`${game.id}-level-${level}`} className="daily-city-cell">
                                {city ? (
                                  <button
                                    type="button"
                                    className="city-link-button"
                                    onClick={() => {
                                      setSelectedCityId(city.id);
                                      setActiveTab('City Database');
                                    }}
                                  >
                                    {city.name}
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </td>
                            );
                          })}
                          <td>{game.gamesPlayed ?? 0}</td>
                          <td className="daily-score-cell">
                            <span>{game.averageScore != null ? Number(game.averageScore).toFixed(1) : '—'}</span>
                            <div className="daily-game-row-actions">
                              <button type="button" className="table-action-button" onClick={() => startEditingGame(game)}>
                                Edit
                              </button>
                              {isFutureDate(game.date) && (
                                <button type="button" className="table-action-button danger-table-button" onClick={() => handleDeleteFutureGame(game.id)}>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  if (activeTab === 'Settings') {
    return (
      <div className="studio-page">
        <aside className="studio-sidebar">
          <div className="studio-sidebar-header">
            <div>
              <p className="eyebrow">FRAMEWORK STUDIO</p>
              <h2>Studio</h2>
            </div>
            <div className="studio-header-actions">
              <Link to="/" className="studio-return-link">Game</Link>
              <button type="button" className="studio-logout-button" onClick={onLogout}>Sign out</button>
            </div>
          </div>

          {renderStudioTabs()}
        </aside>

        <main className="studio-detail">
          <div className="studio-placeholder">
            <p className="eyebrow">SETTINGS</p>
            <h1>Settings</h1>
            <p>Studio settings will be added here as the daily game system expands.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="studio-page">
      <aside className="studio-sidebar">
        <div className="studio-sidebar-header">
          <div>
            <p className="eyebrow">FRAMEWORK STUDIO</p>
            <h2>Studio</h2>
          </div>
          <div className="studio-header-actions">
            <Link to="/" className="studio-return-link">Game</Link>
            <button type="button" className="studio-logout-button" onClick={onLogout}>Sign out</button>
          </div>
        </div>

        {renderStudioTabs()}

        {cities.length === 0 && !showCityForm && renderEmptyStudioState()}

        {cities.length > 0 && (
          <>
            {storageWarning && <p className="field-error storage-warning">{storageWarning}</p>}

            <div className="studio-search-box">
              <input
                type="text"
                value={citySearch}
                onChange={(event) => setCitySearch(event.target.value)}
                placeholder="Search cities"
              />
            </div>

            <button type="button" className="primary-button" onClick={() => setShowCityForm(true)}>
              Add City
            </button>
          </>
        )}

        {showCityForm && (
          <form className="studio-form" onSubmit={handleAddCity}>
            <label htmlFor="new-city-name">City name</label>
            <input
              id="new-city-name"
              type="text"
              value={newCityName}
              onChange={(event) => setNewCityName(event.target.value)}
              placeholder="Enter city name"
              autoFocus
            />

            <label htmlFor="new-city-continent">Continent</label>
            <select
              id="new-city-continent"
              value={newCityContinent}
              onChange={(event) => setNewCityContinent(event.target.value)}
            >
              <option value="Africa">Africa</option>
              <option value="Asia">Asia</option>
              <option value="Europe">Europe</option>
              <option value="North America">North America</option>
              <option value="South America">South America</option>
              <option value="Oceania">Oceania</option>
            </select>

            <div className="level-picker">
              <span>Levels</span>
              <div className="level-options">
                {[1, 2, 3, 4, 5].map((level) => (
                  <label key={level} className={newCityLevels.includes(level) ? 'level-toggle active' : 'level-toggle'}>
                    <input
                      type="checkbox"
                      checked={newCityLevels.includes(level)}
                      onChange={() => toggleGameLevel(level)}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>

            {cityError && <p className="field-error">{cityError}</p>}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmittingCity}>
                {isSubmittingCity ? 'Saving…' : 'Save city'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowCityForm(false);
                  setCityError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {cities.length > 0 && (
          <div className="city-table-wrapper">
            <table className="city-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Uses</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {visibleCities.map((city) => (
                  <tr
                    key={city.id}
                    className={city.id === selectedCity?.id ? 'selected-city-row' : ''}
                    onClick={() => setSelectedCityId(city.id)}
                  >
                    <td>
                      <div className="city-name-cell">
                        <span className={getCityReadiness(city).ready ? 'city-name-ready' : 'city-name-not-ready'}>{city.name}</span>
                        {city.gameLevels?.length > 0 && (
                          <small>{city.gameLevels.join(', ')}</small>
                        )}
                      </div>
                    </td>
                    <td>{city.totalUses}</td>
                    <td>{city.lastGameUsed ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </aside>

      <main className="studio-detail">
        {!selectedCity ? (
          <div className="studio-empty">{cities.length === 0 ? 'No cities registered yet.' : 'No matching city found.'}</div>
        ) : (
          <>
            <header className="studio-detail-header">
              <div>
                <p className="eyebrow">CITY DATABASE</p>
                {isEditingCityDetails ? (
                  <div className="city-detail-editor">
                    <div className="city-detail-field">
                      <label htmlFor="edit-city-name">Name</label>
                      <input
                        id="edit-city-name"
                        type="text"
                        value={cityDetailDraft.name}
                        onChange={(event) => setCityDetailDraft((previousDraft) => ({ ...previousDraft, name: event.target.value }))}
                      />
                    </div>

                    <div className="city-detail-field">
                      <label htmlFor="edit-city-continent">Continent</label>
                      <select
                        id="edit-city-continent"
                        value={cityDetailDraft.continent}
                        onChange={(event) => setCityDetailDraft((previousDraft) => ({ ...previousDraft, continent: event.target.value }))}
                      >
                        <option value="Africa">Africa</option>
                        <option value="Asia">Asia</option>
                        <option value="Europe">Europe</option>
                        <option value="North America">North America</option>
                        <option value="South America">South America</option>
                        <option value="Oceania">Oceania</option>
                      </select>
                    </div>

                    <div className="city-detail-field">
                      <span>Levels</span>
                      <div className="city-detail-level-picker">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <label
                            key={level}
                            className={cityDetailDraft.gameLevels.includes(level) ? 'city-detail-level-toggle active' : 'city-detail-level-toggle'}
                          >
                            <input
                              type="checkbox"
                              checked={cityDetailDraft.gameLevels.includes(level)}
                              onChange={() => handleCityDetailLevelToggle(level)}
                            />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="city-detail-field coordinates-field">
                      <label htmlFor="edit-city-lat">Latitude</label>
                      <input
                        id="edit-city-lat"
                        type="number"
                        step="0.0001"
                        value={cityDetailDraft.coordinates[0]}
                        onChange={(event) =>
                          setCityDetailDraft((previousDraft) => ({
                            ...previousDraft,
                            coordinates: [Number(event.target.value), previousDraft.coordinates[1]],
                          }))
                        }
                      />
                    </div>

                    <div className="city-detail-field coordinates-field">
                      <label htmlFor="edit-city-lng">Longitude</label>
                      <input
                        id="edit-city-lng"
                        type="number"
                        step="0.0001"
                        value={cityDetailDraft.coordinates[1]}
                        onChange={(event) =>
                          setCityDetailDraft((previousDraft) => ({
                            ...previousDraft,
                            coordinates: [previousDraft.coordinates[0], Number(event.target.value)],
                          }))
                        }
                      />
                    </div>
                    {cityDetailError && <p className="field-error city-detail-error">{cityDetailError}</p>}
                    <div className="city-detail-actions">
                      <button type="button" className="primary-button small-button" onClick={handleSaveCityDetails}>Save</button>
                      <button
                        type="button"
                        className="secondary-button small-button"
                        onClick={() => {
                          setIsEditingCityDetails(false);
                          setCityDetailError('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <h1>{selectedCity.name}</h1>
                )}
              </div>

              {!isEditingCityDetails && (
                <div className="city-meta-wrap">
                  <div className="city-meta">
                    <span>Continent: {selectedCity.continent ?? 'Unassigned'}</span>
                    <span>Levels: {selectedCity.gameLevels?.length ? selectedCity.gameLevels.join(', ') : 'None'}</span>
                    <span>Lat: {selectedCity.coordinates[0].toFixed(4)}</span>
                    <span>Lng: {selectedCity.coordinates[1].toFixed(4)}</span>
                  </div>

                  <div className="city-average-score-box">
                    <label>Average score</label>
                    <div className="city-average-score-input-wrap city-average-score-readonly">
                      <span>{selectedCityAverageScore != null ? `${selectedCityAverageScore}%` : 'No live data'}</span>
                    </div>
                  </div>

                  <button type="button" className="secondary-button small-button" onClick={() => setIsEditingCityDetails(true)}>Edit details</button>
                </div>
              )}
            </header>

            {(() => {
              const readiness = getCityReadiness(selectedCity);
              return (
                <div className={`city-readiness ${readiness.ready ? 'ready' : 'not-ready'}`}>
                  {readiness.label}
                  <span> · {readiness.totalClues}/10 clues</span>
                </div>
              );
            })()}

            <section className="city-usage-log">
              <div className="usage-log-header">
                <h3>Daily Game Usage</h3>
              </div>

              <div className="city-log-table-wrapper">
                <table className="city-log-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Date</th>
                      <th>Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCity.dailyGames ?? []).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="usage-log-empty">No daily games recorded yet.</td>
                      </tr>
                    ) : (
                      (selectedCity.dailyGames ?? []).map((entry) => (
                        <tr key={`${selectedCity.id}-game-${entry.gameNumber ?? entry.date ?? Math.random()}`}>
                          <td>Game {entry.gameNumber ?? '—'}</td>
                          <td>{entry.date ?? '—'}</td>
                          <td>{entry.successRate ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="clue-categories">
              {clueCategories.map(({ id, label }) => (
                <article key={id} className="category-panel">
                  <div className="category-panel-header">
                    <h3>{label}</h3>
                  </div>

                  <div className="category-upload-form">
                    <label>
                      Caption
                      <input
                        type="text"
                        value={categoryDrafts[id]?.caption ?? ''}
                        onChange={(event) =>
                          setCategoryDrafts((previousDrafts) => ({
                            ...previousDrafts,
                            [id]: {
                              ...previousDrafts[id],
                              caption: event.target.value,
                            },
                          }))
                        }
                        placeholder="Enter clue caption"
                      />
                    </label>

                    <label>
                      Upload image
                      <input type="file" accept="image/*" onChange={(event) => handleClueFileUpload(id, event)} />
                    </label>

                    {uploadError && <p className="field-error">{uploadError}</p>}

                    {categoryDrafts[id]?.image && (
                      <img src={categoryDrafts[id].image} alt={`${label} preview`} className="clue-preview" />
                    )}

                    <button type="button" className="primary-button small-button" onClick={() => handleAddClueForCategory(id)}>
                      {categoryDrafts[id]?.isEditing ? `Save changes to ${label}` : `Save to ${label}`}
                    </button>
                  </div>

                  <div
                    className={[
                      'clue-grid',
                      ((selectedCity.clues[id] ?? []).length === 1 ? 'clue-grid-single' : ''),
                    ].join(' ')}
                  >
                    {(selectedCity.clues[id] ?? []).length === 0 && (
                      <p className="empty-state">No clues in this category yet.</p>
                    )}

                    {(selectedCity.clues[id] ?? []).map((clue) => (
                      <div key={clue.id} className="clue-card">
                        {clue.image ? (
                          <img src={clue.image} alt={clue.caption} />
                        ) : (
                          <div className="clue-image-placeholder">No image</div>
                        )}
                        <div className="clue-card-body">
                          <p>{clue.caption}</p>
                          <div className="clue-card-actions">
                            <button
                              type="button"
                              className="secondary-button small-button"
                              onClick={() => handleEditClue(id, clue)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="secondary-button small-button danger-button"
                              onClick={() => handleDeleteClue(selectedCity.id, id, clue.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function GamePage() {
  const [cities, setCities] = useState([]);
  const [dailyGames, setDailyGames] = useState([]);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const latestContent = useRef({ cities, dailyGames });

  useEffect(() => {
    latestContent.current = { cities, dailyGames };
  }, [cities, dailyGames]);
  const [guess, setGuess] = useState(null);
  const [scores, setScores] = useState([]);
  const [roundResults, setRoundResults] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);

  const [showResult, setShowResult] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [shareToastVisible, setShareToastVisible] = useState(false);

  const [swapUsed, setSwapUsed] = useState(false);
  const [swapStep, setSwapStep] = useState(null);
  const [swapCategory, setSwapCategory] = useState(null);

  const [shuffleUsed, setShuffleUsed] = useState(false);
  const [shuffleStep, setShuffleStep] = useState(null);
  const [shuffleAnimatingCategory, setShuffleAnimatingCategory] = useState(null);
  const [shuffleIndexes, setShuffleIndexes] = useState({});

  const [activeCategories, setActiveCategories] = useState([]);
  const [lightboxClue, setLightboxClue] = useState(null);

  const activeGame = dailyGames.find((game) => game.date === new Date().toISOString().slice(0, 10)) ?? dailyGames[0] ?? null;
  const currentLevel = currentRound + 1;
  const correctCity = activeGame ? getCityById(cities, activeGame.levels?.[currentLevel]) : null;

  useEffect(() => {
    let isActive = true;

    const legacyCities = getFallbackStoredValue(CITY_STORAGE_KEY) ?? [];
    const legacyDailyGames = getFallbackStoredValue(DAILY_GAMES_STORAGE_KEY) ?? [];

    setCities(legacyCities);
    setDailyGames(legacyDailyGames);

    async function loadStoredData() {
      try {
        const [storedCities, storedDailyGames, publishedContent] = await Promise.all([
          readStoredCities(),
          readStoredDailyGames(),
          getPublishedContent().catch(() => null),
        ]);

        if (!isActive) {
          return;
        }

        const mergedCities = mergeStoredEntries(storedCities, legacyCities);
        const mergedDailyGames = mergeStoredEntries(storedDailyGames, legacyDailyGames);

        setCities(publishedContent?.cities ?? mergedCities);
        setDailyGames(publishedContent?.dailyGames ?? mergedDailyGames);
      } catch (error) {
        if (isActive) {
          setCities(legacyCities);
          setDailyGames(legacyDailyGames);
        }
      } finally {
        if (isActive) {
          setIsStorageHydrated(true);
        }
      }
    }

    loadStoredData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) {
      return undefined;
    }

    return subscribeToPublishedContent((content) => {
      if (!areJsonEqual(latestContent.current.cities, content.cities)) {
        setCities(content.cities);
      }
      if (!areJsonEqual(latestContent.current.dailyGames, content.dailyGames)) {
        setDailyGames(content.dailyGames);
      }
    });
  }, [isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated || typeof window === 'undefined') {
      return;
    }

    void (async () => {
      await persistJsonToStorage(CITY_STORAGE_KEY, cities);
    })();
  }, [cities, isStorageHydrated]);

  useEffect(() => {
    if (!isStorageHydrated || typeof window === 'undefined') {
      return;
    }

    void (async () => {
      await persistJsonToStorage(DAILY_GAMES_STORAGE_KEY, dailyGames);
    })();
  }, [dailyGames, isStorageHydrated]);

  useEffect(() => {
    if (!activeGame) {
      setActiveCategories([]);
      return;
    }

    const roundCategories = getLevelCategorySelection(currentLevel);
    setActiveCategories(roundCategories);
    setSwapStep(null);
    setSwapCategory(null);
    setShuffleStep(null);
    setShuffleIndexes({});
  }, [activeGame, currentLevel]);

  function getCategoryLabel(category) {
    const match = clueCategories.find((entry) => entry.id === category);
    return (match?.label ?? category).toUpperCase();
  }

  function getRoundClueDisplay(category) {
    if (!correctCity || !activeGame) {
      return null;
    }

    const pool = correctCity.clues?.[category] ?? [];
    const savedClue = activeGame.clueSet?.[currentLevel]?.[category];
    const overrideIndex = shuffleIndexes[category];

    if (overrideIndex != null && pool[overrideIndex]) {
      return pool[overrideIndex];
    }

    if (savedClue) {
      const savedMatch = pool.find((clue) => clue.id === savedClue.id);
      if (savedMatch) {
        return savedMatch;
      }
    }

    const savedIndex = pool.findIndex((clue) => clue.id === savedClue?.id);
    const activeIndex = savedIndex >= 0 ? savedIndex : 0;
    return pool[activeIndex] ?? pool[0] ?? null;
  }

  function getCurrentClueIndex(category) {
    const pool = correctCity?.clues?.[category] ?? [];
    const displayedClue = getRoundClueDisplay(category);
    if (!displayedClue) {
      return -1;
    }

    const clueIndex = pool.findIndex((clue) => clue.id === displayedClue.id);
    return clueIndex >= 0 ? clueIndex : 0;
  }

  function handleClueClick(category) {
    if (swapStep === 'select') {
      setSwapCategory(category);
      setSwapStep('replace');
      setShuffleStep(null);
      return;
    }

    if (swapStep === 'replace') {
      return;
    }

    if (shuffleStep === 'select') {
      handleShuffleSelection(category);
    }
  }

  function handleSwap(category) {
    setActiveCategories((previousCategories) => {
      const nextCategories = previousCategories.filter((currentCategory) => currentCategory !== swapCategory);
      if (!nextCategories.includes(category)) {
        nextCategories.push(category);
      }
      return nextCategories;
    });

    setSwapUsed(true);
    setSwapStep(null);
    setSwapCategory(null);
  }

  function handleShuffleStart() {
    setShuffleStep('select');
    setSwapStep(null);
    setSwapCategory(null);
  }

  function handlePowerUpDismiss() {
    if (shuffleStep === 'select') {
      setShuffleStep(null);
    }

    if (swapStep === 'select') {
      setSwapStep(null);
      setSwapCategory(null);
    }
  }

  function handleShuffleSelection(category) {
    if (shuffleStep !== 'select') {
      return;
    }

    const pool = correctCity?.clues?.[category] ?? [];
    if (pool.length <= 1) {
      setShuffleStep(null);
      return;
    }

    const currentIndex = getCurrentClueIndex(category);
    const availableIndexes = pool
      .map((_, index) => index)
      .filter((index) => index !== currentIndex && pool[index]);

    const nextIndex = availableIndexes.length > 0
      ? availableIndexes[Math.floor(Math.random() * availableIndexes.length)]
      : 0;

    setShuffleAnimatingCategory(category);
    setShuffleStep('reshuffling');

    window.setTimeout(() => {
      setShuffleIndexes((previousIndexes) => ({
        ...previousIndexes,
        [category]: nextIndex,
      }));

      setShuffleUsed(true);
      setShuffleAnimatingCategory(null);
      setShuffleStep(null);
    }, 700);
  }

  function handleGuess() {
    if (!correctCity || !guess) {
      return;
    }

    const distance = calculateDistance(guess, correctCity.coordinates);
    const isCorrect = distance <= correctRadius;
    const score = isCorrect ? 5 : 0;

    const result = {
      level: currentLevel,
      city: correctCity.name,
      correct: isCorrect,
      distance: Math.round(distance),
      score,
      guess,
      correctCoordinates: correctCity.coordinates,
    };

    setScores((previousScores) => [...previousScores, score]);
    setRoundResults((previousResults) => [...previousResults, result]);
    setLastResult(result);
    setShowResult(true);
  }

  function handleNextLevel() {
    setShowResult(false);
    setLastResult(null);
    setGuess(null);

    if (currentRound < 4) {
      setCurrentRound(currentRound + 1);
    }
  }

  function handleFinalScore() {
    setShowResult(false);
    setLastResult(null);
    setGuess(null);
    setShowFinalScore(true);
  }

  function handleShareScore() {
    const emojiLine = roundResults.map((result) => (result.correct ? '🟢' : '🔴')).join('');
    const shareText = [window.location.href, activeGame?.date ?? '', emojiLine].join('\n');

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareText).then(() => {
        setShareToastVisible(true);
        window.setTimeout(() => setShareToastVisible(false), 5000);
      });
      return;
    }

    setShareToastVisible(true);
    window.setTimeout(() => setShareToastVisible(false), 5000);
  }

  const totalScore = scores.reduce((total, score) => total + score, 0);
  const swapReplacementOptions = swapCategory
    ? clueCategories
        .map(({ id }) => id)
        .filter((category) => category !== swapCategory && !activeCategories.includes(category))
    : [];

  if (!activeGame || !correctCity) {
    return (
      <div className="game">
        <header className="game-header">
          <div className="logo">CITY</div>
          <div className="date-row">
            <span className="date">DAILY · 001</span>
          </div>
        </header>

        <main className="game-main">
          <p className="eyebrow">NO DAILY GAME</p>
          <h1>Build a daily game in Studio first.</h1>
          <p className="instructions">Create a city database and save a Daily Game before playing.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="game">
      <header className="game-header">
        <div className="logo">CITY</div>
        <div className="date-row">
          <span className="date">DAILY · {String(activeGame.gameNumber ?? currentRound + 1).padStart(3, '0')}</span>
          <button type="button" className="how-to-play-button" onClick={() => setShowHowToPlay(true)}>
            How to Play
          </button>
        </div>
      </header>

      <main
        className="game-main"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            handlePowerUpDismiss();
          }
        }}
      >
        {!showFinalScore && (
          <p className="instructions game-intro">
            Identify the city from the clue deck, then pinpoint it on the map.
          </p>
        )}

        {!showResult && !showFinalScore && (
          <>
            <div className="power-ups">
              <div className="power-up-block">
                <button
                  className={swapUsed ? 'power-up-button power-up-button--swap used' : currentRound === 0 ? 'power-up-button power-up-button--swap unavailable' : 'power-up-button power-up-button--swap available'}
                  disabled={currentRound === 0 || swapUsed}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (swapStep === 'select' || swapStep === 'replace') {
                      setSwapStep(null);
                      setSwapCategory(null);
                      return;
                    }
                    setSwapStep('select');
                    setShuffleStep(null);
                  }}
                >
                  <span className="power-up-icon">⇄</span>
                  <span>Swap</span>
                </button>
                <small className="power-up-note">
                  {swapUsed
                    ? 'Used'
                    : swapStep === 'select'
                      ? 'Choose a category'
                      : swapStep === 'replace'
                        ? 'Choose replacement'
                        : currentRound === 0
                          ? 'All clues visible on Level 1'
                          : 'Swap for a new category'}
                </small>
                {swapStep === 'select' && (
                  <small className="power-up-choice-hint">Choose a category to swap</small>
                )}
                {swapStep === 'replace' && (
                  <small className="power-up-choice-hint">Choose a replacement category</small>
                )}

                {swapStep === 'replace' && swapCategory && (
                  <div
                    className="power-up-replacement-picker"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <label htmlFor="swap-replacement-category">Replacement</label>
                    <select
                      id="swap-replacement-category"
                      defaultValue=""
                      onChange={(event) => {
                        event.stopPropagation();
                        const nextCategory = event.target.value;
                        if (nextCategory) {
                          handleSwap(nextCategory);
                        }
                      }}
                    >
                      <option value="">Select one...</option>
                      {swapReplacementOptions.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="power-up-block">
                <button
                  className={shuffleUsed ? 'power-up-button power-up-button--shuffle used' : 'power-up-button power-up-button--shuffle available'}
                  disabled={shuffleUsed}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (shuffleStep === 'select') {
                      setShuffleStep(null);
                      return;
                    }
                    handleShuffleStart();
                  }}
                >
                  <span className="power-up-icon">⟳</span>
                  <span>Shuffle</span>
                </button>
                <small className="power-up-note">
                  {shuffleUsed ? 'Used' : 'Shuffle a category for a new clue'}
                </small>
                {shuffleStep === 'select' && (
                  <small className="power-up-choice-hint">Choose a category to reshuffle</small>
                )}
              </div>
            </div>

            <div className={['clues', activeCategories.length === 1 ? 'clues--single' : ''].join(' ')}>
              {activeCategories.map((category) => {
                const clue = getRoundClueDisplay(category);
                if (!clue) {
                  return null;
                }

                const isSwapSelectionTarget = swapStep === 'select';
                const isSwapReplacementTarget = swapStep === 'replace' && swapCategory && category !== swapCategory && !activeCategories.includes(category);
                const isShuffleSelectable = shuffleStep === 'select';
                const isShuffling = shuffleAnimatingCategory === category;

                return (
                  <div
                    key={`${currentLevel}-${category}`}
                    className={[
                      'clue',
                      isSwapSelectionTarget || isSwapReplacementTarget || isShuffleSelectable ? 'clue--selection-ready' : '',
                      isShuffling ? 'clue--shuffling' : '',
                    ].join(' ')}
                    onClick={(event) => {
                      if (swapStep === 'select') {
                        event.stopPropagation();
                        handleClueClick(category);
                        return;
                      }

                      if (swapStep === 'replace') {
                        event.stopPropagation();
                        return;
                      }

                      if (shuffleStep === 'select') {
                        event.stopPropagation();
                        handleShuffleSelection(category);
                        return;
                      }

                      event.stopPropagation();
                      setLightboxClue(clue);
                    }}
                  >
                    <strong>{getCategoryLabel(category)}</strong>
                    {(isSwapSelectionTarget || isSwapReplacementTarget || isShuffleSelectable) && (
                      <span className="clue-selection-marker" aria-hidden="true">◎</span>
                    )}
                    {isShuffling && (
                      <span className="clue-shuffle-spinner" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                    {clue.image ? (
                      <img
                        src={clue.image}
                        alt={clue.caption}
                        className="game-clue-image"
                      />
                    ) : (
                      <span className="game-clue-fallback">No image</span>
                    )}
                  </div>
                );
              })}
            </div>

            {lightboxClue && (
              <div className="image-lightbox-backdrop" onClick={() => setLightboxClue(null)}>
                <div className="image-lightbox" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="image-lightbox-close"
                    aria-label="Close image"
                    onClick={() => setLightboxClue(null)}
                  >
                    ×
                  </button>
                  {lightboxClue.image ? (
                    <img src={lightboxClue.image} alt={lightboxClue.caption} className="image-lightbox-image" />
                  ) : (
                    <div className="image-lightbox-empty">No image</div>
                  )}
                </div>
              </div>
            )}

            <div className="game-map-shell">
              <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <GuessMarker setGuess={setGuess} disabled={false} />
                {guess && <Marker position={guess} />}
              </MapContainer>
            </div>

            <button className="guess-button" disabled={!guess} onClick={handleGuess}>
              MAKE YOUR GUESS
            </button>
          </>
        )}

        {showResult && lastResult && (
          <>
            <div className="result result-panel">
              <h2>{lastResult.correct ? 'HIT' : 'MISS'}</h2>

              <p>
                The city was <strong>{lastResult.city}</strong>.
              </p>

              <p>You were {lastResult.distance.toLocaleString()} km away.</p>
            </div>

            <div className="game-map-shell">
              <MapContainer center={lastResult.correctCoordinates} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <GuessMarker setGuess={setGuess} disabled={true} />
                <Marker position={lastResult.guess} />
                <Marker position={lastResult.correctCoordinates} />
                <Polyline positions={[lastResult.guess, lastResult.correctCoordinates]} />
              </MapContainer>
            </div>

            <button className="next-button" onClick={lastResult.level === 5 ? handleFinalScore : handleNextLevel}>
              {lastResult.level === 5 ? 'SEE FINAL SCORE' : 'NEXT LEVEL'}
            </button>
          </>
        )}

        {!showFinalScore && (
          <div className="results">
            <h3>YOUR GAME</h3>

            {[1, 2, 3, 4, 5].map((level) => {
              const result = roundResults.find((entry) => entry.level === level);
              const cityName = result ? result.city : '—';

              return (
                <div key={level} className={result ? (result.correct ? 'result-status hit' : 'result-status miss') : 'result-status pending'}>
                  <strong>LEVEL {level}</strong>
                  <span>{cityName}</span>
                  <span>{result ? (result.correct ? '🟢 HIT' : '🔴 MISS') : '—'}</span>
                </div>
              );
            })}
          </div>
        )}

        {showFinalScore && (
          <div className="final-score">
            <p className="eyebrow">GAME COMPLETE</p>
            <h1>FINAL SCORE</h1>
            <h2>{totalScore}</h2>

            <div className="final-results">
              <div className="final-results-header">
                <span>Level</span>
                <span>Your Guess</span>
                <span>Correct City</span>
                <span>Result</span>
              </div>

              {roundResults.map((result) => (
                <div key={result.level} className="final-results-row">
                  <span>{result.level}</span>
                  <span>{result.guess ? 'Guess placed' : '—'}</span>
                  <span>{result.city}</span>
                  <span>{result.correct ? '🟢 HIT' : '🔴 MISS'}</span>
                </div>
              ))}
            </div>

            <button type="button" className="share-score-button" onClick={handleShareScore}>
              Share your Score
            </button>
          </div>
        )}
      </main>
      {showHowToPlay && (
        <div className="how-to-play-backdrop" onClick={() => setShowHowToPlay(false)}>
          <div className="how-to-play-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
            <button type="button" className="image-lightbox-close" aria-label="Close how to play" onClick={() => setShowHowToPlay(false)}>
              ×
            </button>
            <h2 id="how-to-play-title">How to Play</h2>
            <p>Find the 5 cities on the map based on visual clues from each category. You must be within a 25km radius of the city center for a correct answer.</p>
            <p>The cities on Level 1 are the most difficult, so you will be presented with all 5 clues.</p>
            <p>The clues provided will decrease accordingly until Level 5, the most notable cities, where you will only see 1 clue.</p>
            <p>You get 1 Swap in the game, allowing you to swap a category for a category of your choice. This is only playable on Levels 2-5.</p>
            <p>You get 1 Shuffle to play in the game, allowing you to shuffle out an individual clue for another clue from the same category.</p>
            <p>Good luck and enjoy!</p>
          </div>
        </div>
      )}

      {shareToastVisible && (
        <div className="share-toast">Score saved to clipboard</div>
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/studio" element={<StudioPage />} />
    </Routes>
  );
}

export default App;
