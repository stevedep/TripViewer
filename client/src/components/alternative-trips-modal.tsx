import { useState, useEffect } from "react";
import { X, Clock, Train } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchTrips } from "@/lib/nsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Trip } from "@shared/schema";

interface AlternativeTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromStation: string;
  toStation: string;
  fromDateTime: string;
  originalDestination: string;
}

export default function AlternativeTripsModal({
  isOpen,
  onClose,
  fromStation,
  toStation,
  fromDateTime,
  originalDestination
}: AlternativeTripsModalProps) {
  const [legSeatingData, setLegSeatingData] = useState<{ [key: string]: { first: number; second: number } }>({});
  const [legTrainTypes, setLegTrainTypes] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/trips", fromStation, originalDestination, fromDateTime],
    queryFn: () => searchTrips({
      fromStation,
      toStation: originalDestination,
      dateTime: fromDateTime
    }),
    enabled: isOpen,
  });

  // Fetch material information for trip legs when data loads
  useEffect(() => {
    if (!data?.trips || data.trips.length === 0) return;

    const fetchMaterialInfo = async () => {
      const promises = data.trips.slice(0, 5).flatMap((trip: Trip) =>
        trip.legs.map(async (leg) => {
          const trainNumber = leg.product.number;
          const destinationStationCode = leg.destination.stationCode;
          const dateTime = leg.origin.plannedDateTime;
          
          if (!trainNumber || !destinationStationCode) return null;

          try {
            // For static deployment, make direct call to NS Virtual Train API with seating features
            const virtualTrainUrl = `https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/${trainNumber}/${encodeURIComponent(destinationStationCode)}?dateTime=${encodeURIComponent(dateTime)}&features=zitplaats,druktev2,platformitems`;

            const response = await fetch(virtualTrainUrl, {
              headers: {
                'Ocp-Apim-Subscription-Key': import.meta.env.VITE_NS_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              console.warn(`Failed to fetch train details for ${trainNumber}:`, response.statusText);
              return null;
            }

            const data = await response.json();

            // Extract seat counts from Virtual Train API response
            let firstClassSeats = 0;
            let secondClassSeats = 0;
            
            if (data.materieeldelen && data.materieeldelen.length > 0) {
              data.materieeldelen.forEach((deel: any) => {
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
              secondClassSeats: secondClassSeats
            };
          } catch (err) {
            console.warn(`Error fetching train details for ${trainNumber}:`, err);
            return null;
          }
        })
      );

      const results = await Promise.all(promises);
      const newTrainTypes: { [key: string]: string } = {};
      const newSeatingData: { [key: string]: { first: number; second: number } } = {};
      
      results.forEach(result => {
        if (result) {
          newTrainTypes[result.legKey] = result.trainType;
          newSeatingData[result.legKey] = {
            first: result.firstClassSeats || 0,
            second: result.secondClassSeats || 0
          };
        }
      });

      setLegTrainTypes(newTrainTypes);
      setLegSeatingData(newSeatingData);
    };

    fetchMaterialInfo();
  }, [data]);

  // Format time
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate delay in minutes
  const calculateDelay = (plannedDateTime: string, actualDateTime: string | undefined): number => {
    if (!actualDateTime) return 0;
    const planned = new Date(plannedDateTime);
    const actual = new Date(actualDateTime);
    const delayMs = actual.getTime() - planned.getTime();
    return Math.round(delayMs / (1000 * 60));
  };

  // Format delay display
  const formatDelay = (delayMinutes: number): { text: string; className: string } => {
    if (delayMinutes === 0) return { text: '', className: '' };
    if (delayMinutes > 0) {
      return { 
        text: `+${delayMinutes} min`, 
        className: 'text-red-600 font-medium' 
      };
    } else {
      return { 
        text: `${delayMinutes} min`, 
        className: 'text-green-600 font-medium' 
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Alternative Trips</h2>
            <p className="text-sm text-gray-600">
              From {fromStation} to {originalDestination} starting {formatTime(fromDateTime)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ns-blue"></div>
              <span className="ml-2 text-gray-600">Loading alternative trips...</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center py-8">
              Failed to load alternative trips. Please try again.
            </div>
          )}

          {data && data.trips && (
            <div className="space-y-4">
              {data.trips.slice(0, 5).map((trip: Trip, index: number) => {
                const firstLeg = trip.legs[0];
                const lastLeg = trip.legs[trip.legs.length - 1];
                
                return (
                  <Card key={trip.uid} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          {/* Departure */}
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">
                              {formatTime(firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime)}
                            </div>
                            {(() => {
                              const delay = calculateDelay(firstLeg.origin.plannedDateTime, firstLeg.origin.actualDateTime);
                              const delayInfo = formatDelay(delay);
                              return delayInfo.text ? (
                                <div className={`text-xs ${delayInfo.className}`}>
                                  {delayInfo.text}
                                </div>
                              ) : null;
                            })()}
                            <div className="text-xs text-gray-500">
                              Platform {firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || "?"}
                            </div>
                          </div>

                          {/* Journey line */}
                          <div className="flex-1 relative">
                            <div className="h-px bg-gray-300 relative min-w-24">
                              <div className="absolute inset-0 h-full rounded bg-ns-blue"></div>
                              <Train className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-ns-blue bg-white px-1 w-5 h-5" />
                            </div>
                            <div className="text-xs text-gray-500 text-center mt-1">
                              {trip.transfers} transfer{trip.transfers !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Arrival */}
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">
                              {formatTime(lastLeg.destination.actualDateTime || lastLeg.destination.plannedDateTime)}
                            </div>
                            {(() => {
                              const delay = calculateDelay(lastLeg.destination.plannedDateTime, lastLeg.destination.actualDateTime);
                              const delayInfo = formatDelay(delay);
                              return delayInfo.text ? (
                                <div className={`text-xs ${delayInfo.className}`}>
                                  {delayInfo.text}
                                </div>
                              ) : null;
                            })()}
                            <div className="text-xs text-gray-500">
                              Platform {lastLeg.destination.actualTrack || lastLeg.destination.plannedTrack || "?"}
                            </div>
                          </div>
                        </div>

                        {/* Duration and Material Info */}
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {Math.floor(trip.plannedDurationInMinutes / 60)}:{(trip.plannedDurationInMinutes % 60).toString().padStart(2, '0')}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">Total journey</div>
                          
                          {/* Material Information */}
                          <div className="text-xs text-gray-600 space-y-1">
                            {trip.legs.map((leg, legIndex) => {
                              const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
                              const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
                              const seatingData = legSeatingData[legKey];
                              
                              return (
                                <div key={legIndex} className="text-left">
                                  {seatingData ? (
                                    <span className="text-ns-blue font-medium">
                                      {trainType} ({seatingData.first} : {seatingData.second})
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">
                                      {trainType} (? : ?)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}