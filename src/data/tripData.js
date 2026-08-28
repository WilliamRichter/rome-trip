export const tripDays = [
  {
    date: "2026-12-30",
    shortDate: "30",
    weekday: "WED",
    owners: ["Person B"],
    description: "Arrival day - settling in 🛬",
    showHost: false,
  },
  {
    date: "2026-12-31",
    shortDate: "31",
    weekday: "THU",
    owners: [
      {
        name: "William",
        image: "/images/hosts/william.png",
      },
      {
        name: "Paula",
        image: "/images/hosts/paula.png",
      },
    ],
    description: "New Year's Eve 🍾 🎆",
    showHost: true,
  },
  {
    date: "2027-01-01",
    shortDate: "01",
    weekday: "FRI",
    owners: [
      {
        name: "Stella",
        image: "/images/hosts/stella.png",
      },
      {
        name: "Alice",
        image: "/images/hosts/alice.png",
      },
      {
        name: "Matteo",
        image: "/images/hosts/matteo.png",
      },
      {
        name: "Leonardo",
        image: "/images/hosts/leonardo.png",
      },
      {
        name: "Gaia",
        image: "/images/hosts/gaia.png",
      },
    ],

    hostLabel: "Stella + the Franco Richters",
    description: "New Year's Day 🌅",
    showHost: true,
  },
  {
    date: "2027-01-02",
    shortDate: "02",
    weekday: "SAT",
    owners: [
      {
        name: "Kilian",
        image: "/images/hosts/kilian.png",
      },
      {
        name: "Jordana",
        image: "/images/hosts/jordana.png",
      },
    ],
    description: "Mom's / Nonna's / Mother-in-law's birthday! 🎂",
  },
  {
    date: "2027-01-03",
    shortDate: "03",
    weekday: "SUN",
    owners: ["Person F"],
    description: "Departure day 🛫",
    showHost: false,
  },
];

export const staticPlaces = [
  {
    id: "hotel",
    name: "Horti 14",
    type: "hotel",
    latitude: 41.89439362872292,
    longitude: 12.463107454999244,
    address: "Via di San Francesco di Sales 14, Rome",
    description: "Hotel",
  },
  {
    id: "apartment",
    name: "Franco Richter's Apartment",
    type: "apartment",
    latitude: 41.89669103691434,
    longitude: 12.464601485684447,
    address: "Via della Lungara 40, Rome",
    description: "",
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
