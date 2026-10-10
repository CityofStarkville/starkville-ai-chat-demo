/* Occupancy percentages transcribed from Parking Occupancy Rates.xlsx, Sheet1!A4:N12. */
window.ParkingRates = Object.freeze([
  {
    "name": "Residential Mixed Use",
    "rates": [
      60,
      100,
      100,
      80,
      100,
      100
    ]
  },
  {
    "name": "Hotels, Motels, or Inns",
    "rates": [
      70,
      100,
      100,
      70,
      100,
      100
    ]
  },
  {
    "name": "Offices Professional",
    "rates": [
      100,
      20,
      5,
      5,
      5,
      5
    ]
  },
  {
    "name": "Retail Sales and Services",
    "rates": [
      90,
      80,
      5,
      100,
      70,
      5
    ]
  },
  {
    "name": "Eating & Drinking Establishments",
    "rates": [
      70,
      100,
      100,
      70,
      100,
      10
    ]
  },
  {
    "name": "Theater",
    "rates": [
      40,
      80,
      10,
      80,
      100,
      10
    ]
  },
  {
    "name": "Entertainment",
    "rates": [
      40,
      100,
      10,
      80,
      100,
      5
    ]
  },
  {
    "name": "Conference and Convention",
    "rates": [
      100,
      100,
      5,
      100,
      100,
      5
    ]
  },
  {
    "name": "Places of Worship",
    "rates": [
      100,
      20,
      5,
      10,
      10,
      5
    ]
  }
].map(row => Object.freeze({name:row.name, rates:Object.freeze(row.rates)})));
