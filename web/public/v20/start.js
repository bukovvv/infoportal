// Testowa wersja 2.0 tylko dla administratora: makietę podaje /api/admin/v20 (tam dociera ciasteczko sesji panelu).
// shortcut: plik bez skrótu w nazwie, a .htaccess daje *.js cache na rok — przy zmianie zmienić nazwę.
fetch('/api/admin/session', { credentials: 'same-origin' })
  .then((r) => r.json())
  .then((s) => {
    if (!s.loggedIn) throw new Error('brak sesji')
    const frame = document.createElement('iframe')
    frame.src = '/api/admin/v20/index.html' + location.hash // adres 2.0 (#/pociag/…) z paska przeglądarki
    frame.title = 'zanimwyjdziesz.pl 2.0'
    document.body.append(frame)
  })
  .catch(() => location.replace('/admin'))
