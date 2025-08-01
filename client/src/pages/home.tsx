import { useState, useEffect } from "react";
import { Train, Clock } from "lucide-react";
import TripSearchForm from "@/components/trip-search-form";
import TripResults from "@/components/trip-results";

export default function Home() {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-50 font-sans min-h-screen">
      {/* Header */}
      <header className="bg-ns-blue text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Train className="text-2xl" />
              <h1 className="text-2xl font-bold">NS Trip Planner</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{currentTime || "Loading..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <TripSearchForm />
        <TripResults />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Train className="text-2xl text-ns-orange" />
            <span className="text-lg font-semibold">NS Trip Planner</span>
          </div>
          <p className="text-gray-400 text-sm">
            Powered by NS API - Real-time Dutch railway information
          </p>
        </div>
      </footer>
    </div>
  );
}
