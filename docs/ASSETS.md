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

Leaflet 1.9.4 сохранён локально в `assets/vendor/`; лицензия BSD-2-Clause — `Leaflet-LICENSE.txt`. Картографическая подложка: [OpenStreetMap](https://www.openstreetmap.org/copyright), стандартный источник `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Атрибуция видна на карте, загрузка и кэширование выполняются обычным браузером. Для подложки требуется интернет; фотографии и границы округов хранятся локально.

Границы в `assets/districts/okrugs.geojson` покрывают 12 административных округов. Все 12 геометрий получены напрямую из OSM API 13 октября 2026 года. Состав — дочерние отношения [Москвы — 102269](https://www.openstreetmap.org/relation/102269). Лицензия данных: [ODbL](https://www.openstreetmap.org/copyright). Это данные OSM, а не юридическое определение административных границ. Идентификатор отношения каждого округа записан в GeoJSON и `okrugs.mjs`; загрузку документирует `tools/prepare-okrugs.mjs`. Данные и лицензия предыдущего варианта с 132 районами сохранены в ветке `codex/all-moscow-districts`, коммит `abcdd61`. Исходные пять фотографий относятся к местам:

- [Хамовники — 1255987](https://www.openstreetmap.org/relation/1255987).
- [Пресненский район — 1275551](https://www.openstreetmap.org/relation/1275551).
- [Раменки — 446115](https://www.openstreetmap.org/relation/446115).
- [Замоскворечье — 1255942](https://www.openstreetmap.org/relation/1255942).
- [Сокол — 445280](https://www.openstreetmap.org/relation/445280).

## Фотографии округов

Каждому из 12 округов назначена отдельная реальная фотография узнаваемого места. Файлы сохранены локально в `assets/districts/`; автор, источник и лицензия показаны в карточке на сайте. Используется только CSS-кадрирование, сами фотографии не ретушировались. Скрипт `tools/download-okrug-photos.mjs` документирует точные имена файлов Wikimedia Commons, проверяет JPEG, разрешение и свободную лицензию, загружает превью шириной 1600 px и обновляет атрибуцию в `okrugs.mjs`.

| Округ | Место и источник | Автор | Лицензия |
| --- | --- | --- | --- |
| ЦАО | [Кремль и Москва-река](https://commons.wikimedia.org/wiki/File:View_to_Moscow_river_from_Bolshoy_Moskvoretsky_Bridge.jpg) | Anton Zelenov | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| САО | [Северный речной вокзал](https://commons.wikimedia.org/wiki/File:20210518_Moscow_North_River_Terminal_01.jpg) | Sergey A. Demidov | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| СВАО | [Главный павильон ВДНХ](https://commons.wikimedia.org/wiki/File:Moscow._Central_pavilion_VDNKh_P5293171_2350.jpg) | Alexxx1979 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| ВАО | [Измайловский кремль](https://commons.wikimedia.org/wiki/File:Moscow._Izmailovo_Kremlin_P5140088_2740.jpg) | Alexxx1979 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| ЮВАО | [Парк Кузьминки](https://commons.wikimedia.org/wiki/File:Moscow,_Kuzminki_Park,_Pond,_Russia.jpg) | Vyacheslav Argenberg | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| ЮАО | [Дворец в Коломенском](https://commons.wikimedia.org/wiki/File:Wooden_Palace_in_Kolomenskoye,_Moscow,_Russia.jpg) | Vyacheslav Argenberg | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| ЮЗАО | [Главное здание МГУ](https://commons.wikimedia.org/wiki/File:Moscow_State_University_crop.jpg) | Dmitry A. Mottl; кадрирование King of Hearts | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| ЗАО | [Парк Победы](https://commons.wikimedia.org/wiki/File:Victory_park_on_Poklonnaya_Hill1.jpg) | mos.ru | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| СЗАО | [Живописный мост](https://commons.wikimedia.org/wiki/File:Zhivopisny_Bridge_(37530309561).jpg) | Paul Grach | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| ЗелАО | [Большой городской пруд](https://commons.wikimedia.org/wiki/File:%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B9_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%BE%D0%B9_%D0%BF%D1%80%D1%83%D0%B4.jpg) | Vsatinet | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| НАО | [Липовый парк в Коммунарке](https://commons.wikimedia.org/wiki/File:Moscow-2011_-_53_%D1%83%D0%BB%D0%B8%D1%86%D0%B0_%D0%90%D0%BB%D0%B5%D0%BA%D1%81%D0%B0%D0%BD%D0%B4%D1%80%D1%8B_%D0%9C%D0%BE%D0%BD%D0%B0%D1%85%D0%BE%D0%B2%D0%BE%D0%B9.jpg) | moskva.pictures | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| ТАО | [Река Десна в Троицке](https://commons.wikimedia.org/wiki/File:Desna_River_in_Troitsk_of_Moscow_Region_01.JPG) | Just | Public domain |

Старые фотографии пяти районов сохранены в каталоге для возможного возврата к версии с выбором районов. Лицензии материалов приведены отдельно от исходного кода сайта. Кэш подготовки данных хранится в игнорируемой папке `artifacts/`; рабочий сайт использует готовые локальные файлы и не обращается к OSM API редактирования.
