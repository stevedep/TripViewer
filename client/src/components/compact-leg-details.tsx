import { type Trip } from "@shared/schema";

interface CompactLegDetailsProps {
  trip: Trip;
  legSeatingData?: { [key: string]: { first: number; second: number } };
  legTrainTypes?: { [key: string]: string };
}

export default function CompactLegDetails({ trip, legSeatingData, legTrainTypes }: CompactLegDetailsProps) {
  // Format time
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate walking duration in minutes
  const getWalkingDuration = (leg: any): number => {
    if (leg.origin?.plannedDateTime && leg.destination?.plannedDateTime) {
      const start = new Date(leg.origin.plannedDateTime);
      const end = new Date(leg.destination.plannedDateTime);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }
    return 0;
  };

  // Calculate transfer time
  const getTransferTime = (currentLeg: any, nextLeg: any): number => {
    if (currentLeg.destination?.plannedDateTime && nextLeg.origin?.plannedDateTime) {
      const arrival = new Date(currentLeg.destination.plannedDateTime);
      const departure = new Date(nextLeg.origin.plannedDateTime);
      return Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60));
    }
    return 0;
  };

  return (
    <div className="space-y-2 text-sm">
      {trip.legs.map((leg, index) => {
        if (leg.travelType === 'WALK') {
          const duration = getWalkingDuration(leg);
          return (
            <div key={index} className="flex items-center justify-between text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{formatTime(leg.origin.plannedDateTime)}</span>
                <span className="text-xs">🚶 {duration}min walking</span>
                <span className="font-medium">{leg.destination.name}</span>
              </div>
              <span className="text-xs">{formatTime(leg.destination.plannedDateTime)}</span>
            </div>
          );
        } else if (leg.travelType === 'PUBLIC_TRANSPORT' || leg.travelType === 'PUBLIC_TRANSIT') {
          const trainNumber = leg.product?.number || (leg as any).productNumber;
          const destinationCode = leg.destination?.stationCode || (leg as any).destinationCode;
          const legKey = `${trainNumber}-${destinationCode}`;
          const trainType = legTrainTypes?.[legKey] || leg.product?.categoryCode || (leg as any).categoryCode;
          const seatingData = legSeatingData?.[legKey];
          
          // Get final destination from product longCategoryName if available
          const finalDestination = leg.product?.longCategoryName?.split(' → ')[1] || leg.destination.name;
          
          // Calculate journey duration
          const duration = Math.round((new Date(leg.destination.plannedDateTime).getTime() - new Date(leg.origin.plannedDateTime).getTime()) / (1000 * 60));
          
          // Check for next leg to show transfer time
          const nextLeg = trip.legs[index + 1];
          const transferTime = nextLeg ? getTransferTime(leg, nextLeg) : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-blue-600">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{formatTime(leg.origin.plannedDateTime)}</span>
                  <span className="text-xs font-bold bg-blue-600 text-white px-1 rounded">
                    {trainType || leg.product?.categoryCode} {trainNumber}
                  </span>
                  <span className="text-xs">🚂 {duration}min train (→)</span>
                  <span className="font-medium">({trainNumber}) {leg.origin.name}</span>
                  <span className="text-xs">→ {finalDestination}</span>
                </div>
                <span className="text-xs">{formatTime(leg.destination.plannedDateTime)}</span>
              </div>
              
              {/* Show transfer time if there's a next leg */}
              {transferTime > 0 && (
                <div className="text-xs text-gray-500 ml-4">
                  ⏱ transfer: {transferTime}min:{leg.destination.actualTrack || leg.destination.plannedTrack || '?'} {'->'} {nextLeg.origin.actualTrack || nextLeg.origin.plannedTrack || '?'}
                </div>
              )}
              
              {/* Show material and seating info if available */}
              {seatingData && (
                <div className="text-xs text-blue-600 ml-4 font-medium">
                  {trainType} - {seatingData.first} carriages  Avg: {Math.round((seatingData.first + seatingData.second) / 4)} seats/carriage
                  <br />
                  1st class: {seatingData.first} seats (~1 carriages)   2nd class: {seatingData.second} seats (~3 carriages)   Total: {seatingData.first + seatingData.second} seats
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}