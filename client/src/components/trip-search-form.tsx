import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Calendar, Clock, Search, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TripSearchSchema, type TripSearch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TripSearchFormProps {
  onSearch?: (searchData: TripSearch) => void;
}

export default function TripSearchForm({ onSearch }: TripSearchFormProps) {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);

  // Fetch available stations
  const { data: stations = [] } = useQuery<string[]>({
    queryKey: ["/api/stations"],
  });

  const form = useForm<TripSearch>({
    resolver: zodResolver(TripSearchSchema),
    defaultValues: {
      fromStation: "Den Haag HS",
      toStation: "Eindhoven Centraal",
      dateTime: new Date().toISOString().slice(0, 16),
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

  // Set minimum date to today
  const today = new Date().toISOString().slice(0, 16);

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
                    <FormLabel className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="text-green-500 mr-1 w-4 h-4" />
                      From
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ns-blue focus:border-ns-blue transition-colors">
                          <SelectValue placeholder="Select departure station" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stations.map((station) => (
                          <SelectItem key={station} value={station}>
                            {station}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="text-red-500 mr-1 w-4 h-4" />
                      To
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ns-blue focus:border-ns-blue transition-colors">
                          <SelectValue placeholder="Select arrival station" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stations.map((station) => (
                          <SelectItem key={station} value={station}>
                            {station}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        min={today}
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}