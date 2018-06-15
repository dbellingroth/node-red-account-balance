const FinTSClient = require("open-fin-ts-js-client");

async function getBalance(bankCode, hbciUrl, user, pin, iban) {
  client = new FinTSClient(bankCode, user, pin, hbciUrl);
  await client.EstablishConnection();
  const account = client.konten
    .filter(k => k.iban == iban)[0];
  if (account == null) throw new Error(`Account with IBAN ${iban} was not found`);
  let balance = await client.MsgGetSaldo(account.sepa_data);
  await client.MsgEndDialog()
  client.closeSecure();
  return balance.saldo.saldo;
}

module.exports = RED => {
  function AccountBalanceNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const bankCode = node.credentials.bankCode;
    const user = node.credentials.user;
    const pin = node.credentials.pin;
    const hbciUrl = node.credentials.url;
    const iban = node.credentials.iban;
    const interval = setInterval(() => {
      getBalance(bankCode, hbciUrl, user, pin, iban).then(balance => {
        console.log(balance);
        node.status({ fill: "green", shape: "dot", text: `${balance.value} ${balance.currency}` });
        node.send({
          payload: {
            balance: balance.value,
            currency: balance.currency
          }
        })
      }).catch(error => {
        console.error(error);
      });
    }, config.interval);
    node.on('close', done => {
      clearInterval(interval);
      done();
    });
  }

  RED.nodes.registerType('account-balance', AccountBalanceNode, {
    credentials: {
      bankCode: { type: 'text' },
      url: { type: 'text' },
      user: { type: 'text' },
      pin: { type: 'password' },
      iban: { type: 'text' }
    }
  });

}