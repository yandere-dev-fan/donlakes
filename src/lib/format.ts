export const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
export const phoneLabel = (phone: string) => phone.replace(/^(\+7)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 ($2) $3-$4-$5');
