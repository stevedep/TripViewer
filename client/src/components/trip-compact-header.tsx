import { type Trip } from "@shared/schema";

interface TripCompactHeaderProps {
  trip: Trip;
  legSeatingData?: { [key: string]: { first: number; second: number } };
  legTrainTypes?: { [key: string]: string };
}

export default function TripCompactHeader({ trip, legSeatingData, legTrainTypes }: TripCompactHeaderProps) {
  // This replicates the exact getDetailedHeader logic from the main trip cards
  
  // Calculate waiting time between legs
  const getWaitingTime = (legIndex: number): number => {
    if (legIndex === 0) return 0; // First leg has no waiting time
    
    const previousLeg = trip.legs[legIndex - 1];
    const currentLeg = trip.legs[legIndex];
    
    if (previousLeg && currentLeg) {
      const arrivalTime = new Date(
        previousLeg.destination.actualDateTime || previousLeg.destination.plannedDateTime
      );
      const departureTime = new Date(
        currentLeg.origin.actualDateTime || currentLeg.origin.plannedDateTime
      );
      
      const diffMs = departureTime.getTime() - arrivalTime.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    }
    
    return 0;
  };

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

    // Format time helper
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    transferParts.push(
      <div
        key={index}
        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 min-w-[42px] text-center">
            {formatTime(departureTime)}
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
              <span className={`text-xs ${modeDetails.color} font-medium`}>
                {modalityType}
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

          <div className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 min-w-[42px] text-center">
            {formatTime(arrivalTime)}
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
    const trainType = legTrainTypes?.[legKey];

    // Only add material info if we have both train type and seating data
    const seatingData = legSeatingData?.[legKey];
    if (trainType && seatingData && trainType !== "undefined") {
      materialParts.push(
        `${trainType} (${seatingData.first} : ${seatingData.second})`,
      );
    }
  });

  return (
    <div className="text-gray-600 text-sm space-y-2">
      <div className="font-medium">{transferCount}</div>
      <div className="space-y-1">{transferParts}</div>
      {materialParts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <div className="text-blue-800 font-semibold text-sm">
            {materialParts.join(" - ")}
          </div>
        </div>
      )}
    </div>
  );
}