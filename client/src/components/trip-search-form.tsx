import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Calendar, Clock, Search, Route, ChevronDown, Settings, Bus, Car, Train, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TripSearchSchema, type TripSearch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { searchStations } from "@/lib/nsApi";

interface TripSearchFormProps {
  onSearch?: (searchData: TripSearch) => void;
}

// Searchable Station Dropdown Component
function StationSearchDropdown({ 
  value, 
  onValueChange, 
  placeholder 
}: { 
  value: string; 
  onValueChange: (value: string) => void; 
  placeholder: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get popular stations as fallback
  const { data: popularStations = [] } = useQuery<string[]>({
    queryKey: ["/api/stations"],
  });

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchStations(searchQuery);
          // If NS API fails, filter popular stations instead
          if (results.length === 0) {
            const filteredPopular = popularStations
              .filter(station => station.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(name => ({ naam: name }));
            setSuggestions(filteredPopular);
          } else {
            setSuggestions(results);
          }
        } catch (error) {
          // Fallback to filtering popular stations
          const filteredPopular = popularStations
            .filter(station => station.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(name => ({ naam: name }));
          setSuggestions(filteredPopular);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, popularStations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStation = (stationName: string) => {
    setSearchQuery(stationName);
    onValueChange(stationName);
    setIsOpen(false);
  };

  const displaySuggestions = searchQuery.length >= 2 ? suggestions : popularStations.map(name => ({ naam: name }));

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pr-8"
        />
        <ChevronDown 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          )}
          
          {!isLoading && displaySuggestions.length === 0 && searchQuery.length >= 2 && (
            <div className="px-3 py-2 text-sm text-gray-500">No matching stations found</div>
          )}
          
          {!isLoading && displaySuggestions.length === 0 && searchQuery.length < 2 && (
            <div className="px-3 py-2 text-sm text-gray-500">Type to search popular stations...</div>
          )}
          
          {!isLoading && displaySuggestions.map((station, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelectStation(station.naam || station.name)}
            >
              <div className="font-medium">{station.naam || station.name}</div>
              {station.stationCode && (
                <div className="text-xs text-gray-500">{station.stationCode}</div>
              )}
              {station.type && station.type !== 'stationV2' && (
                <div className="text-xs text-orange-500 capitalize">
                  {station.type.toLowerCase().replace('_', ' ')} - May not support trip planning
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripSearchForm({ onSearch }: TripSearchFormProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<TripSearch>({
    resolver: zodResolver(TripSearchSchema),
    defaultValues: {
      fromStation: "Den Haag HS",
      toStation: "Eindhoven Centraal",
      dateTime: new Date().toISOString().slice(0, 16),
      excludeBus: false,
      excludeTram: false,
      excludeMetro: false,
      walkingOnly: false,
    },
  });

  const onSubmit = async (data: TripSearch) => {
    console.log("Search form onSubmit called with:", data);
    
    if (data.fromStation === data.toStation) {
      toast({
        title: "Invalid Selection",
        description: "Please select different departure and arrival stations.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      console.log("Dispatching tripSearch event with data:", data);
      
      if (onSearch) {
        onSearch(data);
      }
      
      // Dispatch custom event to trigger search
      const searchEvent = new CustomEvent('tripSearch', { detail: data });
      window.dispatchEvent(searchEvent);
      
      console.log("Search event dispatched successfully");
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for trips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Removed minimum date restriction to allow any datetime value

  return (
    <Card className="bg-white rounded-xl shadow-lg mb-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <Route className="text-ns-blue mr-2" />
          Plan Your Journey
        </h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Station */}
              <FormField
                control={form.control}
                name="fromStation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-ns-blue" />
                      <span>From</span>
                    </FormLabel>
                    <FormControl>
                      <StationSearchDropdown
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search departure station..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* To Station */}
              <FormField
                control={form.control}
                name="toStation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-ns-orange" />
                      <span>To</span>
                    </FormLabel>
                    <FormControl>
                      <StationSearchDropdown
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search arrival station..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DateTime Picker */}
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-medium text-gray-700">
                      <Calendar className="text-ns-blue mr-1 w-4 h-4" />
                      Departure Date & Time
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ns-blue focus:border-ns-blue transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                {/* Search Button */}
                <Button 
                  type="submit" 
                  disabled={isSearching}
                  className="w-full bg-ns-blue hover:bg-blue-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg h-[48px]"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Search Trips</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Travel Options */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Travel Options</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="excludeBus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2">
                        <Bus className="w-4 h-4 text-gray-600" />
                        <FormLabel className="text-sm font-normal">
                          Exclude Buses
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excludeTram"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2">
                        <Car className="w-4 h-4 text-gray-600" />
                        <FormLabel className="text-sm font-normal">
                          Exclude Trams
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excludeMetro"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2">
                        <Train className="w-4 h-4 text-gray-600" />
                        <FormLabel className="text-sm font-normal">
                          Exclude Metro
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="walkingOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="flex items-center space-x-2">
                        <Footprints className="w-4 h-4 text-gray-600" />
                        <FormLabel className="text-sm font-normal">
                          Walking Only
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}