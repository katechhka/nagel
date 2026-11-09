export function initContactForm(form) {
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    if (!form.dataset.endpoint) {
      status.textContent = 'Онлайн-заявка пока недоступна. Для подбора времени позвоните: +7 (4872) 337-457.';
      status.focus();
      return;
    }
    button.disabled = true;
    status.textContent = 'Отправляем заявку…';
    try {
      const response = await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('request');
      status.textContent = 'Заявка отправлена. Мы позвоним, уточним услугу и предложим время. Запись оформим, когда согласуем с вами день и час визита.';
      form.reset();
    } catch {
      status.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам: +7 (4872) 337-457.';
    } finally {
      button.disabled = false;
      status.focus();
    }
  });
}
