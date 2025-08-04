import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, AlertCircle, Clock, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TripCard from "./trip-card";
import { NSApiResponseSchema, type NSApiResponse, type TripSearch } from "@shared/schema";
import { searchTrips } from "@/lib/nsApi";

export default function TripResults() {
  const [searchParams, setSearchParams] = useState<TripSearch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [transferFilter, setTransferFilter] = useState<number | null>(null);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string | null>(null);
  const [travelTimeFilter, setTravelTimeFilter] = useState<number | null>(null);
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
      setTravelTimeFilter(null);
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
    queryKey: ["/api/trips", searchParams?.fromStation, searchParams?.toStation, searchParams?.dateTime, searchParams?.excludeBus, searchParams?.excludeTram, searchParams?.excludeMetro, searchParams?.walkingOnly],
    enabled: !!searchParams,
    queryFn: () => searchTrips(searchParams!),
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

  // Function to calculate total travel time in minutes
  const calculateTravelTime = (trip: any): number => {
    if (!trip.legs || trip.legs.length === 0) return 0;
    
    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];
    
    const departureTime = new Date(firstLeg.origin?.plannedDateTime || firstLeg.origin?.actualDateTime || '');
    const arrivalTime = new Date(lastLeg.destination?.plannedDateTime || lastLeg.destination?.actualDateTime || '');
    
    if (!departureTime || !arrivalTime) return 0;
    
    return Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60));
  };

  // Function to remove duplicate trips based on uid and departure time
  const removeDuplicates = (trips: NSApiResponse["trips"]) => {
    const seen = new Set();
    return trips.filter(trip => {
      // Create a unique key using uid and departure time for more robust deduplication
      const departureTime = trip.legs[0]?.origin?.plannedDateTime || '';
      const uniqueKey = `${trip.uid}-${departureTime}`;
      
      if (seen.has(uniqueKey)) {
        console.log(`Removing duplicate trip: ${uniqueKey}`);
        return false;
      }
      seen.add(uniqueKey);
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
      
      const formattedNextTime = nextSearchTime.toISOString().slice(0, 19) + "+0200";
      
      // Use the same searchTrips function to ensure consistent API calls
      const moreTripsData = await searchTrips({
        fromStation: searchParams.fromStation,
        toStation: searchParams.toStation,
        dateTime: formattedNextTime,
        excludeBus: searchParams.excludeBus,
        excludeTram: searchParams.excludeTram,
        excludeMetro: searchParams.excludeMetro,
        walkingOnly: searchParams.walkingOnly
      });
      
      if (moreTripsData.trips && moreTripsData.trips.length > 0) {
        // Combine and remove duplicates before setting
        const combinedTrips = [...currentTrips, ...moreTripsData.trips];
        const uniqueTrips = removeDuplicates(combinedTrips);
        setAllTrips(uniqueTrips);
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
      
      // Special case for ICD: these trains have categoryCode "IC" but Virtual Train API returns "ICD"
      if (materialTypeFilter === 'ICD') {
        const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
        return enhancedTypes.includes('ICD');
      }
      
      // For basic category codes (IC, SPR), check leg category codes
      if (['IC', 'SPR'].includes(materialTypeFilter)) {
        return trip.legs.some((leg: any) => leg.product?.categoryCode === materialTypeFilter);
      }
      
      // For enhanced train types (ICNG, VIRM, DDZ, Flirt, SNG), check enhanced data
      const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
      return enhancedTypes.includes(materialTypeFilter);
    };

    // Filter trips based on transfer, material type, and travel time filters
    let filteredTrips = currentTrips;
    
    // Apply transfer filter
    if (transferFilter !== null) {
      filteredTrips = filteredTrips.filter(trip => trip.transfers === transferFilter);
    }
    
    // Apply material type filter
    filteredTrips = filteredTrips.filter(tripMatchesMaterialFilter);
    
    // Apply travel time filter
    if (travelTimeFilter !== null) {
      filteredTrips = filteredTrips.filter(trip => {
        const travelTime = calculateTravelTime(trip);
        return travelTime <= travelTimeFilter;
      });
    }

    // Sort trips by arrival time (earliest first), then by total journey time (shortest first)
    filteredTrips = [...filteredTrips].sort((a, b) => {
      const getArrivalTime = (trip: any) => {
        const lastLeg = trip.legs[trip.legs.length - 1];
        const arrivalTime = lastLeg.destination?.actualDateTime || lastLeg.destination?.plannedDateTime;
        return new Date(arrivalTime).getTime();
      };
      
      const arrivalTimeA = getArrivalTime(a);
      const arrivalTimeB = getArrivalTime(b);
      
      // Primary sort: by arrival time
      if (arrivalTimeA !== arrivalTimeB) {
        return arrivalTimeA - arrivalTimeB;
      }
      
      // Secondary sort: by total journey time (when arrival times are the same)
      const journeyTimeA = calculateTravelTime(a);
      const journeyTimeB = calculateTravelTime(b);
      return journeyTimeA - journeyTimeB;
    });

    // Helper function to check if trip matches a specific material type
    const tripMatchesSpecificMaterialFilter = (trip: any, materialType: string): boolean => {
      // Special case for ICD: these trains have categoryCode "IC" but Virtual Train API returns "ICD"
      if (materialType === 'ICD') {
        const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
        return enhancedTypes.includes('ICD');
      }
      
      // For basic category codes (IC, SPR), check leg category codes
      if (['IC', 'SPR'].includes(materialType)) {
        return trip.legs.some((leg: any) => leg.product?.categoryCode === materialType);
      }
      
      // For enhanced train types (ICNG, VIRM, DDZ, Flirt, SNG), check enhanced data
      const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
      return enhancedTypes.includes(materialType);
    };

    // Function to get available transfer counts based on current material filter
    const getAvailableTransferCounts = () => {
      const baseTrips = materialTypeFilter ? 
        currentTrips.filter(trip => tripMatchesSpecificMaterialFilter(trip, materialTypeFilter)) : 
        currentTrips;
      return Array.from(new Set(baseTrips.map(trip => trip.transfers))).sort((a, b) => a - b);
    };

    // Function to get available material types based on current transfer filter
    const getAvailableMaterialTypes = () => {
      const baseTrips = transferFilter !== null ? 
        currentTrips.filter(trip => trip.transfers === transferFilter) : 
        currentTrips;
      return getAllMaterialTypes(baseTrips);
    };

    // Get filtered options based on current filters
    const transferCounts = getAvailableTransferCounts();
    const availableMaterialTypes = getAvailableMaterialTypes();
    const travelTimes = currentTrips.map(trip => calculateTravelTime(trip)).filter(time => time > 0).sort((a, b) => a - b);
    const maxTravelTime = travelTimes.length > 0 ? Math.max(...travelTimes) : 0;
    const minTravelTime = travelTimes.length > 0 ? Math.min(...travelTimes) : 0;
    
    const additionalCount = allTrips.length - (data?.trips?.length || 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <List className="text-ns-blue mr-3" />
            Available Trips
          </h2>
          <div className="text-sm text-gray-600">
            {(transferFilter !== null || materialTypeFilter !== null || travelTimeFilter !== null) 
              ? `${filteredTrips.length} of ${currentTrips.length} trips${transferFilter !== null ? ` (${transferFilter} transfer${transferFilter !== 1 ? 's' : ''})` : ''}${materialTypeFilter ? ` (${materialTypeFilter})` : ''}${travelTimeFilter ? ` (≤${travelTimeFilter}min)` : ''}`
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
          <div className="grid md:grid-cols-3 gap-6">
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
                  All ({materialTypeFilter ? 
                    currentTrips.filter(trip => tripMatchesSpecificMaterialFilter(trip, materialTypeFilter)).length : 
                    currentTrips.length})
                </button>
                {transferCounts.map(count => {
                  const baseTrips = materialTypeFilter ? 
                    currentTrips.filter(trip => tripMatchesSpecificMaterialFilter(trip, materialTypeFilter)) : 
                    currentTrips;
                  const countForThisTransfer = baseTrips.filter(trip => trip.transfers === count).length;
                  
                  // Hide options with zero count
                  if (countForThisTransfer === 0) return null;
                  
                  return (
                    <button
                      key={count}
                      onClick={() => setTransferFilter(count)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        transferFilter === count
                          ? 'bg-ns-blue text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {count} transfer{count !== 1 ? 's' : ''} ({countForThisTransfer})
                    </button>
                  );
                })}
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
                  All Types ({transferFilter !== null ? 
                    currentTrips.filter(trip => trip.transfers === transferFilter).length : 
                    currentTrips.length})
                </button>
                {availableMaterialTypes.map(materialType => {
                  const baseTrips = transferFilter !== null ? 
                    currentTrips.filter(trip => trip.transfers === transferFilter) : 
                    currentTrips;
                  
                  const countForThisMaterial = (() => {
                    // Special case for ICD: count using enhanced data
                    if (materialType === 'ICD') {
                      return baseTrips.filter(trip => {
                        const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
                        return enhancedTypes.includes('ICD');
                      }).length;
                    }
                    // For basic category codes, count by leg category code
                    if (['IC', 'SPR'].includes(materialType)) {
                      return baseTrips.filter(trip => 
                        trip.legs.some(leg => leg.product?.categoryCode === materialType)
                      ).length;
                    }
                    // For enhanced types, count using enhanced data
                    return baseTrips.filter(trip => {
                      const enhancedTypes = tripEnhancedTypes[trip.uid] || [];
                      return enhancedTypes.includes(materialType);
                    }).length;
                  })();
                  
                  // Hide options with zero count
                  if (countForThisMaterial === 0) return null;
                  
                  return (
                    <button
                      key={materialType}
                      onClick={() => setMaterialTypeFilter(materialType)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        materialTypeFilter === materialType
                          ? 'bg-ns-blue text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {materialType} ({countForThisMaterial})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Travel Time Filter */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Filter by Travel Time
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTravelTimeFilter(null)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      travelTimeFilter === null
                        ? 'bg-ns-blue text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    All Times
                  </button>
                  {travelTimeFilter !== null && (
                    <span className="text-sm text-gray-600">
                      Max: {Math.floor(travelTimeFilter / 60)}h {travelTimeFilter % 60 > 0 ? `${travelTimeFilter % 60}m` : ''} 
                      ({currentTrips.filter(trip => calculateTravelTime(trip) <= travelTimeFilter).length} trips)
                    </span>
                  )}
                </div>
                
                {maxTravelTime > 0 && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={maxTravelTime + 15}
                      step={15}
                      value={travelTimeFilter || (maxTravelTime + 15)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setTravelTimeFilter(value === (maxTravelTime + 15) ? null : value);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #1e40af 0%, #1e40af ${((travelTimeFilter || (maxTravelTime + 15)) / (maxTravelTime + 15)) * 100}%, #e5e7eb ${((travelTimeFilter || (maxTravelTime + 15)) / (maxTravelTime + 15)) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0h 0m</span>
                      <span>{Math.floor((maxTravelTime + 15) / 60)}h {(maxTravelTime + 15) % 60}m</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
          <>
            {filteredTrips.map((trip, index) => (
              <TripCard 
                key={`${trip.uid}-${index}`} 
                trip={trip} 
                materialTypeFilter={materialTypeFilter}
              />
            ))}
            
            {/* Load More Trips Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMoreTrips}
                disabled={loadingMore}
                className="px-6 py-3 bg-ns-orange text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
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
          </>
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
