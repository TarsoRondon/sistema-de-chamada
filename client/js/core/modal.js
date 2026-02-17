(function initModal(global) {
  function createModalElement() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
        <h3 id="app-modal-title" class="modal-title"></h3>
        <p class="modal-text"></p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-cancel>Cancelar</button>
          <button type="button" class="btn btn-primary" data-confirm>Confirmar</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        close(modal, false);
      }
    });

    return modal;
  }

  function close(modal, value) {
    const resolver = modal._resolver;
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 100);
    if (resolver) {
      resolver(value);
    }
  }

  function confirm({
    title = 'Confirmar acao',
    message = 'Deseja continuar?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
  } = {}) {
    return new Promise((resolve) => {
      const modal = createModalElement();
      modal._resolver = resolve;

      modal.querySelector('.modal-title').textContent = title;
      modal.querySelector('.modal-text').textContent = message;
      modal.querySelector('[data-confirm]').textContent = confirmText;
      modal.querySelector('[data-cancel]').textContent = cancelText;

      modal.querySelector('[data-cancel]').addEventListener('click', () => close(modal, false));
      modal.querySelector('[data-confirm]').addEventListener('click', () => close(modal, true));

      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('is-open'));
    });
  }

  global.AppModal = {
    confirm,
  };
})(window);
