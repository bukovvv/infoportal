/* Stary adres (infoportal.abuczek.pl) → zanimwyjdziesz.pl. Ustawienia z pamięci przeglądarki (kw_*: ulubione stacje,
   motyw, ostatnie wyszukiwanie) są przypisane do adresu, więc jadą w części # adresu (nie trafia do serwera)
   i nowa strona zapisuje je u siebie (utils/migration.ts). */
(function () {
  var data = {}
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i)
      if (key && key.indexOf('kw_') === 0) data[key] = localStorage.getItem(key)
    }
  } catch (e) { /* pamięć przeglądarki niedostępna */ }
  var path = location.hostname === 'zanimwyjdziesz.pl' ? '/' : location.pathname + location.search // bez pętli na nowym adresie
  var target = 'https://zanimwyjdziesz.pl' + path
  target += Object.keys(data).length ? '#kw-przenosiny=' + encodeURIComponent(JSON.stringify(data)) : location.hash
  location.replace(target)
})()
