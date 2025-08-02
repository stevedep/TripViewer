import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Train,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LegDetails from "./leg-details";
import AlternativeTripsModal from "./alternative-trips-modal";
import { type Trip } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface TripCardProps {
  trip: Trip;
  materialTypeFilter?: string | null;
}

export default function TripCard({ trip, materialTypeFilter }: TripCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate delay information
  const getStatusInfo = () => {
    if (trip.status === "CANCELLED") {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        text: "Cancelled",
        className: "bg-red-100 text-red-800",
      };
    }

    // Check if any leg has delays
    const hasDelays = trip.legs.some(
      (leg) =>
        leg.origin.actualDateTime !== leg.origin.plannedDateTime ||
        leg.destination.actualDateTime !== leg.destination.plannedDateTime,
    );

    if (hasDelays) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: "Delayed",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    return {
      icon: <CheckCircle className="w-4 h-4" />,
      text: "On Time",
      className: "bg-green-100 text-green-800",
    };
  };

  const statusInfo = getStatusInfo();

  // Get first and last stations
  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];

  if (!firstLeg || !lastLeg) {
    return null;
  }

  // Format time
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate delay in minutes
  const calculateDelay = (
    plannedDateTime: string,
    actualDateTime: string | undefined,
  ): number => {
    if (!actualDateTime) return 0;
    const planned = new Date(plannedDateTime);
    const actual = new Date(actualDateTime);
    const delayMs = actual.getTime() - planned.getTime();
    return Math.round(delayMs / (1000 * 60)); // Convert to minutes
  };

  // Format delay display
  const formatDelay = (
    delayMinutes: number,
  ): { text: string; className: string } => {
    if (delayMinutes === 0) return { text: "", className: "" };
    if (delayMinutes > 0) {
      return {
        text: `+${delayMinutes} min`,
        className: "text-red-600 font-medium",
      };
    } else {
      return {
        text: `${delayMinutes} min`,
        className: "text-green-600 font-medium",
      };
    }
  };

  // Get line color based on train type
  const getLineColor = () => {
    if (trip.transfers > 0) return "bg-yellow-500";
    return "bg-ns-blue";
  };

  // State to store train types and seating data for each leg and API call details
  const [legTrainTypes, setLegTrainTypes] = useState<{ [key: string]: string }>(
    {},
  );
  const [legSeatingData, setLegSeatingData] = useState<{
    [key: string]: { first: number; second: number };
  }>({});
  const [legCarriageData, setLegCarriageData] = useState<{
    [key: string]: { carriageCount: number; bakkenImages: string[]; direction?: string };
  }>({});
  const [apiCallDetails, setApiCallDetails] = useState<
    Array<{
      url: string;
      response: any;
      error?: string;
      timestamp: string;
    }>
  >([]);
  const [showApiDetails, setShowApiDetails] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showCarriageModal, setShowCarriageModal] = useState(false);
  const [selectedCarriageData, setSelectedCarriageData] = useState<{ 
    bakkenImages: string[]; 
    direction?: string; 
    trainType: string;
  } | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    fromStation: string;
    toStation: string;
    fromDateTime: string;
  }>({
    isOpen: false,
    fromStation: "",
    toStation: "",
    fromDateTime: ""
  });

  // Handle train click to show carriage modal
  const handleTrainClick = (leg: any) => {
    const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
    const carriageData = legCarriageData[legKey];
    const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
    
    if (carriageData && carriageData.bakkenImages.length > 0) {
      setSelectedCarriageData({
        bakkenImages: carriageData.bakkenImages,
        direction: carriageData.direction,
        trainType: trainType
      });
      setShowCarriageModal(true);
    }
  };

  // Handle time click to show search modal (same as station click in leg-details)
  const handleTimeClick = (fromStation: string, toStation: string, dateTime: string) => {
    console.log('TripCard handleTimeClick called with:', {
      fromStation,
      toStation, 
      dateTime
    });
    
    setModalState({
      isOpen: true,
      fromStation,
      toStation,
      fromDateTime: dateTime
    });
  };

  // No longer need to filter at card level - parent component handles filtering

  // Get leg category codes for display
  const getLegCategoryCodes = () => {
    return trip.legs
      .map((leg) => {
        const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
        const trainType = legTrainTypes[legKey];
        return trainType || leg.product.categoryCode;
      })
      .filter((code) => code && code.trim())
      .join(" → ");
  };

  // Calculate waiting time between legs in minutes
  const getWaitingTime = (currentLegIndex: number): number => {
    if (currentLegIndex === 0) return 0; // No waiting for first leg

    const currentLeg = trip.legs[currentLegIndex];
    const previousLeg = trip.legs[currentLegIndex - 1];

    if (!currentLeg || !previousLeg) return 0;

    const arrivalTime = new Date(
      previousLeg.destination.actualDateTime ||
        previousLeg.destination.plannedDateTime,
    );
    const departureTime = new Date(
      currentLeg.origin.actualDateTime || currentLeg.origin.plannedDateTime,
    );

    const waitingMs = departureTime.getTime() - arrivalTime.getTime();
    return Math.max(0, Math.round(waitingMs / (1000 * 60))); // Convert to minutes, minimum 0
  };

  // Generate detailed header structure with multiple lines
  const getDetailedHeader = () => {
    // Line 1: Transfer count
    const transferCount = `${trip.transfers} transfer${trip.transfers !== 1 ? "s" : ""}`;

    // Line 2: Travel and transfer details - each leg shows travel to destination, then transfer info
    const transferParts: React.ReactNode[] = [];
    trip.legs.forEach((leg, index) => {
      // Calculate leg duration
      const legStart = new Date(
        leg.origin.actualDateTime || leg.origin.plannedDateTime,
      );
      const legEnd = new Date(
        leg.destination.actualDateTime || leg.destination.plannedDateTime,
      );
      const legDurationMinutes = Math.round(
        (legEnd.getTime() - legStart.getTime()) / (1000 * 60),
      );

      // Get modality type with better detection
      let modalityType = "train"; // default
      if (leg.product.type === "TRAM") modalityType = "tram";
      else if (leg.product.type === "BUS" || leg.product.categoryCode === "BUS")
        modalityType = "bus";
      else if (
        leg.product.type === "METRO" ||
        leg.product.categoryCode === "METRO"
      )
        modalityType = "metro";
      else if (
        leg.product.categoryCode === "WALK" ||
        leg.product.type === "WALK"
      )
        modalityType = "walking";
      else if (
        leg.product.displayName &&
        leg.product.displayName.toLowerCase().includes("walk")
      )
        modalityType = "walking";
      else if (
        leg.product.displayName &&
        leg.product.displayName.toLowerCase().includes("bus")
      )
        modalityType = "bus";

      // Get transport mode details
      const getModeDetails = (mode: string) => {
        switch (mode) {
          case "train":
            return {
              icon: "🚆",
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            };
          case "tram":
            return {
              icon: "🚊",
              color: "text-green-600",
              bgColor: "bg-green-50",
            };
          case "bus":
            return {
              icon: "🚌",
              color: "text-orange-600",
              bgColor: "bg-orange-50",
            };
          case "metro":
            return {
              icon: "🚇",
              color: "text-purple-600",
              bgColor: "bg-purple-50",
            };
          case "walking":
            return {
              icon: "🚶",
              color: "text-gray-600",
              bgColor: "bg-gray-50",
            };
          default:
            return {
              icon: "🚉",
              color: "text-slate-600",
              bgColor: "bg-slate-50",
            };
        }
      };

      const modeDetails = getModeDetails(modalityType);

      // Get quiet car info for trains
      const isQuiet =
        leg.product.displayName?.toLowerCase().includes("stil") ||
        leg.product.displayName?.toLowerCase().includes("quiet");

      // Get departure platform for trains and trams
      const departurePlatform =
        leg.origin.actualTrack || leg.origin.plannedTrack;
      const platformInfo =
        (modalityType === "train" || modalityType === "tram") &&
        departurePlatform
          ? `(${departurePlatform}) `
          : "";

      // Get departure and arrival times
      const departureTime = new Date(
        leg.origin.actualDateTime || leg.origin.plannedDateTime,
      );
      const arrivalTime = new Date(
        leg.destination.actualDateTime || leg.destination.plannedDateTime,
      );
      const formatTime = (date: Date) =>
        date.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        });

      // Calculate delays for departure and arrival
      const departureDelay = calculateDelay(
        leg.origin.plannedDateTime,
        leg.origin.actualDateTime,
      );
      const arrivalDelay = calculateDelay(
        leg.destination.plannedDateTime,
        leg.destination.actualDateTime,
      );
      const departureDelayInfo = formatDelay(departureDelay);
      const arrivalDelayInfo = formatDelay(arrivalDelay);

      transferParts.push(
        <div
          key={`leg-${index}`}
          className={`text-sm ${modeDetails.bgColor} rounded overflow-hidden`}
        >
          {/* Mobile-optimized layout */}
          <div className="flex items-center gap-1 p-2">
            {/* Start time with delay info - smaller on mobile */}
            <div 
              className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 min-w-[42px] text-center flex-shrink-0 cursor-pointer hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                const dateTime = leg.origin.actualDateTime || leg.origin.plannedDateTime;
                console.log('Departure time clicked - raw dateTime:', dateTime);
                handleTimeClick(
                  leg.origin.name,
                  lastLeg.destination.name,
                  dateTime
                );
              }}
            >
              <div>{formatTime(departureTime)}</div>
              {departureDelayInfo.text && (
                <div className={`text-[10px] ${departureDelayInfo.className}`}>
                  {departureDelayInfo.text}
                </div>
              )}
            </div>

            <span className="text-lg flex-shrink-0">{modeDetails.icon}</span>

            <div className="flex-1 min-w-0 px-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-500 font-mono">
                  {legDurationMinutes}min
                </span>
                {isQuiet && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                    quiet
                  </span>
                )}
                <span className={`text-xs ${modeDetails.color} font-medium cursor-pointer hover:underline`}
                      onClick={() => handleTrainClick(leg)}>
                  {modalityType}
                  {(() => {
                    // Add direction indicator for trains
                    if (modalityType === "train") {
                      const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
                      const carriageData = legCarriageData[legKey];
                      if (carriageData?.direction === "LINKS") {
                        return " (←)";
                      } else if (carriageData?.direction === "RECHTS") {
                        return " (→)";
                      }
                    }
                    return "";
                  })()}
                </span>
              </div>
              <div className={`font-bold ${modeDetails.color} truncate`}>
                {platformInfo}{leg.destination.name}
                {leg.direction && leg.direction !== leg.destination.name && (
                  <span className="text-xs text-gray-600 font-normal ml-1">
                    → {leg.direction}
                  </span>
                )}
              </div>
            </div>

            {/* End time with delay info - smaller on mobile */}
            <div 
              className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 min-w-[42px] text-center flex-shrink-0 cursor-pointer hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                const dateTime = leg.destination.actualDateTime || leg.destination.plannedDateTime;
                console.log('Arrival time clicked - raw dateTime:', dateTime);
                handleTimeClick(
                  leg.destination.name,
                  lastLeg.destination.name,
                  dateTime
                );
              }}
            >
              <div>{formatTime(arrivalTime)}</div>
              {arrivalDelayInfo.text && (
                <div className={`text-[10px] ${arrivalDelayInfo.className}`}>
                  {arrivalDelayInfo.text}
                </div>
              )}
            </div>
          </div>
        </div>,
      );

      // If there's a next leg, show transfer info at this destination
      if (index < trip.legs.length - 1) {
        const nextLeg = trip.legs[index + 1];
        const waitingTime = getWaitingTime(index + 1);

        // Skip transfer info for walking (no platforms/waiting)
        let nextModalityType = "train"; // default
        if (nextLeg.product.type === "TRAM") nextModalityType = "tram";
        else if (
          nextLeg.product.type === "BUS" ||
          nextLeg.product.categoryCode === "BUS"
        )
          nextModalityType = "bus";
        else if (
          nextLeg.product.type === "METRO" ||
          nextLeg.product.categoryCode === "METRO"
        )
          nextModalityType = "metro";
        else if (
          nextLeg.product.categoryCode === "WALK" ||
          nextLeg.product.type === "WALK"
        )
          nextModalityType = "walking";
        else if (
          nextLeg.product.displayName &&
          nextLeg.product.displayName.toLowerCase().includes("walk")
        )
          nextModalityType = "walking";
        else if (
          nextLeg.product.displayName &&
          nextLeg.product.displayName.toLowerCase().includes("bus")
        )
          nextModalityType = "bus";

        if (nextModalityType !== "walking" && waitingTime > 0) {
          // Get platform information for the transfer
          const arrivalPlatform =
            leg.destination.actualTrack || leg.destination.plannedTrack;
          const departurePlatform =
            nextLeg.origin.actualTrack || nextLeg.origin.plannedTrack;

          let platformInfo = "";
          if (arrivalPlatform && departurePlatform) {
            platformInfo = `:${arrivalPlatform}->${departurePlatform}`;
          } else if (departurePlatform) {
            platformInfo = `:${departurePlatform}`;
          }

          transferParts.push(
            <div
              key={`transfer-${index}`}
              className="text-xs text-black ml-8 -mt-1 mb-1"
            >
              ↻ transfer: {waitingTime}min{platformInfo}
            </div>,
          );
        }
      }
    });

    // Line 3: Material/train info with seating - only show if data is available
    const materialParts: string[] = [];
    trip.legs.forEach((leg, index) => {
      const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
      const trainType = legTrainTypes[legKey];

      // Only add material info if we have both train type and seating data
      const seatingData = legSeatingData[legKey];
      if (trainType && seatingData && trainType !== "undefined") {
        materialParts.push(
          `${trainType} (${seatingData.first} : ${seatingData.second})`,
        );
      }
    });

    return {
      transferCount,
      transferDetails: transferParts,
      materialInfo: materialParts.length > 0 ? materialParts.join(" - ") : null,
    };
  };

  // Fetch train details for each leg to get the actual train type
  useEffect(() => {
    const fetchTrainDetails = async () => {
      const apiCalls: Array<{
        url: string;
        response: any;
        error?: string;
        timestamp: string;
      }> = [];

      const promises = trip.legs.map(async (leg) => {
        try {
          // Extract train number, destination station code, and datetime from the leg
          const trainNumber = leg.product.number;
          const destinationStationCode = leg.destination.stationCode;
          const dateTime = leg.origin.plannedDateTime;

          if (!trainNumber || !destinationStationCode) return null;

          // For static deployment, make direct call to NS Virtual Train API with CORS and seating features
          const virtualTrainUrl = `https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${trainNumber}/${encodeURIComponent(destinationStationCode)}?dateTime=${encodeURIComponent(dateTime)}&features=zitplaats,druktev2,platformitems`;
          const timestamp = new Date().toISOString();

          const response = await fetch(virtualTrainUrl, {
            headers: {
              "Ocp-Apim-Subscription-Key":
                import.meta.env.VITE_NS_API_KEY || "",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          // Log the full structure to understand seat data format
          console.log(
            "Full Virtual Train API Response Structure:",
            JSON.stringify(data, null, 2),
          );

          // Store API call details
          apiCalls.push({
            url: virtualTrainUrl,
            response: data,
            error: response.ok
              ? undefined
              : `${response.status}: ${response.statusText}`,
            timestamp,
          });

          if (!response.ok) {
            console.warn(
              `Failed to fetch train details for ${trainNumber}:`,
              response.statusText,
            );
            return null;
          }

          // Extract seat counts, carriage count, bakken images, and direction from Virtual Train API response
          let firstClassSeats = 0;
          let secondClassSeats = 0;
          let carriageCount = 0;
          let bakkenImages: string[] = [];
          let direction = data.rijrichting || null; // Extract direction (LINKS/RECHTS)

          if (data.materieeldelen && data.materieeldelen.length > 0) {
            data.materieeldelen.forEach((deel: any) => {
              // Count carriages from bakken array and collect images
              if (deel.bakken && deel.bakken.length > 0) {
                carriageCount += deel.bakken.length;
                deel.bakken.forEach((bak: any) => {
                  if (bak.afbeelding && bak.afbeelding.url) {
                    bakkenImages.push(bak.afbeelding.url);
                  }
                });
              }
              // Sum seating from materieeldeel level
              if (deel.zitplaatsen) {
                firstClassSeats += deel.zitplaatsen.zitplaatsEersteKlas || 0;
                secondClassSeats += deel.zitplaatsen.zitplaatsTweedeKlas || 0;
              }
            });
          }

          return {
            legKey: `${trainNumber}-${destinationStationCode}`,
            trainType: data.type || leg.product.categoryCode,
            firstClassSeats: firstClassSeats,
            secondClassSeats: secondClassSeats,
            carriageCount: carriageCount,
            bakkenImages: bakkenImages,
            direction: direction,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.warn(`Error fetching train details for leg:`, error);

          // Store error details
          apiCalls.push({
            url: `Error constructing URL for leg ${leg.product.number}`,
            response: null,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });

          return null;
        }
      });

      const results = await Promise.all(promises);
      const newTrainTypes: { [key: string]: string } = {};
      const newSeatingData: {
        [key: string]: { first: number; second: number };
      } = {};
      const newCarriageData: {
        [key: string]: { carriageCount: number; bakkenImages: string[]; direction?: string };
      } = {};

      results.forEach((result) => {
        if (result) {
          newTrainTypes[result.legKey] = result.trainType;
          newSeatingData[result.legKey] = {
            first: result.firstClassSeats || 0,
            second: result.secondClassSeats || 0,
          };
          newCarriageData[result.legKey] = {
            carriageCount: result.carriageCount || 0,
            bakkenImages: result.bakkenImages || [],
            direction: result.direction || undefined,
          };

          // Emit custom event for the filter to listen to
          window.dispatchEvent(
            new CustomEvent("trainTypeUpdated", {
              detail: { trainType: result.trainType },
            }),
          );
        }
      });

      setLegTrainTypes(newTrainTypes);
      setLegSeatingData(newSeatingData);
      setLegCarriageData(newCarriageData);
      setApiCallDetails(apiCalls);

      // Emit enhanced types to parent component for filtering
      const enhancedTypes = Object.values(newTrainTypes);
      window.dispatchEvent(
        new CustomEvent("tripEnhancedDataUpdated", {
          detail: { tripId: trip.uid, enhancedTypes },
        }),
      );
    };

    if (trip.legs.length > 0) {
      fetchTrainDetails();
    }
  }, [trip.legs]);

  // No longer filtering at card level - parent component handles filtering

  return (
    <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
      {/* Trip Header */}
      <CardContent className="p-4 border-b border-gray-100">
        {/* Start/End times on first line */}
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            {/* Trip Overview */}
            <div className="flex items-center space-x-8 w-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {formatTime(
                    firstLeg.origin.actualDateTime ||
                      firstLeg.origin.plannedDateTime,
                  )}
                </div>
                {(() => {
                  const delay = calculateDelay(
                    firstLeg.origin.plannedDateTime,
                    firstLeg.origin.actualDateTime,
                  );
                  const delayInfo = formatDelay(delay);
                  return delayInfo.text ? (
                    <div className={`text-xs ${delayInfo.className}`}>
                      {delayInfo.text}
                    </div>
                  ) : null;
                })()}
                <div className="text-sm text-gray-600">
                  {firstLeg.origin.name}
                </div>
                <div className="text-xs text-gray-500">
                  Platform{" "}
                  {firstLeg.origin.actualTrack ||
                    firstLeg.origin.plannedTrack ||
                    "?"}
                </div>
              </div>
              <div className="flex-1 relative">
                <div className="h-px bg-gray-300 relative">
                  <div
                    className={`absolute inset-0 h-full rounded ${getLineColor()}`}
                  ></div>
                  {trip.transfers > 0 ? (
                    <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-600 bg-white px-1 w-6 h-6" />
                  ) : (
                    <Train className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-ns-blue bg-white px-1 w-6 h-6" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {formatTime(
                    lastLeg.destination.actualDateTime ||
                      lastLeg.destination.plannedDateTime,
                  )}
                </div>
                {(() => {
                  const delay = calculateDelay(
                    lastLeg.destination.plannedDateTime,
                    lastLeg.destination.actualDateTime,
                  );
                  const delayInfo = formatDelay(delay);
                  return delayInfo.text ? (
                    <div className={`text-xs ${delayInfo.className}`}>
                      {delayInfo.text}
                    </div>
                  ) : null;
                })()}
                <div className="text-sm text-gray-600">
                  {lastLeg.destination.name}
                </div>
                <div className="text-xs text-gray-500">
                  Platform{" "}
                  {lastLeg.destination.actualTrack ||
                    lastLeg.destination.plannedTrack ||
                    "?"}
                </div>
              </div>
            </div>
          </div>
          
          {/* Delay status and journey time on second line */}
          <div className="flex items-center justify-between">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.className}`}
            >
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-800">
                {Math.floor(trip.plannedDurationInMinutes / 60)}:
                {(trip.plannedDurationInMinutes % 60)
                  .toString()
                  .padStart(2, "0")}
              </div>
              <div className="text-xs text-gray-600">Total journey</div>
            </div>
          </div>

          {/* Trip details on separate line */}
          <div className="text-gray-600 text-sm space-y-1">
            {(() => {
              const headerInfo = getDetailedHeader();
              return (
                <>
                  <div className="font-medium">{headerInfo.transferCount}</div>
                  <div className="space-y-1">{headerInfo.transferDetails}</div>
                  {headerInfo.materialInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <div className="text-blue-800 font-semibold text-sm">
                        {headerInfo.materialInfo}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Toggle Details Button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="text-ns-blue hover:bg-ns-light-blue"
          >
            {showDetails ? "Hide" : "Show"} Journey Details
          </Button>
        </div>
      </CardContent>

      {/* Trip Legs Details */}
      {showDetails && (
        <CardContent className="p-6">
          <LegDetails
            legs={trip.legs}
            originalDestination={lastLeg.destination.name}
            legSeatingData={legSeatingData}
            legTrainTypes={legTrainTypes}
            legCarriageData={legCarriageData}
          />

          {/* API Call Details Section */}
          <div className="mt-6 border-t pt-4">
            <button
              onClick={() => setShowApiDetails(!showApiDetails)}
              className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
            >
              {showApiDetails
                ? "Hide API Call Details"
                : "Show API Call Details"}
            </button>

            {showApiDetails && apiCallDetails.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">
                  Virtual Train API Calls
                </h4>
                {apiCallDetails.map((apiCall, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-3 rounded-lg text-sm"
                  >
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">
                        Call #{index + 1}:
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {apiCall.timestamp}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="font-medium text-gray-700">URL:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                        {apiCall.url}
                      </code>
                    </div>

                    {apiCall.error && (
                      <div className="mb-2">
                        <span className="font-medium text-red-600">Error:</span>
                        <span className="ml-2 text-red-600 text-xs">
                          {apiCall.error}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="font-medium text-gray-700">
                        Response:
                      </span>
                      <pre className="bg-white p-2 rounded mt-1 text-xs overflow-auto max-h-32 border">
                        {JSON.stringify(apiCall.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showApiDetails && apiCallDetails.length === 0 && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                No API calls made yet. Virtual train API calls will appear here
                when the component loads.
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Carriage Modal */}
      {showCarriageModal && selectedCarriageData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedCarriageData.trainType} Train Carriages
                {selectedCarriageData.direction && (
                  <span className="ml-2 text-sm text-gray-600">
                    Direction: {selectedCarriageData.direction === "LINKS" ? "← Left" : "→ Right"}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowCarriageModal(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Full Width Carriage Images */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {selectedCarriageData.bakkenImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    {/* Direction indicator box */}
                    {selectedCarriageData.direction && (
                      <>
                        {selectedCarriageData.direction === "LINKS" && index === 0 && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded font-bold z-10">
                            ← Direction
                          </div>
                        )}
                        {selectedCarriageData.direction === "RECHTS" && index === selectedCarriageData.bakkenImages.length - 1 && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded font-bold z-10">
                            Direction →
                          </div>
                        )}
                      </>
                    )}
                    <img
                      src={imageUrl}
                      alt={`Carriage ${index + 1}`}
                      className="w-full h-auto object-contain rounded border shadow-sm"
                      style={{ maxHeight: 'none' }}
                    />
                    <div className="text-center text-sm text-gray-600 mt-2">
                      Carriage {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Trips Modal */}
      <AlternativeTripsModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        fromStation={modalState.fromStation}
        toStation={modalState.toStation}
        fromDateTime={modalState.fromDateTime}
        originalDestination={lastLeg.destination.name}
      />
    </Card>
  );
}
