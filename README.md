# Proofread API

[Русский](#русский) · [English](#english)

## Русский

Расширение для браузеров на Chromium (Chrome, Edge, Brave, Opera, Яндекс Браузер). Выдели текст, и расширение исправит ошибки и пунктуацию, перескажет другими словами, улучшит стиль или переведёт на русский. Ответы приходят от любого чат-API, совместимого с OpenAI. Сервер по умолчанию: tooken.club, модель `gpt-6-luna`. Интерфейс на русском.

### Установка
1. Скачай `proofread-api-<версия>.zip` из раздела Releases и распакуй. Получится папка `proofread-api`. Положи её туда, где она будет лежать постоянно: путь к папке определяет «личность» расширения, и обновления кладутся в ту же папку.
2. Открой `chrome://extensions` (`edge://extensions`, `browser://extensions` в Яндекс Браузере), включи «Режим разработчика», нажми «Загрузить распакованное» и выбери папку `proofread-api`.
3. Настройки откроются сами: вставь API-ключ и нажми «Сохранить». Список моделей подгрузится с сервера, и это заодно подтвердит, что ключ рабочий.

### Как пользоваться
Выдели текст, над ним появится панель:
- «Редактировать»: «Исправить ошибки» (Alt+R), «Другими словами» (Alt+U), «Улучшить стиль» (Alt+Y), «Открыть в редакторе» (Alt+O)
- «Перевести» (Alt+T), поиск, копирование, закрыть

Горячие клавиши работают, пока текст выделен, в том числе в русской раскладке. В карточке результата есть «Заменить текст» (внутри поля ввода), «Обновить» (запросить заново) и копирование. После «Исправить ошибки» изменённые слова подсвечены.

Выделенный текст отправляется на сервер, указанный в настройках. Поля паролей расширение не читает.

### Обновление
1. Замени файлы в папке `proofread-api` содержимым новой папки из архива.
2. На `chrome://extensions` нажми кнопку перезагрузки на карточке расширения, затем обнови открытые вкладки.

Настройки сохранятся, пока папка остаётся той же.

## English

A browser extension for Chromium browsers (Chrome, Edge, Brave, Opera, Yandex Browser). Select text and it fixes spelling and punctuation, rephrases, improves the style or translates to Russian. The answers come from any OpenAI-compatible chat API; the default server is tooken.club with the model `gpt-6-luna`. The interface is in Russian.

### Install
1. Download `proofread-api-<version>.zip` from Releases and extract it. You get a folder named `proofread-api`. Put it where it can stay: the folder's path is the extension's identity, and updates go into the same folder.
2. Open `chrome://extensions` (`edge://extensions`, `browser://extensions` in Yandex Browser), turn on Developer mode, press «Загрузить распакованное» (Load unpacked) and pick the `proofread-api` folder.
3. The settings open by themselves: paste your API key and press «Сохранить» (Save). The model list loads from the server, which also confirms the key.

### Use
Select text and a toolbar appears above it:
- «Редактировать» (Edit): «Исправить ошибки» (fix errors, Alt+R), «Другими словами» (rephrase, Alt+U), «Улучшить стиль» (improve style, Alt+Y), «Открыть в редакторе» (open in the editor, Alt+O)
- «Перевести» (translate, Alt+T), search, copy, close

The hotkeys work while text is selected, in the Russian layout too. The result card under the selection has «Заменить текст» (replace text, inside a text field), «Обновить» (ask again) and copy. Changed words are highlighted after «Исправить ошибки».

The selected text is sent to the server set in the settings. Password fields are never read.

### Update
1. Replace the files in your `proofread-api` folder with the contents of the new folder from the zip.
2. On `chrome://extensions` press the reload button on the extension's card, then reload the open tabs.

The settings are kept as long as the folder stays the same.
