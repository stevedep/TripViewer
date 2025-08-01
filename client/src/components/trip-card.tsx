import { useState, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, Train, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LegDetails from "./leg-details";
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
    const hasDelays = trip.legs.some(leg => 
      leg.origin.actualDateTime !== leg.origin.plannedDateTime ||
      leg.destination.actualDateTime !== leg.destination.plannedDateTime
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
    return Math.round(delayMs / (1000 * 60)); // Convert to minutes
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

  // Get line color based on train type
  const getLineColor = () => {
    if (trip.transfers > 0) return "bg-yellow-500";
    return "bg-ns-blue";
  };

  // State to store train types and seating data for each leg and API call details
  const [legTrainTypes, setLegTrainTypes] = useState<{ [key: string]: string }>({});
  const [legSeatingData, setLegSeatingData] = useState<{ [key: string]: { first: number; second: number } }>({});
  const [legCarriageData, setLegCarriageData] = useState<{ [key: string]: { carriageCount: number } }>({});
  const [apiCallDetails, setApiCallDetails] = useState<Array<{
    url: string;
    response: any;
    error?: string;
    timestamp: string;
  }>>([]);
  const [showApiDetails, setShowApiDetails] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // No longer need to filter at card level - parent component handles filtering

  // Get leg category codes for display
  const getLegCategoryCodes = () => {
    return trip.legs.map(leg => {
      const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
      const trainType = legTrainTypes[legKey];
      return trainType || leg.product.categoryCode;
    }).filter(code => code && code.trim()).join(" → ");
  };

  // Calculate waiting time between legs in minutes
  const getWaitingTime = (currentLegIndex: number): number => {
    if (currentLegIndex === 0) return 0; // No waiting for first leg
    
    const currentLeg = trip.legs[currentLegIndex];
    const previousLeg = trip.legs[currentLegIndex - 1];
    
    if (!currentLeg || !previousLeg) return 0;
    
    const arrivalTime = new Date(previousLeg.destination.actualDateTime || previousLeg.destination.plannedDateTime);
    const departureTime = new Date(currentLeg.origin.actualDateTime || currentLeg.origin.plannedDateTime);
    
    const waitingMs = departureTime.getTime() - arrivalTime.getTime();
    return Math.max(0, Math.round(waitingMs / (1000 * 60))); // Convert to minutes, minimum 0
  };

  // Generate detailed header structure with multiple lines
  const getDetailedHeader = () => {
    // Line 1: Transfer count
    const transferCount = `${trip.transfers} transfer${trip.transfers !== 1 ? 's' : ''}`;
    
    // Line 2: Journey details
    const journeyParts: string[] = [];
    trip.legs.forEach((leg, index) => {
      const waitingTime = getWaitingTime(index);
      
      // Get platform information
      const departurePlatform = leg.origin.actualTrack || leg.origin.plannedTrack || "?";
      let platformInfo = departurePlatform;
      
      // For transfers (not first leg), show arrival -> departure platform
      if (index > 0) {
        const previousLeg = trip.legs[index - 1];
        const arrivalPlatform = previousLeg.destination.actualTrack || previousLeg.destination.plannedTrack || "?";
        platformInfo = `${arrivalPlatform} -> ${departurePlatform}`;
      }
      
      // Add full station name where you get on the train
      journeyParts.push(`[${leg.origin.name}]`);
      
      // Add waiting time and platform info
      journeyParts.push(`(${waitingTime} min : ${platformInfo})`);
    });
    
    // Line 3: Material/train info with seating
    const materialParts: string[] = [];
    trip.legs.forEach((leg, index) => {
      const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
      const trainType = legTrainTypes[legKey] || leg.product.categoryCode;
      
      // Get seating information from Virtual Train API data
      const seatingData = legSeatingData[legKey];
      if (seatingData) {
        materialParts.push(`${trainType} (${seatingData.first} : ${seatingData.second})`);
      } else {
        materialParts.push(`${trainType} (? : ?)`);
      }
    });
    
    return {
      transferCount,
      journeyDetails: journeyParts.join(' - '),
      materialInfo: materialParts.join(' - ')
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
              'Ocp-Apim-Subscription-Key': import.meta.env.VITE_NS_API_KEY || '',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();

          // Log the full structure to understand seat data format
          console.log("Full Virtual Train API Response Structure:", JSON.stringify(data, null, 2));

          // Store API call details
          apiCalls.push({
            url: virtualTrainUrl,
            response: data,
            error: response.ok ? undefined : `${response.status}: ${response.statusText}`,
            timestamp
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch train details for ${trainNumber}:`, response.statusText);
            return null;
          }

          // Extract seat counts and carriage count from Virtual Train API response
          let firstClassSeats = 0;
          let secondClassSeats = 0;
          let carriageCount = 0;
          
          if (data.materieeldelen && data.materieeldelen.length > 0) {
            carriageCount = data.materieeldelen.length; // Number of carriages is the number of materieeldelen
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
            secondClassSeats: secondClassSeats,
            carriageCount: carriageCount
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Error fetching train details for leg:`, error);
          
          // Store error details
          apiCalls.push({
            url: `Error constructing URL for leg ${leg.product.number}`,
            response: null,
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
          
          return null;
        }
      });

      const results = await Promise.all(promises);
      const newTrainTypes: { [key: string]: string } = {};
      const newSeatingData: { [key: string]: { first: number; second: number } } = {};
      const newCarriageData: { [key: string]: { carriageCount: number } } = {};
      
      results.forEach(result => {
        if (result) {
          newTrainTypes[result.legKey] = result.trainType;
          newSeatingData[result.legKey] = {
            first: result.firstClassSeats || 0,
            second: result.secondClassSeats || 0
          };
          newCarriageData[result.legKey] = {
            carriageCount: result.carriageCount || 0
          };
          
          // Emit custom event for the filter to listen to
          window.dispatchEvent(new CustomEvent('trainTypeUpdated', {
            detail: { trainType: result.trainType }
          }));
        }
      });

      setLegTrainTypes(newTrainTypes);
      setLegSeatingData(newSeatingData);
      setLegCarriageData(newCarriageData);
      setApiCallDetails(apiCalls);
      
      // Emit enhanced types to parent component for filtering
      const enhancedTypes = Object.values(newTrainTypes);
      window.dispatchEvent(new CustomEvent('tripEnhancedDataUpdated', {
        detail: { tripId: trip.uid, enhancedTypes }
      }));
    };

    if (trip.legs.length > 0) {
      fetchTrainDetails();
    }
  }, [trip.legs]);

  // No longer filtering at card level - parent component handles filtering

  return (
    <Card className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
      {/* Trip Header */}
      <CardContent className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.className}`}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
            <div className="text-gray-600 text-sm max-w-2xl space-y-1">
              {(() => {
                const headerInfo = getDetailedHeader();
                return (
                  <>
                    <div className="font-medium">{headerInfo.transferCount}</div>
                    <div>{headerInfo.journeyDetails}</div>
                    <div className="text-ns-blue font-medium">{headerInfo.materialInfo}</div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">
              {Math.floor(trip.plannedDurationInMinutes / 60)}:{(trip.plannedDurationInMinutes % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600">Total journey</div>
          </div>
        </div>

        {/* Trip Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8 w-full">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
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
              <div className="text-sm text-gray-600">{firstLeg.origin.name}</div>
              <div className="text-xs text-gray-500">
                Platform {firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || "?"}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="h-px bg-gray-300 relative">
                <div className={`absolute inset-0 h-full rounded ${getLineColor()}`}></div>
                {trip.transfers > 0 ? (
                  <ArrowRight className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-600 bg-white px-1 w-6 h-6" />
                ) : (
                  <Train className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-ns-blue bg-white px-1 w-6 h-6" />
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
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
              <div className="text-sm text-gray-600">{lastLeg.destination.name}</div>
              <div className="text-xs text-gray-500">
                Platform {lastLeg.destination.actualTrack || lastLeg.destination.plannedTrack || "?"}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Details Button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="text-ns-blue hover:bg-ns-light-blue"
          >
            {showDetails ? 'Hide' : 'Show'} Journey Details
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
              {showApiDetails ? 'Hide API Call Details' : 'Show API Call Details'}
            </button>
            
            {showApiDetails && apiCallDetails.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Virtual Train API Calls</h4>
                {apiCallDetails.map((apiCall, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">Call #{index + 1}:</span>
                      <span className="ml-2 text-xs text-gray-500">{apiCall.timestamp}</span>
                    </div>
                    
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">URL:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded text-xs">{apiCall.url}</code>
                    </div>
                    
                    {apiCall.error && (
                      <div className="mb-2">
                        <span className="font-medium text-red-600">Error:</span>
                        <span className="ml-2 text-red-600 text-xs">{apiCall.error}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">Response:</span>
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
                No API calls made yet. Virtual train API calls will appear here when the component loads.
              </div>
            )}
          </div>
        </CardContent>
      )}


    </Card>
  );
}