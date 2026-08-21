export const tripDays = [
  {
    date: "2026-12-30",
    shortDate: "30",
    weekday: "WED",
    owners: ["Person B"],
    description: "Arrival day - getting ready and settling in",
    showHost: false,
  },
  {
    date: "2026-12-31",
    shortDate: "31",
    weekday: "THU",
    owners: ["William", "Paula"],
    description: "New Year's Eve",
    showHost: true,
  },
  {
    date: "2027-01-01",
    shortDate: "01",
    weekday: "FRI",
    owners: ["Stella + Franco Richters"],
    description: "New Year's Day",
    showHost: true,
  },
  {
    date: "2027-01-02",
    shortDate: "02",
    weekday: "SAT",
    owners: ["Kilian", "Jordana"],
    description:
      "Mom, Nonna, mother-in-law, and most importantly - BIRTHDAY GIRL",
    showHost: true,
  },
  {
    date: "2027-01-03",
    shortDate: "03",
    weekday: "SUN",
    owners: ["Person F"],
    description: "Departure day",
    showHost: false,
  },
];

export const events = [
  {
    id: 1,
    date: "2026-12-30",
    startTime: "10:30",
    name: "Museum placeholder",
    category: "museum",
    locationName: "Placeholder museum",
    latitude: 41.9142,
    longitude: 12.4922,
  },
  {
    id: 2,
    date: "2026-12-30",
    startTime: "13:00",
    name: "Lunch placeholder",
    category: "food",
    locationName: "Placeholder restaurant",
    latitude: 41.9106,
    longitude: 12.4931,
  },
  {
    id: 3,
    date: "2026-12-31",
    startTime: "16:00",
    name: "Afternoon activity",
    category: "activity",
    locationName: "Placeholder location",
    latitude: 41.9009,
    longitude: 12.4833,
  },
];

export const staticPlaces = [
  {
    id: "hotel",
    name: "Family hotel - Hotel Horti 14",
    type: "hotel",
    latitude: 41.89439362872292,
    longitude: 12.463107454999244,
    address: "Via di San Francesco di Sales 14, Rome",
    description: "Hotel Horti 14",
  },
  {
    id: "apartment",
    name: "Franco Richter's Apartment",
    type: "apartment",
    latitude: 41.89669103691434,
    longitude: 12.464601485684447,
    address: "Via della Lungara 40, Rome",
    description: "Apartment for sister and family",
  },
];

export const arrivals = [
  {
    id: 1,
    date: "2026-12-30",
    time: "15:00",
    people: "Kirsten, Patrik, Kilian, Jordana, William and Paula",
    detail: "Check in at Horti 14 Borgo Trastevere",
  },

  {
    id: 2,
    date: "2027-01-03",
    time: "17:20",
    people: "Franco Richters",
    detail: "Flight from Rome airport",
  },
];
