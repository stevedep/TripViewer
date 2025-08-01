import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, AlertCircle, Clock, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TripCard from "./trip-card";
import { NSApiResponseSchema, type NSApiResponse, type TripSearch } from "@shared/schema";

export default function TripResults() {
  const [searchParams, setSearchParams] = useState<TripSearch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [transferFilter, setTransferFilter] = useState<number | null>(null);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string | null>(null);
  const [allTrips, setAllTrips] = useState<NSApiResponse["trips"]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enhancedTrainTypes, setEnhancedTrainTypes] = useState<Set<string>>(new Set());
  const [tripEnhancedTypes, setTripEnhancedTypes] = useState<{[tripId: string]: string[]}>({});

  // Listen for search events - must be before useQuery for hooks order
  useEffect(() => {
    const handleSearch = (event: CustomEvent<TripSearch>) => {
      console.log("TripResults received search event:", event.detail);
      setSearchParams(event.detail);
      setIsLoading(true);
      // Reset all trips and filters when new search is performed
      setAllTrips([]);
      setTransferFilter(null);
      setMaterialTypeFilter(null);
    };

    console.log("TripResults: Adding event listener for tripSearch");
    window.addEventListener('tripSearch', handleSearch as EventListener);
    return () => {
      console.log("TripResults: Removing event listener for tripSearch");
      window.removeEventListener('tripSearch', handleSearch as EventListener);
    };
  }, []);

  // Query trips data - must be called before any conditional returns
  const { data, error, isError, isLoading: queryLoading } = useQuery<NSApiResponse>({
    queryKey: ["/api/trips", searchParams?.fromStation, searchParams?.toStation, searchParams?.dateTime],
    enabled: !!searchParams,
    select: (rawData) => {
      console.log("Raw API data received:", rawData);
      // Return raw data directly to avoid schema validation issues
      // The UI components will handle displaying the available data
      return rawData as NSApiResponse;
    },
    meta: {
      onSettled: () => setIsLoading(false),
    },
  });

  // Initialize all trips with data when available
  useEffect(() => {
    if (data && data.trips) {
      setAllTrips(data.trips);
    }
  }, [data]);

  // Listen for enhanced train types from trip cards
  useEffect(() => {
    const handleTrainTypeUpdate = (event: CustomEvent) => {
      const { trainType } = event.detail;
      if (trainType) {
        setEnhancedTrainTypes(prev => new Set(Array.from(prev).concat([trainType])));
      }
    };

    const handleTripEnhancedData = (event: CustomEvent) => {
      const { tripId, enhancedTypes } = event.detail;
      if (tripId && enhancedTypes) {
        setTripEnhancedTypes(prev => ({
          ...prev,
          [tripId]: enhancedTypes
        }));
      }
    };

    window.addEventListener('trainTypeUpdated', handleTrainTypeUpdate as EventListener);
    window.addEventListener('tripEnhancedDataUpdated', handleTripEnhancedData as EventListener);
    return () => {
      window.removeEventListener('trainTypeUpdated', handleTrainTypeUpdate as EventListener);
      window.removeEventListener('tripEnhancedDataUpdated', handleTripEnhancedData as EventListener);
    };
  }, []);

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

  // Function to remove duplicate trips based on uid
  const removeDuplicates = (trips: NSApiResponse["trips"]) => {
    const seen = new Set();
    return trips.filter(trip => {
      if (seen.has(trip.uid)) {
        return false;
      }
      seen.add(trip.uid);
      return true;
    });
  };

  // Function to load more trips using the last trip's arrival time
  const loadMoreTrips = async () => {
    if (!data?.trips || data.trips.length === 0 || !searchParams) return;
    
    setLoadingMore(true);
    try {
      const currentTrips = allTrips.length > 0 ? allTrips : data.trips;
      
      // Get the last trip's arrival time
      const lastTrip = currentTrips[currentTrips.length - 1];
      const lastArrivalTime = lastTrip.legs[lastTrip.legs.length - 1].destination.actualDateTime || 
                             lastTrip.legs[lastTrip.legs.length - 1].destination.plannedDateTime;
      
      // Format the datetime for the next search
      const nextSearchTime = new Date(lastArrivalTime);
      nextSearchTime.setMinutes(nextSearchTime.getMinutes() + 1); // Start 1 minute after last arrival
      
      const formattedNextTime = nextSearchTime.toISOString().slice(0, 16);
      
      // Make API call for more trips
      const response = await fetch(`/api/trips?fromStation=${encodeURIComponent(searchParams.fromStation)}&toStation=${encodeURIComponent(searchParams.toStation)}&dateTime=${encodeURIComponent(formattedNextTime)}`);
      
      if (response.ok) {
        const moreTripsData = await response.json();
        if (moreTripsData.trips && moreTripsData.trips.length > 0) {
          // Combine and remove duplicates before setting
          const combinedTrips = [...currentTrips, ...moreTripsData.trips];
          const uniqueTrips = removeDuplicates(combinedTrips);
          setAllTrips(uniqueTrips);
        }
      }
    } catch (error) {
      console.error("Error loading more trips:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Show results if we have data, regardless of error state
  if (data && data.trips && data.trips.length > 0) {
    // Use allTrips for everything (includes original + additional trips without duplicates)
    const currentTrips = allTrips.length > 0 ? allTrips : data.trips;
    


    // Get all unique material types from all trips (includes enhanced types from API calls)
    const getAllMaterialTypes = (trips: NSApiResponse["trips"]) => {
      const materialTypes = new Set<string>();
      
      // Add basic category codes that are always available
      trips.forEach(trip => {
        trip.legs.forEach(leg => {
          if (leg.product?.categoryCode) {
            materialTypes.add(leg.product.categoryCode);
          }
        });
      });

      // Add enhanced train types from Virtual Train API
      Array.from(enhancedTrainTypes).forEach(type => materialTypes.add(type));

      return Array.from(materialTypes).sort();
    };

    // Filter function for material types
    const tripMatchesMaterialFilter = (trip: any): boolean => {
      if (!materialTypeFilter) return true;
      
      // For basic category codes (IC, SPR, ICD), check leg category codes
      if (['IC', 'SPR', 'ICD'].includes(materialTypeFilter)) {
        return trip.legs.some((leg: any) => leg.product?.categoryCode === materialTypeFilter);
      }
      
      // For enhanced train types (ICNG, VIRM, DDZ, Flirt, SNG), check enhanced data
      const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
      return enhancedTypes.includes(materialTypeFilter);
    };

    // Filter trips based on both transfer and material type filters
    let filteredTrips = currentTrips;
    
    // Apply transfer filter
    if (transferFilter !== null) {
      filteredTrips = filteredTrips.filter(trip => trip.transfers === transferFilter);
    }
    
    // Apply material type filter
    filteredTrips = filteredTrips.filter(tripMatchesMaterialFilter);

    // Get unique transfer counts and material types for filter options
    const transferCounts = Array.from(new Set(currentTrips.map(trip => trip.transfers))).sort((a, b) => a - b);
    const availableMaterialTypes = getAllMaterialTypes(currentTrips);
    
    const additionalCount = allTrips.length - (data?.trips?.length || 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <List className="text-ns-blue mr-3" />
            Available Trips
          </h2>
          <div className="text-sm text-gray-600">
            {(transferFilter !== null || materialTypeFilter !== null) 
              ? `${filteredTrips.length} of ${currentTrips.length} trips${transferFilter !== null ? ` (${transferFilter} transfer${transferFilter !== 1 ? 's' : ''})` : ''}${materialTypeFilter ? ` (${materialTypeFilter})` : ''}`
              : `${currentTrips.length} trips found`
            }
            {additionalCount > 0 && (
              <span className="ml-2 text-ns-blue">
                (includes {additionalCount} additional)
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Transfer Filter */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Transfers
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTransferFilter(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    transferFilter === null
                      ? 'bg-ns-blue text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All ({currentTrips.length})
                </button>
                {transferCounts.map(count => (
                  <button
                    key={count}
                    onClick={() => setTransferFilter(count)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      transferFilter === count
                        ? 'bg-ns-blue text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {count} transfer{count !== 1 ? 's' : ''} ({currentTrips.filter(trip => trip.transfers === count).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Material Type Filter */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Train Type
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMaterialTypeFilter(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    materialTypeFilter === null
                      ? 'bg-ns-blue text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All Types ({currentTrips.length})
                </button>
                {availableMaterialTypes.map(materialType => (
                  <button
                    key={materialType}
                    onClick={() => setMaterialTypeFilter(materialType)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      materialTypeFilter === materialType
                        ? 'bg-ns-blue text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {materialType} ({(() => {
                      // For basic category codes, count by leg category code
                      if (['IC', 'SPR', 'ICD'].includes(materialType)) {
                        return currentTrips.filter(trip => 
                          trip.legs.some(leg => leg.product?.categoryCode === materialType)
                        ).length;
                      }
                      // For enhanced types, count using enhanced data
                      return currentTrips.filter(trip => {
                        const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
                        return enhancedTypes.includes(materialType);
                      }).length;
                    })()})
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Load More Trips Button */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={loadMoreTrips}
              disabled={loadingMore}
              className="px-4 py-2 bg-ns-orange text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading more trips...</span>
                </>
              ) : (
                <span>Load More Trips</span>
              )}
            </button>
          </div>
        </div>

        {/* Debug information - Hidden by default */}
        <div className="mb-4">
          <button 
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
          >
            {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
          {showDebugInfo && (
            <div className="p-4 bg-gray-100 rounded-lg text-sm">
              <h4 className="font-bold mb-2">Full API Debug Info:</h4>
              <div className="space-y-2">
                <p><strong>Search Params:</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(searchParams, null, 2)}</pre>
                <p><strong>Original Data (${data?.trips?.length || 0} trips):</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
                <p><strong>All Trips (${allTrips.length} total, ${additionalCount} additional):</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(allTrips, null, 2)}</pre>
                <p><strong>Error:</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
                <p><strong>Query State:</strong></p>
                <pre className="bg-white p-2 rounded text-xs overflow-auto">{JSON.stringify({isError, queryLoading, isLoading}, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip, index) => (
            <TripCard 
              key={`${trip.uid}-${index}`} 
              trip={trip} 
              materialTypeFilter={materialTypeFilter}
            />
          ))
        ) : (
          <Card className="bg-gray-50 border border-gray-200 rounded-lg">
            <CardContent className="p-6 text-center">
              <AlertCircle className="text-gray-400 text-3xl mb-4 mx-auto w-12 h-12" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No trips match your filter</h3>
              <p className="text-gray-500 mb-4">
                Try selecting a different number of transfers or clear the filter to see all trips.
              </p>
              <button
                onClick={() => setTransferFilter(null)}
                className="px-4 py-2 bg-ns-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Show All Trips
              </button>
            </CardContent>
          </Card>
        )}
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
