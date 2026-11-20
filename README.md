# Proofread API

A browser extension for Chromium browsers (Chrome, Edge, Brave, Opera, Yandex Browser). Select text and it fixes spelling and punctuation, rephrases, improves the style or translates to Russian. The answers come from any OpenAI-compatible chat API; the default server is tooken.club with the model `gpt-6-luna`. The interface is in Russian.

## Install
1. Download `proofread-api-<version>.zip` from Releases and extract it into a folder you will keep. The folder's path is the extension's identity: updates go into the same folder.
2. Open `chrome://extensions` (`edge://extensions`, `browser://extensions` in Yandex Browser), turn on Developer mode, press «Загрузить распакованное» and pick the folder.
3. The settings open by themselves: paste your API key and press «Сохранить». The model list loads from the server, which also confirms the key.

## Use
Select text and a toolbar appears above it:
- «Редактировать»: «Исправить ошибки» (Alt+R), «Другими словами» (Alt+U), «Улучшить стиль» (Alt+Y), «Открыть в редакторе» (Alt+O)
- «Перевести» (Alt+T), search, copy, close

The hotkeys work while text is selected, in the Russian layout too. The result card under the selection has «Заменить текст» (inside a text field), «Обновить» (ask again) and copy. Changed words are highlighted after «Исправить ошибки».

The selected text is sent to the server set in the settings. Password fields are never read.

## Update
1. Replace the files in the extension's folder with the new zip's contents.
2. On `chrome://extensions` press the reload button on the extension's card, then reload the open tabs.

The settings are kept as long as the folder stays the same.
