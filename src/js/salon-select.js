export function initSalonSelect(select) {
  const label = select.parentElement;
  const wrapper = document.createElement('div');
  wrapper.className = 'salon-select';
  const caption = document.createElement('span');
  caption.id = 'salon-select-label';
  caption.textContent = label.firstChild.textContent;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'salon-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-labelledby', `${caption.id} salon-select-value`);
  trigger.innerHTML = '<span id="salon-select-value"></span><span class="salon-select__chevron" aria-hidden="true"></span>';
  const list = document.createElement('ul');
  list.id = 'salon-select-options';
  list.className = 'salon-select__options';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', caption.id);
  list.hidden = true;
  trigger.setAttribute('aria-controls', list.id);
  const options = [...select.options].map((option, index) => {
    const item = document.createElement('li');
    item.setAttribute('role', 'option');
    item.tabIndex = -1;
    item.textContent = option.textContent;
    item.addEventListener('click', () => choose(index));
    list.append(item);
    return item;
  });
  function sync() {
    trigger.firstElementChild.textContent = select.selectedOptions[0].textContent;
    options.forEach((item, index) => item.setAttribute('aria-selected', String(index === select.selectedIndex)));
  }
  function close(restore = false) {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) trigger.focus();
  }
  function open() {
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    options[select.selectedIndex].focus();
  }
  function choose(index) {
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    close(true);
  }
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  wrapper.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    if (event.key === 'Tab') { close(); return; }
    const index = options.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (list.hidden) { open(); return; }
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[next].focus();
    }
    if (index >= 0 && ['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(index); }
    if (index >= 0 && event.key.length === 1 && event.key !== ' ') {
      const next = options.find(item => item.textContent.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      next?.focus();
    }
  });
  document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(); });
  wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
  select.hidden = true;
  label.replaceWith(wrapper);
  wrapper.append(caption, select, trigger, list);
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => queueMicrotask(sync));
  sync();
}
