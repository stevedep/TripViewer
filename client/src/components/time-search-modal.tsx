import { useState, useEffect } from "react";
import { X, Clock, MapPin } from "lucide-react";

interface TimeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromStation: string;
  toStation: string;
  dateTime: string;
  onSearch: (fromStation: string, toStation: string, dateTime: string) => void;
}

export default function TimeSearchModal({
  isOpen,
  onClose,
  fromStation,
  toStation,
  dateTime,
  onSearch
}: TimeSearchModalProps) {
  const [searchFromStation, setSearchFromStation] = useState(fromStation);
  const [searchToStation, setSearchToStation] = useState(toStation);
  const [searchDateTime, setSearchDateTime] = useState(dateTime);

  // Update state when modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setSearchFromStation(fromStation);
      setSearchToStation(toStation);
      setSearchDateTime(dateTime);
    }
  }, [isOpen, fromStation, toStation, dateTime]);

  if (!isOpen) return null;

  const formatDisplayTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr;
    }
  };

  const formatInputTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return date.toISOString().slice(0, 16); // Format for datetime-local input
    } catch {
      return '';
    }
  };

  const handleSearch = () => {
    console.log('TimeSearchModal handleSearch called with:', {
      fromStation: searchFromStation,
      toStation: searchToStation,
      dateTime: searchDateTime
    });
    
    if (searchFromStation && searchToStation && searchDateTime) {
      onSearch(searchFromStation, searchToStation, searchDateTime);
      onClose();
    } else {
      console.error('TimeSearchModal: Missing required fields', {
        fromStation: searchFromStation,
        toStation: searchToStation,
        dateTime: searchDateTime
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-ns-blue" />
            <h3 className="text-lg font-semibold text-gray-800">
              Search Additional Trips
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-700 mb-1">Departure from:</div>
            <div className="font-medium text-blue-800">{fromStation}</div>
            <div className="text-xs text-blue-600 mt-1">
              {formatDisplayTime(dateTime)}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Station
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchFromStation}
                  onChange={(e) => setSearchFromStation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ns-blue focus:border-transparent"
                  placeholder="Enter departure station"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Station
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchToStation}
                  onChange={(e) => setSearchToStation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ns-blue focus:border-transparent"
                  placeholder="Enter destination station"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departure Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  value={formatInputTime(searchDateTime)}
                  onChange={(e) => setSearchDateTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ns-blue focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-ns-blue text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Search Trips
          </button>
        </div>
      </div>
    </div>
  );
}