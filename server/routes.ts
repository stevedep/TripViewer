import type { Express } from "express";
import { createServer, type Server } from "http";
import { TripSearchSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Search trips endpoint
  app.get("/api/trips", async (req, res) => {
    try {
      const { fromStation, toStation, dateTime } = req.query;

      // Validate query parameters
      const searchParams = TripSearchSchema.parse({
        fromStation,
        toStation,
        dateTime,
      });

      // Build NS API URL
      const apiUrl = new URL("https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips");
      apiUrl.searchParams.set("fromStation", searchParams.fromStation);
      apiUrl.searchParams.set("toStation", searchParams.toStation);
      apiUrl.searchParams.set("dateTime", searchParams.dateTime);
      apiUrl.searchParams.set("lang", "nl");
      apiUrl.searchParams.set("product", "OVCHIPKAART_ENKELE_REIS");
      apiUrl.searchParams.set("travelClass", "2");
      apiUrl.searchParams.set("firstMileModality", "PUBLIC_TRANSPORT");
      apiUrl.searchParams.set("lastMileModality", "PUBLIC_TRANSPORT");

      // Get API key from environment variables
      const apiKey = process.env.NS_API_KEY || process.env.OCP_APIM_SUBSCRIPTION_KEY || "1ea3dd385baf4127a20cb8fb38af634d";

      // Make request to NS API
      const response = await fetch(apiUrl.toString(), {
        method: "GET",
        headers: {
          "accept": "application/json, text/plain, */*",
          "accept-language": "nl",
          "cache-control": "no-cache",
          "ocp-apim-subscription-key": apiKey,
          "pragma": "no-cache",
          "x-caller-id": "NS Web",
          "x-caller-version": "rio-frontends-20250618.14",
          "x-enabled-capabilities": "BFF_PRODUCT, BFF_STEPS",
          "x-request-id": `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      if (!response.ok) {
        throw new Error(`NS API responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("NS API Response:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
      res.json(data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid request parameters", 
          details: error.errors 
        });
      } else if (error instanceof Error) {
        res.status(500).json({ 
          error: "Failed to fetch trip data", 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          error: "An unexpected error occurred" 
        });
      }
    }
  });

  // Get train details from NS Virtual Train API
  app.get("/api/train/:trainNumber/:stationCode", async (req, res) => {
    try {
      const { trainNumber, stationCode } = req.params;
      const { dateTime } = req.query;
      
      if (!trainNumber || !stationCode || !dateTime) {
        return res.status(400).json({ error: "Missing required parameters: trainNumber, stationCode, dateTime" });
      }

      const formattedDateTime = encodeURIComponent(dateTime as string);
      const apiUrl = `https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${trainNumber}/${stationCode}?dateTime=${formattedDateTime}&features=zitplaats,druktev2,platformitems`;
      
      // Get API key from environment variables
      const apiKey = process.env.NS_API_KEY || process.env.OCP_APIM_SUBSCRIPTION_KEY || "1ea3dd385baf4127a20cb8fb38af634d";
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'nl',
          'Cache-Control': 'no-cache',
          'Ocp-Apim-Subscription-Key': apiKey,
          'Pragma': 'no-cache',
          'X-Caller-Id': 'NS Web',
          'X-Caller-Version': 'rio-frontends-20250618.14',
          'X-Request-Id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      if (!response.ok) {
        throw new Error(`NS Virtual Train API responded with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("NS Virtual Train API Response:", JSON.stringify(data, null, 2).substring(0, 300) + "...");
      res.json(data);
    } catch (error) {
      console.error("Error fetching train details:", error);
      res.status(500).json({ 
        error: "Failed to fetch train details", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get list of popular stations
  app.get("/api/stations", (req, res) => {
    const stations = [
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
      "Amersfoort Centraal"
    ];
    
    res.json(stations);
  });

  const httpServer = createServer(app);
  return httpServer;
}
