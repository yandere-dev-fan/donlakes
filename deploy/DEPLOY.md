# Установка и эксплуатация

Актуальная схема: GitHub `yandere-dev-fan/donlakes` → GitHub Actions → `135.106.164.41`, публичный адрес `https://donozera.ru`, Nginx на портах 80/443. Админка слушает только `127.0.0.1:8787`, снаружи доступна через **Tailscale Serve**, без Funnel.

## Что хранится на сервере

- `/opt/donozera/source` — ссылка на активную версию исходников.
- `/opt/donozera/incoming/` — версии исходников с установленными зависимостями.
- `/opt/donozera/builds/` — временные сборки; удаляются после окончания публикации.
- `/var/www/donozera/releases/<id>/site/` — неизменяемая публичная версия.
- `/var/www/donozera/releases/<id>/content.json` — данные конкретной публикации, вне webroot.
- `/var/www/donozera/current` — активный публичный сайт; переключается атомарно.
- `/var/www/donozera/previous` — предыдущая версия для отката.
- `/var/lib/donozera/draft.json` — текущий черновик владельца.
- `/var/lib/donozera/published.json` — ссылка на данные активного релиза.
- `/var/lib/donozera/status.json`, `last-publish.log` — состояние и журнал последней публикации.

Все сборки выполняются от непривилегированного пользователя `donozera`. Админка ограничена systemd: 1,5 ГБ RAM, 1,5 CPU, запрещена запись за пределами каталогов приложения. Nginx читает только готовую статику. Закрытые данные и исходники не лежат внутри webroot.

## Первичная установка

На Ubuntu 24.04 нужны Nginx, rsync, sudo, curl, xz-utils, Node.js 24 LTS, Tailscale. Создайте пользователя `donozera` и каталоги выше с владельцем `donozera`. Загрузите исходники в отдельную папку внутри `incoming/`, затем:

```sh
cd /opt/donozera/incoming/initial
npm ci --no-audit --no-fund
flock /var/lib/donozera/publish.lock node deploy/publish.mjs --source "$PWD"
```

Установите `deploy/server/site.conf` как `/etc/nginx/snippets/donozera-site.conf`, а `deploy/server/nginx-bootstrap.conf` как `/etc/nginx/sites-available/donozera`. Включите сайт в `sites-enabled`, отключите стандартный default, проверьте `nginx -t` и перезагрузите Nginx. После настройки DNS выполните `bash deploy/server/enable-domain.sh` от root: скрипт проверит публичные A/AAAA, выпустит сертификат и установит итоговую HTTPS-конфигурацию `nginx.conf`. До выпуска сертификата HTTPS-конфигурацию устанавливать нельзя. Установите unit админки в `/etc/systemd/system/donozera-admin.service`, выполните `systemctl daemon-reload` и `systemctl enable --now donozera-admin`.

Установите `deploy/server/receive.sh` как root-owned исполняемый `/usr/local/bin/donozera-deploy`. Публичный ключ CI поместите в `/home/donozera/.ssh/authorized_keys` с ограничением:

```text
restrict,command="/usr/local/bin/donozera-deploy" ssh-ed25519 <public-key>
```

Этот ключ принимает только архив исходников для деплоя; интерактивный shell, форвардинг и доступ root не разрешены. В `/etc/sudoers.d/donozera-admin` разрешена ровно одна команда:

```text
donozera ALL=(root) NOPASSWD: /usr/bin/systemctl restart donozera-admin.service
```

## GitHub Actions

В репозитории нужны два **Actions secrets** (не variables):

- `DONOZERA_SSH_KEY`: отдельный приватный ключ CI.
- `DONOZERA_KNOWN_HOSTS`: заранее проверенная строка ключа сервера из known_hosts.

Не используйте root-ключ или `StrictHostKeyChecking=no`. Не получайте host key через непроверенный ssh-keyscan внутри CI.

Workflow выполняет проверку данных, тесты API, интеграционный тест публикации, сборку, проверку всех медиа, npm audit и браузерные тесты на двух размерах экрана. Только успешный workflow ветки `main` деплоится в environment `production`. PR не получает секретов деплоя. Деплои сериализованы; админка и CI дополнительно используют один `flock` на сервере.

