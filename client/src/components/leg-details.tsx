import { useState } from "react";
import { Route, ChevronDown, ChevronUp } from "lucide-react";
import { type Leg } from "@shared/schema";

interface LegDetailsProps {
  legs: Leg[];
}

export default function LegDetails({ legs }: LegDetailsProps) {
  const [expandedLegs, setExpandedLegs] = useState<Set<string>>(new Set());

  const toggleLegStops = (legIdx: string) => {
    const newExpanded = new Set(expandedLegs);
    if (newExpanded.has(legIdx)) {
      newExpanded.delete(legIdx);
    } else {
      newExpanded.add(legIdx);
    }
    setExpandedLegs(newExpanded);
  };

  // Format time
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get train type color
  const getTrainTypeColor = (categoryCode: string) => {
    switch (categoryCode) {
      case 'IC':
        return 'bg-ns-blue text-white';
      case 'SPR':
        return 'bg-green-600 text-white';
      case 'ICD':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Calculate stop duration
  const getStopDuration = (arrival?: string, departure?: string) => {
    if (!arrival || !departure) return "0 min stop";
    
    const arrivalTime = new Date(arrival);
    const departureTime = new Date(departure);
    const diffMinutes = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60));
    
    return diffMinutes > 0 ? `${diffMinutes} min stop` : "0 min stop";
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Route className="text-ns-blue mr-2" />
        Journey Details
      </h3>

      {legs.map((leg, index) => (
        <div key={leg.idx || index} className="border border-gray-200 rounded-lg p-4 mb-4 last:mb-0">
          {/* Leg Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${getTrainTypeColor(leg.product.categoryCode)}`}>
                {leg.product.categoryCode} {leg.product.number}
              </div>
              <div className="text-gray-700 font-medium">{leg.product.displayName}</div>
              <div className="text-gray-500 text-sm">→ {leg.direction}</div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {leg.duration.value}
            </div>
          </div>

          {/* Leg Journey */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Origin */}
            <div className="flex items-start space-x-3">
              <div className="bg-green-500 w-3 h-3 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-gray-800">{leg.origin.name}</div>
                <div className="text-sm text-gray-600">
                  Departure: {formatTime(leg.origin.actualDateTime)}
                </div>
                <div className="text-xs text-gray-500">
                  Platform {leg.origin.actualTrack || leg.origin.plannedTrack || "?"}
                </div>
                {leg.origin.actualDateTime !== leg.origin.plannedDateTime && (
                  <div className="text-xs text-yellow-600">
                    Originally: {formatTime(leg.origin.plannedDateTime)}
                  </div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-start space-x-3">
              <div className="bg-red-500 w-3 h-3 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-gray-800">{leg.destination.name}</div>
                <div className="text-sm text-gray-600">
                  Arrival: {formatTime(leg.destination.actualDateTime)}
                </div>
                <div className="text-xs text-gray-500">
                  Platform {leg.destination.actualTrack || leg.destination.plannedTrack || "?"}
                </div>
                {leg.destination.actualDateTime !== leg.destination.plannedDateTime && (
                  <div className="text-xs text-yellow-600">
                    Originally: {formatTime(leg.destination.plannedDateTime)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Intermediate Stops */}
          {leg.stops && leg.stops.length > 2 && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Intermediate Stops</span>
                <button 
                  className="text-ns-blue text-sm hover:underline flex items-center"
                  onClick={() => toggleLegStops(leg.idx)}
                >
                  <span>
                    {expandedLegs.has(leg.idx) ? 'Hide' : 'Show'} {leg.stops.length - 2} stops
                  </span>
                  {expandedLegs.has(leg.idx) ? (
                    <ChevronUp className="ml-1 w-4 h-4" />
                  ) : (
                    <ChevronDown className="ml-1 w-4 h-4" />
                  )}
                </button>
              </div>
              
              {expandedLegs.has(leg.idx) && (
                <div className="space-y-2">
                  {leg.stops.slice(1, -1).map((stop, stopIndex) => (
                    <div key={stop.uicCode || stopIndex} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium text-gray-800">{stop.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          Platform {stop.actualArrivalTrack || stop.plannedArrivalTrack || "?"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {stop.plannedArrivalDateTime && stop.plannedDepartureDateTime ? (
                          <>
                            {formatTime(stop.actualArrivalDateTime || stop.plannedArrivalDateTime)} - {formatTime(stop.actualDepartureDateTime || stop.plannedDepartureDateTime)}
                            <span className="ml-2 text-xs">
                              ({getStopDuration(stop.actualArrivalDateTime || stop.plannedArrivalDateTime, stop.actualDepartureDateTime || stop.plannedDepartureDateTime)})
                            </span>
                          </>
                        ) : (
                          formatTime(stop.actualDepartureDateTime || stop.plannedDepartureDateTime || "")
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
