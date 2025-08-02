import { useState, useEffect } from "react";
import { X, Clock, Train, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchTrips } from "@/lib/nsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Trip } from "@shared/schema";
import TripHeader from "./trip-header";

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
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

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
        trip.legs.filter(leg => leg.travelType === 'PUBLIC_TRANSPORT').map(async (leg) => {
          const trainNumber = leg.product.number;
          const destinationStationCode = leg.destination.stationCode;
          const dateTime = leg.origin.plannedDateTime;
          
          if (!trainNumber || !destinationStationCode || trainNumber === 'Unknown') return null;

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

  if (!isOpen) return null;

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

  // Calculate waiting time until departure
  const calculateWaitTime = (departureTime: string, requestedTime: string): string => {
    const departure = new Date(departureTime);
    const requested = new Date(requestedTime);
    const diffMinutes = Math.round((departure.getTime() - requested.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 0) return "Now";
    if (diffMinutes < 60) return `+${diffMinutes} min`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `+${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Toggle trip expansion
  const toggleTripExpansion = (tripUid: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripUid)) {
      newExpanded.delete(tripUid);
    } else {
      newExpanded.add(tripUid);
    }
    setExpandedTrips(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Alternative Trips</h2>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              From {fromStation} to {originalDestination} starting {formatTime(fromDateTime)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0 ml-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[75vh] sm:max-h-[65vh]">
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
                
                const isExpanded = expandedTrips.has(trip.uid);
                
                return (
                  <Card key={trip.uid} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      {/* Clickable header - Mobile-first layout */}
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 cursor-pointer"
                        onClick={() => toggleTripExpansion(trip.uid)}
                      >
                        
                        {/* Times and journey line */}
                        <div className="flex items-center space-x-3 sm:space-x-6 flex-1">
                          {/* Departure */}
                          <div className="text-center flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-gray-800">
                              {formatTime(firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime)}
                            </div>
                            {/* Waiting time */}
                            <div className="text-xs text-blue-600 font-medium">
                              {calculateWaitTime(firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime, fromDateTime)}
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
                            <div className="text-xs text-gray-500 hidden sm:block">
                              Platform {firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || "?"}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden">
                              P{firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || "?"}
                            </div>
                          </div>

                          {/* Journey line */}
                          <div className="flex-1 relative">
                            <div className="h-px bg-gray-300 relative min-w-16 sm:min-w-24">
                              <div className="absolute inset-0 h-full rounded bg-ns-blue"></div>
                              <Train className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-ns-blue bg-white px-1 w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="text-xs text-gray-500 text-center mt-1">
                              {trip.transfers} transfer{trip.transfers !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Arrival */}
                          <div className="text-center flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-gray-800">
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
                            <div className="text-xs text-gray-500 hidden sm:block">
                              Platform {lastLeg.destination.actualTrack || lastLeg.destination.plannedTrack || "?"}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden">
                              P{lastLeg.destination.actualTrack || lastLeg.destination.plannedTrack || "?"}
                            </div>
                          </div>
                        </div>

                        {/* Duration and expand button */}
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="text-center sm:text-right flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-gray-800">
                              {Math.floor(trip.plannedDurationInMinutes / 60)}:{(trip.plannedDurationInMinutes % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="text-xs text-gray-600">Total journey</div>
                          </div>
                          
                          {/* Expand/Collapse Icon */}
                          <div className="text-gray-400 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details - Hidden by default */}
                      {isExpanded && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <TripHeader 
                            trip={trip}
                            legSeatingData={legSeatingData}
                            legTrainTypes={legTrainTypes}
                          />
                          {/* Debug info */}
                          <div className="mt-2 text-xs text-gray-500">
                            Debug: legTrainTypes keys: {Object.keys(legTrainTypes).join(', ')}<br/>
                            Debug: legSeatingData keys: {Object.keys(legSeatingData).join(', ')}<br/>
                            Debug: trip transfers: {trip.transfers}<br/>
                            Debug: legs: {trip.legs.map(leg => `${leg.product.number}-${leg.destination.stationCode}`).join(', ')}
                          </div>
                        </div>
                      )}
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