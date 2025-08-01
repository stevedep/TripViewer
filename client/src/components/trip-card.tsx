import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Train, ArrowRight, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LegDetails from "@/components/leg-details";
import { type Trip } from "@shared/schema";

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
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

  // Get line color based on train type
  const getLineColor = () => {
    if (trip.transfers > 0) return "bg-yellow-500";
    return "bg-ns-blue";
  };

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
            <div className="text-gray-600 text-sm">
              {trip.transfers} transfer{trip.transfers !== 1 ? 's' : ''}
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
                {formatTime(firstLeg.origin.actualDateTime)}
              </div>
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
                {formatTime(lastLeg.destination.actualDateTime)}
              </div>
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
          <LegDetails legs={trip.legs} />
        </CardContent>
      )}

      {/* Trip Actions */}
      <CardContent className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Real-time information
          </div>
          <Button className="bg-ns-orange hover:bg-orange-600 text-white font-medium">
            <Ticket className="w-4 h-4 mr-2" />
            Buy Ticket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}