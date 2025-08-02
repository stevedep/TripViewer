import { TripSearchSchema } from "@shared/schema";

const NS_API_BASE = "https://gateway.apiportal.ns.nl";
const PLACES_API_KEY = "590c1627b27c414baffb2737e241f16f"; // For Places API (search)
const TRIPS_API_KEY = "1ea3dd385baf4127a20cb8fb38af634d"; // For Trips API (door-to-door planning)

// Create headers for NS API requests
function createHeaders(): HeadersInit {
  return {
    "accept": "application/json, text/plain, */*",
    "accept-language": "nl",
    "cache-control": "no-cache",
    "ocp-apim-subscription-key": TRIPS_API_KEY,
    "pragma": "no-cache",
    "x-caller-id": "NS Web",
    "x-caller-version": "rio-frontends-20250618.14",
    "x-enabled-capabilities": "BFF_PRODUCT, BFF_STEPS",
    "x-request-id": `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

export async function searchTrips(params: {
  fromStation: string;
  toStation: string;
  dateTime: string;
  excludeBus?: boolean;
  excludeTram?: boolean;
  excludeMetro?: boolean;
  walkingOnly?: boolean;
}) {
  // Validate parameters
  const searchParams = TripSearchSchema.parse(params);

  // Check if we need to get coordinates for non-station locations
  const fromLocation = await getLocationCoordinates(searchParams.fromStation);
  const toLocation = await getLocationCoordinates(searchParams.toStation);

  // Build API URL
  const apiUrl = new URL(`${NS_API_BASE}/reisinformatie-api/api/v3/trips`);
  
  // Use coordinates for non-station locations, station names for actual stations
  if (fromLocation && fromLocation.lat && fromLocation.lng) {
    apiUrl.searchParams.set("originLat", fromLocation.lat.toString());
    apiUrl.searchParams.set("originLng", fromLocation.lng.toString());
    apiUrl.searchParams.set("originName", searchParams.fromStation);
  } else {
    apiUrl.searchParams.set("fromStation", searchParams.fromStation);
  }
  
  if (toLocation && toLocation.lat && toLocation.lng) {
    apiUrl.searchParams.set("destinationLat", toLocation.lat.toString());
    apiUrl.searchParams.set("destinationLng", toLocation.lng.toString());
    apiUrl.searchParams.set("destinationName", searchParams.toStation);
  } else {
    apiUrl.searchParams.set("toStation", searchParams.toStation);
  }
  
  apiUrl.searchParams.set("dateTime", searchParams.dateTime);
  apiUrl.searchParams.set("lang", "nl");
  apiUrl.searchParams.set("product", "OVCHIPKAART_ENKELE_REIS");
  apiUrl.searchParams.set("travelClass", "2");
  
  // Set modality based on travel preferences
  if (searchParams.walkingOnly) {
    apiUrl.searchParams.set("firstMileModality", "WALK");
    apiUrl.searchParams.set("lastMileModality", "WALK");
  } else {
    apiUrl.searchParams.set("firstMileModality", "PUBLIC_TRANSPORT");
    apiUrl.searchParams.set("lastMileModality", "PUBLIC_TRANSPORT");
  }
  
  // Add exclusions for specific transport types
  if (searchParams.excludeBus) {
    apiUrl.searchParams.set("excludeTransportType", "BUS");
  }
  if (searchParams.excludeTram) {
    apiUrl.searchParams.set("excludeTransportType", "TRAM");
  }
  if (searchParams.excludeMetro) {
    apiUrl.searchParams.set("excludeTransportType", "METRO");
  }

  console.log("Making direct NS API request:", apiUrl.toString());

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: createHeaders(),
      mode: "cors", // Enable CORS
    });

    if (!response.ok) {
      throw new Error(`NS API responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("NS API Response:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
    
    // Return raw data and let the component handle validation more gracefully
    console.log("Returning raw NS API data for client-side validation");
    return data;
  } catch (error) {
    console.error("Error fetching trips from NS API:", error);
    
    // If CORS or other network errors occur, throw a more specific error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error("Unable to connect to NS API. This may be due to CORS restrictions in static hosting. Consider using a server-side proxy.");
    }
    
    throw error;
  }
}

export async function getTrainDetails(
  trainNumber: string,
  stationCode: string,
  dateTime: string
) {
  const formattedDateTime = encodeURIComponent(dateTime);
  const apiUrl = `${NS_API_BASE}/virtual-train-api/api/v1/trein/${trainNumber}/${stationCode}?dateTime=${formattedDateTime}&features=zitplaats,druktev2,platformitems`;

  console.log("Making direct NS Virtual Train API request:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: createHeaders(),
      mode: "cors", // Enable CORS
    });

    if (!response.ok) {
      throw new Error(`NS Virtual Train API responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("NS Virtual Train API Response:", JSON.stringify(data, null, 2).substring(0, 300) + "...");
    return data;
  } catch (error) {
    console.error("Error fetching train details:", error);
    throw error;
  }
}

export function getPopularStations(): string[] {
  return [
    "Den Haag HS",
    "Amsterdam Centraal",
    "Rotterdam Centraal",
    "Utrecht Centraal",
    "Eindhoven Centraal",
    "Delft",
    "Breda",
    "Tilburg",
    "Maastricht",
    "Groningen",
    "Leeuwarden",
    "Zwolle",
    "Arnhem Centraal",
    "Nijmegen",
    "Haarlem",
    "Leiden Centraal",
    "Almere Centrum",
    "Amersfoort Centraal",
    "NIBC"
  ];
}

// Station autocomplete API using NS Places API
export async function searchStations(query: string): Promise<any[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://gateway.apiportal.ns.nl/places-api/v2/places?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Ocp-Apim-Subscription-Key': PLACES_API_KEY,
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      }
    );

    if (!response.ok) {
      console.warn(`NS Places API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    // Extract locations from all place types, prioritizing actual transit stations
    const allPlaces = data.payload || [];
    const allLocations = allPlaces.flatMap((place: any) => {
      // For places with locations array (like stations)
      if (place.locations && place.locations.length > 0) {
        return place.locations.map((location: any) => ({
          name: location.name,
          stationCode: location.stationCode,
          lat: location.lat,
          lng: location.lng,
          type: place.type,
          priority: place.type === 'stationV2' ? 1 : 2 // Prioritize actual stations
        }));
      }
      
      // For places that are locations themselves (like POI, addresses)
      if (place.name && place.name !== 'Stations') {
        return [{
          name: place.name,
          stationCode: place.stationCode || null,
          lat: place.lat,
          lng: place.lng,
          type: place.type,
          priority: place.type === 'stationV2' ? 1 : 3 // Lower priority for POI
        }];
      }
      
      return [];
    });
    
    // Sort by priority (stations first) then by name
    return allLocations.sort((a: any, b: any) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.warn(`Error searching stations for "${query}":`, error);
    return [];
  }
}

// Get coordinates for a location from the Places API
async function getLocationCoordinates(locationName: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://gateway.apiportal.ns.nl/places-api/v2/places?q=${encodeURIComponent(locationName)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Ocp-Apim-Subscription-Key': PLACES_API_KEY,
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const places = data.payload || [];
    
    // Find exact match first
    for (const place of places) {
      if (place.locations) {
        const location = place.locations.find((loc: any) => loc.name === locationName);
        if (location && location.lat && location.lng) {
          return { lat: location.lat, lng: location.lng };
        }
      }
      // Check if the place itself matches and has coordinates
      if (place.name === locationName && place.lat && place.lng) {
        return { lat: place.lat, lng: place.lng };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error getting coordinates for "${locationName}":`, error);
    return null;
  }
}