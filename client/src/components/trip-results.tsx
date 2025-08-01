import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import TripCard from "@/components/trip-card";
import { NSApiResponseSchema, type NSApiResponse, type TripSearch } from "@shared/schema";

export default function TripResults() {
  const [searchParams, setSearchParams] = useState<TripSearch | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Listen for search events
  useEffect(() => {
    const handleSearch = (event: CustomEvent<TripSearch>) => {
      console.log("TripResults received search event:", event.detail);
      setSearchParams(event.detail);
      setIsLoading(true);
    };

    console.log("TripResults: Adding event listener for tripSearch");
    window.addEventListener('tripSearch', handleSearch as EventListener);
    return () => {
      console.log("TripResults: Removing event listener for tripSearch");
      window.removeEventListener('tripSearch', handleSearch as EventListener);
    };
  }, []);

  // Query trips data
  const { data, error, isError, isLoading: queryLoading } = useQuery<NSApiResponse>({
    queryKey: ["/api/trips", searchParams?.fromStation, searchParams?.toStation, searchParams?.dateTime],
    enabled: !!searchParams,
    meta: {
      onSettled: () => setIsLoading(false),
    },
  });

  // Debug: Log the current state
  console.log("TripResults Debug:", {
    searchParams,
    data,
    error,
    isError,
    queryLoading,
    isLoading
  });

  // Loading state
  if (isLoading || queryLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center space-x-2 text-ns-blue">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ns-blue"></div>
          <span className="text-lg font-medium">Searching for trips...</span>
        </div>
        {/* Debug information */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <p><strong>Search Params:</strong> {JSON.stringify(searchParams, null, 2)}</p>
          <p><strong>Query Loading:</strong> {String(queryLoading)}</p>
          <p><strong>Is Loading:</strong> {String(isLoading)}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="bg-red-50 border border-red-200 rounded-lg">
        <CardContent className="p-6 text-center">
          <AlertCircle className="text-red-500 text-3xl mb-4 mx-auto w-12 h-12" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load trips</h3>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : "An unexpected error occurred while fetching trip data."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // No search performed yet
  if (!searchParams) {
    return (
      <Card className="bg-blue-50 border border-blue-200 rounded-lg">
        <CardContent className="p-6 text-center">
          <Clock className="text-blue-500 text-3xl mb-4 mx-auto w-12 h-12" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Ready to search</h3>
          <p className="text-blue-600">
            Enter your travel details above and click "Search Trips" to find available journeys.
          </p>
          {/* Debug information */}
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <p><strong>Search Params:</strong> {searchParams ? JSON.stringify(searchParams, null, 2) : "None"}</p>
            <p><strong>Data:</strong> {data ? JSON.stringify(data, null, 2) : "None"}</p>
            <p><strong>Error:</strong> {error ? String(error) : "None"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No trips found
  if (data && (!data.trips || data.trips.length === 0)) {
    return (
      <Card className="bg-red-50 border border-red-200 rounded-lg">
        <CardContent className="p-6 text-center">
          <AlertCircle className="text-red-500 text-3xl mb-4 mx-auto w-12 h-12" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">No trips found</h3>
          <p className="text-red-600 mb-4">
            We couldn't find any trips for your selected route and time. Please try adjusting your search criteria.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Display results
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <List className="text-ns-blue mr-3" />
          Available Trips
        </h2>
        <div className="text-sm text-gray-600">
          {data?.trips?.length || 0} trips found
        </div>
      </div>

      {/* Debug information */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg text-sm">
        <h4 className="font-bold mb-2">Debug Info:</h4>
        <p><strong>Search Params:</strong> {JSON.stringify(searchParams, null, 2)}</p>
        <p><strong>Data:</strong> {data ? `${data.trips?.length || 0} trips found` : "No data"}</p>
        <p><strong>API Response:</strong> {data ? JSON.stringify(data, null, 2).substring(0, 500) + "..." : "None"}</p>
        <p><strong>Error:</strong> {error ? String(error) : "None"}</p>
      </div>

      {data?.trips?.map((trip, index) => (
        <TripCard key={trip.uid || index} trip={trip} />
      ))}
    </div>
  );
}
