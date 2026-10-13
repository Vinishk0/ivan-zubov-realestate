# Стоковые материалы макета

Портрет, изображения в демонстрационных кейсах и фоновое видео используются как иллюстрации концепции. Они не изображают Ивана Зубова или его реальные сделки. Фотографии районов Москвы реальные; их источники и лицензии перечислены ниже.

## Видео

- Mixkit: [Flying slowly over a big city](https://mixkit.co/free-stock-video/flying-slowly-over-a-big-city-49806/), ролик 49806, исходник Full HD 1920×1080. [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree). Локальный файл `assets/hero.mp4`.
- Исходник: https://assets.mixkit.co/videos/49806/49806-1080.mp4. Сжат в H.264, CRF 19, preset slow, без звука, faststart. Разрешение сохранено; итоговый видеопоток около 10 Мбит/с вместо прежних 2,6 Мбит/с. Это исходное Full HD, не апскейл.
- `hero.jpg` — кадр на второй секунде того же исходного Full HD-видео.

## Фото

Источник — Unsplash, [лицензия](https://unsplash.com/license). Локальные файлы:

- `portrait.jpg` — CDN: photo-1560250097-0b93528c311a (стоковый портрет, не Иван).
- `living.jpg` — CDN: photo-1600210492486-724fe5c67fb0.
- `interior.jpg` — CDN: photo-1600607687920-4e2a09cf159d.
- `architecture.jpg` — CDN: photo-1600585154340-be6161a56a0c.
- `city.jpg` — CDN: photo-1511818966892-d7d671e672a2.

## Шрифты

Manrope и Cormorant Garamond из Google Fonts. Файлы загружены локально: сайт не обращается к Google при просмотре. Лицензия SIL Open Font License; исходные семейства: https://github.com/sharanda/manrope и https://github.com/CatharsisFonts/Cormorant.

`tools/download-assets.mjs` документирует точные URL загрузки. Он не запускается при обычном просмотре сайта.

## Реальная карта Москвы

Leaflet 1.9.4 сохранён локально в `assets/vendor/`; лицензия BSD-2-Clause — `Leaflet-LICENSE.txt`. Картографическая подложка: [OpenStreetMap](https://www.openstreetmap.org/copyright), стандартный источник `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Атрибуция видна на карте, загрузка и кэширование выполняются обычным браузером. Для подложки требуется интернет; фотографии и границы районов хранятся локально.

Границы в `assets/districts/boundaries.geojson` получены через Nominatim из OpenStreetMap 13 октября 2026 года. Лицензия данных: [ODbL](https://www.openstreetmap.org/copyright). Это данные OSM, а не юридическое определение административных границ. Использованы отношения:

- [Хамовники — 1255987](https://www.openstreetmap.org/relation/1255987).
- [Пресненский район — 1275551](https://www.openstreetmap.org/relation/1275551).
- [Раменки — 446115](https://www.openstreetmap.org/relation/446115).
- [Замоскворечье — 1255942](https://www.openstreetmap.org/relation/1255942).
- [Сокол — 445280](https://www.openstreetmap.org/relation/445280).

## Фотографии районов

Файлы в `assets/districts/` — реальные фотографии мест в соответствующих районах. Автор, источник и лицензия показаны рядом с фотографией. На странице используются CSS-кадрирование и выбор положения кадра; сами файлы не ретушировались.

| Файл | Место и источник | Автор | Лицензия |
| --- | --- | --- | --- |
| `khamovniki.jpg` | [Новодевичий монастырь](https://commons.wikimedia.org/wiki/File:Novodevichy_Convent_Night.jpg) | Anton Zelenov | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `presnya.jpg` | [Панорама Москва-Сити с Воробьёвых гор](https://commons.wikimedia.org/wiki/File:Moscow._View_of_Moscow-City_from_Sparrow_Hills_P4131826_2600.jpg) | Alexxx1979 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `ramenki.jpg` | [Главное здание МГУ](https://commons.wikimedia.org/wiki/File:Moscow_State_University_crop.jpg) | Dmitry A. Mottl; кадрирование King of Hearts | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `zamoskvorechye.jpg` | [Климентовский храм](https://commons.wikimedia.org/wiki/File:Saint_Clement_Church_2016-04-19_2637.jpg) | Mike1979 Russia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `sokol.jpg` | [Улица Поленова, 18](https://commons.wikimedia.org/wiki/File:Polenova_str._18.JPG) | Andreykor | Public domain |

Лицензии относятся к изображениям и данным, а не к исходному коду всего сайта.
