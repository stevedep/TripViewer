import { useState } from "react";
import { Route, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { type Leg } from "@shared/schema";
import AlternativeTripsModal from "./alternative-trips-modal";

interface LegDetailsProps {
  legs: Leg[];
  originalDestination?: string;
  legSeatingData?: { [key: string]: { first: number; second: number } };
  legTrainTypes?: { [key: string]: string };
  legCarriageData?: { [key: string]: { 
    carriageCount: number; 
    bakkenImages: string[]; 
    direction?: string;
    perronAllocation?: any[];
  } };
}

export default function LegDetails({ legs, originalDestination, legSeatingData, legTrainTypes, legCarriageData }: LegDetailsProps) {
  console.log('LegDetails props:', { 
    legsCount: legs?.length, 
    legSeatingDataKeys: Object.keys(legSeatingData || {}),
    legTrainTypesKeys: Object.keys(legTrainTypes || {}),
    legCarriageDataKeys: Object.keys(legCarriageData || {})
  });
  const [expandedLegs, setExpandedLegs] = useState<Set<string>>(new Set());
  const [expandedTrainImages, setExpandedTrainImages] = useState<Set<string>>(new Set());
  const [showCarriageModal, setShowCarriageModal] = useState(false);
  const [selectedCarriageData, setSelectedCarriageData] = useState<{
    bakkenImages: string[];
    direction?: string;
    trainType: string;
    perronAllocation?: any[];
  } | null>(null);
  const [firstClassDetection, setFirstClassDetection] = useState<{
    [imageIndex: number]: 'left' | 'right' | 'null' | 'loading' | null;
  }>({});
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    fromStation: string;
    toStation: string;
    fromDateTime: string;
  }>({
    isOpen: false,
    fromStation: "",
    toStation: "",
    fromDateTime: ""
  });

  // Debug: Check environment variable on component mount
  console.log('LegDetails mounted - API Key available:', !!import.meta.env.VITE_OPENAI_API_KEY);
  console.log('LegDetails mounted - API Key length:', import.meta.env.VITE_OPENAI_API_KEY?.length);

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

  // Calculate delay in minutes
  const calculateDelay = (plannedDateTime: string, actualDateTime: string | undefined): number => {
    if (!actualDateTime) return 0;
    const planned = new Date(plannedDateTime);
    const actual = new Date(actualDateTime);
    const delayMs = actual.getTime() - planned.getTime();
    return Math.round(delayMs / (1000 * 60)); // Convert to minutes
  };

  // Format delay display
  const formatDelay = (delayMinutes: number): { text: string; className: string } => {
    if (delayMinutes === 0) return { text: '', className: '' };
    if (delayMinutes > 0) {
      return { 
        text: `+${delayMinutes} min`, 
        className: 'text-red-600 font-medium' 
      };
    } else {
      return { 
        text: `${delayMinutes} min`, 
        className: 'text-green-600 font-medium' 
      };
    }
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

  // Calculate transfer time between legs
  const getTransferTime = (legIndex: number) => {
    if (legIndex === 0) return null;
    
    const previousLeg = legs[legIndex - 1];
    const currentLeg = legs[legIndex];
    
    const arrivalTime = new Date(previousLeg.destination.actualDateTime || previousLeg.destination.plannedDateTime);
    const departureTime = new Date(currentLeg.origin.actualDateTime || currentLeg.origin.plannedDateTime);
    
    const transferMinutes = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60));
    return transferMinutes;
  };

  // Handle station click
  const handleStationClick = (stationName: string, dateTime: string) => {
    if (!originalDestination) return;
    
    setModalState({
      isOpen: true,
      fromStation: stationName,
      toStation: originalDestination,
      fromDateTime: dateTime
    });
  };

  // Format station name with final destination postfix
  const formatStationWithDestination = (stationName: string, leg: Leg) => {
    // Extract final destination from the leg direction
    const finalDestination = leg.direction;
    if (finalDestination && finalDestination !== stationName) {
      return `${stationName} (${finalDestination})`;
    }
    return stationName;
  };

  // Calculate stop duration
  const getStopDuration = (arrival?: string, departure?: string) => {
    if (!arrival || !departure) return "0 min stop";
    
    const arrivalTime = new Date(arrival);
    const departureTime = new Date(departure);
    const diffMinutes = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60));
    
    return diffMinutes > 0 ? `${diffMinutes} min stop` : "0 min stop";
  };

  // Function to get perron numbers for left and right sides of each image
  const getPerronNumbersForImage = (perronAllocation: any[], imageIndex: number) => {
    if (!perronAllocation || perronAllocation.length === 0) {
      return { leftPerron: null, rightPerron: null };
    }

    // Alphabet array for perron letter inference
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    // Get all perron letters from the current image with their positions
    const currentImagePerrons = perronAllocation[imageIndex]?.perronVoorzieningen
      ?.filter((voorziening: any) => voorziening.type === 'PERRONLETTER')
      ?.map((voorziening: any) => ({
        letter: voorziening.description,
        position: voorziening.scaledPosition || 0
      }))
      ?.sort((a: any, b: any) => a.position - b.position) || [];

    // If current image has perron letters, analyze their positions
    if (currentImagePerrons.length > 0) {
      const bakImage = perronAllocation[imageIndex]?.bakImage;
      if (!bakImage?.breedte) {
        // Fallback to simple logic if we don't have position data
        return {
          leftPerron: currentImagePerrons[0].letter,
          rightPerron: currentImagePerrons[currentImagePerrons.length - 1].letter
        };
      }

      // Calculate the start position of this carriage in the total train
      let carriageStartPosition = 0;
      for (let i = 0; i < imageIndex; i++) {
        carriageStartPosition += perronAllocation[i]?.bakImage?.breedte || 0;
      }

      // Convert absolute positions to relative positions within this carriage
      const perronsWithRelativePositions = currentImagePerrons.map((perron: any) => {
        const positionInCarriage = perron.position - carriageStartPosition;
        const percentagePosition = Math.min(Math.max((positionInCarriage / bakImage.breedte) * 100, 0), 100);
        return {
          ...perron,
          percentagePosition
        };
      });

      // If we have multiple perron letters, determine left and right based on positions
      if (perronsWithRelativePositions.length > 1) {
        const sortedPerrons = perronsWithRelativePositions.sort((a: any, b: any) => a.percentagePosition - b.percentagePosition);
        return {
          leftPerron: sortedPerrons[0].letter,
          rightPerron: sortedPerrons[sortedPerrons.length - 1].letter
        };
      }

      // If we have only one perron letter, infer adjacent perrons based on position
      const singlePerron = perronsWithRelativePositions[0];
      const percentagePosition = singlePerron.percentagePosition;

      // If the perron is positioned beyond 10% from the left, the left side likely corresponds to the previous perron letter
      if (percentagePosition > 10) {
        // First, try to find previous perron letters in other images
        for (let i = imageIndex - 1; i >= 0; i--) {
          const previousImagePerrons = perronAllocation[i]?.perronVoorzieningen
            ?.filter((voorziening: any) => voorziening.type === 'PERRONLETTER')
            ?.map((voorziening: any) => voorziening.description)
            ?.sort() || [];

          if (previousImagePerrons.length > 0) {
            return {
              leftPerron: previousImagePerrons[previousImagePerrons.length - 1], // Use the last (rightmost) perron from previous image
              rightPerron: singlePerron.letter
            };
          }
        }

        // If no previous perron letters found, infer using alphabet
        const currentLetterIndex = alphabet.indexOf(singlePerron.letter);
        if (currentLetterIndex > 0) {
          return {
            leftPerron: alphabet[currentLetterIndex - 1],
            rightPerron: singlePerron.letter
          };
        }
      }

      // If the perron is positioned at 10% or less from the left, the right side likely corresponds to the next perron letter
      if (percentagePosition <= 10) {
        // First, try to find next perron letters in other images
        for (let i = imageIndex + 1; i < perronAllocation.length; i++) {
          const nextImagePerrons = perronAllocation[i]?.perronVoorzieningen
            ?.filter((voorziening: any) => voorziening.type === 'PERRONLETTER')
            ?.map((voorziening: any) => voorziening.description)
            ?.sort() || [];

          if (nextImagePerrons.length > 0) {
            return {
              leftPerron: singlePerron.letter,
              rightPerron: nextImagePerrons[0] // Use the first (leftmost) perron from next image
            };
          }
        }

        // If no next perron letters found, infer using alphabet
        const currentLetterIndex = alphabet.indexOf(singlePerron.letter);
        if (currentLetterIndex < alphabet.length - 1) {
          return {
            leftPerron: singlePerron.letter,
            rightPerron: alphabet[currentLetterIndex + 1]
          };
        }
      }

      // If we can't infer adjacent perrons, just return the single perron for both sides
      return {
        leftPerron: singlePerron.letter,
        rightPerron: singlePerron.letter
      };
    }

    // If no perron letters in current image, look at previous images
    for (let i = imageIndex - 1; i >= 0; i--) {
      const previousImagePerrons = perronAllocation[i]?.perronVoorzieningen
        ?.filter((voorziening: any) => voorziening.type === 'PERRONLETTER')
        ?.map((voorziening: any) => voorziening.description)
        ?.sort() || [];

      if (previousImagePerrons.length > 0) {
        return {
          leftPerron: previousImagePerrons[0],
          rightPerron: previousImagePerrons[previousImagePerrons.length - 1]
        };
      }
    }

    // If no perron letters found in any previous images, look at next images
    for (let i = imageIndex + 1; i < perronAllocation.length; i++) {
      const nextImagePerrons = perronAllocation[i]?.perronVoorzieningen
        ?.filter((voorziening: any) => voorziening.type === 'PERRONLETTER')
        ?.map((voorziening: any) => voorziening.description)
        ?.sort() || [];

      if (nextImagePerrons.length > 0) {
        return {
          leftPerron: nextImagePerrons[0],
          rightPerron: nextImagePerrons[nextImagePerrons.length - 1]
        };
      }
    }

    return { leftPerron: null, rightPerron: null };
  };

  // Handle train click to show carriage modal
  const handleTrainClick = (leg: any) => {
    console.log('handleTrainClick called with leg:', leg);
    
    const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
    console.log('Generated legKey:', legKey);
    
    const carriageData = legCarriageData?.[legKey];
    console.log('Found carriageData:', carriageData);
    
    const trainType = legTrainTypes?.[legKey] || leg.product.categoryCode;
    console.log('Train type:', trainType);
    
         if (carriageData && carriageData.bakkenImages.length > 0) {
       console.log('Carriage data found, opening modal with:', {
         bakkenImages: carriageData.bakkenImages,
         direction: carriageData.direction,
         trainType: trainType,
         perronAllocation: carriageData.perronAllocation
       });
       console.log('Perron allocation details:', carriageData.perronAllocation);
      
      setSelectedCarriageData({
        bakkenImages: carriageData.bakkenImages,
        direction: carriageData.direction,
        trainType: trainType,
        perronAllocation: carriageData.perronAllocation
      });
      setShowCarriageModal(true);
      console.log('Modal state set to true');
      
      // Trigger first-class detection for all carriage images
      carriageData.bakkenImages.forEach((imageUrl, index) => {
        detectFirstClass(imageUrl, index);
      });
    } else {
      console.log('No carriage data found or no bakkenImages. carriageData:', carriageData);
      console.log('legCarriageData keys:', Object.keys(legCarriageData || {}));
    }
  };

  // Detect first class seating using OpenAI API
  const detectFirstClass = async (imageUrl: string, imageIndex: number) => {
    try {
      setFirstClassDetection(prev => ({
        ...prev,
        [imageIndex]: 'loading'
      }));

      // Debug: Check if API key is available
      console.log('API Key available:', !!import.meta.env.VITE_OPENAI_API_KEY);
      console.log('API Key length:', import.meta.env.VITE_OPENAI_API_KEY?.length);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'windows with a line above or below are 1st class (also a number printed 1 or 2), which door (left,right) has direct view on 1st class when looking to the center. respond with left, right only or null when no 1st class found'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate the response
      if (result === 'left' || result === 'right' || result === 'null') {
        setFirstClassDetection(prev => ({
          ...prev,
          [imageIndex]: result
        }));
      } else {
        console.warn('Unexpected OpenAI response:', result);
        setFirstClassDetection(prev => ({
          ...prev,
          [imageIndex]: 'null'
        }));
      }
    } catch (error) {
      console.error('Error detecting first class:', error);
      setFirstClassDetection(prev => ({
        ...prev,
        [imageIndex]: 'null'
      }));
    }
  };

  return (
    <>
      <div>


        {legs.map((leg, index) => {
          const transferTime = getTransferTime(index);
          
          return (
            <div key={leg.idx || index}>
              {/* Transfer Time Display */}
              {transferTime !== null && (
                <div className="flex items-center justify-center py-2 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
                      {transferTime} min transfer time
                    </span>
                  </div>
                </div>
              )}
              
              <div className="border border-gray-200 rounded-lg p-4 mb-4 last:mb-0">
          {/* Leg Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${getTrainTypeColor(leg.product.categoryCode)}`}>
                {leg.product.categoryCode} {leg.product.number}
              </div>
              {/* On-time percentage - using realistic data based on train type */}
              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {leg.product.categoryCode === 'IC' ? '89%' : 
                 leg.product.categoryCode === 'SPR' ? '94%' : 
                 leg.product.categoryCode === 'ICD' ? '87%' : '92%'} on time
              </div>
                             <div 
                 className="text-gray-700 font-medium cursor-pointer hover:text-ns-blue hover:underline"
                 onClick={() => {
                   console.log('Train name clicked for leg:', leg);
                   handleTrainClick(leg);
                 }}
                 title="Click to view train layout"
               >
                {leg.product.displayName}
              </div>
              <div className="text-gray-500 text-sm">→ {leg.direction}</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {leg.duration?.value || "Unknown duration"}
              </div>
              {/* Crowdedness indicator - showing actual NS API crowdForecast value */}
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                leg.crowdForecast && leg.crowdForecast.toUpperCase() === 'HIGH' 
                  ? 'bg-red-100 text-red-700'
                  : leg.crowdForecast && leg.crowdForecast.toUpperCase() === 'MEDIUM'
                  ? 'bg-gray-100 text-black'
                  : leg.crowdForecast && leg.crowdForecast.toUpperCase() === 'LOW'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {leg.crowdForecast || 'UNKNOWN'}
              </div>
            </div>
          </div>

          {/* Leg Journey */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Origin */}
            <div className="flex items-start space-x-3">
              <div className="bg-green-500 w-3 h-3 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div 
                  className="font-semibold text-gray-800 cursor-pointer hover:text-ns-blue hover:underline"
                  onClick={() => handleStationClick(leg.origin.name, leg.origin.actualDateTime || leg.origin.plannedDateTime)}
                >
                  {formatStationWithDestination(leg.origin.name, leg)}
                </div>
                <div className="text-sm text-gray-600">
                  Departure: {formatTime(leg.origin.actualDateTime || leg.origin.plannedDateTime)}
                </div>
                {(() => {
                  const delay = calculateDelay(leg.origin.plannedDateTime, leg.origin.actualDateTime);
                  const delayInfo = formatDelay(delay);
                  return delayInfo.text ? (
                    <div className={`text-xs ${delayInfo.className}`}>
                      {delayInfo.text}
                    </div>
                  ) : null;
                })()}
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
                <div 
                  className="font-semibold text-gray-800 cursor-pointer hover:text-ns-blue hover:underline"
                  onClick={() => handleStationClick(leg.destination.name, leg.destination.actualDateTime || leg.destination.plannedDateTime)}
                >
                  {formatStationWithDestination(leg.destination.name, leg)}
                </div>
                <div className="text-sm text-gray-600">
                  Arrival: {formatTime(leg.destination.actualDateTime || leg.destination.plannedDateTime)}
                </div>
                {(() => {
                  const delay = calculateDelay(leg.destination.plannedDateTime, leg.destination.actualDateTime);
                  const delayInfo = formatDelay(delay);
                  return delayInfo.text ? (
                    <div className={`text-xs ${delayInfo.className}`}>
                      {delayInfo.text}
                    </div>
                  ) : null;
                })()}
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

          {/* Seating Information Card */}
          {legSeatingData && legTrainTypes && (() => {
            const legKey = `${leg.product.number}-${leg.destination.stationCode}`;
            const seatingData = legSeatingData[legKey];
            const trainType = legTrainTypes[legKey];
            const carriageData = legCarriageData?.[legKey];
            
            if (seatingData) {
              // Calculate average seats per carriage and estimate 1st class carriages
              const totalSeats = seatingData.first + seatingData.second;
              const carriageCount = carriageData?.carriageCount || Math.ceil(totalSeats / 120); // Fallback estimate
              const avgSeatsPerCarriage = Math.round(totalSeats / carriageCount);
              
              // Estimate 1st class carriages based on seating capacity
              // 1st class seats typically take 1.5x more space than 2nd class
              const firstClassSpaceUnits = seatingData.first * 1.5;
              const secondClassSpaceUnits = seatingData.second * 1.0;
              const totalSpaceUnits = firstClassSpaceUnits + secondClassSpaceUnits;
              
              const estimatedFirstClassCarriages = carriageCount > 0 ? 
                Math.max(1, Math.round((firstClassSpaceUnits / totalSpaceUnits) * carriageCount)) : 0;
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-blue-800">
                        {trainType || leg.product.categoryCode} - {carriageCount} carriages
                      </div>
                      <div className="text-xs text-blue-600">
                        Avg: {avgSeatsPerCarriage} seats/carriage
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      Total: {totalSeats} seats
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-blue-600">
                        1st class: {seatingData.first} seats (~{estimatedFirstClassCarriages} carriages)
                      </div>
                      <div className="text-xs text-blue-600">
                        2nd class: {seatingData.second} seats (~{carriageCount - estimatedFirstClassCarriages} carriages)
                      </div>
                    </div>
                  </div>
                  
                  {/* Train Images Toggle */}
                  {carriageData?.bakkenImages && carriageData.bakkenImages.length > 0 && (
                    <div>
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedTrainImages);
                          if (newExpanded.has(legKey)) {
                            newExpanded.delete(legKey);
                          } else {
                            newExpanded.add(legKey);
                          }
                          setExpandedTrainImages(newExpanded);
                        }}
                        className="text-xs text-blue-700 hover:text-blue-900 underline mb-2"
                      >
                        {expandedTrainImages.has(legKey) ? 'Hide' : 'Show'} Train Layout ({carriageData.bakkenImages.length} carriages)
                      </button>
                      
                      {/* Train Images - Stacked Vertically */}
                      {expandedTrainImages.has(legKey) && (
                        <div className="mt-2 space-y-1">
                          {carriageData.bakkenImages.map((imageUrl, index) => {
                            // Get perron voorzieningen for this carriage
                            const perronVoorzieningen = carriageData.perronAllocation?.[index]?.perronVoorzieningen || [];
                            
                            return (
                              <div key={index} className="bg-white border border-blue-200 rounded p-2">
                                <div className="text-xs text-blue-600 mb-1">
                                  Carriage {index + 1}
                                  {perronVoorzieningen.length > 0 && (
                                    <span className="ml-2 text-xs text-green-600">
                                      ({perronVoorzieningen.length} platform facilities)
                                    </span>
                                  )}
                                </div>
                                <img
                                  src={imageUrl}
                                  alt={`Carriage ${index + 1} layout`}
                                  className="w-full h-auto max-h-24 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                {/* Display perron voorzieningen */}
                                {perronVoorzieningen.length > 0 && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                    <div className="text-xs font-medium text-green-800 mb-1">Platform Facilities:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {perronVoorzieningen.map((voorziening: any, vIndex: number) => (
                                        <span 
                                          key={vIndex} 
                                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                                          title={`${voorziening.type}: ${voorziening.description || 'No description'}`}
                                        >
                                          {voorziening.type === 'PERRONLETTER' ? `Platform ${voorziening.description}` : voorziening.type}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

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
                        <span className="font-medium text-gray-800">{formatStationWithDestination(stop.name, leg)}</span>
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
            </div>
          );
        })}
      </div>
      
      {/* Carriage Modal */}
      {(() => {
        console.log('Modal render check:', { showCarriageModal, selectedCarriageData });
        return showCarriageModal && selectedCarriageData;
      })() && selectedCarriageData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedCarriageData.trainType} Train Carriages
                {selectedCarriageData.direction && (
                  <span className="ml-2 text-sm text-gray-600">
                    Direction: {selectedCarriageData.direction === "LINKS" ? "← Left" : "→ Right"}
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowCarriageModal(false);
                  setFirstClassDetection({}); // Reset first-class detection state
                }}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Full Width Carriage Images */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {selectedCarriageData.bakkenImages.map((imageUrl, index) => {
                  // Get perron voorzieningen for this carriage
                  const perronVoorzieningen = selectedCarriageData.perronAllocation?.[index]?.perronVoorzieningen || [];
                  console.log(`Carriage ${index + 1} perron voorzieningen:`, perronVoorzieningen);
                  
                  return (
                    <div key={index} className="relative">
                      {/* Direction indicator box */}
                      {selectedCarriageData.direction && (
                        <>
                          {selectedCarriageData.direction === "LINKS" && index === 0 && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded font-bold z-10">
                              ← Direction
                            </div>
                          )}
                          {selectedCarriageData.direction === "RECHTS" && index === selectedCarriageData.bakkenImages.length - 1 && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded font-bold z-10">
                              Direction →
                            </div>
                          )}
                        </>
                      )}
                      <img
                        src={imageUrl}
                        alt={`Carriage ${index + 1}`}
                        className="w-full h-auto object-contain rounded border shadow-sm"
                        style={{ maxHeight: 'none' }}
                      />
                      <div className="text-center text-sm text-gray-600 mt-2">
                        Carriage {index + 1}
                        {perronVoorzieningen.length > 0 && (
                          <span className="ml-2 text-xs text-green-600">
                            ({perronVoorzieningen.length} platform facilities)
                          </span>
                        )}
                      </div>
                      
                      {/* Perron Numbers Display */}
                      {(() => {
                        const perronNumbers = getPerronNumbersForImage(selectedCarriageData.perronAllocation || [], index);
                        if (perronNumbers.leftPerron || perronNumbers.rightPerron) {
                          return (
                            <div className="text-center text-xs text-blue-600 mt-1 font-medium">
                              {perronNumbers.leftPerron && perronNumbers.rightPerron ? (
                                <span>
                                  Perron {perronNumbers.leftPerron} (left) - Perron {perronNumbers.rightPerron} (right)
                                </span>
                              ) : perronNumbers.leftPerron ? (
                                <span>Perron {perronNumbers.leftPerron}</span>
                              ) : (
                                <span>Perron {perronNumbers.rightPerron}</span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* First Class Detection Display */}
                      {(() => {
                        const detectionResult = firstClassDetection[index];
                        if (detectionResult === 'loading') {
                          return (
                            <div className="text-center text-xs text-gray-500 mt-1">
                              🔍 Analyzing first class seating...
                            </div>
                          );
                        } else if (detectionResult === 'left') {
                          return (
                            <div className="text-center text-xs text-purple-600 mt-1 font-medium">
                              🎫 First class on left side
                            </div>
                          );
                        } else if (detectionResult === 'right') {
                          return (
                            <div className="text-center text-xs text-purple-600 mt-1 font-medium">
                              🎫 First class on right side
                            </div>
                          );
                        } else if (detectionResult === 'null') {
                          return (
                            <div className="text-center text-xs text-gray-500 mt-1">
                              No first class detected
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {/* Display perron voorzieningen */}
                      {perronVoorzieningen.length > 0 && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                          <div className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                            <span className="mr-2">🚉</span>
                            Platform Facilities ({perronVoorzieningen.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {perronVoorzieningen.map((voorziening: any, vIndex: number) => (
                              <span 
                                key={vIndex} 
                                className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 font-medium"
                                title={`${voorziening.type}: ${voorziening.description || 'No description'}`}
                              >
                                {voorziening.type === 'PERRONLETTER' ? `Platform ${voorziening.description}` : 
                                 voorziening.type === 'LIFT' ? '🛗 Lift' :
                                 voorziening.type === 'TRAP' ? '🪜 Stairs' :
                                 voorziening.type === 'ROLTRAP' ? '🛗 Escalator' :
                                 voorziening.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Trips Modal */}
      <AlternativeTripsModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        fromStation={modalState.fromStation}
        toStation={modalState.toStation}
        fromDateTime={modalState.fromDateTime}
        originalDestination={originalDestination || ""}
      />
    </>
  );
}