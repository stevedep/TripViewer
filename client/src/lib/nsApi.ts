import { TripSearchSchema } from "@shared/schema";

const NS_API_BASE = "https://gateway.apiportal.ns.nl";
const API_KEY = "1ea3dd385baf4127a20cb8fb38af634d"; // Public API key for demo purposes

// Create headers for NS API requests
function createHeaders(): HeadersInit {
  return {
    "accept": "application/json, text/plain, */*",
    "accept-language": "nl",
    "cache-control": "no-cache",
    "ocp-apim-subscription-key": API_KEY,
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
}) {
  // Validate parameters
  const searchParams = TripSearchSchema.parse(params);

  // Build API URL
  const apiUrl = new URL(`${NS_API_BASE}/reisinformatie-api/api/v3/trips`);
  apiUrl.searchParams.set("fromStation", searchParams.fromStation);
  apiUrl.searchParams.set("toStation", searchParams.toStation);
  apiUrl.searchParams.set("dateTime", searchParams.dateTime);
  apiUrl.searchParams.set("lang", "nl");
  apiUrl.searchParams.set("product", "OVCHIPKAART_ENKELE_REIS");
  apiUrl.searchParams.set("travelClass", "2");
  apiUrl.searchParams.set("firstMileModality", "PUBLIC_TRANSPORT");
  apiUrl.searchParams.set("lastMileModality", "PUBLIC_TRANSPORT");

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
          'Ocp-Apim-Subscription-Key': '590c1627b27c414baffb2737e241f16f',
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
    
    // Extract locations from all place types (stations, POI, addresses, etc.)
    const allPlaces = data.payload || [];
    const allLocations = allPlaces.flatMap((place: any) => {
      // For places with locations array (like stations)
      if (place.locations && place.locations.length > 0) {
        return place.locations.map((location: any) => ({
          name: location.name,
          stationCode: location.stationCode,
          type: place.type
        }));
      }
      
      // For places that are locations themselves (like POI, addresses)
      if (place.name && place.name !== 'Stations') {
        return [{
          name: place.name,
          stationCode: place.stationCode || null,
          type: place.type
        }];
      }
      
      return [];
    });
    
    return allLocations;
  } catch (error) {
    console.warn(`Error searching stations for "${query}":`, error);
    return [];
  }
}