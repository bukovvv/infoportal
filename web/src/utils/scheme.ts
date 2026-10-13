// Schemat połączeń KW: węzły (stacje opisane na schemacie i punkty załamania), linie z pełną listą stacji
// (nazwy jak w rozkładzie GTFS, kolejność z kursów) i geometria równoległych linii na wspólnych odcinkach.

export interface SchemeNode {
  x: number
  y: number
  /** nazwa stacji w rozkładzie; brak = punkt załamania linii */
  name?: string
  /** podpis na schemacie (\n = nowa linia) */
  label?: string
  /** strona podpisu względem punktu */
  at?: 'l' | 'r' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br'
  major?: boolean
}

export interface SchemeLine {
  id: string
  name: string
  color: string
  /** kolor w ciemnym motywie, gdy podstawowy jest niewidoczny na ciemnym tle */
  dark?: string
  /** przebieg na schemacie: identyfikatory węzłów */
  path: string[]
  /** oznaczenie linii PKM */
  badge?: string
  /** wszystkie stacje w kolejności przebiegu */
  stations: string[]
  note?: string
}

export const NODES: Record<string, SchemeNode> = {
  poz: { x: 360, y: 380, name: 'Poznań Główny', label: 'Poznań Gł.', at: 'bl', major: true },
  wsch: { x: 410, y: 380, name: 'Poznań Wschód', label: 'Poznań Wsch.', at: 'b' },
  lubon: { x: 360, y: 435, name: 'Luboń koło Poznania', label: 'Luboń', at: 'tl' },
  // północ: Piła, Krzyż
  obor: { x: 360, y: 295, name: 'Oborniki Wielkopolskie', label: 'Oborniki\nWlkp.', at: 'l' },
  rogo: { x: 360, y: 245, name: 'Rogoźno Wielkopolskie', label: 'Rogoźno\nWlkp.', at: 'l' },
  chodz: { x: 360, y: 190, name: 'Chodzież', label: 'Chodzież', at: 'l' },
  pila: { x: 360, y: 130, name: 'Piła Główna', label: 'Piła Gł.', at: 't', major: true },
  trzc: { x: 275, y: 130, name: 'Trzcianka', label: 'Trzcianka', at: 't' },
  b_pila1: { x: 210, y: 130 },
  b_pila2: { x: 190, y: 150 },
  wielen: { x: 190, y: 172, name: 'Wieleń', label: 'Wieleń', at: 'l' },
  krzyz: { x: 190, y: 210, name: 'Krzyż', label: 'Krzyż Wlkp.', at: 'l', major: true },
  wronki: { x: 240, y: 260, name: 'Wronki', label: 'Wronki', at: 'l' },
  szam: { x: 280, y: 300, name: 'Szamotuły', label: 'Szamotuły', at: 'l' },
  rokiet: { x: 320, y: 340, name: 'Rokietnica', label: 'Rokietnica', at: 'l' },
  // północny wschód: Gołańcz, Mogilno
  b_gol1: { x: 425, y: 380 },
  b_gol2: { x: 445, y: 360 },
  murg: { x: 445, y: 300, name: 'Murowana Goślina', label: 'Murowana\nGoślina', at: 'l' },
  b_gol3: { x: 445, y: 290 },
  wagr: { x: 485, y: 250, name: 'Wągrowiec', label: 'Wągrowiec', at: 'l' },
  golancz: { x: 520, y: 215, name: 'Gołańcz', label: 'Gołańcz', at: 't', major: true },
  b_mog: { x: 440, y: 380 },
  pobiedz: { x: 465, y: 355, name: 'Pobiedziska', label: 'Pobiedziska', at: 'r' },
  gniezno: { x: 560, y: 260, name: 'Gniezno', label: 'Gniezno', at: 'r', major: true },
  mogilno: { x: 610, y: 210, name: 'Mogilno', label: 'Mogilno', at: 'r', major: true },
  // wschód: Kutno
  wrzesnia: { x: 560, y: 380, name: 'Września', label: 'Września', at: 'bl' },
  b_kut1: { x: 590, y: 380 },
  slupca: { x: 615, y: 405, name: 'Słupca', label: 'Słupca', at: 'tr' },
  b_kut2: { x: 640, y: 430 },
  konin: { x: 720, y: 430, name: 'Konin', label: 'Konin', at: 't' },
  kolo: { x: 790, y: 430, name: 'Koło', label: 'Koło', at: 't' },
  kutno: { x: 930, y: 430, name: 'Kutno', label: 'Kutno', at: 't', major: true },
  // południowy wschód: Jarocin, Ostrów, Kalisz, Łódź
  sroda: { x: 460, y: 480, name: 'Środa Wielkopolska', label: 'Środa Wlkp.', at: 'tr' },
  jarocin: { x: 560, y: 580, name: 'Jarocin', label: 'Jarocin', at: 'tr' },
  pleszew: { x: 617, y: 637, name: 'Pleszew', label: 'Pleszew', at: 'tr' },
  ostrow: { x: 675, y: 695, name: 'Ostrów Wielkopolski', label: 'Ostrów Wlkp.', at: 'r', major: true },
  krotoszyn: { x: 560, y: 695, name: 'Krotoszyn', label: 'Krotoszyn', at: 'l', major: true },
  odolanow: { x: 630, y: 740, name: 'Odolanów', label: 'Odolanów', at: 'l', major: true },
  ostrzeszow: { x: 675, y: 770, name: 'Ostrzeszów', label: 'Ostrzeszów', at: 'r' },
  kepno: { x: 675, y: 815, name: 'Kępno', label: 'Kępno', at: 'r' },
  leka: { x: 675, y: 860, name: 'Łęka Opatowska', label: 'Łęka Opatowska', at: 'r', major: true },
  kalisz: { x: 735, y: 635, name: 'Kalisz', label: 'Kalisz', at: 't', major: true },
  opatowek: { x: 785, y: 635, name: 'Opatówek', label: 'Opatówek', at: 'b' },
  sieradz: { x: 835, y: 635, name: 'Sieradz', label: 'Sieradz', at: 't' },
  zdwola: { x: 875, y: 635, name: 'Zduńska Wola', label: 'Zduńska\nWola', at: 'b' },
  pabianice: { x: 915, y: 595, name: 'Pabianice', label: 'Pabianice', at: 'l' },
  lodz: { x: 955, y: 555, name: 'Łódź Kaliska', label: 'Łódź Kal.', at: 't', major: true },
  // zachód: Zbąszynek, Wolsztyn
  buk: { x: 255, y: 380, name: 'Buk', label: 'Buk', at: 't' },
  b_zb1: { x: 210, y: 380 },
  nt: { x: 180, y: 410, name: 'Nowy Tomyśl', label: 'Nowy Tomyśl', at: 'tl' },
  b_zb2: { x: 150, y: 440 },
  zbaszyn: { x: 150, y: 465, name: 'Zbąszyń', label: 'Zbąszyń', at: 'bl' },
  zbaszynek: { x: 80, y: 465, name: 'Zbąszynek', label: 'Zbąszynek', at: 't', major: true },
  steszew: { x: 325, y: 470, name: 'Stęszew', label: 'Stęszew', at: 'tl' },
  grodzisk: { x: 290, y: 505, name: 'Grodzisk Wielkopolski', label: 'Grodzisk\nWlkp.', at: 'b' },
  wolsztyn: { x: 190, y: 505, name: 'Wolsztyn', label: 'Wolsztyn', at: 'tr', major: true },
  powodowo: { x: 120, y: 505, name: 'Powodowo', label: 'Powodowo', at: 'b', major: true },
  boszkowo: { x: 235, y: 550, name: 'Boszkowo', label: 'Boszkowo', at: 'l' },
  // południe: Leszno, Rawicz, Głogów
  koscian: { x: 360, y: 505, name: 'Kościan', label: 'Kościan', at: 'r' },
  b_kos: { x: 360, y: 515 },
  leszno: { x: 280, y: 595, name: 'Leszno', label: 'Leszno', at: 'l', major: true },
  rawicz: { x: 280, y: 675, name: 'Rawicz', label: 'Rawicz', at: 'r', major: true },
  wschowa: { x: 230, y: 645, name: 'Wschowa', label: 'Wschowa', at: 'tl' },
  glogow: { x: 180, y: 695, name: 'Głogów', label: 'Głogów', at: 'l', major: true },
  kobylin: { x: 430, y: 595, name: 'Kobylin', label: 'Kobylin', at: 't' },
  b_kob: { x: 460, y: 595 },
}

