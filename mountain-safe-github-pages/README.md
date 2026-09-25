# Mountain Safe (GitHub Pages)

Статическая версия сайта. Все файлы уже лежат в корне: `index.html` рядом с папками `css`, `js`, `fonts`, `vendor`, `icons`.

## Как опубликовать
1. Создайте репозиторий на GitHub и загрузите **содержимое этой папки** в корень (не саму папку внутри папки).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: **main**, папка **/(root)** → Save.
3. Через 1–2 минуты сайт откроется по адресу `https://ВАШ-ЛОГИН.github.io/ИМЯ-РЕПОЗИТОРИЯ/`.

Работает: приложение, SOS, Stress Mode, офлайн (Service Worker), GPS, погода, карта, GPX.
Не работает: онлайн-группы (нужен Node-сервер, см. основной проект). Локальная группа работает.
