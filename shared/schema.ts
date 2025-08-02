import { z } from "zod";

// NS API Response Types
export const StationSchema = z.object({
  name: z.string(),
  lng: z.number(),
  lat: z.number(),
  countryCode: z.string(),
  uicCode: z.string(),
  stationCode: z.string().optional(),
  type: z.string(),
  plannedTimeZoneOffset: z.number(),
  plannedDateTime: z.string(),
  actualTimeZoneOffset: z.number().optional(),
  actualDateTime: z.string().optional(),
  plannedTrack: z.string().optional(),
  actualTrack: z.string().optional(),
  exitSide: z.string().optional(),
  checkinStatus: z.string(),
  notes: z.array(z.any()),
});

export const ProductSchema = z.object({
  productType: z.string(),
  number: z.string(),
  categoryCode: z.string(),
  shortCategoryName: z.string(),
  longCategoryName: z.string(),
  operatorCode: z.string(),
  operatorName: z.string(),
  operatorAdministrativeCode: z.number(),
  type: z.string(),
  displayName: z.string(),
  nameNesProperties: z.object({
    color: z.string(),
  }),
  iconNesProperties: z.object({
    color: z.string(),
    icon: z.string(),
  }),
  notes: z.array(z.array(z.any())),
  text: z.object({
    color: z.string(),
    text: z.string(),
    accessibilityText: z.string(),
  }),
  code: z.object({
    color: z.string(),
    text: z.string(),
    accessibilityText: z.string(),
  }),
  direction: z.object({
    color: z.string(),
    text: z.string(),
    accessibilityText: z.string(),
  }),
  passing: z.object({
    color: z.string(),
    text: z.string(),
    accessibilityText: z.string(),
  }),
  duration: z.object({
    color: z.string(),
    text: z.string(),
    accessibilityText: z.string(),
  }),
  icon: z.object({
    color: z.string(),
    icon: z.string(),
  }),
  line: z.object({
    color: z.string(),
  }),
});

export const StopSchema = z.object({
  uicCode: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  countryCode: z.string(),
  notes: z.array(z.any()),
  routeIdx: z.number(),
  plannedDepartureDateTime: z.string().optional(),
  plannedDepartureTimeZoneOffset: z.number().optional(),
  actualDepartureDateTime: z.string().optional(),
  actualDepartureTimeZoneOffset: z.number().optional(),
  plannedArrivalDateTime: z.string().optional(),
  plannedArrivalTimeZoneOffset: z.number().optional(),
  actualArrivalDateTime: z.string().optional(),
  actualArrivalTimeZoneOffset: z.number().optional(),
  actualDepartureTrack: z.string().optional(),
  plannedDepartureTrack: z.string().optional(),
  plannedArrivalTrack: z.string().optional(),
  actualArrivalTrack: z.string().optional(),
  departureDelayInSeconds: z.number().optional(),
  arrivalDelayInSeconds: z.number().optional(),
  cancelled: z.boolean(),
  borderStop: z.boolean(),
  passing: z.boolean(),
});

export const LegSchema = z.object({
  idx: z.string(),
  name: z.string(),
  travelType: z.string(),
  direction: z.string(),
  partCancelled: z.boolean(),
  cancelled: z.boolean(),
  isAfterCancelledLeg: z.boolean(),
  isOnOrAfterCancelledLeg: z.boolean(),
  changePossible: z.boolean(),
  alternativeTransport: z.boolean(),
  journeyDetailRef: z.string(),
  origin: StationSchema,
  destination: StationSchema,
  product: ProductSchema,
  stops: z.array(StopSchema),
  crowdForecast: z.string().optional(),
  bicycleSpotCount: z.number().optional(),
  punctuality: z.number().optional(),
  shorterStock: z.boolean().optional(),
  journeyDetail: z.array(z.any()).optional(),
  reachable: z.boolean().optional(),
  plannedDurationInMinutes: z.number().optional(),
  nesProperties: z.object({
    color: z.string(),
    scope: z.string(),
    styles: z.object({
      type: z.string(),
      dashed: z.boolean(),
    }),
  }).optional(),
  duration: z.object({
    value: z.string(),
    accessibilityValue: z.string(),
    nesProperties: z.object({
      color: z.string(),
    }),
  }).optional(),
  preSteps: z.array(z.any()).optional(),
  postSteps: z.array(z.any()).optional(),
});

export const TripSchema = z.object({
  idx: z.number(),
  uid: z.string(),
  ctxRecon: z.string(),
  sourceCtxRecon: z.string(),
  plannedDurationInMinutes: z.number(),
  actualDurationInMinutes: z.number(),
  transfers: z.number(),
  status: z.string(),
  messages: z.array(z.any()),
  legs: z.array(LegSchema),
  checksum: z.string().optional(),
  crowdForecast: z.string().optional(),
  punctuality: z.number().optional(),
  optimal: z.boolean().optional(),
  fareRoute: z.object({
    routeId: z.string(),
    origin: z.object({
      varCode: z.number(),
      name: z.string(),
    }),
    destination: z.object({
      varCode: z.number(),
      name: z.string(),
    }),
  }).optional(),
  fares: z.array(z.any()).optional(),
  fareLegs: z.array(z.any()).optional(),
  productFare: z.object({
    priceInCents: z.number(),
    priceInCentsExcludingSupplement: z.number(),
    buyableTicketPriceInCents: z.number(),
    buyableTicketPriceInCentsExcludingSupplement: z.number(),
    product: z.string(),
    travelClass: z.string(),
    discountType: z.string(),
  }).optional(),
  fareOptions: z.object({
    isInternationalBookable: z.boolean(),
    isInternational: z.boolean(),
    isEticketBuyable: z.boolean(),
    isPossibleWithOvChipkaart: z.boolean(),
    isTotalPriceUnknown: z.boolean(),
  }).optional(),
  type: z.string().optional(),
  shareUrl: z.object({
    uri: z.string(),
  }).optional(),
  realtime: z.boolean().optional(),
  routeId: z.string().optional(),
  registerJourney: z.object({
    url: z.string().optional(),
    searchUrl: z.string().optional(),
    status: z.string().optional(),
    bicycleReservationRequired: z.boolean().optional(),
  }).optional(),
  modalityListItems: z.array(z.any()).optional(),
});

export const NSApiResponseSchema = z.object({
  source: z.string(),
  trips: z.array(TripSchema),
});

export const TripSearchSchema = z.object({
  fromStation: z.string().min(1, "From station is required"),
  toStation: z.string().min(1, "To station is required"),
  dateTime: z.string().min(1, "Date and time is required"),
  excludeBus: z.boolean().optional().default(false),
  excludeTram: z.boolean().optional().default(false),
  excludeMetro: z.boolean().optional().default(false),
  walkingOnly: z.boolean().optional().default(false),
});

export type Station = z.infer<typeof StationSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Leg = z.infer<typeof LegSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type NSApiResponse = z.infer<typeof NSApiResponseSchema>;
export type TripSearch = z.infer<typeof TripSearchSchema>;
