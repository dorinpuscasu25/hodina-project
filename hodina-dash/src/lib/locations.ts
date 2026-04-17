export interface Country {
  code: string;
  name: string;
  cities: string[];
}

export const COUNTRIES: Country[] = [
  {
    code: 'MD',
    name: 'Moldova',
    cities: [
      'Chișinău',
      'Bălți',
      'Tiraspol',
      'Bender',
      'Cahul',
      'Ungheni',
      'Orhei',
      'Soroca',
      'Comrat',
      'Edineț',
      'Strășeni',
      'Ialoveni',
      'Căușeni',
      'Hîncești',
      'Călărași',
      'Dubăsari',
      'Fălești',
      'Florești',
      'Drochia',
      'Nisporeni',
      'Rezina',
      'Sîngerei',
      'Șoldănești',
      'Ștefan Vodă',
      'Taraclia',
      'Telenești',
      'Ocnița',
      'Briceni',
      'Cantemir',
      'Anenii Noi',
      'Basarabeasca',
      'Criuleni',
      'Dondușeni',
      'Glodeni',
      'Leova',
      'Râșcani',
      'Cimișlia',
    ],
  },
  {
    code: 'RO',
    name: 'România',
    cities: [
      'București',
      'Cluj-Napoca',
      'Timișoara',
      'Iași',
      'Constanța',
      'Brașov',
      'Craiova',
      'Galați',
      'Oradea',
      'Ploiești',
      'Sibiu',
      'Bacău',
      'Arad',
      'Suceava',
      'Pitești',
      'Târgu Mureș',
      'Baia Mare',
      'Buzău',
      'Botoșani',
      'Satu Mare',
      'Piatra Neamț',
      'Râmnicu Vâlcea',
      'Drobeta-Turnu Severin',
      'Focșani',
      'Târgoviște',
      'Bistrița',
      'Reșița',
      'Tulcea',
      'Deva',
      'Alba Iulia',
      'Hunedoara',
      'Slatina',
      'Zalău',
      'Brăila',
      'Călărași',
      'Giurgiu',
      'Slobozia',
    ],
  },
  {
    code: 'UA',
    name: 'Ukraine',
    cities: ['Kyiv', 'Odesa', 'Lviv', 'Kharkiv', 'Chernivtsi'],
  },
];

export function findCities(countryCode: string): string[] {
  return COUNTRIES.find((c) => c.code === countryCode)?.cities ?? [];
}

export function findCountryByName(name: string): Country | undefined {
  const normalized = name.trim().toLowerCase();
  return COUNTRIES.find(
    (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized,
  );
}