Сервер применяет к новому коду **последние опубликованные данные владельца**, затем собирает и проверяет сайт. Несохранённый или неопубликованный черновик не публикуется случайно при деплое кода. Старые хешированные JS/CSS остаются доступны посетителям, которые открыли предыдущую HTML-страницу.

## Tailscale

```sh
tailscale up --hostname=donozera
tailscale serve --bg http://127.0.0.1:8787
tailscale serve status
```

Владелец проходит авторизацию сервера в своей сети Tailscale. При необходимости включает HTTPS по ссылке, которую выдаст `serve`. Админка дополнительно требует заголовок идентичности, добавляемый Tailscale Serve. Обращение к localhost без этого заголовка получает 403. Публичные `/admin`, `/api`, `/map-review` и приватный порт недоступны. Для отдельных участников сети ограничьте доступ к `donozera:443` политиками Tailscale. **Funnel для админки не включать**.

## Проверка после деплоя

```sh
curl -f http://127.0.0.1/healthz
curl --resolve donozera.ru:443:135.106.164.41 -I https://donozera.ru/
curl --resolve donozera.ru:443:135.106.164.41 -I https://donozera.ru/admin/
curl --resolve donozera.ru:443:135.106.164.41 -I https://donozera.ru/map-review/
ss -lntp
systemctl status donozera-admin nginx
```

`/` — 200, приватные пути — 404, порт админки привязан к 127.0.0.1. Публикацию проверяйте через реальную приватную страницу: сохраните текущие данные без изменения цен, нажмите «Опубликовать изменения», дождитесь сообщения об успехе и проверьте публичную страницу.

## Откат и резервные копии

Откат к предыдущему релизу от пользователя `donozera`:

```sh
bash /opt/donozera/source/deploy/server/rollback.sh
```

Рабочий контент переключится вместе с сайтом; черновик останется сохранён. При ошибке сборки откат не требуется: действующая ссылка не меняется.

Резервная копия должна включать `/var/lib/donozera`, `/var/www/donozera/releases`, `/opt/donozera/incoming`, конфигурации Nginx и systemd, `/home/donozera/.ssh/authorized_keys`. Обычный деплой кода не является копией пользовательских правок. Копировать нужно с сохранением ссылок и прав доступа. Перед очисткой старых версий убедитесь, что они не являются целями `source`, `current`, `previous` и не используются выполняющейся сборкой. Автоматического удаления резервных релизов нет; за диском следует следить.

## Домен и HTTPS

В DNS-хостинге Selectel нужны A-записи `@` и `www` со значением `135.106.164.41`. AAAA-записи не добавляются без настроенного публичного IPv6. После распространения DNS скрипт `enable-domain.sh` выпускает сертификат для `donozera.ru` и `www.donozera.ru`, включает HTTPS и настраивает автоматическое продление с безопасной перезагрузкой Nginx.

Основной публичный адрес — `https://donozera.ru`. HTTP и www перенаправляются на него с сохранением пути и параметров. По IP сайт не отдаётся: HTTP перенаправляется на основной домен, а HTTPS с неизвестным SNI отклоняется. `/healthz` остаётся доступен локально и по IP для служебной проверки деплоя.

Проверка продления: `certbot renew --cert-name donozera.ru --dry-run`. Админка использует отдельный приватный HTTPS Tailscale. Nginx слушает HTTPS только на публичном `135.106.164.41:443`: wildcard-привязка к порту 443 конфликтует с Tailscale Serve, который занимает этот порт на адресах tailnet. При смене публичного IP обновите также директивы `listen` в `nginx.conf`.

Если новая делегация ещё распространяется, можно установить одноразовый `donozera-domain.service`. Его скрипты и конфигурации должны лежать в **root-owned** `/usr/local/lib/donozera-domain/`, недоступном для записи пользователю `donozera`. Сервис проверяет только публичный DNS раз в минуту (до 24 часов), а Certbot запускает один раз после совпадения ответов Cloudflare и Google. После успеха отключает свой автозапуск. Состояние: `systemctl status donozera-domain`; журнал: `journalctl -u donozera-domain`. Ошибка выпуска сертификата требует проверки журнала и явного перезапуска сервиса; бесконечных повторных запросов к CA нет.
