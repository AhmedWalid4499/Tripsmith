import type { CountrySample } from "./types";

/**
 * Curated practical info per country, used by the Mock providers. Prices are typical 2026 levels
 * in local currency major units.
 */
export const COUNTRY_SAMPLES: CountrySample[] = [
  {
    country: "JP",
    currency: "JPY",
    currencyName: "Japanese yen",
    language: "Japanese",
    tipping:
      "Tipping is not expected and can cause confusion; good service is already included. Upscale hotels and restaurants may add a 10 to 15% service charge to the bill.",
    safety: [
      "Crime is very low, and lost items are often handed in to the local police box (koban).",
      "Foreign visitors are legally required to carry their passport at all times.",
      "Earthquakes happen: note your hotel's exits and install the official Safety Tips app for alerts.",
      "Typhoon season runs roughly August to October and can cancel flights and trains.",
    ],
    localTransport: [
      "Use a Suica or PASMO IC card (or add one to Apple Wallet) for trains, subways, buses and convenience stores.",
      "The Japan Rail Pass got much pricier in 2023; it only pays off with several long Shinkansen trips.",
      "Reserve Shinkansen seats in peak seasons (Golden Week, Obon, New Year) and when travelling with large luggage.",
      "Taxis are clean but expensive; the GO app works in most big cities.",
    ],
    cashVsCard:
      "Cards and IC cards work in most city shops and chains, but carry cash for small restaurants, shrines and rural areas; 7-Eleven ATMs accept foreign cards.",
    plugType: "Type A/B, 100V",
    emergencyNumber: "110 police, 119 fire/ambulance",
    connectivity:
      "Data-only eSIMs are the easiest option; pocket Wi-Fi routers and tourist SIMs can also be picked up at the airport.",
    dailyTransportMajor: 1200,
  },
  {
    country: "FR",
    currency: "EUR",
    currencyName: "Euro",
    language: "French",
    tipping:
      "Service is included by law (service compris), so tipping is optional; rounding up or leaving 5 to 10% for good table service is appreciated.",
    safety: [
      "Pickpockets work around the Eiffel Tower, Montmartre and on Metro line 1; keep phones off café tables.",
      "Ignore petition, friendship bracelet and 'found a gold ring' approaches.",
      "Strikes (grèves) can disrupt trains and the Metro; check the RATP and SNCF apps the day before.",
    ],
    localTransport: [
      "In Paris, tap a contactless bank card or a Navigo Easy card on the Metro, RER and buses.",
      "Book TGV and Ouigo high-speed trains early on SNCF Connect for the lowest fares.",
      "Vélib' shared bikes and Uber or G7 taxis are good for late evenings.",
    ],
    cashVsCard:
      "Contactless cards are accepted almost everywhere; keep a little cash for markets and small bakeries.",
    plugType: "Type C/E, 230V",
    emergencyNumber: "112 general, 15 medical, 17 police, 18 fire",
    connectivity:
      "eSIMs work well; prepaid SIMs from Orange, SFR, Bouygues or Free are sold in shops and need ID, and EU roaming rules apply.",
    dailyTransportMajor: 10,
  },
  {
    country: "IT",
    currency: "EUR",
    currencyName: "Euro",
    language: "Italian",
    tipping:
      "Tipping is not expected; many restaurants add a small coperto (cover charge). Rounding up or leaving a few euros for good service is enough.",
    safety: [
      "Pickpockets target Rome's Termini station, bus 64, the Metro and busy sights; use a zipped bag.",
      "Use only official white taxis or apps, and agree on the fixed airport fare before setting off.",
      "Driving into historic centres (ZTL zones) triggers automatic fines, often months later.",
      "Validate regional train and bus tickets before boarding or risk an on-the-spot fine.",
    ],
    localTransport: [
      "Trenitalia Frecciarossa and Italo run fast city-to-city trains; book ahead for cheaper fares.",
      "Rome and Milan Metros accept contactless bank cards at the gates.",
      "Bus tickets are often bought at a tabaccheria or by app, not from the driver.",
    ],
    cashVsCard:
      "Cards are widely accepted and shops must take them, but carry some cash for small cafés, markets and tips.",
    plugType: "Type C/F/L, 230V",
    emergencyNumber: "112",
    connectivity:
      "TIM, Vodafone, WindTre and Iliad sell prepaid SIMs (passport required), and data eSIMs are a simple alternative.",
    dailyTransportMajor: 8,
  },
  {
    country: "ES",
    currency: "EUR",
    currencyName: "Euro",
    language: "Spanish (Catalan is also official in Catalonia)",
    tipping:
      "Tipping is optional; locals round up or leave 5 to 10% at sit-down restaurants for good service.",
    safety: [
      "Pickpockets are common on Las Ramblas, the Barcelona Metro and beaches; never leave bags unattended.",
      "Watch for distraction thefts (spilled drinks, 'you dropped something') in tourist areas.",
      "Keep phones in a front pocket on café terraces and on crowded trains.",
    ],
    localTransport: [
      "In Barcelona, the T-casual card gives 10 Metro/bus trips; tapping a contactless card also works on the Metro.",
      "Renfe AVE, Ouigo and Iryo high-speed trains link the main cities; book early for low fares.",
      "Taxis are metered and reasonably priced; Uber and Cabify operate in big cities.",
    ],
    cashVsCard:
      "Cards and contactless payments are accepted almost everywhere, even for small amounts.",
    plugType: "Type C/F, 230V",
    emergencyNumber: "112",
    connectivity:
      "Movistar, Vodafone and Orange sell prepaid SIMs with ID, and data eSIMs work well; EU roaming rules apply.",
    dailyTransportMajor: 8,
  },
  {
    country: "GB",
    currency: "GBP",
    currencyName: "Pound sterling",
    language: "English",
    tipping:
      "Many restaurants add a 12.5% service charge, so check the bill before tipping; there is no need to tip for drinks at a pub bar.",
    safety: [
      "Phone snatching by people on bikes happens in busy London streets; keep phones away from the kerb.",
      "Traffic drives on the left: look right first when crossing.",
      "Use licensed black cabs or app-booked minicabs, never unbooked cars touting for fares.",
    ],
    localTransport: [
      "Tap a contactless card or phone on the Tube, buses and trains in London; daily and weekly fares are capped automatically.",
      "Use the same card for every tap so the cap applies; buses do not take cash.",
      "Book long-distance trains in advance for much cheaper fares.",
    ],
    cashVsCard:
      "Cards are accepted almost everywhere and some places are card-only; cash is rarely needed.",
    plugType: "Type G, 230V",
    emergencyNumber: "999 or 112 emergency, 111 non-urgent medical advice",
    connectivity:
      "EE, Vodafone, O2 and Three sell prepaid SIMs in shops and supermarkets, and data eSIMs are widely used.",
    dailyTransportMajor: 10,
  },
  {
    country: "TR",
    currency: "TRY",
    currencyName: "Turkish lira",
    language: "Turkish",
    tipping:
      "Leave 5 to 10% in cash at restaurants, and round up taxi fares; hammam attendants and guides also expect a tip.",
    safety: [
      "Avoid the 'let's go for a drink' scam around Taksim, where strangers steer visitors to bars with huge bills.",
      "Make sure taxis use the meter, or book through the BiTaksi or Uber apps.",
      "Watch for pickpockets in crowded bazaars, trams and ferries.",
      "Traffic is heavy and drivers rarely yield, so cross with care.",
    ],
    localTransport: [
      "Buy an Istanbulkart for the metro, T1 tram, buses, funiculars and ferries.",
      "Public ferries across the Bosphorus are cheap and often faster than the roads.",
      "Havaist buses and the M11 metro connect Istanbul Airport to the city.",
    ],
    cashVsCard:
      "Cards are widely accepted, but carry lira for small shops, bazaars and tips; prices change quickly because of inflation.",
    plugType: "Type C/F, 230V",
    emergencyNumber: "112",
    connectivity:
      "Turkcell, Vodafone and Türk Telekom sell tourist SIMs at the airport (pricier than in town), and data eSIMs are easy alternatives.",
    dailyTransportMajor: 350,
  },
  {
    country: "AE",
    currency: "AED",
    currencyName: "UAE dirham",
    language: "Arabic (English widely spoken)",
    tipping:
      "Service charges are often included; otherwise leave around 10% at restaurants and a few dirhams for drivers and porters.",
    safety: [
      "Crime is very low, but laws are strict: no drugs (some prescription medicines need approval), and no public drunkenness.",
      "Dress modestly in malls, souks and religious sites, and be discreet with public affection.",
      "During Ramadan, avoid eating or drinking in public during daylight.",
      "Summer heat is extreme (over 40 °C); plan outdoor sightseeing for early morning or evening.",
    ],
    localTransport: [
      "Use a Nol card for the Metro, tram and buses; the Red Line runs from the airport to Downtown and the Marina.",
      "RTA taxis are metered and affordable; Careem and Uber are also available.",
      "Water taxis and traditional abras cross Dubai Creek for a few dirhams.",
    ],
    cashVsCard:
      "Cards are accepted almost everywhere; small cash is handy for abras, souks and tips.",
    plugType: "Type G, 230V",
    emergencyNumber: "999 police, 998 ambulance, 997 fire",
    connectivity:
      "du and e& (Etisalat) sell tourist SIMs at the airport, and eSIMs work well; WhatsApp voice and video calls are restricted.",
    dailyTransportMajor: 40,
  },
  {
    country: "TH",
    currency: "THB",
    currencyName: "Thai baht",
    language: "Thai",
    tipping:
      "Tipping is not required; leave small change at cafés, 50 to 100 baht after a massage, and around 10% at upscale restaurants without a service charge.",
    safety: [
      "Ignore 'the palace is closed today' and gem shop scams, usually started by friendly strangers or tuk-tuk drivers.",
      "Road traffic is the main risk; avoid renting motorbikes without a licence and proper insurance.",
      "Criticising the monarchy is a serious crime; show respect at temples and cover shoulders and knees.",
    ],
    localTransport: [
      "The BTS Skytrain and MRT subway avoid traffic; the MRT and some BTS lines accept contactless bank cards.",
      "Grab and Bolt apps are the easiest way to get cars and motorbike taxis at fixed prices.",
      "Chao Phraya Express boats are a cheap, quick way along the river to the old town.",
      "Insist that metered taxis use the meter.",
    ],
    cashVsCard:
      "Cash is needed for street food, markets and small shops; Thai ATMs charge about 220 baht per withdrawal, so take out larger amounts.",
    plugType: "Type A/B/C/O, 220V",
    emergencyNumber: "191 police, 1669 ambulance, 1155 tourist police",
    connectivity:
      "AIS, True and DTAC sell cheap tourist SIMs at the airport (passport required), and data eSIMs work well.",
    dailyTransportMajor: 250,
  },
  {
    country: "EG",
    currency: "EGP",
    currencyName: "Egyptian pound",
    language: "Arabic",
    tipping:
      "Tipping (baksheesh) is expected almost everywhere; add 10% at restaurants even with a service charge, and keep small notes for porters, guides and drivers.",
    safety: [
      "Expect persistent touts at major sites like Giza; agree prices before any ride or service.",
      "Traffic is chaotic, so cross roads carefully and prefer app-booked cars.",
      "Dress modestly, especially at mosques and outside tourist resorts.",
      "Drink bottled water and be careful with raw salads in basic restaurants.",
    ],
    localTransport: [
      "Uber and Careem work well in Cairo and Alexandria and avoid fare haggling.",
      "The Cairo Metro is very cheap; the first carriage on each train is reserved for women.",
      "Domestic flights or overnight sleeper trains connect Cairo to Luxor and Aswan.",
    ],
    cashVsCard:
      "Cash is still king for taxis, tips and small shops; cards are accepted in hotels, malls and larger restaurants.",
    plugType: "Type C/F, 220V",
    emergencyNumber: "122 police, 123 ambulance, 180 fire, 126 tourist police",
    connectivity:
      "Vodafone, Orange, e& (Etisalat) and WE sell SIMs at the airport with a passport, and eSIMs are increasingly supported.",
    dailyTransportMajor: 300,
  },
];
