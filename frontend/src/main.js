import "./style.css";
import { api, setToken } from "./api.js";

const root = document.querySelector("#app");
const state = {
  user: null,
  units: [],
  unit: 1,
  menu: [],
  cart: new Map(),
  orders: [],
  channel: "",
  tab: "cardapio",
  loyalty: null,
  page: 1,
  total: 0,
};
const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const labels = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};
const staff = () => state.user && state.user.perfil !== "CLIENTE";

function render() {
  root.innerHTML = `<header><a class="brand" href="/">r<span>•</span>n <b>raízes<br><small>DO NORDESTE</small></b></a><div class="header-right"><span class="demo">AMBIENTE DEMONSTRATIVO</span><a href="http://localhost:3000/docs" target="_blank" rel="noreferrer">API ↗</a>${state.user ? `<span>${escape(state.user.nome)} · ${state.user.perfil}</span><button class="text" data-action="logout">Sair</button>` : '<button class="outline" data-action="login">Entrar</button>'}</div></header>
  <main><section class="intro"><div><p class="eyebrow">DA NOSSA TERRA, PARA SUA MESA</p><h1>Sabor que tem raiz.</h1><p>Comida de verdade. Feita na hora, pertinho de você.</p></div><label class="unit-label">Sua unidade<select id="unit">${state.units.map((unit) => `<option value="${unit.id}" ${unit.id === state.unit ? "selected" : ""}>${escape(unit.nome)} · ${escape(unit.cidade)}</option>`).join("")}</select></label></section>
  <nav>${[
    ["cardapio", "Cardápio"],
    ["pedidos", staff() ? "Pedidos da rede" : "Meus pedidos"],
    ["fidelidade", "Fidelidade"],
  ]
    .map(
      ([tab, label]) =>
        `<button data-tab="${tab}" class="${state.tab === tab ? "active" : ""}">${label}</button>`,
    )
    .join("")}<span>APP · TOTEM · BALCÃO · PICKUP · WEB</span></nav>
  <div id="notice" role="status" aria-live="polite"></div><section id="content">${state.tab === "cardapio" ? menuView() : state.tab === "pedidos" ? ordersView() : loyaltyView()}</section>
  <footer>Raízes do Nordeste <span>Projeto Multidisciplinar · 2026 · Pagamentos simulados</span></footer></main><dialog id="auth"><form id="auth-form" novalidate><button type="button" class="close text" data-action="close">✕</button><p class="eyebrow">BEM-VINDO À NOSSA MESA</p><h2>Entre na sua conta</h2><label class="register-only" hidden>Nome<input name="nome" autocomplete="name" maxlength="120" aria-describedby="nome-error"><span id="nome-error" class="field-error" aria-live="polite"></span></label><label>E-mail<input name="email" type="email" autocomplete="username" required aria-describedby="email-error"><span id="email-error" class="field-error" aria-live="polite"></span></label><label>Senha<input name="senha" type="password" autocomplete="current-password" required aria-describedby="senha-error"><span id="senha-error" class="field-error" aria-live="polite"></span></label><p id="auth-error" role="alert"></p><button class="primary" type="submit">Entrar</button><button class="text" type="button" data-action="toggle-register">Ainda não tenho conta</button></form></dialog>`;
  bind();
}
function menuView() {
  const total = [...state.cart].reduce(
    (sum, [id, quantity]) =>
      sum + state.menu.find((p) => p.id === id).precoCentavos * quantity,
    0,
  );
  return `<div class="shop"><div><div class="section-heading"><h2>Os favoritos da casa</h2><span>${state.menu.length} opções</span></div><div class="products">${state.menu.map((product, index) => `<article class="product"><div class="food-art art-${index % 3}" aria-hidden="true"><span>${["◒", "▰", "◡"][index % 3]}</span><small>FEITO NA HORA</small></div><div class="product-body"><span class="category">${product.id === 3 ? "PARA REFRESCAR" : "SABORES DA TERRA"}</span><h3>${escape(product.nome)}</h3><p>${escape(product.descricao)}</p><div class="product-bottom"><strong>${money(product.precoCentavos)}</strong><button class="add" aria-label="Adicionar ${escape(product.nome)}" data-add="${product.id}" ${product.quantidade <= (state.cart.get(product.id) || 0) ? "disabled" : ""}>+</button></div>${product.quantidade === 0 ? "<small>Esgotado nesta unidade</small>" : ""}</div></article>`).join("")}</div><p class="hint">Os preços e a disponibilidade variam por unidade.</p></div><aside class="cart"><p class="eyebrow">SEU PEDIDO</p><h2>Uma boa escolha.</h2>${
    state.cart.size
      ? [...state.cart]
          .map(([id, quantity]) => {
            const product = state.menu.find((p) => p.id === id);
            return `<div class="cart-item"><span>${escape(product.nome)}<small>${money(product.precoCentavos)}</small></span><div class="quantity"><button data-remove="${id}" aria-label="Remover uma unidade">−</button><b>${quantity}</b><button data-add="${id}" aria-label="Adicionar uma unidade">+</button></div></div>`;
          })
          .join("")
      : '<div class="empty"><span>＋</span><p>Escolha um sabor para começar.</p></div>'
  }${state.loyalty?.consentimento && state.loyalty.pontos > 0 ? `<label>Resgatar pontos<input id="points" type="number" min="0" max="${Math.min(state.loyalty.pontos, Math.floor(total / 20))}" step="1" value="0" aria-describedby="points-help points-error"><span id="points-error" class="field-error" aria-live="polite"></span></label><small id="points-help">Saldo: ${state.loyalty.pontos} pontos. Neste pedido: até ${Math.min(state.loyalty.pontos, Math.floor(total / 20))} pontos. Cada ponto vale R$ 0,10, limitado a 50% do subtotal.</small>` : ''}<div class="cart-total"><span>Subtotal</span><strong>${money(total)}</strong></div><button class="primary" data-action="checkout" ${!state.cart.size ? "disabled" : ""}>${state.user ? "Criar pedido →" : "Entrar para pedir →"}</button><small class="cart-note">Você simula o pagamento na próxima etapa.</small></aside></div>`;
}
function ordersView() {
  if (!state.user)
    return '<div class="empty panel"><h2>Seus pedidos ficam aqui.</h2><p>Entre na sua conta para acompanhar.</p><button class="primary" data-action="login">Entrar</button></div>';
  return `<div class="section-heading"><h2>${staff() ? "Acompanhe a operação" : "Do preparo à sua mesa"}</h2><label>Filtrar por canal<select id="filter"><option value="">Todos os canais</option>${["WEB", "APP", "TOTEM", "BALCAO", "PICKUP"].map((v) => `<option ${state.channel === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><button class="outline" data-action="refresh">Atualizar</button></div><div class="order-list">${state.orders.length ? state.orders.map((order) => `<article class="order panel"><div><span class="eyebrow">PEDIDO #${order.id} · ${order.canalPedido} · UNIDADE ${order.unidadeId}</span><h3>${money(order.totalCentavos)}</h3><p>${order.itens.map((i) => `${i.quantidade}× produto #${i.produtoId}`).join(" · ")}</p></div><div class="order-actions"><span class="badge ${order.status.toLowerCase()}">${labels[order.status]}</span>${order.status === "AGUARDANDO_PAGAMENTO" && state.user.perfil !== "COZINHA" ? `<div><button class="primary" data-pay="${order.id}" data-scenario="APROVADO">Pagar (mock)</button><button class="outline" data-pay="${order.id}" data-scenario="RECUSADO">Simular recusa</button><button class="text" data-cancel="${order.id}">Cancelar</button></div>` : ""}${order.status === "EM_PREPARO" && ["COZINHA", "GERENTE", "ADMIN"].includes(state.user.perfil) ? `<button class="primary" data-status="PRONTO" data-id="${order.id}">Marcar como pronto</button>` : ""}${order.status === "PRONTO" && ["ATENDENTE", "GERENTE", "ADMIN"].includes(state.user.perfil) ? `<button class="primary" data-status="ENTREGUE" data-id="${order.id}">Confirmar entrega</button>` : ""}</div></article>`).join("") : '<div class="panel empty">Nenhum pedido encontrado.</div>'}</div><div class="pagination"><button class="outline" data-page="-1" ${state.page === 1 ? "disabled" : ""}>Anterior</button><span>Página ${state.page} · ${state.total} pedidos</span><button class="outline" data-page="1" ${state.page * 10 >= state.total ? "disabled" : ""}>Próxima</button></div>`;
}
function loyaltyView() {
  if (!state.user || !state.loyalty)
    return '<div class="panel empty"><h2>Voltar tem suas vantagens.</h2><p>Entre para consultar seus pontos e decidir se quer participar.</p><button class="primary" data-action="login">Entrar</button></div>';
  const { pontos, consentimento, historico } = state.loyalty;
  return `<div class="panel loyalty"><p class="eyebrow">PROGRAMA DE FIDELIDADE</p><h2>Todo encontro conta.</h2><div class="points">${pontos}<span>pontos</span></div><p>A cada R$ 1 em pedidos entregues, você ganha 1 ponto.<br>Resgate cada ponto por R$ 0,10 em novos pedidos, até 50% do subtotal.</p><label class="consent"><input id="consent" type="checkbox" ${consentimento ? "checked" : ""}> Quero participar e autorizo o uso do meu histórico de compras para calcular pontos.</label><p class="hint">Participação opcional. Você pode revogar aqui a qualquer momento; compras continuam disponíveis. A revogação suspende novos créditos e resgates, preservando o histórico.</p><h3>Últimas movimentações</h3>${historico.data.length ? historico.data.map((row) => `<div class="ledger"><span>${row.motivo} · Pedido #${row.pedidoId}</span><b>${row.pontos > 0 ? "+" : ""}${row.pontos}</b></div>`).join("") : "<p>Nenhuma movimentação por enquanto.</p>"}</div>`;
}
function notify(message, error = false) {
  const box = document.querySelector("#notice");
  box.textContent = message;
  box.className = error ? "notice error" : "notice";
}
async function load() {
  if (state.tab === "cardapio")
    state.menu = (await api(`/unidades/${state.unit}/cardapio?limit=100`)).data;
  if (state.tab === "pedidos" && state.user) {
    const result = await api(
      `/pedidos?page=${state.page}&limit=10${state.channel ? `&canalPedido=${state.channel}` : ""}`,
    );
    state.orders = result.data;
    state.total = result.total;
  }
  if (["fidelidade", "cardapio"].includes(state.tab) && state.user)
    state.loyalty = await api("/fidelidade?limit=20");
  render();
}
function setFieldError(form, name, message) {
  form.querySelector(`#${name}-error`).textContent = message;
  form.elements[name].setAttribute("aria-invalid", String(Boolean(message)));
}
function clearAuthErrors(form) {
  for (const name of ["nome", "email", "senha"]) setFieldError(form, name, "");
  form.querySelector("#auth-error").textContent = "";
}
function bind() {
  root.onclick = async (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    try {
      if (button.dataset.tab) {
        state.tab = button.dataset.tab;
        await load();
      }
      if (button.dataset.add) {
        const id = Number(button.dataset.add);
        const count = state.cart.get(id) || 0;
        if (
          count < Math.min(100, state.menu.find((p) => p.id === id).quantidade)
        )
          state.cart.set(id, count + 1);
        render();
      }
      if (button.dataset.remove) {
        const id = Number(button.dataset.remove);
        const count = state.cart.get(id);
        count > 1 ? state.cart.set(id, count - 1) : state.cart.delete(id);
        render();
      }
      if (button.dataset.action === "login")
        document.querySelector("#auth").showModal();
      if (button.dataset.action === "close")
        document.querySelector("#auth").close();
      if (button.dataset.action === "logout") {
        state.user = null;
        setToken("");
        state.orders = [];
        state.loyalty = null;
        render();
      }
      if (button.dataset.action === "toggle-register") {
        const form = document.querySelector("#auth-form");
        const register = form.dataset.mode !== "register";
        form.dataset.mode = register ? "register" : "login";
        form.querySelector(".register-only").hidden = !register;
        form.elements.nome.required = register;
        form.querySelector("h2").textContent = register
          ? "Crie sua conta"
          : "Entre na sua conta";
        form.querySelector("[type=submit]").textContent = register
          ? "Cadastrar"
          : "Entrar";
        form.elements.senha.autocomplete = register ? "new-password" : "current-password";
        clearAuthErrors(form);
        button.textContent = register
          ? "Já tenho uma conta"
          : "Ainda não tenho conta";
      }
      if (button.dataset.action === "checkout") {
        if (!state.user) return document.querySelector("#auth").showModal();
        const pointsInput = document.querySelector("#points");
        const points = pointsInput ? Number(pointsInput.value) : 0;
        if (pointsInput && (!Number.isInteger(points) || points < 0 || points > Number(pointsInput.max))) {
          document.querySelector("#points-error").textContent = `Informe um número inteiro entre 0 e ${pointsInput.max}.`;
          pointsInput.setAttribute("aria-invalid", "true");
          pointsInput.focus();
          return;
        }
        button.disabled = true;
        const pedido = await api("/pedidos", {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: {
            unidadeId: state.unit,
            canalPedido: "WEB",
            pontosResgatados: points,
            itens: [...state.cart].map(([produtoId, quantidade]) => ({
              produtoId,
              quantidade,
            })),
          },
        });
        state.cart.clear();
        state.tab = "pedidos";
        state.page = 1;
        await load();
        notify(
          `Pedido #${pedido.id} criado. Escolha o resultado do pagamento mock.`,
        );
      }
      if (button.dataset.pay) {
        button.disabled = true;
        const result = await api("/pagamentos", {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: {
            pedidoId: Number(button.dataset.pay),
            cenario: button.dataset.scenario,
          },
        });
        await load();
        notify(result.pagamento.payload.message);
      }
      if (button.dataset.cancel) {
        button.disabled = true;
        await api(`/pedidos/${button.dataset.cancel}/cancelamento`, {
          method: "POST",
        });
        await load();
        notify("Pedido cancelado. Estoque e pontos devolvidos.");
      }
      if (button.dataset.status) {
        button.disabled = true;
        await api(`/pedidos/${button.dataset.id}/status`, {
          method: "PATCH",
          body: { status: button.dataset.status },
        });
        await load();
        notify("Status atualizado.");
      }
      if (button.dataset.page) {
        state.page += Number(button.dataset.page);
        await load();
      }
      if (button.dataset.action === "refresh") await load();
    } catch (error) {
      button.disabled = false;
      notify(error.message, true);
    }
  };
  document.querySelector("#unit").onchange = async (event) => {
    state.unit = Number(event.target.value);
    state.cart.clear();
    await load().catch((error) => notify(error.message, true));
  };
  const filter = document.querySelector("#filter");
  if (filter)
    filter.onchange = async (event) => {
      state.channel = event.target.value;
      state.page = 1;
      await load().catch((error) => notify(error.message, true));
    };
  const consent = document.querySelector("#consent");
  if (consent)
    consent.onchange = async (event) => {
      try {
        await api("/fidelidade/consentimento", {
          method: "PUT",
          body: { aceito: event.target.checked },
        });
        await load();
        notify("Preferência registrada.");
      } catch (error) {
        event.target.checked = !event.target.checked;
        notify(error.message, true);
      }
    };
  document.querySelector("#auth-form").oninput = (event) => {
    const field = event.target;
    if (field.name) setFieldError(event.currentTarget, field.name, "");
    event.currentTarget.querySelector("#auth-error").textContent = "";
  };
  document.querySelector("#auth-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("[type=submit]");
    clearAuthErrors(form);
    const input = Object.fromEntries(new FormData(form));
    input.nome = input.nome.trim();
    input.email = input.email.trim();
    const register = form.dataset.mode === "register";
    const errors = {};
    if (register && input.nome.length < 2) errors.nome = "Informe seu nome com pelo menos 2 caracteres.";
    if (!input.email) errors.email = "Informe seu e-mail.";
    else if (form.elements.email.validity.typeMismatch || input.email.length > 200) errors.email = "Informe um e-mail válido, como nome@exemplo.com.";
    if (!input.senha) errors.senha = "Informe sua senha.";
    else if (register && input.senha.length < 10) errors.senha = "A senha deve ter pelo menos 10 caracteres.";
    else if (input.senha.length > 128) errors.senha = "A senha deve ter no máximo 128 caracteres.";
    for (const [field, message] of Object.entries(errors)) setFieldError(form, field, message);
    if (Object.keys(errors).length) {
      form.elements[Object.keys(errors)[0]].focus();
      return;
    }
    button.disabled = true;
    try {
      if (form.dataset.mode === "register")
        await api("/auth/cadastro", { method: "POST", body: input });
      const session = await api("/auth/login", {
        method: "POST",
        body: { email: input.email, senha: input.senha },
      });
      state.user = session.user;
      setToken(session.accessToken);
      await load();
      notify(`Bem-vindo, ${state.user.nome}.`);
    } catch (error) {
      if (error.code === "EMAIL_EM_USO") {
        setFieldError(form, "email", "Este e-mail já está sendo utilizado. Entre na sua conta ou use outro e-mail.");
        form.elements.email.focus();
      } else if (error.code === "CREDENCIAIS_INVALIDAS") {
        setFieldError(form, "senha", "E-mail ou senha inválidos. Confira os dados e tente novamente.");
        form.elements.senha.focus();
      } else {
        form.querySelector("#auth-error").textContent = error.message;
      }
      button.disabled = false;
    }
  };
}
render();
try {
  state.units = (await api("/unidades")).data;
  if (state.units.length) state.unit = state.units[0].id;
  await load();
} catch {
  notify(
    "Não foi possível carregar o cardápio. Confira se a API está rodando.",
    true,
  );
}
