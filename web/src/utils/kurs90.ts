/**
 * Kody stacji z systemu sprzedaży KURS'90 (np. Poznań Główny = 159) — cicha funkcja wyszukiwarki:
 * wpisanie kodu w pole stacji podpowiada stację. Nigdzie nie wyświetlamy kodów.
 * Źródło: lista „Oznaczenia stacji w systemie Kurs'90” na stronie użytkownika Wikipedii Upior polnocy
 * (pl.wikipedia.org/wiki/Wikipedysta:Upior_polnocy/Kurs90, CC BY-SA 4.0), dopasowana do stacji z rozkładu.
 * Nowe przystanki (np. Czerwonak Osiedle, Wronki Zamość) nie mają kodu na liście.
 */
export const KURS90: Record<string, string> = {
  '46011': '7021', // Antonin
  '28936': '7024', // Baborówko
  '33217': '7025', // Barłogi
  '26336': '7026', // Belęcin Wielkopolski
  '44040': '7028', // Biadki
  '14530': '8033', // Biała Pilska
  '29231': '8043', // Biernatowo
  '44883': '7034', // Biniew
  '30973': '7036', // Biskupice Wielkopolskie
  '44511': '7044', // Bojanowo
  '29868': '7045', // Bolechowo
  '43356': '7051', // Boszkowo
  '46250': '7052', // Bożacin
  '44867': '7054', // Bronów
  '33175': '7061', // Budki Nowe
  '16162': '7062', // Budzyń
  '27235': '7063', // Buk
  '43331': '7038', // Błotnica
  '28696': '7073', // Chludowo
  '30288': '7074', // Chocicza
  '16188': '17', // Chodzież
  '26187': '7077', // Chrośnica
  '44792': '7079', // Chwalibogowo
  '33365': '7084', // Cienin
  '33373': '7085', // Cienin Kościelny
  '45971': '7095', // Czekanów
  '44156': '7096', // Czeluścin
  '43448': '503', // Czempiń
  '30890': '7097', // Czerniejewo
  '29843': '7098', // Czerwonak
  '44081': '7099', // Daniszyn
  '45468': '7107', // Domanin
  '27268': '7108', // Dopiewo
  '29017': '7109', // Drawski Młyn
  '30460': '7112', // Drużyna Poznańska
  '43059': '7116', // Drzymałowo
  '14431': '8111', // Dziembówko
  '44115': '7119', // Dzierżanów Wielkopolski
  '42796': '7121', // Dzięczyn
  '30940': '7123', // Fałkowo
  '30809': '45', // Gniezno
  '46235': '7140', // Golina
  '28688': '7139', // Golęczewo
  '44057': '7144', // Gorzupia
  '31369': '7141', // Gołańcz
  '43125': '7158', // Granowo
  '43091': '7159', // Grodzisk Wielkopolski
  '31344': '7160', // Grylewo
  '30072': '7164', // Gutowo Wielkopolskie
  '30148': '7163', // Gułtowy
  '42655': '7153', // Górka Duchowna
  '30239': '7127', // Gądki
  '30874': '7129', // Gębarzewo
  '42200': '44', // Głogów
  '42499': '6119', // Głogówko
  '30478': '7166', // Iłowiec
  '32060': '7168', // Jankowo Dolne
  '45989': '7169', // Janków Przygodzki
  '44701': '56', // Jarocin
  '26195': '7173', // Jastrzębsko
  '42861': '7178', // Kaczkowo
  '45245': '65', // Kalisz
  '45278': '7179', // Kalisz Szczypiorno
  '45294': '7180', // Kalisz Winiary
  '42820': '7182', // Karzec
  '33332': '7183', // Kawnice
  '30668': '7189', // Kiekrz
  '31336': '7196', // Kobylec
  '44131': '7197', // Kobylin
  '31021': '7198', // Kobylnica
  '178639': '1205', // Kolumna
  '33100': '79', // Konin
  '30064': '7211', // Kostrzyn Wielkopolski
  '44834': '7212', // Kotlin
  '33191': '77', // Koło
  '43406': '82', // Kościan
  '46201': '7216', // Koźmin Wielkopolski
  '33159': '7218', // Kramsk
  '42838': '7220', // Krobia
  '44008': '88', // Krotoszyn
  '32227': '1224', // Krzewie
  '42960': '7227', // Krzycko Wielkie
  '29108': '90', // Krzyż
  '44784': '7230', // Książno
  '44123': '7231', // Kuklinów
  '32201': '94', // Kutno
  '30247': '7217', // Kórnik
  '42697': '7186', // Kąkolewo
  '45401': '903', // Kępno
  '32250': '1200', // Kłodawa
  '31351': '7237', // Laskownica
  '42879': '7238', // Lasocice
  '30957': '7240', // Lednogóra
  '42606': '100', // Leszno
  '42754': '7242', // Leszno Grzybowo
  '31039': '7246', // Ligowiec
  '42648': '7253', // Lipno Nowe
  '30403': '7259', // Luboń koło Poznania
  '30916': '7276', // Marzenin
  '28993': '7278', // Miały
  '44735': '7281', // Mieszków
  '16196': '7287', // Milcz
  '44776': '7288', // Miłosław
  '32003': '126', // Mogilno
  '28985': '7290', // Mokrz
  '30452': '7291', // Mosina
  '29876': '7296', // Murowana Goślina
  '30049': '7299', // Nekla
  '45526': '7302', // Niedźwiedź Wielkopolski
  '43299': '7310', // Nowawieś Mochy
  '32235': '1307', // Nowe Kutnowskie
  '45203': '7313', // Nowe Skalmierzyce
  '43281': '7316', // Nowy Solec
  '26211': '7317', // Nowy Tomyśl
  '43273': '7318', // Nowy Widzim
  '29603': '7320', // Oborniki Wielkopolskie
  '29645': '7321', // Oborniki Wielkopolskie Miasto
  '43430': '7322', // Oborzyska Stare
  '46227': '7323', // Obra Stara
  '45229': '7325', // Ociąż
  '46052': '7327', // Odolanów
  '27201': '7330', // Opalenica
  '45310': '7331', // Opatówek
  '44768': '7333', // Orzechowo
  '45476': '7338', // Ostrzeszów
  '45906': '145', // Ostrów Wielkopolski
  '45963': '7336', // Ostrów Wielkopolski Gorzyce
  '16170': '7337', // Ostrówki koło Chodzieży
  '30080': '7341', // Otoczna
  '27250': '7342', // Otusz
  '29850': '7344', // Owińska
  '46581': '148', // Pabianice
  '28498': '7345', // Paczkowo
  '28753': '7347', // Palędzie
  '28944': '7348', // Pamiątkowo
  '29637': '7352', // Parkowo
  '33142': '7353', // Patrzyków
  '42770': '7354', // Pawłowice
  '43323': '7359', // Perkowo
  '30221': '7365', // Pierzchno
  '30932': '7366', // Pierzyska
  '14407': '151', // Piła Główna
  '14456': '8271', // Piła Kalina
  '44842': '155', // Pleszew
  '30965': '7371', // Pobiedziska
  '30981': '7372', // Pobiedziska Letnisko
  '30031': '7373', // Podstolice
  '42788': '7379', // Poniec
  '26245': '7383', // Porażyn
  '28464': '7385', // Poznań Antoninek
  '30585': '7386', // Poznań Dębiec
  '28555': '7387', // Poznań Dębina
  '29892': '7389', // Poznań Garbary
  '28720': '7390', // Poznań Górczyn
  '30601': '159', // Poznań Główny
  '28738': '7391', // Poznań Junikowo
  '29835': '7392', // Poznań Karolin
  '28563': '7394', // Poznań Krzesiny
  '28654': '7396', // Poznań Podolany
  '28522': '513', // Poznań Starołęka
  '30643': '7397', // Poznań Strzeszyn
  '30650': '7398', // Poznań Wola
  '29801': '514', // Poznań Wschód
  '30999': '7401', // Promno
  '46003': '7407', // Przygodzice
  '31468': '7409', // Przysieczyn
  '42689': '7410', // Przysieka Stara
  '43075': '7413', // Ptaszkowo
  '30411': '7414', // Puszczykowo
  '30429': '7415', // Puszczykówko
  '28951': '7361', // Pęckowo
  '44164': '7362', // Pępowo
  '44727': '7419', // Radlin Wielkopolski
  '43042': '7424', // Rakoniewice
  '44305': '171', // Rawicz
  '16139': '517', // Rogoźno Wielkopolskie
  '30676': '7428', // Rokietnica
  '43026': '7431', // Rostarzewo
  '31476': '7432', // Roszkowo Wągrowieckie
  '29652': '7433', // Rożnowo
  '43067': '7434', // Ruchocice
  '42853': '7439', // Rydzyna
  '29249': '8327', // Siedlisko Czarnkowskie
  '19489': '183', // Sieradz
  '31252': '518', // Skoki
  '16154': '7463', // Sokołowo Budzyńskie
  '30270': '7464', // Solec Wielkopolski
  '33324': '7466', // Spławie
  '42671': '7469', // Stare Bojanowo
  '42937': '7470', // Stare Drzewce
  '43349': '7472', // Starkowo
  '26286': '7475', // Stefanowo
  '14522': '8361', // Stobno
  '43133': '7482', // Strykowo Poznańskie
  '30114': '7483', // Strzałkowo
  '30536': '7477', // Stęszew
  '30262': '7487', // Sulęcinek
  '28472': '521', // Swarzędz
  '28803': '199', // Szamotuły
  '30486': '7497', // Szreniawa
  '26237': '7443', // Sątopy
  '31203': '7453', // Sława Wielkopolska
  '30122': '7457', // Słupca
  '45724': '7458', // Słupia
  '44859': '7503', // Taczanów
  '46045': '7504', // Tarchały Wielkie
  '16147': '7505', // Tarnowo Rogozińskie
  '46037': '7508', // Topola-Osiedle
  '14548': '8409', // Trzcianka
  '30510': '7512', // Trzebaw Rosnówko
  '32078': '5655', // Trzemeszno
  '26344': '7519', // Tuchorza
  '32243': '1466', // Turzynów
  '43034': '7507', // Tłoki
  '28670': '7524', // Wargowo
  '29223': '8435', // Wieleń
  '42952': '7537', // Wilkowice
  '30494': '7539', // Wiry
  '44826': '7540', // Witaszyce
  '27243': '7545', // Wojnowice Wielkopolskie
  '46243': '7546', // Wolenice
  '43000': '524', // Wolsztyn
  '43265': '7548', // Wroniawy
  '28969': '249', // Wronki
  '30007': '250', // Września
  '42887': '7551', // Wschowa
  '32045': '5706', // Wydartowo
  '30098': '7547', // Wólka
  '31302': '233', // Wągrowiec
  '44172': '7542', // Włostowo
  '42978': '7543', // Włoszakowice
  '26104': '259', // Zbąszynek
  '26146': '7559', // Zbąszyń
  '26153': '7560', // Zbąszyń Przedmieście
  '19430': '260', // Zduńska Wola
  '242219': '7564', // Zielone Wzgórza
  '28647': '7565', // Złotniki
  '46649': '1248', // Łask
  '29884': '7268', // Łopuchowo
  '46706': '113', // Łódź Kaliska
  '44073': '7263', // Łąkociny
  '45732': '7265', // Łęka Opatowska
  '30205': '212', // Środa Wielkopolska
  '44750': '7568', // Żerków
  '30882': '7570', // Żydowo
}

const byCode = new Map(Object.entries(KURS90).map(([id, code]) => [code, id]))

/** Identyfikator stacji dla kodu KURS'90 (sam numer, bez spacji) albo undefined. */
export const stationByKurs90 = (query: string) => byCode.get(query.trim())
