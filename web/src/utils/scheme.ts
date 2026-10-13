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
  wolsztyn: { x: 190, y: 505, name: 'Wolsztyn', label: 'Wolsztyn', at: 'bl', major: true },
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
    id: 'wolsztyn', name: 'Poznań – Wolsztyn', color: '#0B5A86',
    path: ['poz', 'lubon', 'steszew', 'grodzisk', 'wolsztyn'],
    stations: [
      ...POZ_LUBON, 'Wiry', 'Szreniawa', 'Trzebaw Rosnówko', 'Stęszew', 'Strykowo Poznańskie', 'Granowo', 'Kotowo', 'Ptaszkowo', 'Grąblewo',
      'Grodzisk Wielkopolski', 'Ruchocice', 'Drzymałowo', 'Rakoniewice', 'Rostarzewo', 'Tłoki', 'Adamowo', 'Wolsztyn',
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

/** Linie na każdym odcinku schematu, w kolejności z listy. */
export function edgeLoads(lines: SchemeLine[]) {
  const loads = new Map<string, string[]>()
  for (const line of lines) {
    for (let i = 1; i < line.path.length; i++) {
      const key = edgeKey(line.path[i - 1], line.path[i])
      const list = loads.get(key) ?? []
      if (!list.includes(line.id)) list.push(line.id)
      loads.set(key, list)
    }
  }
  return loads
}

/** Punkty osi linii przesuniętej równolegle na wspólnych odcinkach (połączenia ukośne liczone jako przecięcie przesuniętych prostych). */
export function linePoints(line: SchemeLine, loads: Map<string, string[]>, nodes = NODES): LinePt[] {
  const pts = line.path.map((id) => nodes[id])
  const segs = pts.slice(1).map((b, i) => {
    const a = pts[i]
    const ids = loads.get(edgeKey(line.path[i], line.path[i + 1])) ?? [line.id]
    const off = (ids.indexOf(line.id) - (ids.length - 1) / 2) * GAP
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
      // odcinki współliniowe: zmiana liczby linii w wiązce — krótkie przejście na nowy tor
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
  /** kąt osi znacznika (prostopadle do najszerszej wiązki), w stopniach */
  angle: number
  terminal: boolean
}

/** Znaczniki stacji: kółko albo „pigułka” w poprzek wiązki linii. */
export function stationMarkers(lines: SchemeLine[], loads: Map<string, string[]>, nodes = NODES): StationMarker[] {
  const ends = new Set(lines.flatMap((l) => [l.path[0], l.path[l.path.length - 1]]))
  const used = new Set(lines.flatMap((l) => l.path))
  return Object.entries(nodes)
    .filter(([id, n]) => n.name && used.has(id))
    .map(([id, n]) => {
      let width = 1
      let angle = 0
      for (const [key, ids] of loads) {
        const [a, b] = key.split('|')
        if ((a !== id && b !== id) || ids.length < width) continue
        if (ids.length > width || width === 1) {
          const d = canonicalDir(nodes[a], nodes[b])
          width = ids.length
          angle = (Math.atan2(d.y, d.x) * 180) / Math.PI + 90
        }
      }
      return { id, x: n.x, y: n.y, width, angle, terminal: ends.has(id) }
    })
}

/** Linie przejeżdżające przez stację (wg pełnych list stacji). */
export function linesAt(name: string, lines: SchemeLine[]) {
  return lines.filter((l) => l.stations.includes(name))
}