// wspólne odcinki list stacji
const POZ_WSCH = ['Poznań Główny', 'Poznań Garbary', 'Poznań Wschód']
const POZ_LUBON = ['Poznań Główny', 'Poznań Dębiec', 'Luboń koło Poznania']
const POZ_JAROCIN = [
  'Poznań Główny', 'Poznań Dębina', 'Poznań Starołęka', 'Poznań Krzesiny', 'Gądki', 'Kórnik', 'Pierzchno', 'Środa Wielkopolska',
  'Sulęcinek', 'Solec Wielkopolski', 'Chocicza', 'Mieszków', 'Jarocin',
]
const JAROCIN_OSTROW = ['Witaszyce', 'Kotlin', 'Pleszew', 'Taczanów', 'Bronów', 'Biniew', 'Ostrów Wielkopolski']
const JAROCIN_KROTOSZYN = ['Golina', 'Obra Stara', 'Koźmin Wielkopolski', 'Wolenice', 'Bożacin', 'Krotoszyn']
const SE_TRUNK = ['poz', 'sroda', 'jarocin']
const OSTROW_TRUNK = [...SE_TRUNK, 'pleszew', 'ostrow']

/** Kolejność na liście = kolejność linii w wiązkach na wspólnych odcinkach. */
export const LINES: SchemeLine[] = [
  {
    id: 'pila-krzyz', name: 'Krzyż – Piła', color: '#C7A28E',
    path: ['krzyz', 'wielen', 'b_pila2', 'b_pila1', 'trzc', 'pila'],
    stations: ['Krzyż', 'Wieleń', 'Biernatowo', 'Siedlisko Czarnkowskie', 'Trzcianka', 'Biała Pilska', 'Stobno', 'Piła Główna'],
  },
  {
    id: 'krzyz', name: 'Poznań – Krzyż Wlkp.', color: '#EF7D00',
    path: ['poz', 'rokiet', 'szam', 'wronki', 'krzyz'],
    stations: ['Poznań Główny', 'Poznań Wola', 'Kiekrz', 'Rokietnica', 'Pamiątkowo', 'Baborówko', 'Szamotuły', 'Pęckowo', 'Wronki', 'Wronki Zamość', 'Mokrz', 'Miały', 'Drawski Młyn', 'Krzyż'],
  },
  {
    id: 'pila', name: 'Poznań – Piła', color: '#7B4A2A',
    path: ['poz', 'obor', 'rogo', 'chodz', 'pila'],
    stations: [
      'Poznań Główny', 'Poznań Podolany', 'Poznań Strzeszyn', 'Złotniki Grzybowe', 'Złotniki', 'Złotkowo', 'Golęczewo', 'Chludowo', 'Wargowo', 'Bogdanowo',
      'Oborniki Wielkopolskie Miasto', 'Oborniki Wielkopolskie', 'Rożnowo', 'Parkowo', 'Rogoźno Wielkopolskie', 'Tarnowo Rogozińskie', 'Sokołowo Budzyńskie',
      'Budzyń', 'Ostrówki koło Chodzieży', 'Chodzież', 'Milcz', 'Dziembówko', 'Piła Kalina', 'Piła Główna',
    ],
  },
  {
    id: 'golancz', name: 'Poznań – Gołańcz', color: '#16A34A',
    path: ['poz', 'wsch', 'b_gol1', 'b_gol2', 'murg', 'b_gol3', 'wagr', 'golancz'],
    stations: [
      ...POZ_WSCH, 'Poznań Karolin', 'Czerwonak', 'Czerwonak Osiedle', 'Owińska', 'Bolechowo', 'Zielone Wzgórza', 'Murowana Goślina', 'Przebędowo', 'Łopuchowo',
      'Łopuchowo Osiedle', 'Sława Wielkopolska', 'Skoki', 'Roszkowo Wągrowieckie', 'Przysieczyn', 'Wągrowiec', 'Kobylec', 'Grylewo', 'Laskownica', 'Gołańcz',
    ],
  },
  {
    id: 'mogilno', name: 'Poznań – Mogilno', color: '#F5A700',
    path: ['poz', 'wsch', 'b_gol1', 'b_mog', 'pobiedz', 'gniezno', 'mogilno'],
    stations: [
      ...POZ_WSCH, 'Ligowiec', 'Kobylnica', 'Biskupice Wielkopolskie', 'Promno', 'Pobiedziska Letnisko', 'Pobiedziska', 'Lednogóra', 'Fałkowo', 'Pierzyska',
      'Gniezno', 'Jankowo Dolne', 'Trzemeszno', 'Wydartowo', 'Mogilno',
    ],
  },
  {
    id: 'kutno', name: 'Poznań – Kutno', color: '#E30613',
    path: ['poz', 'wsch', 'b_gol1', 'b_mog', 'wrzesnia', 'b_kut1', 'slupca', 'b_kut2', 'konin', 'kolo', 'kutno'],
    stations: [
      ...POZ_WSCH, 'Poznań Antoninek', 'Swarzędz', 'Paczkowo', 'Kostrzyn Wielkopolski', 'Gułtowy', 'Nekla', 'Podstolice', 'Września', 'Gutowo Wielkopolskie',
      'Otoczna', 'Wólka', 'Strzałkowo', 'Słupca', 'Cienin', 'Cienin Kościelny', 'Spławie', 'Kawnice', 'Konin Zachód', 'Konin', 'Patrzyków', 'Kramsk',
      'Budki Nowe', 'Koło', 'Barłogi', 'Kłodawa', 'Turzynów', 'Krzewie', 'Nowe Kutnowskie', 'Kutno',
    ],
  },
  {
    id: 'gniezno-krotoszyn', name: 'Gniezno – Krotoszyn', color: '#9BCB6A',
    path: ['gniezno', 'wrzesnia', 'jarocin', 'krotoszyn'],
    stations: [
      'Gniezno', 'Gębarzewo', 'Żydowo', 'Czerniejewo', 'Marzenin', 'Września', 'Obłaczkowo', 'Chwalibogowo', 'Książno', 'Miłosław', 'Orzechowo', 'Żerków',
      'Radlin Wielkopolski', 'Jarocin', ...JAROCIN_KROTOSZYN,
    ],
  },
  {
    id: 'kalisz', name: 'Poznań – Kalisz', color: '#3FA9A9',
    path: [...OSTROW_TRUNK, 'kalisz', 'opatowek'],
    stations: [...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Czekanów', 'Ociąż', 'Nowe Skalmierzyce', 'Kalisz Szczypiorno', 'Kalisz', 'Kalisz Winiary', 'Opatówek'],
  },
  {
    id: 'lodz', name: 'Poznań – Łódź', color: '#7D6BB3',
    path: [...OSTROW_TRUNK, 'kalisz', 'opatowek', 'sieradz', 'zdwola', 'pabianice', 'lodz'],
    stations: [
      'Poznań Główny', 'Poznań Dębina', 'Poznań Starołęka', 'Środa Wielkopolska', 'Jarocin', 'Pleszew', 'Ostrów Wielkopolski', 'Nowe Skalmierzyce', 'Kalisz',
      'Opatówek', 'Sieradz', 'Zduńska Wola', 'Łask', 'Kolumna', 'Pabianice', 'Pabianice Północne', 'Łódź Retkinia', 'Łódź Kaliska',
    ],
    note: 'Pociągi pospieszne KW — zatrzymują się tylko na wymienionych stacjach.',
  },
  {
    id: 'leka', name: 'Poznań – Łęka Opatowska', color: '#FFCC00',
    path: [...OSTROW_TRUNK, 'ostrzeszow', 'kepno', 'leka'],
    stations: [
      ...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Janków Przygodzki', 'Przygodzice', 'Antonin', 'Niedźwiedź Wielkopolski', 'Ostrzeszów', 'Domanin', 'Kępno', 'Słupia',
      'Łęka Opatowska',
    ],
  },
  {
    id: 'odolanow', name: 'Poznań – Odolanów', color: '#E6007E',
    path: [...OSTROW_TRUNK, 'odolanow'],
    stations: [...POZ_JAROCIN, ...JAROCIN_OSTROW, 'Topola-Osiedle', 'Tarchały Wielkie', 'Odolanów'],
  },
  {
    id: 'krotoszyn', name: 'Poznań – Krotoszyn', color: '#A3237F',
    path: [...SE_TRUNK, 'krotoszyn'],
    stations: [...POZ_JAROCIN, ...JAROCIN_KROTOSZYN],
  },
  {
    id: 'leszno-ostrow', name: 'Leszno – Ostrów Wlkp.', color: '#1F1F1F', dark: '#E6E6E6',
    path: ['leszno', 'kobylin', 'b_kob', 'krotoszyn', 'ostrow'],
    stations: [
      'Leszno', 'Leszno Grzybowo', 'Kąkolewo', 'Pawłowice', 'Poniec', 'Dzięczyn', 'Karzec', 'Krobia', 'Włostowo', 'Pępowo', 'Czeluścin', 'Kobylin', 'Kuklinów',
      'Dzierżanów Wielkopolski', 'Krotoszyn', 'Gorzupia', 'Biadki', 'Daniszyn', 'Łąkociny', 'Ostrów Wielkopolski Gorzyce', 'Ostrów Wielkopolski',
    ],
  },
  {
    id: 'rawicz', name: 'Poznań – Rawicz', color: '#C0601A',
    path: ['poz', 'lubon', 'koscian', 'b_kos', 'leszno', 'rawicz'],
    stations: [
      ...POZ_LUBON, 'Puszczykowo', 'Puszczykówko', 'Mosina', 'Drużyna Poznańska', 'Iłowiec', 'Czempiń', 'Oborzyska Stare', 'Kościan', 'Przysieka Stara',
      'Stare Bojanowo', 'Górka Duchowna', 'Lipno Nowe', 'Leszno', 'Rydzyna', 'Kaczkowo', 'Bojanowo', 'Rawicz',
    ],
  },
  {
    id: 'glogow', name: 'Leszno – Głogów', color: '#7F9A1E',
    path: ['leszno', 'wschowa', 'glogow'],
    stations: ['Leszno', 'Lasocice', 'Wschowa', 'Stare Drzewce', 'Głogówko', 'Głogów'],
  },
  {
    id: 'wolsztyn', name: 'Poznań – Wolsztyn – Powodowo', color: '#0B5A86',
    path: ['poz', 'lubon', 'steszew', 'grodzisk', 'wolsztyn', 'powodowo'],
    stations: [
      ...POZ_LUBON, 'Wiry', 'Szreniawa', 'Trzebaw Rosnówko', 'Stęszew', 'Strykowo Poznańskie', 'Granowo', 'Kotowo', 'Ptaszkowo', 'Grąblewo',
      'Grodzisk Wielkopolski', 'Ruchocice', 'Drzymałowo', 'Rakoniewice', 'Rostarzewo', 'Tłoki', 'Adamowo', 'Wolsztyn', 'Powodowo',
    ],
  },
  {
    id: 'zbaszynek', name: 'Poznań – Zbąszynek', color: '#2AA7DF',
    path: ['poz', 'buk', 'b_zb1', 'nt', 'b_zb2', 'zbaszyn', 'zbaszynek'],
    stations: [
      'Poznań Główny', 'Poznań Górczyn', 'Poznań Junikowo', 'Palędzie', 'Dopiewo', 'Otusz', 'Buk', 'Wojnowice Wielkopolskie', 'Opalenica', 'Porażyn', 'Sątopy',
      'Nowy Tomyśl', 'Jastrzębsko', 'Chrośnica', 'Zbąszyń', 'Zbąszynek',
    ],
  },
  {
    id: 'zbaszynek-leszno', name: 'Zbąszynek – Leszno', color: '#9A9A9A',
    path: ['zbaszynek', 'zbaszyn', 'wolsztyn', 'boszkowo', 'leszno'],
    stations: [
      'Zbąszynek', 'Zbąszyń', 'Zbąszyń Przedmieście', 'Stefanowo', 'Belęcin Wielkopolski', 'Tuchorza', 'Wolsztyn', 'Nowy Widzim', 'Wroniawy', 'Nowy Solec',
      'Nowawieś Mochy', 'Perkowo', 'Błotnica', 'Starkowo', 'Boszkowo', 'Włoszakowice', 'Krzycko Wielkie', 'Wilkowice', 'Leszno',
    ],
  },
]

/** Kolejność na liście linii (jak w legendzie mapy przewoźnika). */
export const LEGEND = [
  'kutno', 'mogilno', 'golancz', 'pila', 'pila-krzyz', 'krzyz', 'zbaszynek', 'wolsztyn', 'zbaszynek-leszno', 'rawicz', 'leszno-ostrow', 'glogow',
  'krotoszyn', 'odolanow', 'leka', 'lodz', 'kalisz', 'gniezno-krotoszyn',
].map((id) => LINES.find((l) => l.id === id)!)

/** Poznańska Kolej Metropolitalna — kolory linii z rozkładu. */
export const PKM_LINES: SchemeLine[] = [
  {
    id: 'pkm4', badge: 'PKM4', name: 'Wronki – Poznań Gł. – Środa Wlkp.', color: '#823D8C',
    path: ['wronki', 'szam', 'rokiet', 'poz', 'sroda'],
    stations: ['Wronki', 'Pęckowo', 'Szamotuły', 'Baborówko', 'Pamiątkowo', 'Rokietnica', 'Kiekrz', 'Poznań Wola', ...POZ_JAROCIN.slice(0, 8)],
  },
  {
    id: 'pkm5', badge: 'PKM5', name: 'Poznań Gł. – Rogoźno Wlkp.', color: '#E8B120',
    path: ['poz', 'obor', 'rogo'],
    stations: LINES.find((l) => l.id === 'pila')!.stations.slice(0, 15),
  },
  {
    id: 'pkm3', badge: 'PKM3', name: 'Grodzisk Wlkp. – Poznań Gł. – Wągrowiec', color: '#3F9236',
    path: ['grodzisk', 'steszew', 'lubon', 'poz', 'wsch', 'b_gol1', 'b_gol2', 'murg', 'b_gol3', 'wagr'],
    stations: [
      'Grodzisk Wielkopolski', 'Grąblewo', 'Ptaszkowo', 'Kotowo', 'Granowo', 'Strykowo Poznańskie', 'Stęszew', 'Trzebaw Rosnówko', 'Szreniawa', 'Wiry',
      ...[...POZ_LUBON].reverse(), ...POZ_WSCH.slice(1), 'Poznań Karolin', 'Czerwonak', 'Czerwonak Osiedle', 'Owińska', 'Bolechowo', 'Zielone Wzgórza',
      'Murowana Goślina', 'Przebędowo', 'Łopuchowo', 'Łopuchowo Osiedle', 'Sława Wielkopolska', 'Skoki', 'Roszkowo Wągrowieckie', 'Przysieczyn', 'Wągrowiec',
    ],
  },
  {
    id: 'pkm1', badge: 'PKM1', name: 'Kościan – Poznań Gł. – Gniezno', color: '#3A76C2',
    path: ['koscian', 'lubon', 'poz', 'wsch', 'b_gol1', 'b_mog', 'pobiedz', 'gniezno'],
    stations: [
      'Kościan', 'Oborzyska Stare', 'Czempiń', 'Iłowiec', 'Drużyna Poznańska', 'Mosina', 'Puszczykówko', 'Puszczykowo', ...[...POZ_LUBON].reverse(),
      ...POZ_WSCH.slice(1), 'Ligowiec', 'Kobylnica', 'Biskupice Wielkopolskie', 'Promno', 'Pobiedziska Letnisko', 'Pobiedziska', 'Lednogóra', 'Fałkowo',
      'Pierzyska', 'Gniezno',
    ],
  },
  {
    id: 'pkm2', badge: 'PKM2', name: 'Nowy Tomyśl – Poznań Gł. – Września', color: '#EA1A35',
    path: ['nt', 'b_zb1', 'buk', 'poz', 'wsch', 'b_gol1', 'b_mog', 'wrzesnia'],
    stations: [
      'Nowy Tomyśl', 'Sątopy', 'Porażyn', 'Opalenica', 'Wojnowice Wielkopolskie', 'Buk', 'Otusz', 'Dopiewo', 'Palędzie', 'Poznań Junikowo', 'Poznań Górczyn',
      ...POZ_WSCH, 'Poznań Antoninek', 'Swarzędz', 'Paczkowo', 'Kostrzyn Wielkopolski', 'Gułtowy', 'Nekla', 'Podstolice', 'Września',
    ],
  },
]

/** Granica województwa wielkopolskiego (PRG) przekształcona na współrzędne schematu: rzeczywiste położenie każdej stacji z rozkładu
 *  trafia w jej miejsce na schemacie (funkcja sklejana cienkiej płyty), więc stacje leżą po tej samej stronie granicy co w terenie. */
export const REGION =
  'M440 -24 L446 -31 L453 -32 L453 -27 L450 -23 L450 -20 L453 -17 L453 -12 L457 -5 L456 -1 L457 4 L456 7 L460 8 L463 6 L468 8 L468 13 L465 15 L468 19 L472 21 L480 20 L487 13 L503 20 L505 19 L522 20 L527 18 L530 19 L533 23 L536 23 L534 27 L538 27 L538 31 L543 34 L546 32 L551 33 L552 34 L548 42 L539 48 L534 54 L524 59 L523 66 L520 69 L509 74 L510 78 L514 81 L526 86 L528 85 L532 92 L532 95 L537 99 L539 105 L541 107 L545 106 L548 111 L544 116 L545 118 L541 121 L541 124 L538 126 L529 127 L519 130 L518 132 L522 136 L519 142 L518 146 L521 148 L518 151 L532 153 L530 157 L522 159 L524 163 L523 172 L517 176 L514 176 L517 185 L519 187 L520 194 L515 195 L513 202 L518 203 L519 208 L533 205 L539 201 L544 202 L556 203 L563 200 L565 202 L569 200 L567 203 L569 206 L570 211 L568 213 L567 216 L542 241 L571 214 L565 221 L571 217 L568 227 L578 216 L575 216 L579 212 L581 211 L581 213 L582 214 L585 210 L587 211 L590 215 L595 216 L598 224 L596 232 L599 236 L604 239 L604 243 L607 244 L610 248 L613 246 L613 260 L615 261 L615 255 L620 257 L627 267 L628 263 L635 265 L638 273 L635 275 L635 281 L639 286 L642 286 L643 291 L646 294 L650 293 L661 301 L661 309 L666 312 L672 312 L676 316 L682 309 L693 302 L692 295 L694 293 L703 301 L702 313 L705 323 L705 326 L714 331 L714 328 L724 332 L723 325 L725 325 L729 321 L737 325 L743 333 L745 333 L749 342 L754 344 L756 344 L758 347 L768 351 L772 363 L776 363 L779 372 L785 372 L791 380 L792 382 L797 387 L800 396 L805 396 L806 393 L811 390 L816 393 L820 391 L822 387 L830 386 L829 381 L833 381 L830 374 L835 377 L838 382 L842 382 L844 387 L842 388 L851 392 L850 395 L855 398 L859 398 L859 403 L857 403 L858 409 L860 410 L859 418 L861 417 L869 418 L869 420 L870 427 L867 428 L870 438 L869 440 L865 436 L860 435 L851 437 L850 440 L846 439 L845 443 L846 455 L848 459 L852 462 L853 461 L855 464 L855 468 L853 469 L854 477 L848 476 L845 473 L841 476 L842 479 L841 481 L838 480 L835 482 L831 480 L828 476 L825 481 L829 494 L835 505 L833 508 L837 514 L838 518 L836 518 L838 522 L839 520 L842 530 L846 532 L845 543 L845 554 L842 557 L844 562 L844 572 L839 573 L838 571 L837 573 L835 572 L832 569 L827 573 L825 579 L822 577 L821 573 L817 577 L818 589 L816 588 L815 590 L817 599 L817 601 L813 605 L817 611 L815 619 L816 621 L813 626 L812 633 L804 643 L800 650 L803 650 L799 656 L796 658 L796 661 L790 668 L794 666 L781 688 L780 691 L780 694 L774 710 L769 716 L759 734 L754 740 L750 738 L744 738 L741 734 L731 742 L734 744 L733 748 L728 758 L722 765 L715 765 L711 771 L708 779 L705 781 L700 780 L693 786 L697 789 L695 797 L697 804 L693 818 L691 821 L692 823 L689 828 L688 833 L693 827 L694 830 L696 830 L698 824 L701 825 L695 842 L695 844 L693 853 L688 859 L684 870 L686 870 L680 880 L672 884 L666 891 L664 891 L663 887 L658 896 L648 905 L621 916 L616 915 L612 918 L607 920 L603 915 L593 914 L594 906 L601 902 L612 887 L613 879 L610 877 L605 880 L597 877 L594 870 L596 861 L595 858 L597 852 L605 838 L611 833 L610 829 L613 827 L609 824 L612 818 L608 817 L608 815 L603 816 L603 814 L607 811 L611 806 L615 805 L619 800 L623 799 L626 796 L625 794 L619 793 L616 795 L615 799 L609 803 L601 799 L597 802 L592 799 L586 801 L583 800 L577 805 L564 807 L559 805 L555 802 L562 797 L562 794 L555 787 L559 785 L557 782 L560 779 L559 773 L564 769 L578 769 L587 765 L591 757 L593 749 L589 747 L590 740 L577 738 L578 731 L568 725 L563 721 L543 714 L528 705 L496 678 L454 656 L442 658 L430 656 L426 668 L429 677 L426 682 L427 693 L415 688 L406 690 L385 688 L379 681 L359 685 L360 692 L355 693 L350 690 L339 692 L333 694 L323 694 L322 697 L315 698 L313 693 L303 695 L299 693 L294 683 L291 683 L278 687 L272 692 L268 693 L267 690 L263 691 L266 685 L261 686 L263 682 L271 673 L248 688 L251 684 L245 687 L246 684 L251 675 L260 668 L267 659 L264 657 L264 652 L268 642 L272 635 L271 632 L266 636 L263 637 L261 636 L265 627 L259 634 L262 627 L251 636 L246 638 L241 643 L238 642 L241 633 L240 625 L242 614 L239 614 L241 609 L234 597 L237 590 L231 588 L223 583 L221 587 L216 585 L212 601 L209 606 L206 605 L202 597 L196 599 L187 593 L173 594 L173 590 L181 576 L176 573 L177 566 L174 562 L179 560 L177 550 L171 542 L163 541 L140 553 L111 555 L104 549 L87 550 L77 543 L73 537 L88 534 L83 529 L90 527 L78 526 L77 524 L67 523 L66 522 L56 522 L47 528 L40 527 L34 525 L29 526 L27 522 L26 519 L51 513 L77 504 L68 501 L76 499 L90 491 L91 484 L109 478 L115 468 L118 458 L131 452 L137 447 L131 437 L132 429 L124 418 L123 412 L118 402 L118 396 L116 390 L118 382 L116 376 L109 377 L107 375 L102 376 L97 369 L94 366 L91 360 L98 355 L99 357 L98 361 L102 362 L110 356 L110 354 L114 350 L114 334 L112 328 L107 324 L115 317 L112 312 L111 313 L114 308 L110 303 L110 300 L116 294 L111 294 L117 287 L126 284 L128 281 L129 273 L139 273 L157 269 L168 265 L171 261 L172 250 L174 249 L175 244 L168 242 L166 239 L169 230 L173 228 L174 232 L180 227 L179 222 L182 222 L184 220 L184 208 L180 199 L181 192 L178 180 L174 169 L172 159 L171 147 L172 130 L178 129 L180 127 L182 128 L182 131 L184 131 L197 116 L211 110 L217 110 L219 113 L225 113 L232 111 L255 107 L258 99 L263 100 L270 98 L276 99 L282 95 L282 93 L285 92 L290 98 L294 97 L297 99 L301 97 L308 98 L309 100 L313 102 L314 100 L320 98 L325 93 L326 91 L330 91 L334 89 L339 90 L342 93 L341 96 L343 100 L350 98 L351 94 L348 93 L355 86 L360 82 L363 82 L367 80 L376 80 L371 75 L371 71 L367 69 L362 58 L355 57 L352 52 L349 52 L344 43 L342 45 L337 38 L332 36 L333 33 L332 30 L331 14 L330 11 L337 4 L344 11 L354 11 L366 14 L367 12 L380 15 L396 7 L399 8 L402 5 L404 -1 L406 -4 L407 -8 L410 -7 L412 -10 L412 -13 L419 -24 L419 -26 L433 -26 L434 -30 L437 -30 L439 -24Z'

/** Odstęp osi linii biegnących obok siebie. */
export const GAP = 6

type Pt = { x: number; y: number }
/** punkt osi linii; stop = w miejscu stacji (łagodniejsze zaokrąglenie, żeby linia przechodziła przez znacznik) */
type LinePt = Pt & { stop?: boolean }

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const unit = (v: Pt): Pt => {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}
const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Kierunek odcinka niezależny od kierunku przejazdu (w prawo, a pionowo w dół) — wspólny układ odniesienia dla wszystkich linii. */
function canonicalDir(a: Pt, b: Pt): Pt {
  const d = unit(sub(b, a))
  return d.x > 1e-9 || (Math.abs(d.x) <= 1e-9 && d.y > 0) ? d : { x: -d.x, y: -d.y }
}

/** Przesunięcie każdej linii względem osi odcinka: odcinek → linia → px. */
export type Offsets = Map<string, Map<string, number>>

const parallel = (a: Pt, b: Pt) => Math.abs(a.x * b.y - a.y * b.x) < 1e-6

/**
 * Tory linii na wspólnych odcinkach. Odcinki leżące w jednej prostej, przez które linia przejeżdża na wprost, tworzą ciąg
 * i linia ma w nim stały tor — przy rozejściu się wiązki pozostałe linie jadą dalej prosto, bez uskoków. Na osi (tor 0)
 * leży linia biegnąca przez ciąg najdalej, pozostałe obok niej w kolejności z listy.
 */
export function edgeOffsets(lines: SchemeLine[], nodes = NODES): Offsets {
  const dir = (key: string) => {
    const [a, b] = key.split('|')
    return canonicalDir(nodes[a], nodes[b])
  }
  const loads = new Map<string, string[]>()
  const parent = new Map<string, string>()
  const find = (k: string): string => {
    const p = parent.get(k) ?? k
    if (p === k) return k
    const root = find(p)
    parent.set(k, root)
    return root
  }
  for (const line of lines) {
    for (let i = 1; i < line.path.length; i++) {
      const key = edgeKey(line.path[i - 1], line.path[i])
      const list = loads.get(key) ?? []
      if (!list.includes(line.id)) list.push(line.id)
      loads.set(key, list)
      if (i > 1) {
        const prev = edgeKey(line.path[i - 2], line.path[i - 1])
        if (parallel(dir(prev), dir(key))) parent.set(find(prev), find(key))
      }
    }
  }
  const chains = new Map<string, string[]>()
  for (const key of loads.keys()) chains.set(find(key), [...(chains.get(find(key)) ?? []), key])
  const out: Offsets = new Map()
  for (const keys of chains.values()) {
    const ids = lines.map((l) => l.id).filter((id) => keys.some((k) => loads.get(k)!.includes(id)))
    const cover = ids.map((id) => keys.filter((k) => loads.get(k)!.includes(id)).length)
    const longest = ids.map((_, i) => i).filter((i) => cover[i] === Math.max(...cover))
    const zero = longest.reduce((sum, i) => sum + i, 0) / longest.length
    for (const k of keys) out.set(k, new Map(loads.get(k)!.map((id) => [id, (ids.indexOf(id) - zero) * GAP])))
  }
  return out
}

/** Punkty osi linii przesuniętej równolegle na wspólnych odcinkach (połączenia ukośne liczone jako przecięcie przesuniętych prostych). */
export function linePoints(line: SchemeLine, offsets: Offsets, nodes = NODES): LinePt[] {
  const pts = line.path.map((id) => nodes[id])
  const segs = pts.slice(1).map((b, i) => {
    const a = pts[i]
    const off = offsets.get(edgeKey(line.path[i], line.path[i + 1]))?.get(line.id) ?? 0
    const d = canonicalDir(a, b)
    const n = { x: -d.y, y: d.x }
    return { a: { x: a.x + n.x * off, y: a.y + n.y * off }, b: { x: b.x + n.x * off, y: b.y + n.y * off }, d: unit(sub(b, a)) }
  })
  const out: LinePt[] = [segs[0].a]
  for (let i = 1; i < segs.length; i++) {
    const p = segs[i - 1]
    const q = segs[i]
    const stop = !!nodes[line.path[i]].name
    const cross = p.d.x * q.d.y - p.d.y * q.d.x
    if (Math.abs(cross) < 1e-6) {
      // odcinki współliniowe z innym torem (rzadkie) — krótkie przejście
      out.push({ ...p.b, stop })
      if (Math.hypot(p.b.x - q.a.x, p.b.y - q.a.y) > 0.01) out.push({ ...q.a, stop })
      continue
    }
    const t = ((q.a.x - p.a.x) * q.d.y - (q.a.y - p.a.y) * q.d.x) / cross
    out.push({ x: p.a.x + p.d.x * t, y: p.a.y + p.d.y * t, stop })
  }
  out.push(segs[segs.length - 1].b)
  return out
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Ścieżka SVG z zaokrąglonymi załamaniami (na stacjach ciaśniej). */
export function roundedPath(pts: LinePt[], radius = 16, stopRadius = 5): string {
  if (pts.length < 2) return ''
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const next = pts[i + 1]
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y)
    const r = Math.min(cur.stop ? stopRadius : radius, inLen / 2, outLen / 2)
    const a = unit(sub(cur, prev))
    const b = unit(sub(next, cur))
    d += ` L${r1(cur.x - a.x * r)} ${r1(cur.y - a.y * r)} Q${r1(cur.x)} ${r1(cur.y)} ${r1(cur.x + b.x * r)} ${r1(cur.y + b.y * r)}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${r1(last.x)} ${r1(last.y)}`
}

export interface StationMarker {
  id: string
  x: number
  y: number
  /** liczba linii w najszerszej wiązce przy stacji */
  width: number
  /** odległość skrajnych torów tej wiązki (px) */
  span: number
  /** kąt osi znacznika (prostopadle do najszerszej wiązki), w stopniach */
  angle: number
  terminal: boolean
}

/** Znaczniki stacji: kółko albo „pigułka” w poprzek najszerszej wiązki, ustawione na torach linii. */
export function stationMarkers(lines: SchemeLine[], offsets: Offsets, nodes = NODES): StationMarker[] {
  const ends = new Set(lines.flatMap((l) => [l.path[0], l.path[l.path.length - 1]]))
  const used = new Set(lines.flatMap((l) => l.path))
  return Object.entries(nodes)
    .filter(([id, n]) => n.name && used.has(id))
    .map(([id, n]) => {
      let best: { offs: number[]; d: Pt } | null = null
      for (const [key, map] of offsets) {
        const [a, b] = key.split('|')
        if ((a !== id && b !== id) || (best && map.size <= best.offs.length)) continue
        best = { offs: [...map.values()], d: canonicalDir(nodes[a], nodes[b]) }
      }
      const offs = best?.offs ?? [0]
      const d = best?.d ?? { x: 1, y: 0 }
      const lo = Math.min(...offs)
      const hi = Math.max(...offs)
      const mid = (lo + hi) / 2
      return {
        id, x: n.x - d.y * mid, y: n.y + d.x * mid, width: offs.length, span: hi - lo,
        angle: (Math.atan2(d.y, d.x) * 180) / Math.PI + 90, terminal: ends.has(id),
      }
    })
}

/** Linie przejeżdżające przez stację (wg pełnych list stacji). */
export function linesAt(name: string, lines: SchemeLine[]) {
  return lines.filter((l) => l.stations.includes(name))
}
