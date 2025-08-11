import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Train,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());

  const toggleStopsExpansion = (legIndex: number) => {
    setExpandedStops(prev => {
      const newSet = new Set(prev);
      if (newSet.has(legIndex)) {
        newSet.delete(legIndex);
      } else {
        newSet.add(legIndex);
      }
      return newSet;
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

  // Calculate delay information
  const getStatusInfo = () => {
    if (trip.status === "CANCELLED") {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        text: "Cancelled",
        className: "bg-red-100 text-red-800",
      };
    }

    // Check if any leg has actual delays (more than 0 minutes)
    const hasDelays = trip.legs.some((leg) => {
      const departureDelay = calculateDelay(
        leg.origin.plannedDateTime,
        leg.origin.actualDateTime,
      );
      const arrivalDelay = calculateDelay(
        leg.destination.plannedDateTime,
        leg.destination.actualDateTime,
      );
      return departureDelay > 0 || arrivalDelay > 0;
    });

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

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  };

  // Get line color based on train type
  const getLineColor = () => {
    if (trip.transfers > 0) return "bg-yellow-500";
    return "bg-ns-blue";
  };

  // Get unique travel modalities for the trip with material details and time spent
  const getTravelModalities = () => {
    const modalityTimes: { [key: string]: number } = {};
    const modalityMaterials: { [key: string]: Array<{ name: string; crowdingLevel: string }> } = {};
    
    trip.legs.forEach((leg) => {
      let modalityType = "";
      
      if (leg.product.type === "TRAM") {
        modalityType = "T";
      } else if (leg.product.type === "BUS" || leg.product.categoryCode === "BUS") {
        modalityType = "B";
      } else if (leg.product.type === "METRO" || leg.product.categoryCode === "METRO") {
        modalityType = "M";
      } else if (
        leg.product.categoryCode === "WALK" ||
        leg.product.type === "WALK" ||
        (leg.product.displayName && leg.product.displayName.toLowerCase().includes("walk"))
      ) {
        modalityType = "W";
      } else {
        // Train modality - collect material types
        modalityType = "TR";
      }
      
      // Calculate leg duration in minutes
      const legDuration = leg.plannedDurationInMinutes || 0;
      modalityTimes[modalityType] = (modalityTimes[modalityType] || 0) + legDuration;
      
      // Collect train material types with crowding info
      if (modalityType === "TR") {
        if (!modalityMaterials[modalityType]) {
          modalityMaterials[modalityType] = [];
        }
        
        const legKey = `${leg.product.number}-${leg.origin.stationCode}`;
        const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
        
        // Use real crowding data from NS API
        let crowdingLevel = "low"; // Default green
        
        if (leg.crowdForecast) {
          console.log(`Crowding data for ${trainType} train ${leg.product.number}:`, leg.crowdForecast);
          const crowdForecast = leg.crowdForecast.toUpperCase();
          
          // Map NS crowding levels to text color classes
          switch (crowdForecast) {
            case 'HIGH':
              crowdingLevel = "high"; // Red
              break;
            case 'MEDIUM':
              crowdingLevel = "medium"; // Black (as per user requirement)
              break;
            case 'LOW':
              crowdingLevel = "low"; // Green
              break;
            case 'UNKNOWN':
              crowdingLevel = "unknown"; // Grey
              break;
            default:
              // For other values, default to unknown (grey)
              crowdingLevel = "unknown";
          }
        } else {
          console.log(`No crowding data for ${trainType} train ${leg.product.number}`);
        }
        
        // Avoid duplicates
        if (!modalityMaterials[modalityType].some(m => m.name === trainType)) {
          modalityMaterials[modalityType].push({ name: trainType, crowdingLevel });
        }
      }
    });
    
    // Build the result array with time information
    const result: Array<{
      type: string;
      time: number;
      materials?: Array<{ name: string; crowdingLevel: string }>;
    }> = [];
    
    Object.keys(modalityTimes).forEach(modalityType => {
      result.push({
        type: modalityType,
        time: modalityTimes[modalityType],
        materials: modalityMaterials[modalityType]
      });
    });
    
    return result;
  };

  // Utility function to allocate perronVoorzieningen to bakken based on proportional positioning
  const allocatePerronVoorzieningen = (materieeldeel: any, perronVoorzieningen: any[]) => {
    if (!materieeldeel?.bakken || !perronVoorzieningen || perronVoorzieningen.length === 0) {
      return [];
    }

    const { bakken, breedte } = materieeldeel;
    
    // Calculate total width of all bakken images
    const totalBakkenWidth = bakken.reduce((sum: number, bak: any) => {
      return sum + (bak.afbeelding?.breedte || 0);
    }, 0);

    // Calculate the scale factor between actual train width and image width
    const scaleFactor = breedte / totalBakkenWidth;

    // Create allocation result
    const allocation: Array<{
      bakIndex: number;
      bakImage: any;
      perronVoorzieningen: any[];
    }> = [];

    // Initialize each bak with empty perronVoorzieningen array
    bakken.forEach((bak: any, index: number) => {
      allocation.push({
        bakIndex: index,
        bakImage: bak.afbeelding,
        perronVoorzieningen: []
      });
    });

    // Allocate each perronVoorziening to the appropriate bak
    perronVoorzieningen.forEach((voorziening) => {
      const voorzieningCenter = voorziening.paddingLeft + (voorziening.width / 2);
      
      // Convert perronVoorziening position to scaled position
      const scaledPosition = voorzieningCenter / scaleFactor;
      
      // Find which bak this voorziening belongs to
      let currentPosition = 0;
      let allocatedBakIndex = -1;
      
      for (let i = 0; i < bakken.length; i++) {
        const bakWidth = bakken[i].afbeelding?.breedte || 0;
        const bakStart = currentPosition;
        const bakEnd = currentPosition + bakWidth;
        
        if (scaledPosition >= bakStart && scaledPosition <= bakEnd) {
          allocatedBakIndex = i;
          break;
        }
        
        currentPosition += bakWidth;
      }
      
      // If not found in any specific bak, allocate to the closest one
      if (allocatedBakIndex === -1) {
        currentPosition = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < bakken.length; i++) {
          const bakWidth = bakken[i].afbeelding?.breedte || 0;
          const bakCenter = currentPosition + (bakWidth / 2);
          const distance = Math.abs(scaledPosition - bakCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            allocatedBakIndex = i;
          }
          
          currentPosition += bakWidth;
        }
      }
      
      // Add the voorziening to the allocated bak
      if (allocatedBakIndex >= 0 && allocatedBakIndex < allocation.length) {
        allocation[allocatedBakIndex].perronVoorzieningen.push({
          ...voorziening,
          scaledPosition,
          originalPosition: voorzieningCenter
        });
      }
    });

    return allocation;
  };

  // State to store train types and seating data for each leg and API call details
  const [legTrainTypes, setLegTrainTypes] = useState<{ [key: string]: string }>(
    {},
  );
  const [legSeatingData, setLegSeatingData] = useState<{
    [key: string]: { first: number; second: number };
  }>({});
  const [legCarriageData, setLegCarriageData] = useState<{
    [key: string]: { 
      carriageCount: number; 
      bakkenImages: string[]; 
      direction?: string;
      perronAllocation?: any[];
    };
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
    perronAllocation?: any[];
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
    const legKey = `${leg.product.number}-${leg.origin.stationCode}`;
    const carriageData = legCarriageData[legKey];
    const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
    
    if (carriageData && carriageData.bakkenImages.length > 0) {
      setSelectedCarriageData({
        bakkenImages: carriageData.bakkenImages,
        direction: carriageData.direction,
        trainType: trainType,
        perronAllocation: carriageData.perronAllocation
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
             <div className="flex flex-col items-center gap-1">
               <span className="text-lg flex-shrink-0">{modeDetails.icon}</span>
               <div 
                 className="bg-white/80 px-1.5 py-0.3 rounded text-xs font-mono text-gray-700 min-w-[10px] text-center flex-shrink-0 cursor-pointer hover:bg-blue-50 hover:text-blue-700"
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
             </div>

            <div className="flex-1 min-w-0 px-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-500 font-mono">
                  {formatDuration(legDurationMinutes)}
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
                 
                 {/* Show train material type with crowding color coding */}
                 {modalityType === "train" && (() => {
                   const legKey = `${leg.product.number}-${leg.origin.stationCode}`;
                   const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
                   
                   // Get crowding color based on crowdForecast
                   const getCrowdingColor = (crowdForecast?: string) => {
                     if (!crowdForecast) return 'text-gray-600';
                     const level = crowdForecast.toUpperCase();
                     switch (level) {
                       case 'LOW': return 'text-green-600';
                       case 'MEDIUM': return 'text-black';
                       case 'HIGH': return 'text-red-600';
                       case 'UNKNOWN': return 'text-gray-600';
                       default: return 'text-gray-600';
                     }
                   };
                   
                   return (
                     <span className={`text-xs font-medium ${getCrowdingColor(leg.crowdForecast)}`}>
                       {trainType}
                     </span>
                   );
                 })()}
               </div>
              <div className={`font-bold ${modeDetails.color} truncate`}>
                {platformInfo}{leg.destination.name} {leg.destination.actualTrack && leg.destination.actualTrack.length > 0 && `(${leg.destination.actualTrack})`}
              </div>
              <div>{leg.name} {leg.direction && leg.direction !== leg.destination.name && (
                  <span className="text-xs text-gray-600 font-normal ml-1">
                    → {leg.direction}
                  </span> 
                )}  </div>
                <div>
                  {leg.stops && leg.stops.length > 2 && (
                    <div className="text-xs text-gray-600">
                      {expandedStops.has(index) ? (
                        <div>
                          {leg.stops.slice(1, -1).map((stop, stopIndex) => (
                            <span key={stopIndex}>
                              {stop.name}{stopIndex < leg.stops.slice(1, -1).length - 1 ? ' -> ' : ''}
                            </span>
                          ))}
                          <button 
                            onClick={() => toggleStopsExpansion(index)}
                            className="text-blue-600 hover:text-blue-800 ml-1 underline"
                          >
                            Hide stops
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => toggleStopsExpansion(index)}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Show {leg.stops.length - 2} stops
                        </button>
                      )}
                    </div>
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
              className="text-sm text-purple-600 ml-8 -mt-1 mb-1"
            >
              ↻ transfer: {waitingTime}min{platformInfo}
            </div>,
          );
        }
      }
    });

    // Line 3: Material/train info with seating and crowding - show basic info even if detailed data is loading
    const materialParts: Array<{text: string, crowdForecast?: string}> = [];
    trip.legs.forEach((leg, index) => {
      const legKey = `${leg.product.number}-${leg.origin.stationCode}`;
      const trainType = legTrainTypes[legKey];
      const seatingData = legSeatingData[legKey];

      // Show enhanced info if available, otherwise show basic category code
      if (trainType && seatingData && trainType !== "undefined") {
        materialParts.push({
          text: `${trainType} (${seatingData.first} : ${seatingData.second})`,
          crowdForecast: leg.crowdForecast
        });
      } else if (leg.product.categoryCode && leg.product.categoryCode !== "undefined") {
        // Show basic category code while waiting for detailed train type
        materialParts.push({
          text: leg.product.categoryCode,
          crowdForecast: leg.crowdForecast
        });
      }
    });

    return {
      transferCount,
      transferDetails: transferParts,
      materialParts: materialParts,
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
          // Extract train number, boarding station code, and datetime from the leg
          const trainNumber = leg.product.number;
          const boardingStationCode = leg.origin.stationCode;
          const dateTime = leg.origin.plannedDateTime;

          if (!trainNumber || !boardingStationCode) return null;

          // For static deployment, make direct call to NS Virtual Train API with CORS and seating features
          const virtualTrainUrl = `https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${trainNumber}/${encodeURIComponent(boardingStationCode)}?dateTime=${encodeURIComponent(dateTime)}&features=zitplaats,druktev2,platformitems`;
          const timestamp = new Date().toISOString();

          const response = await fetch(virtualTrainUrl, {
            headers: {
              "Ocp-Apim-Subscription-Key": "ae99952bf4d24fb893ce33472cb6d605"
                // import.meta.env.VITE_NS_API_KEY || "",
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
          let perronAllocation: any[] = [];

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

            // Allocate perronVoorzieningen to bakken for the first materieeldeel
            if (data.perronVoorzieningen && data.materieeldelen[0]) {
              perronAllocation = allocatePerronVoorzieningen(
                data.materieeldelen[0], 
                data.perronVoorzieningen
              );
              console.log("Perron allocation result:", perronAllocation);
            }
          }

          return {
            legKey: `${trainNumber}-${boardingStationCode}`,
            trainType: data.type || leg.product.categoryCode,
            firstClassSeats: firstClassSeats,
            secondClassSeats: secondClassSeats,
            carriageCount: carriageCount,
            bakkenImages: bakkenImages,
            direction: direction,
            perronAllocation: perronAllocation,
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
        [key: string]: { 
          carriageCount: number; 
          bakkenImages: string[]; 
          direction?: string;
          perronAllocation?: any[];
        };
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
            perronAllocation: result.perronAllocation || [],
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
         <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 mx-1">
      {/* Trip Header */}
             <CardContent className="p-2 border-b border-gray-100">
        <div className="mb-3 space-y-2">
          {/* Modality info on first line with transfer count */}
          <div className="flex justify-center">
            <div className="bg-gray-100 border border-gray-300 rounded px-3 py-1 text-sm font-medium text-gray-700 flex items-center gap-1">
              {/* Transfer count first */}
              <span className="flex items-center">
                {trip.transfers} transfer{trip.transfers !== 1 ? 's' : ''} -
              </span>
              {getTravelModalities().map((modality, index) => (
                <span key={index} className="flex items-center">
                  {modality.type}:{modality.time}
                  {modality.materials && modality.materials.length > 0 && (
                    <span className="ml-0.5">
                      (
                      {modality.materials.map((material, matIndex) => {
                        const getCrowdingColor = (level: string) => {
                          switch (level) {
                            case 'low': return 'text-green-600';
                            case 'medium': return 'text-black';
                            case 'high': return 'text-red-600';
                            case 'unknown': return 'text-gray-600';
                            default: return 'text-gray-600';
                          }
                        };
                        
                        return (
                          <span key={matIndex}>
                            <span className={getCrowdingColor(material.crowdingLevel)}>
                              {material.name}
                            </span>
                            {matIndex < modality.materials!.length - 1 && ', '}
                          </span>
                        );
                      })}
                      )
                    </span>
                  )}
                  {index < getTravelModalities().length - 1 && ' '}
                </span>
              ))}
            </div>
          </div>
          
          {/* Start/End times on second line */}
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
                <div className="text-xs text-gray-500 mt-1">
                  → {firstLeg.destination.name}
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
          
          {/* Delay status, collapse triangle, and journey time on second line */}
          <div className="flex items-center justify-between">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.className}`}
            >
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
            
            {/* Collapse/Expand Triangle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              )}
            </button>
            
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

          {/* Trip details on separate line - collapsible */}
          {!isCollapsed && (
            <div className="text-gray-600 text-sm space-y-1">
              {(() => {
                const headerInfo = getDetailedHeader();
                return (
                  <>
                    <div className="space-y-1">{headerInfo.transferDetails}</div>
                    {headerInfo.materialParts && headerInfo.materialParts.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <div className="text-blue-800 font-semibold text-sm">
                          {headerInfo.materialParts.map((material, index) => {
                            // Get color based on crowdForecast value
                            const getCrowdingTextColor = (crowdForecast?: string) => {
                              if (!crowdForecast) return 'text-gray-600';
                              const level = crowdForecast.toUpperCase();
                              switch (level) {
                                case 'LOW': return 'text-green-600';
                                case 'MEDIUM': return 'text-black';
                                case 'HIGH': return 'text-red-600';
                                case 'UNKNOWN': return 'text-gray-600';
                                default: return 'text-gray-600';
                              }
                            };
                            
                            return (
                              <span key={index}>
                                <span className={getCrowdingTextColor(material.crowdForecast)}>
                                  {material.text}
                                </span>
                                {index < headerInfo.materialParts!.length - 1 && ' - '}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Toggle Details Button - only show when expanded */}
        {!isCollapsed && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="text-ns-blue hover:bg-ns-light-blue"
            >
              {showDetails ? "Hide" : "Show"} Journey Details
            </Button>
          </div>
        )}
      </CardContent>

      {/* Trip Legs Details */}
      {showDetails && (
                 <CardContent className="p-2">
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
                {selectedCarriageData.bakkenImages.map((imageUrl, index) => {
                  const perronVoorzieningen = selectedCarriageData.perronAllocation?.[index]?.perronVoorzieningen || [];
                  return (
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
                        {perronVoorzieningen.length > 0 && (
                          <span className="ml-2 text-xs text-green-600">
                            ({perronVoorzieningen.length} platform facilities)
                          </span>
                        )}
                      </div>
                      {perronVoorzieningen.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                          <div className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                            <span className="mr-2">🚉</span>
                            Platform Facilities ({perronVoorzieningen.length})
                          </div>
                          
                          {/* Precise Plotting Bar */}
                          <div className="mb-3">
                            <div className="text-xs text-gray-600 mb-1">Platform Layout (proportional positioning):</div>
                            <div className="relative bg-gray-200 h-8 rounded border">
                              {/* Grid lines for reference */}
                              <div className="absolute inset-0 flex">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <div key={i} className="flex-1 border-r border-gray-300 last:border-r-0"></div>
                                ))}
                              </div>
                              
                              {/* Plot each voorziening at its precise position */}
                              {perronVoorzieningen.map((voorziening: any, vIndex: number) => {
                                const bakImage = selectedCarriageData.perronAllocation?.[index]?.bakImage;
                                if (!bakImage?.breedte) return null;
                                
                                // Calculate position relative to this specific bak image
                                const voorzieningCenter = voorziening.paddingLeft + (voorziening.width / 2);
                                const scaledPosition = voorzieningCenter / (selectedCarriageData.perronAllocation?.[index]?.bakImage?.breedte || 1);
                                const percentagePosition = Math.min(Math.max(scaledPosition * 100, 0), 100);
                                
                                return (
                                  <div
                                    key={vIndex}
                                    className="absolute top-0 h-full flex items-center"
                                    style={{ left: `${percentagePosition}%`, transform: 'translateX(-50%)' }}
                                  >
                                    <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                                      {voorziening.type === 'PERRONLETTER' ? `P${voorziening.description}` : 
                                       voorziening.type === 'LIFT' ? '🛗' :
                                       voorziening.type === 'TRAP' ? '🪜' :
                                       voorziening.type === 'ROLTRAP' ? '🛗' :
                                       voorziening.type.charAt(0)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Left edge of image: 0% | Right edge of image: 100%
                            </div>
                          </div>
                          
                          {/* List of facilities */}
                          <div className="flex flex-wrap gap-2">
                            {perronVoorzieningen.map((voorziening: any, vIndex: number) => (
                              <span key={vIndex} className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 font-medium" title={`${voorziening.type}: ${voorziening.description || 'No description'}`}>
                                {voorziening.type === 'PERRONLETTER' ? `Platform ${voorziening.description}` : 
                                 voorziening.type === 'LIFT' ? '🛗 Lift' :
                                 voorziening.type === 'TRAP' ? '🪜 Stairs' :
                                 voorziening.type === 'ROLTRAP' ? '🛗 Escalator' :
                                 voorziening.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
