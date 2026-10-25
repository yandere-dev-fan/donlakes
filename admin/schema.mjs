export const groups = [
  ['hero', 'Первый экран', [['description', 'Описание']]],
  ['intro', 'О базе', [['paragraphOne', 'Первый абзац'], ['paragraphTwo', 'Второй абзац']]],
  ['contact', 'Контакты и время работы', [
    ['phone', 'Телефон, формат +79185886812', 'tel'], ['description', 'Текст в блоке контактов'],
    ['mapUrl', 'Ссылка на Яндекс Карты', 'url'], ['checkIn', 'Заезд с', 'time'], ['checkOut', 'Выезд до', 'time'],
    ['dayStart', 'Дневной отдых с', 'time'], ['dayEnd', 'Дневной отдых до', 'time'], ['childrenNote', 'Условия для детей'],
  ]],
  ['summer', 'Летние домики', [['priceTwo', 'Стоимость на двоих, ₽ / сутки', 'number'], ['priceThree', 'Стоимость на троих, ₽ / сутки', 'number'], ['description', 'Описание'], ['amenities', 'Удобства']]],
  ['cottage', 'Срубы', [['priceTwo', 'Стоимость на двоих, ₽ / сутки', 'number'], ['extraGuestPrice', 'Дополнительное место, ₽', 'number'], ['description', 'Описание'], ['amenities', 'Удобства']]],
  ['sauna', 'Бани', [['priceText', 'Стоимость и условия (например: 3 000 ₽ / час, минимум 2 часа)'], ['description', 'Описание'], ['brooms', 'Веники и дополнительные услуги']]],
  ['fishing', 'Рыбалка', [['description', 'Описание'], ['conditions', 'Стоимость и условия']]],
  ['day', 'Дневной отдых', [['price', 'Стоимость с человека, ₽', 'number'], ['description', 'Что входит'], ['gazebos', 'Беседки'], ['activities', 'Активности'], ['water', 'Пляж']]],
];

export function validateContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Неверный формат данных');
  const result = {};
  for (const [group, , fields] of groups) {
    result[group] = {};
    for (const [key, label, type] of fields) {
      const value = input[group]?.[key];
      if (type === 'number') {
        if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) throw new Error(`${label}: введите целое число от 0 до 1 000 000`);
      } else {
        if (typeof value !== 'string' || !value.trim() || value.length > 3000) throw new Error(`${label}: заполните поле (до 3000 символов)`);
        if (type === 'tel' && !/^\+7\d{10}$/.test(value)) throw new Error('Телефон: используйте формат +79185886812');
        if (type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${label}: используйте ЧЧ:ММ`);
        if (type === 'url') {
          let url;
          try { url = new URL(value); } catch { throw new Error('Некорректная ссылка на карту'); }
          if (url.protocol !== 'https:' || url.username || url.password || !['yandex.ru', 'yandex.com', 'ya.ru'].includes(url.hostname)) throw new Error('Используйте HTTPS-ссылку на Яндекс Карты');
        }
      }
      result[group][key] = typeof value === 'string' ? value.trim() : value;
    }
  }
  if (result.contact.dayStart >= result.contact.dayEnd) throw new Error('Окончание дневного отдыха должно быть позже начала');
  return result;
}
