import { type Trip } from "@shared/schema";

interface TripHeaderProps {
  trip: Trip;
  legTrainTypes: { [key: string]: string };
  legSeatingData: { [key: string]: { first: number; second: number } };
}

export default function TripHeader({ trip, legTrainTypes, legSeatingData }: TripHeaderProps) {
  // Get transfer count
  const transferCount = trip.transfers;
  
  // Build material info with seating data
  const materialParts: string[] = [];
  trip.legs.forEach((leg) => {
    if (leg.travelType === 'PUBLIC_TRANSPORT') {
      const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
      const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
      const seatingData = legSeatingData[legKey];
      
      if (trainType && seatingData && trainType !== "undefined") {
        materialParts.push(
          `${trainType} (${seatingData.first} : ${seatingData.second})`
        );
      } else if (trainType && trainType !== "undefined") {
        // Show just train type if no seating data
        materialParts.push(`${trainType} (? : ?)`);
      }
    }
  });

  return (
    <div className="text-gray-600 text-sm space-y-1">
      <div className="font-medium">
        {transferCount} transfer{transferCount !== 1 ? 's' : ''}
      </div>
      {materialParts.length > 0 && (
        <div className="text-ns-blue font-medium text-xs">
          {materialParts.join(' - ')}
        </div>
      )}
    </div>
  );
}