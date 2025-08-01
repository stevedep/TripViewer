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
    select: (rawData) => {
      console.log("Raw API data received:", rawData);
      try {
        // Try to validate the data with schema
        const validatedData = NSApiResponseSchema.parse(rawData);
        console.log("Schema validation successful:", validatedData);
        return validatedData;
      } catch (validationError) {
        console.error("Schema validation failed:", validationError);
        console.log("Raw data that failed validation:", JSON.stringify(rawData, null, 2));
        // Return the raw data anyway for debugging
        return rawData as NSApiResponse;
      }
    },
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

  // Loading state - only show loading if we're actually loading and don't have data yet
  if ((isLoading || queryLoading) && !data) {
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
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <AlertCircle className="text-red-500 text-3xl mb-4 mx-auto w-12 h-12" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load trips</h3>
            <p className="text-red-600 mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred while fetching trip data."}
            </p>
          </div>
          {/* Full API Debug Information */}
          <div className="p-4 bg-gray-100 rounded-lg text-left text-sm">
            <h4 className="font-bold mb-2">Full API Debug Info:</h4>
            <div className="space-y-2">
              <p><strong>Search Params:</strong></p>
              <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(searchParams, null, 2)}</pre>
              <p><strong>Error Object:</strong></p>
              <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
              <p><strong>Raw Data:</strong></p>
              <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
              <p><strong>Query Key:</strong></p>
              <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(["/api/trips", searchParams?.fromStation, searchParams?.toStation, searchParams?.dateTime], null, 2)}</pre>
            </div>
          </div>
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

  // Show results if we have data, regardless of error state
  if (data && data.trips && data.trips.length > 0) {
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
          <h4 className="font-bold mb-2">Full API Debug Info:</h4>
          <div className="space-y-2">
            <p><strong>Search Params:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(searchParams, null, 2)}</pre>
            <p><strong>Data (${data?.trips?.length || 0} trips):</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
            <p><strong>Error:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
            <p><strong>Query State:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify({isError, queryLoading, isLoading}, null, 2)}</pre>
          </div>
        </div>

        {data?.trips?.map((trip, index) => (
          <TripCard key={trip.uid || index} trip={trip} />
        ))}
      </div>
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

  // Fallback - this should not be reached if we have proper data handling above
  return (
    <Card className="bg-yellow-50 border border-yellow-200 rounded-lg">
      <CardContent className="p-6 text-center">
        <AlertCircle className="text-yellow-500 text-3xl mb-4 mx-auto w-12 h-12" />
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Unexpected State</h3>
        <p className="text-yellow-600 mb-4">
          The application is in an unexpected state. Debug information below:
        </p>
        {/* Debug information */}
        <div className="p-4 bg-gray-100 rounded-lg text-left text-sm">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <div className="space-y-2">
            <p><strong>Search Params:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(searchParams, null, 2)}</pre>
            <p><strong>Data:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
            <p><strong>Error:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
            <p><strong>State:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify({isError, queryLoading, isLoading}, null, 2)}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
